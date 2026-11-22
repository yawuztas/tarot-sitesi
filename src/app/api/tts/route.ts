import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { applyRateLimit } from '@/lib/security/rate-limit';
import { assertSameOrigin, clampText } from '@/lib/security/validation';
import { getCurrentUser } from '@/lib/auth/session';
import { getCurrentSession, isSessionPaid } from '@/lib/session/anonymous-session';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Gemini TTS ham 16-bit PCM çıktısını tarayıcıların doğrudan çalabileceği
 * standart RIFF/WAV formatına sarmalar.
 */
function wrapPcmAsWav(pcmBytes: Buffer, sampleRate = 24000, channels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const dataSize = pcmBytes.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM subchunk size
  header.writeUInt16LE(1, 20); // AudioFormat = 1 (PCM)
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBytes]);
}

export async function POST(req: NextRequest) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;

  const rateLimited = applyRateLimit(req, 'ai-tts', { limit: 12, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
  }

  const rawText = clampText(body.text, 2000);
  if (!rawText) {
    return NextResponse.json({ error: 'Metin boş' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey === 'placeholder') {
    return NextResponse.json({ available: false, reason: 'no_api_key' }, { status: 200 });
  }

  // AI maliyet koruması: yalnızca giriş yapmış üyeler veya ödenmiş oturumlar Gemini TTS kullanır.
  // Misafirler ücretsiz tarayıcı speechSynthesis'e düşer.
  const currentUser = await getCurrentUser();
  const anonSession = currentUser ? null : await getCurrentSession();
  const guestHasAi = Boolean(anonSession && isSessionPaid(anonSession));
  if (!currentUser && !guestHasAi) {
    return NextResponse.json({ available: false, reason: 'auth_required' }, { status: 200 });
  }

  if (currentUser) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const DAILY_TTS_LIMIT = parseInt(process.env.AI_TTS_DAILY_LIMIT_PER_USER || '15', 10);
    const ttsToday = await db.aiCallLog.count({
      where: {
        userId: currentUser.id,
        provider: 'gemini-tts',
        createdAt: { gte: startOfDay },
      },
    });
    if (ttsToday >= DAILY_TTS_LIMIT) {
      return NextResponse.json({ available: false, reason: 'daily_limit' }, { status: 200 });
    }
  }

  const textToSpeak = rawText.slice(0, 1800);
  const preferredTtsModel = process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts';
  const ttsModels = Array.from(
    new Set([preferredTtsModel, 'gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-2.5-flash-preview-tts'])
  );

  try {
    const ai = new GoogleGenAI({ apiKey });
    for (const ttsModel of ttsModels) {
      try {
        const response = await ai.models.generateContent({
          model: ttsModel,
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Aoede',
                },
              },
            },
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Aşağıdaki Türkçe tarot kehanetini sakin, derin, bilge ve sıcak bir kahin tonuyla seslendir:\n\n${textToSpeak}`,
                },
              ],
            },
          ],
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        const audioPart = parts.find((p) => p.inlineData?.data);
        const base64Audio = audioPart?.inlineData?.data || response.data;
        const mimeType = audioPart?.inlineData?.mimeType || 'audio/wav';

        if (!base64Audio) continue;

        const audioBuffer = Buffer.from(base64Audio, 'base64');

        await db.aiCallLog
          .create({
            data: {
              userId: currentUser?.id ?? null,
              model: ttsModel,
              provider: 'gemini-tts',
              outputTokens: Math.ceil(textToSpeak.length / 3),
              cacheHit: false,
              success: true,
            },
          })
          .catch(() => {});

        // Eğer raw PCM (L16 / pcm) ise WAV header ekle
        if (mimeType.includes('L16') || mimeType.includes('pcm')) {
          const rateMatch = mimeType.match(/rate=(\d+)/i);
          const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
          const wavBuffer = wrapPcmAsWav(audioBuffer, sampleRate);
          return new NextResponse(new Uint8Array(wavBuffer), {
            status: 200,
            headers: {
              'Content-Type': 'audio/wav',
              'Cache-Control': 'no-store',
            },
          });
        }

        return new NextResponse(new Uint8Array(audioBuffer), {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Cache-Control': 'no-store',
          },
        });
      } catch (modelErr) {
        console.warn(`TTS model ${ttsModel} failed, trying fallback...`, modelErr);
      }
    }
    return NextResponse.json({ available: false, reason: 'empty_audio' }, { status: 200 });
  } catch (err) {
    console.warn('Gemini TTS fallback to browser speech:', err);
    return NextResponse.json({ available: false, reason: 'tts_error' }, { status: 200 });
  }
}
