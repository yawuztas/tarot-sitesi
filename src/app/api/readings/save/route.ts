/**
 * Fal Kaydetme Endpoint
 *
 * POST /api/readings/save
 *
 * Bir fal tamamlandığında istemci tarafından çağrılır.
 * - Kullanıcı kayıtlıysa: Reading + ReadingCard oluşturur, AI'a summary
 *   çıkarttırır, astro bağlamını ve önceki fal bağlamını snapshot olarak saklar.
 * - Kullanıcı misafirse: sadece summary çıkartıp döner.
 *
 * Body:
 *   styleSlug, spreadSlug, intentionSlug?, intentionText?
 *   cards: [{ slug, isReversed, positionIndex }]
 *   seed, hash (provably-fair)
 *   interpretation: string (AI'ın ürettiği tam yorum)
 *   astroContextJson?: string (varsa)
 *
 * Yanıt:
 *   { ok, readingId?, summary, keyThemes, predictedArc }
 */

import { NextRequest, NextResponse } from 'next/server';
import { streamTarotInterpretation } from '@/lib/ai/gemini';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { MYSTIC_TAROT_SYSTEM_PROMPT, SUMMARY_EXTRACTION_PROMPT } from '@/lib/ai/prompt-builder';
import { applyRateLimit } from '@/lib/security/rate-limit';
import { assertSameOrigin, clampText, isValidSlug } from '@/lib/security/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SaveRequestBody {
  styleSlug: string;
  spreadSlug: string;
  intentionSlug?: string;
  intentionText?: string;
  cards: Array<{ slug: string; isReversed: boolean; positionIndex: number }>;
  seed: string;
  hash: string;
  interpretation: string;
  astroContextJson?: string;
}

