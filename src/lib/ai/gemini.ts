import { GoogleGenAI } from '@google/genai';

/**
 * Universal Multi-Provider AI Tarot Interpretation Engine
 * Supports:
 * 1. Google Gemini Flash (Recommended: gemini-2.5-flash / gemini-2.0-flash)
 * 2. Z.AI / Zhipu GLM (GLM-4 / GLM-5 Flash via OpenAI-compatible endpoint)
 * 3. MiniMax (MiniMax-Text-01 via API endpoint)
 */

export interface StreamTarotOptions {
  prompt: string;
  systemInstruction?: string;
  model?: string;
  isChat?: boolean;
  /**
   * true ise hicbir AI saglayicisina (Gemini / GLM / MiniMax) gidilmez;
   * yerel prosedurel "oracle" motoru kullanilir. AI maliyeti 0.
   * Misafir / kota dolmus kullanicilar icin kullanilir.
   */
  forceLocal?: boolean;
}

/**
 * Detects configured AI provider based on environment variables
 */
export function getActiveAiProvider(): {
  provider: 'gemini' | 'glm' | 'minimax' | 'fallback';
  apiKey?: string;
  model: string;
} {
  // 1. Google Gemini (1. Öncelikli & Şiddetle Tavsiye Edilen)
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiKey && geminiKey !== 'placeholder') {
    return {
      provider: 'gemini',
      apiKey: geminiKey,
      model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
    };
  }

  // 2. Z.AI / Zhipu GLM
  const glmKey = process.env.GLM_API_KEY || process.env.ZHIPU_API_KEY;
  if (glmKey && glmKey !== 'placeholder') {
    return {
      provider: 'glm',
      apiKey: glmKey,
      model: process.env.GLM_MODEL || 'glm-4-flash',
    };
  }

  // 3. MiniMax
  const minimaxKey = process.env.MINIMAX_API_KEY;
  if (minimaxKey && minimaxKey !== 'placeholder') {
    return {
      provider: 'minimax',
      apiKey: minimaxKey,
      model: process.env.MINIMAX_MODEL || 'minimax-text-01',
    };
  }

  // Genel AI_API_KEY kontrolü
  const genericKey = process.env.AI_API_KEY;
  if (genericKey && genericKey !== 'placeholder') {
    if (genericKey.startsWith('AIzaSy')) {
      return { provider: 'gemini', apiKey: genericKey, model: 'gemini-3.5-flash-lite' };
    }
  }

  return { provider: 'fallback', model: 'procedural-oracle' };
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Streams tarot interpretation or chat response using active AI provider
 */
