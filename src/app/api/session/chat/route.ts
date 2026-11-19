/**
 * Fal Sohbeti Endpoint
 *
 * POST /api/session/chat
 *
 * Body:
 *   message: string (kullanıcının sorusu)
 *
 * 1. Mevcut session'ı getir (cookie)
 * 2. Ödenmiş mi + kalan soru var mı kontrol et
 * 3. AI'a system prompt (birth chart + kartlar + önceki sohbet) + yeni soru gönder
 * 4. SSE stream olarak yanıtı döndür
 * 5. questionsUsed'i artır
 *
 * Yanıt:
 *   text/plain SSE stream (yanıt parçaları)
 *   Header: X-Question-Number, X-Remaining-Questions
 */

import { NextRequest, NextResponse } from 'next/server';
import { streamTarotInterpretation } from '@/lib/ai/gemini';
import { db } from '@/lib/db';
import { getCurrentSession, updateSession, addChatMessage, getSessionMessages, getRemainingQuestions, isSessionPaid } from '@/lib/session/anonymous-session';
import { MYSTIC_CHAT_SYSTEM_PROMPT } from '@/lib/ai/prompts/mystic-chat-prompt';
import { calculateDailyTransits, getTransitSummaryForPrompt } from '@/lib/astrology/transits';
import { applyRateLimit } from '@/lib/security/rate-limit';
import { assertSameOrigin, clampText } from '@/lib/security/validation';