export async function POST(req: NextRequest) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;

  const rateLimited = applyRateLimit(req, 'readings-save', { limit: 20, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  let body: SaveRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 });
  }

  if (
    !isValidSlug(body.styleSlug) ||
    !isValidSlug(body.spreadSlug) ||
    typeof body.interpretation !== 'string' ||
    !body.interpretation.trim() ||
    !Array.isArray(body.cards) ||
    body.cards.length === 0 ||
    body.cards.length > 10
  ) {
    return NextResponse.json({ error: 'Geçersiz veya eksik alan' }, { status: 400 });
  }

  body.interpretation = clampText(body.interpretation, 20000);
  body.intentionText = clampText(body.intentionText, 800) || undefined;
  body.seed = clampText(body.seed, 128);
  body.hash = clampText(body.hash, 128);
  if (body.astroContextJson) {
    body.astroContextJson = clampText(body.astroContextJson, 4000);
  }

  const user = await getCurrentUser();
  if (!user) {
    // Misafir kullanıcılar için veritabanı kaydı ve ekstra LLM özet çağrısı yapma
    return NextResponse.json({
      ok: true,
      savedToUser: false,
      summary: '',
      keyThemes: [],
      predictedArc: '',
    });
  }

  // Özet + tema + gelişim çizgisi çıkar (yalnızca kayıtlı kullanıcıda AI'a 2. çağrı)
  let summary = '';
  let keyThemes: string[] = [];
  let predictedArc = '';

  try {
    const stream = await streamTarotInterpretation({
      prompt: `${body.interpretation}\n\n${SUMMARY_EXTRACTION_PROMPT}`,
      systemInstruction: MYSTIC_TAROT_SYSTEM_PROMPT,
    });
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let summaryText = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      summaryText += decoder.decode(value, { stream: true });
    }

    // Formatı parse et
    const summaryMatch = summaryText.match(/\[ÖZET\]([\s\S]*?)(?=\[ANA TEMALAR\]|$)/);
    const themesMatch = summaryText.match(/\[ANA TEMALAR\]([\s\S]*?)(?=\[GELİŞİM ÇİZGİSİ\]|$)/);
    const arcMatch = summaryText.match(/\[GELİŞİM ÇİZGİSİ\]([\s\S]*?)$/);

    if (summaryMatch) summary = summaryMatch[1].trim();
    if (themesMatch) {
      keyThemes = themesMatch[1].split(/[,\n]/).map(t => t.trim()).filter(Boolean);
    }
    if (arcMatch) predictedArc = arcMatch[1].trim();
  } catch (err: any) {
    console.error('Summary extraction failed:', err);
    // Hata olursa bile kaydetmeye devam et
  }

  let readingId: string | undefined;

  if (user) {
    // Kayıtlı kullanıcı: DB'ye kaydet
    const [style, spread] = await Promise.all([
      db.tarotStyle.findUnique({ where: { slug: body.styleSlug } }),
      db.spread.findUnique({ where: { slug: body.spreadSlug } }),
    ]);

    if (!style || !spread) {
      return NextResponse.json({ error: 'Geçersiz stil/açılım' }, { status: 400 });
    }

    // Niyet kategorisi
    let intentionCategoryId: string | undefined;
    if (body.intentionSlug) {
      const cat = await db.intentionCategory.findUnique({ where: { slug: body.intentionSlug } });
      if (cat) intentionCategoryId = cat.id;
    }

    // Son 3 falı çek (previousReadingsContext için)
    const previousReadings = await db.reading.findMany({
      where: { userId: user.id, status: 'completed' },
      orderBy: { drawnAt: 'desc' },
      take: 3,
      select: {
        drawnAt: true,
        intentionText: true,
        aiSummaryTr: true,
        keyThemes: true,
        predictedArc: true,
        readingCards: {
          include: {
            card: { select: { nameTr: true } },
          },
        },
        intentionCategory: { select: { nameTr: true } },
      },
    });

    const previousContext = previousReadings
      .filter(r => r.aiSummaryTr)
      .map(r => ({
        drawnAt: r.drawnAt.toISOString(),
        intentionCategory: r.intentionCategory?.nameTr || 'Genel',
        intentionText: r.intentionText,
        cardsSummary: r.readingCards.map(rc => `${rc.card.nameTr} (${rc.isReversed ? 'ters' : 'düz'})`).join(', '),
        aiSummary: r.aiSummaryTr!,
        keyThemes: r.keyThemes ? JSON.parse(r.keyThemes) : [],
        predictedArc: r.predictedArc || '',
      }));

    // Reading row oluştur
    const reading = await db.reading.create({
      data: {
        userId: user.id,
        spreadId: spread.id,
        styleId: style.id,
        intentionCategoryId,
        intentionText: body.intentionText,
        rngSeed: body.seed,
        rngHash: body.hash,
        astroContextJson: body.astroContextJson || null,
        previousReadingsContext: previousContext.length > 0 ? JSON.stringify(previousContext) : null,
        aiInterpretation: body.interpretation,
        aiSummaryTr: summary || null,
        keyThemes: keyThemes.length > 0 ? JSON.stringify(keyThemes) : null,
        predictedArc: predictedArc || null,
        status: 'completed',
        completedAt: new Date(),
        isFreeReading: user.creditsBalance > 0,
      },
    });

    // ReadingCard'ları kaydet
    const cardDbPromises = body.cards.map(async (c, idx) => {
      const card = await db.card.findFirst({
        where: { styleId: style.id, slug: c.slug },
        select: { id: true },
      });
      if (!card) return null;
      return db.readingCard.create({
        data: {
          readingId: reading.id,
          cardId: card.id,
          positionIndex: c.positionIndex,
          isReversed: c.isReversed,
          drawOrder: idx,
        },
      });
    });

    await Promise.all(cardDbPromises);

    // User.totalReadingsCount + streak güncelle
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastActive = (await db.user.findUnique({ where: { id: user.id }, select: { lastActiveDate: true, currentStreak: true } }))!;
    const lastActiveDate = lastActive.lastActiveDate ? new Date(lastActive.lastActiveDate.getTime()) : null;
    if (lastActiveDate) lastActiveDate.setHours(0, 0, 0, 0);

    let newStreak = 1;
    if (lastActiveDate) {
      const diffDays = Math.floor((today.getTime() - lastActiveDate.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays === 0) {
        newStreak = lastActive.currentStreak; // aynı gün, streak korunsun
      } else if (diffDays === 1) {
        newStreak = lastActive.currentStreak + 1;
      } else {
        newStreak = 1; // streak bozuldu
      }
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        totalReadingsCount: { increment: 1 },
        freeReadingsUsed: { increment: 1 },
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, lastActive.currentStreak),
        lastActiveDate: today,
      },
    });

    readingId = reading.id;
  }

  return NextResponse.json({
    ok: true,
    readingId,
    savedToUser: !!user,
    summary,
    keyThemes,
    predictedArc,
  });
}