export async function streamTarotInterpretation({
  prompt,
  systemInstruction,
  model,
  isChat = false,
  forceLocal = false,
}: StreamTarotOptions): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();
  // forceLocal: AI saglayicilarina hic gidilmez -> yerel prosedurel motor.
  const active = forceLocal
    ? { provider: 'fallback' as const, model: 'procedural-oracle' }
    : getActiveAiProvider();

  // 1. Google Gemini (Hızlı Timeout'lu SSE Akışı + Non-Streaming Kurtarma)
  if (active.provider === 'gemini' && active.apiKey) {
    try {
      const client = new GoogleGenAI({ apiKey: active.apiKey });
      const preferred = model || active.model || 'gemini-3.1-flash-lite';
      const streamCandidates = Array.from(
        new Set([preferred, 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest'])
      ).filter((m) => m !== 'gemini-3.5-flash-lite');

      const nonStreamCandidates = Array.from(
        new Set(['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite'])
      );

      for (const candidate of streamCandidates) {
        try {
          const responseStream = await withTimeout(
            client.models.generateContentStream({
              model: candidate,
              contents: prompt,
              config: systemInstruction
                ? {
                    systemInstruction,
                    temperature: 0.85,
                    topP: 0.95,
                  }
                : {
                    temperature: 0.85,
                    topP: 0.95,
                  },
            }),
            isChat ? 12_000 : 18_000,
            `stream:${candidate}`
          );

          return new ReadableStream<Uint8Array>({
            async start(controller) {
              let emittedText = '';
              try {
                for await (const chunk of responseStream) {
                  const text = chunk.text;
                  if (text) {
                    emittedText += text;
                    controller.enqueue(encoder.encode(text));
                  }
                }
              } catch (err: any) {
                console.error('Gemini stream chunk error:', err);
                let rescued = false;
                for (const rescueModel of nonStreamCandidates) {
                  try {
                    const rescueResp = await withTimeout(
                      client.models.generateContent({
                        model: rescueModel,
                        contents: emittedText
                          ? `${prompt}\n\n---\nAşağıdaki yanıt yarıda kesildi; kaldığı yerden doğal biçimde devam edip tamamla (önceki kısmı tekrar etme):\n${emittedText}`
                          : prompt,
                        config: systemInstruction
                          ? { systemInstruction, temperature: 0.85, topP: 0.95 }
                          : { temperature: 0.85, topP: 0.95 },
                      }),
                      16_000,
                      `rescue:${rescueModel}`
                    );
                    const tail = rescueResp.text?.trim();
                    if (tail) {
                      controller.enqueue(encoder.encode((emittedText ? ' ' : '') + tail));
                      rescued = true;
                      break;
                    }
                  } catch (rescueErr) {
                    console.warn(`Gemini rescue model ${rescueModel} failed:`, rescueErr);
                  }
                }
                if (!rescued && !emittedText) {
                  controller.enqueue(
                    encoder.encode('Yıldızların enerjisi geçici olarak yoğunlaştı, lütfen birkaç saniye sonra tekrar deneyin.')
                  );
                }
              } finally {
                controller.close();
              }
            },
          });
        } catch (candidateErr: any) {
          console.warn(`Gemini stream model ${candidate} failed (${candidateErr?.status || candidateErr?.message}), trying next model...`);
        }
      }

      // Tüm stream modelleri meşgul veya zaman aşımına uğradıysa, non-streaming modellerle dene
      for (const fallbackModel of nonStreamCandidates) {
        try {
          const fullResp = await withTimeout(
            client.models.generateContent({
              model: fallbackModel,
              contents: prompt,
              config: systemInstruction
                ? { systemInstruction, temperature: 0.85, topP: 0.95 }
                : { temperature: 0.85, topP: 0.95 },
            }),
            isChat ? 15_000 : 22_000,
            `non-stream:${fallbackModel}`
          );
          const fullText = fullResp.text?.trim();
          if (fullText) {
            return new ReadableStream<Uint8Array>({
              async start(controller) {
                const words = fullText.split(/(?<=\s)/);
                for (let i = 0; i < words.length; i += 3) {
                  controller.enqueue(encoder.encode(words.slice(i, i + 3).join('')));
                  await new Promise((r) => setTimeout(r, 12));
                }
                controller.close();
              },
            });
          }
        } catch (fallbackErr: any) {
          console.warn(`Gemini non-stream model ${fallbackModel} failed (${fallbackErr?.status || fallbackErr?.message})`);
        }
      }
    } catch (err: any) {
      console.warn('Gemini API call failed, falling back to procedural stream:', err?.message || err);
    }
  }

  // 2. Z.AI / Zhipu GLM ile SSE Akışı (OpenAI compatible)
  if (active.provider === 'glm' && active.apiKey) {
    try {
      const endpoint = process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
      const messages: any[] = [];
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
      }
      messages.push({ role: 'user', content: prompt });

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${active.apiKey}`,
        },
        body: JSON.stringify({
          model: model || active.model,
          messages,
          stream: true,
          temperature: 0.85,
        }),
      });

      if (resp.ok && resp.body) {
        return createOpenAICompatibleStream(resp.body);
      }
    } catch (err: any) {
      console.warn('GLM API call failed, falling back:', err?.message || err);
    }
  }

  // 3. MiniMax ile SSE Akışı
  if (active.provider === 'minimax' && active.apiKey) {
    try {
      const endpoint = process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat/v1/text/chatcompletion_v2';
      const messages: any[] = [];
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
      }
      messages.push({ role: 'user', content: prompt });

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${active.apiKey}`,
        },
        body: JSON.stringify({
          model: model || active.model,
          messages,
          stream: true,
          temperature: 0.85,
        }),
      });

      if (resp.ok && resp.body) {
        return createOpenAICompatibleStream(resp.body);
      }
    } catch (err: any) {
      console.warn('MiniMax API call failed, falling back:', err?.message || err);
    }
  }

  // API Anahtarı henüz eklenmemişse yüksek kaliteli ussal mistik akış
  return createProceduralTarotStream(prompt, isChat);
}

/**
 * OpenAI / GLM / MiniMax SSE Stream Parser
 */
function createOpenAICompatibleStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = body.getReader();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed === 'data: [DONE]') {
              controller.close();
              return;
            }
            if (trimmed.startsWith('data: ')) {
              try {
                const json = JSON.parse(trimmed.slice(6));
                const content = json.choices?.[0]?.delta?.content || '';
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch (e) {
                // partial json chunk
              }
            }
          }
        }
      } catch (err) {
        console.error('SSE Stream error:', err);
      } finally {
        try {
          controller.close();
        } catch {}
      }
    },
  });
}

/**
 * Prompt içinden çekilen kart, kullanıcı adı, niyet ve burç bilgilerini çıkarır
 * (API anahtarı yokken bile falın kişiye özel ve tutarlı kalmasını sağlar)
 */
