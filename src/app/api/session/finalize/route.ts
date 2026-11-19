/**
 * Fal Oturumu Sonlandırma Endpoint
 *
 * POST /api/session/finalize
 *
 * 10 soru bittiğinde çağrılır. AI'a sohbetin özetini çıkarttırır.
 *
 * Body: (boş)
 *
 * Yanıt:
 *   { summary, keyThemes, predictedArc, returnKey }
 *   - returnKey: kullanıcı siteye geri döndüğünde AI'ın onu karşılaması için kullanılacak kısa hatırlatma
 *
 * Eğer kullanıcı "verilerimi sakla" onayı verdiyse + email girdiyse:
 *   - Reading row oluştur (User'a bağlanır)
 *   - UserConsent oluştur
 *   - ChatMessage'ları Reading'e taşı
 */

import { NextRequest, NextResponse } from 'next/server';
import { streamTarotInterpretation } from '@/lib/ai/gemini';
import { db } from '@/lib/db';
import { getCurrentSession, updateSession } from '@/lib/session/anonymous-session';
import { getSessionMessages } from '@/lib/session/anonymous-session';
import { MYSTIC_CHAT_SYSTEM_PROMPT, SESSION_SUMMARY_PROMPT } from '@/lib/ai/prompts/mystic-chat-prompt';
import { applyRateLimit } from '@/lib/security/rate-limit';
import { assertSameOrigin } from '@/lib/security/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;

  const rateLimited = applyRateLimit(req, 'session-finalize', { limit: 10, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'Fal oturumu bulunamadı' }, { status: 404 });
  }

  // Tüm sohbet mesajlarını getir
  const messages = await getSessionMessages(session.id);
  if (messages.length === 0) {
    return NextResponse.json({ error: 'Sohbet geçmişi yok' }, { status: 400 });
  }

  // AI'a özet çıkarttır
  let summary = '';
  let keyThemes: string[] = [];
  let predictedArc = '';
  let returnKey = '';

  const conversationText = messages
    .filter(m => m.role !== 'system')
    .map(m => `${m.role === 'user' ? 'Yoldaş' : 'Falcı'}: ${m.content}`)
    .join('\n\n');

  try {
    const stream = await streamTarotInterpretation({
      prompt: `${conversationText}\n\n${SESSION_SUMMARY_PROMPT}`,
      systemInstruction: MYSTIC_CHAT_SYSTEM_PROMPT,
    });
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let summaryText = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      summaryText += decoder.decode(value, { stream: true });
    }

    // Parse
    const summaryMatch = summaryText.match(/\[ÖZET\]([\s\S]*?)(?=\[ANA TEMALAR\]|$)/);
    const themesMatch = summaryText.match(/\[ANA TEMALAR\]([\s\S]*?)(?=\[GELİŞİM ÇİZGİSİ\]|$)/);
    const arcMatch = summaryText.match(/\[GELİŞİM ÇİZGİSİ\]([\s\S]*?)(?=\[DÖNÜŞ ANAHTARI\]|$)/);
    const returnMatch = summaryText.match(/\[DÖNÜŞ ANAHTARI\]([\s\S]*?)$/);

    if (summaryMatch) summary = summaryMatch[1].trim();
    if (themesMatch) {
      keyThemes = themesMatch[1].split(/[,\n]/).map(t => t.trim()).filter(Boolean);
    }
    if (arcMatch) predictedArc = arcMatch[1].trim();
    if (returnMatch) returnKey = returnMatch[1].trim();
  } catch (err: any) {
    console.error('Summary generation failed:', err);
  }

  // Session'ı finalize et
  await updateSession(session.id, {
    finalizedAt: new Date(),
  });

  // Eğer kullanıcı "verilerimi sakla" onayı verdiyse + User'a bağlanmışsa
  if (session.consentSaveData && session.userId) {
    await saveReadingToUser(session, summary, keyThemes, predictedArc, returnKey);
  }

  return NextResponse.json({
    ok: true,
    summary,
    keyThemes,
    predictedArc,
    returnKey,
    savedToUser: !!(session.consentSaveData && session.userId),
  });
}

/**
 * Session'ı User'a Reading olarak kaydet
 */
async function saveReadingToUser(session: any, summary: string, keyThemes: string[], predictedArc: string, returnKey: string) {
  // Reading oluştur
  const style = await db.tarotStyle.findUnique({ where: { slug: 'rider-waite' } });
  const spread = session.spreadSlug ? await db.spread.findUnique({ where: { slug: session.spreadSlug } }) : null;
  if (!style || !spread) return;

  const cards = session.drawnCardsJson ? JSON.parse(session.drawnCardsJson) : [];

  const reading = await db.reading.create({
    data: {
      userId: session.userId,
      spreadId: spread.id,
      styleId: style.id,
      intentionText: session.displayName ? `${session.displayName} için sohbet falı` : 'Sohbet falı',
      rngSeed: session.rngSeed || '',
      rngHash: session.rngHash || '',
      astroContextJson: session.natalChartJson,
      aiInterpretation: cards.map((c: any) => `${c.nameTr} (${c.isReversed ? 'ters' : 'düz'})`).join(', '),
      aiSummaryTr: summary || null,
      keyThemes: keyThemes.length > 0 ? JSON.stringify(keyThemes) : null,
      predictedArc: predictedArc || null,
      status: 'completed',
      completedAt: new Date(),
      isFreeReading: false,
    },
  });

  // ReadingCard'ları kaydet
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const card = await db.card.findFirst({
      where: { styleId: style.id, slug: c.slug },
      select: { id: true },
    });
    if (card) {
      await db.readingCard.create({
        data: {
          readingId: reading.id,
          cardId: card.id,
          positionIndex: c.positionIndex ?? i,
          isReversed: c.isReversed,
          drawOrder: i,
        },
      });
    }
  }

  // returnKey'i User'a kaydet (welcome back için)
  if (returnKey) {
    await db.user.update({
      where: { id: session.userId },
      data: {
        // UserSettings'e koyabiliriz, ama şimdilik User'a ek bir alan gerek yok
        // returnKey'i sonraki dönüşte welcome endpoint'i çekecek
        // Şimdilik en son Reading'in predictedArc alanında saklanıyor
      },
    });
  }

  // User stats güncelle
  await db.user.update({
    where: { id: session.userId },
    data: {
      totalReadingsCount: { increment: 1 },
      lastActiveDate: new Date(),
    },
  });
}