const TRANSIT_PHASE_MEANINGS: Record<string, Record<string, string>> = {
  applying: {
    conjunction: 'Etki yoğunlaşıyor, olaylar yaklaşıyor. Bu süreç henüz zirvesine ulaşmadı, hazırlık yap.',
    sextile: 'Fırsat kapısı açılmak üzere. Henüz tam açık değil ama enerji hareketleniyor.',
    square: 'Gerilim artıyor. Zorlayıcı enerji henüz zirvede değil ama yaklaşıyor. Dikkatli ol.',
    trine: 'Destekleyici enerji akıyor. Kolaylaşma süreci başladı, akışa bırak.',
    opposition: 'Karşıtlık derinleşiyor. Dengesizlik artıyor, taraf seçme zamanı yaklaşıyor.',
  },
  exact: {
    conjunction: 'Zirve! Bu etki şu an en güçlü halinde. Kararlar, olaylar, dönüşümler şu an gerçekleşiyor.',
    sextile: 'Fırsat zirvesinde. Kapı şu an en açık halinde, harekete geç.',
    square: 'Gerilim zirvesinde. Zorlu enerji şu an dorukta. Sabır ve direnç gerektiriyor.',
    trine: 'Destek zirvesinde. Akış şu an en kolay halinde. İlerle, engel yok.',
    opposition: 'Karşıtlık zirvesinde. Denge şu an en hassas noktada. Uzlaşma ya da ayrışma zamanı.',
  },
  separating: {
    conjunction: 'Etki azalıyor, olaylar geride kalıyor. Dersler çıkar, entegre et.',
    sextile: 'Fırsat kapanıyor. Artık hareket etme zamanı değil, değerlendirme zamanı.',
    square: 'Gerilim gevşiyor. Zorlu süreç geride kalıyor, toparlanma başlıyor.',
    trine: 'Destek hafifliyor. Kolaylık azalıyor, kendi gücünle ilerleme zamanı.',
    opposition: 'Karşıtlık çözülüyor. Denge yeniden kuruluyor, uzlaşma mümkün.',
  },
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatRequestBody {
  message: string;
}

export async function POST(req: NextRequest) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;

  const rateLimited = applyRateLimit(req, 'session-chat', { limit: 20, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 });
  }

  const cleanMessage = clampText(body.message, 800);
  if (!cleanMessage) {
    return NextResponse.json({ error: 'Soru boş olamaz' }, { status: 400 });
  }
  body.message = cleanMessage;

  // 1. Session kontrolü
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'Fal oturumu bulunamadı. Lütfen baştan başla.' }, { status: 404 });
  }

  // 2. Kalan soru kontrolü (10 Soru Kotası)
  const remaining = getRemainingQuestions(session);
  if (remaining <= 0) {
    return NextResponse.json({ error: '10 soru hakkın tamamlandı. Yeni bir açılım başlatabilirsin.' }, { status: 403 });
  }

  // 4. Question number
  const questionNumber = (session.questionsUsed || 0) + 1;

  // 5. Kullanıcının mesajını kaydet
  await addChatMessage(session.id, 'user', body.message.trim(), questionNumber);

  // 6. Sohbet geçmişini getir (son 20 mesaj)
  const messages = await getSessionMessages(session.id);

  // 7. AI'a gönderilecek mesaj listesi hazırla
  // - İlk system mesajı: doğum haritası + kartlar
  // - Sonra sohbet geçmişi (user + assistant)
  // - Son olarak: güncel transitler + fal serisi bağlamı + yeni soru

  const aiMessages: any[] = [];

  // 7a. Ana system prompt
  aiMessages.push({ role: 'assistant', content: MYSTIC_CHAT_SYSTEM_PROMPT });

  // 7b. Session system context (birth chart + kartlar)
  const systemContextMessage = messages.find(m => m.role === 'system');
  if (systemContextMessage) {
    aiMessages.push({ role: 'user', content: systemContextMessage.content });
  }

  // 7c. Güncel transitler + (varsa) önceki fal bağlamı
  const todayContext = await buildTodayContext(session);
  if (todayContext) {
    aiMessages.push({ role: 'user', content: todayContext });
  }

  // 7d. Sohbet geçmişi (system mesajlar hariç, son 20)
  const conversationMessages = messages.filter(m => m.role !== 'system').slice(-20);
  for (const msg of conversationMessages) {
    aiMessages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }

  // 8. Gemini AI stream başlat
  const promptText = aiMessages.map(m => `${m.role === 'user' ? 'Yolcu' : 'Kahin'}: ${m.content}`).join('\n\n');
  const baseStream = await streamTarotInterpretation({
    prompt: promptText,
    systemInstruction: MYSTIC_CHAT_SYSTEM_PROMPT,
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let accumulatedResponse = '';

  const transformedStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = baseStream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulatedResponse += chunk;
          controller.enqueue(value);
        }

        // AI yanıtını DB'ye kaydet
        if (accumulatedResponse) {
          await addChatMessage(session.id, 'assistant', accumulatedResponse, questionNumber);
          await updateSession(session.id, {
            questionsUsed: questionNumber,
          });
        }

        controller.close();
      } catch (err) {
        console.error('Chat stream error:', err);
        controller.error(err);
      }
    },
    cancel() {
      // İstemci bağlantıyı kesti
    },
  });

  // Header'larda kalan soru sayısını belirt
  const newRemaining = remaining - 1;
  return new Response(transformedStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Question-Number': String(questionNumber),
      'X-Remaining-Questions': String(newRemaining),
    },
  });
}

/**
 * Güncel transitler + (varsa) önceki fal bağlamını içeren metin
 */