function extractPromptDetails(prompt: string) {
  const nameMatch =
    prompt.match(/KULLANICI:\s*(.+)/i) ||
    prompt.match(/Danışan:\s*(.+)/i) ||
    prompt.match(/İsim:\s*(.+)/i);
  const userName = nameMatch?.[1]?.trim().split('\n')[0] || 'Sevgili Yolcu';

  const intentionMatch =
    prompt.match(/KULLANICININ YENİ SORUSU:\s*"([^"]+)"/i) ||
    prompt.match(/SORU:\s*"?([^"\n]+)"?/i) ||
    prompt.match(/Niyet:\s*(.+)/i);
  const intention = intentionMatch?.[1]?.trim() || 'kalbindeki niyet';

  const cardLines: string[] = [];
  const cardLineRegex = /(?:^|\n)(?:\d+\.\s*|[•\-]\s*)?([^:\n]{2,45}):\s*([^(;\n]+?\((?:Ters|Düz|ters|düz)\))/g;
  let match: RegExpExecArray | null;
  while ((match = cardLineRegex.exec(prompt)) !== null) {
    cardLines.push(`${match[1].trim()} konumundaki ${match[2].trim()}`);
  }
  // Inline comma-separated card list fallback (chat context)
  if (cardLines.length === 0) {
    const inlineMatch = prompt.match(/MASADA AÇIK OLAN KARTLAR:\s*(.+)/i);
    if (inlineMatch?.[1]) {
      cardLines.push(...inlineMatch[1].split(',').map((s) => s.trim()).filter(Boolean));
    }
  }

  const astroMatch = prompt.match(/Güneş:\s*([^,\n]+).*?Ay:\s*([^,\n]+).*?Yükselen:\s*([^\n]+)/i);
  const astroLine = astroMatch
    ? `Güneş (${astroMatch[1].trim()}), Ay (${astroMatch[2].trim()}) ve Yükselen (${astroMatch[3].trim()})`
    : null;

  return { userName, intention, cardLines: cardLines.slice(0, 10), astroLine };
}

/**
 * Yüksek kaliteli Mistik Usul Stream (API Key olmadığında falı kesmeyen bağlam duyarlı akış)
 */
function createProceduralTarotStream(prompt: string, isChat = false): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const { userName, intention, cardLines, astroLine } = extractPromptDetails(prompt);
  const cardsText =
    cardLines.length > 0
      ? cardLines.join(', ')
      : 'masada açılan kadim arkana sembolleri';

  if (isChat) {
    const chatReplies = [
      `${userName}, gözlerimi ${cardsText} üzerine odakladığımda "${intention}" sorunun yankısı netleşiyor.\n\n`,
      `${astroLine ? `${astroLine} enerjisiyle birleşen bu açılım, ` : 'Masadaki kartların dizilimi, '}şu an bir karar eşiğinde durduğunu gösteriyor. Ters düşen etkiler varsa bunlar dışsal bir engel değil, zihnindeki kararsızlığı fark etmen için beliren işaretlerdir.\n\n`,
      `Önümüzdeki günlerde aceleci tepkiler yerine kartların işaret ettiği dengeyi koru; ilk somut işaret küçük ama net bir konuşma veya beklenmedik bir farkındalıkla gelecek.`,
    ];

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        for (const p of chatReplies) {
          const words = p.split(' ');
          for (const w of words) {
            controller.enqueue(encoder.encode(w + ' '));
            await new Promise((r) => setTimeout(r, 28));
          }
        }
        controller.close();
      },
    });
  }

  // İlk Fal Açılımı — kartlara ve astrolojiye dayalı
  const paragraphs = [
    `Perde aralandı ${userName}...\n\n`,
    `"${intention}" niyetiyle masaya bıraktığın enerji, ${cardsText} üzerinden güçlü bir diyalog kuruyor.${astroLine ? ` Doğum haritandaki ${astroLine} yerleşimi de bu sembollerin altını özellikle çiziyor.` : ''}\n\n`,
    `Kartların Aynasındaki Hikaye:\n${cardLines.length > 0 ? cardLines.map((c, i) => `${i + 1}. ${c}, bu süreçteki görünmeyen dinamiği açığa çıkarıyor.`).join(' ') : 'Çektiğin kartlar geçmişin izlerini bugünün iradesiyle buluşturuyor.'}\n\n`,
    `Yolun Rehberliği & Ritüel:\nÖnündeki dönemeçte zihninin gürültüsünü susturup kalbinin ilk verdiği sese güven. Bu akşam sessiz bir 5 dakika ayırıp niyetini tek bir cümlede netleştir; kartlar netlik kazandığın anda akışı hızlandıracaktır.\n\n`,
    `✦ Not: Gerçek zamanlı derin LLM yorumu için .env dosyasına GEMINI_API_KEY ekleyebilirsin.`,
  ];

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const p of paragraphs) {
        const words = p.split(' ');
        for (const w of words) {
          controller.enqueue(encoder.encode(w + ' '));
          await new Promise((r) => setTimeout(r, 28));
        }
      }
      controller.close();
    },
  });
}