async function buildTodayContext(session: any): Promise<string | null> {
  const parts: string[] = [];

  // Güncel transitler - kişiselleştirilmiş
  try {
    if (session.natalChartJson) {
      const birthChart = JSON.parse(session.natalChartJson);
      const transitReport = calculateDailyTransits(birthChart);
      
      parts.push('# BUGÜNKÜ GÖKYÜZÜ ETKİLERİ (' + new Date().toLocaleDateString('tr-TR') + ')');
      parts.push(transitReport.overallTheme);
      
      if (transitReport.retrogradePlanets.length > 0) {
        parts.push(`\nRetrograde gezegenler: ${transitReport.retrogradePlanets.join(', ')}`);
      }
      
      if (transitReport.significantTransits.length > 0) {
        parts.push('\nAktif transitler:');
        transitReport.significantTransits.slice(0, 5).forEach(t => {
          const phaseKey = t.phase === 'Yaklaşıyor' ? 'applying' : t.phase === 'Tam' ? 'exact' : 'separating';
          const aspectKey = t.aspectType === 'Konjunksiyon' ? 'conjunction' : t.aspectType === 'Sekstil' ? 'sextile' : t.aspectType === 'Kare' ? 'square' : t.aspectType === 'Üçgen' ? 'trine' : 'opposition';
          const phaseMeaning = TRANSIT_PHASE_MEANINGS[phaseKey]?.[aspectKey] || '';
          
          parts.push(`- ${t.transitingBodyTr} ${t.transitSignTr} burcunda → ${t.aspectTypeTr} ${t.natalPointTr} (${t.phaseTr}, %${t.strength} güç${t.isRetrograde ? ', retrograde' : ''})`);
          if (phaseMeaning) {
            parts.push(`  Faz yorumu: ${phaseMeaning}`);
          }
          if (t.natalHouse) {
            parts.push(`  Doğum evi: ${t.natalHouse}. ev — ${t.houseMeaning}`);
          }
          parts.push(`  Etki: ${t.interpretation}`);
          t.areaEffects.forEach(ae => {
            parts.push(`  ${ae.areaTr}: ${ae.effect}`);
          });
        });

        parts.push('\n## GÜNLÜK ALAN YORUMLARI');
        const f = transitReport.areaForecasts;
        parts.push(`AŞK: ${f.ask.summary}`);
        parts.push(`İŞ: ${f.is.summary}`);
        parts.push(`PARA: ${f.para.summary}`);
        parts.push(`SAĞLIK: ${f.saglik.summary}`);
        parts.push('\nKullanıcının sorusu hangi alansa o bölümü kullan: aşk/sevgi/ilişki/evlilik → AŞK; iş/kariyer/proje/iş başvurusu → İŞ; para/parasal/maaş/borç/yatırım → PARA; sağlık/hastalık/enerji/yorgunluk → SAĞLIK.');
      }

      parts.push(`\nAy burcu: ${transitReport.moonSign}`);
    }
  } catch (e) {
    console.error('Transit calc failed:', e);
  }

  // Önceki fal bağlamı (kullanıcı kayıtlıysa)
  if (session.userId) {
    try {
      const previousReadings = await db.reading.findMany({
        where: { userId: session.userId, status: 'completed' },
        orderBy: { drawnAt: 'desc' },
        take: 3,
        select: {
          drawnAt: true,
          intentionText: true,
          aiSummaryTr: true,
          keyThemes: true,
          predictedArc: true,
          intentionCategory: { select: { nameTr: true } },
          readingCards: { include: { card: { select: { nameTr: true } } } },
        },
      });

      if (previousReadings.length > 0) {
        parts.push('\n# ÖNCEKİ FAL ÖZETLERİ (son ' + previousReadings.length + ' fal — SADECE tema takibi için, kart yorumu İÇİN DEĞİL)');
        previousReadings.forEach((r, idx) => {
          const date = new Date(r.drawnAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
          parts.push(`\nFal ${idx + 1} (${date}):`);
          if (r.intentionText) parts.push(`  Soru: "${r.intentionText}"`);
          if (r.aiSummaryTr) parts.push(`  Özet: ${r.aiSummaryTr}`);
          if (r.keyThemes) {
            try {
              const themes = JSON.parse(r.keyThemes);
              parts.push(`  Temalar: ${themes.join(', ')}`);
            } catch {}
          }
        });

        parts.push('\nFal serisi takibi: Aynı tema tekrar ediyorsa belirt, ama kart yorumları için YUKARIDAKİ ÇEKİLEN KARTLARI kullan.');
      }
    } catch (e) {
      console.error('Previous readings fetch failed:', e);
    }
  }

  const result = parts.join('\n');
  return result || null;
}

function singleChunkStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      if (text) controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}
