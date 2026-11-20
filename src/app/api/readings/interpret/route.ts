/**
 * AI Yorum Streaming Endpoint
 *
 * İstemciden çekilen kartları, niyeti ve opsiyonel bağlamı alır;
 * mistik tarot promptunu inşa eder; z.ai SDK üzerinden SSE stream
 * olarak yorumu parça parça gönderir.
 *
 * Backend-only: z-ai-web-dev-sdk sunucu tarafında çalışır.
 */

import { createHash } from 'crypto';
import { NextRequest } from 'next/server';
import { streamTarotInterpretation, getActiveAiProvider } from '@/lib/ai/gemini';
import { db } from '@/lib/db';
import {
  buildReadingPrompt,
  MYSTIC_TAROT_SYSTEM_PROMPT,
  calculateLifeStage,
  type PromptCard,
  type PromptAstroContext,
  type PromptPreviousReading,
} from '@/lib/ai/prompt-builder';
import type { TarotCard } from '@/lib/tarot/cards';
import { getCurrentUser } from '@/lib/auth/session';
import {
  getCurrentSession,
  getRemainingQuestions,
  isSessionPaid,
  updateSession,
} from '@/lib/session/anonymous-session';
import { calculateCurrentTransits } from '@/lib/astrology/chart';
import { applyRateLimit } from '@/lib/security/rate-limit';
import { assertSameOrigin, clampText, isValidSlug } from '@/lib/security/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface InterpretRequestBody {
  styleSlug: string;        // "rider-waite" | "marseille"
  spreadSlug: string;       // "single" | "three-card" | "horseshoe" | "celtic-cross"
  intentionSlug?: string;   // "love" | "career" | ...
  intentionText?: string;   // kullanıcının serbest niyet metni
  cards: Array<{
    slug: string;
    isReversed: boolean;
    positionIndex: number;
  }>;
  userDisplayName?: string;
  birthDate?: string;       // e.g. "1990-05-15" - yaş ve hayat evresi tespiti için
  // Astro opsiyonel — istemciden geçirilmezse, kullanıcı kayıtlıysa DB'den alınır
  birthChartSnapshot?: BirthChartSnapshot;
  // Canlı kahin sohbeti için yapılandırılmış bağlam
  chatContext?: {
    question: string;
    pillarTitle?: string;
    initialReading?: string;
    history?: ChatHistoryMessage[];
  };
}

interface BirthChartSnapshot {
  sunSign?: string;
  sunSignFormatted?: string;
  moonSign?: string;
  moonSignFormatted?: string;
  ascendant?: string | null;
  ascendantFormatted?: string | null;
  narrative?: string;
}

/**
 * DB'den kart + pozisyon + niyet verisini çek ve PromptCard[] hazırla
 */
async function preparePromptCards(
  styleId: string,
  spreadId: string,
  cardInputs: InterpretRequestBody['cards']
): Promise<{ cards: PromptCard[]; spreadName?: string }> {
  // Açılım pozisyonlarını getir
  const spread = await db.spread.findUnique({
    where: { id: spreadId },
    include: {
      positions: { orderBy: { positionIndex: 'asc' } },
    },
  });

  // Kartları tek sorguda çek
  const slugs = cardInputs.map((c) => c.slug);
  let dbCards = await db.card.findMany({
    where: {
      styleId,
      slug: { in: slugs },
    },
  });

  if (dbCards.length === 0) {
    dbCards = await db.card.findMany({
      where: { styleId },
      take: Math.max(cardInputs.length, 3),
    });
  }

  // slug -> card haritası
  const cardMap = new Map<string, typeof dbCards[number]>();
  for (const c of dbCards) cardMap.set(c.slug, c);

  const cards: PromptCard[] = [];
  for (let idx = 0; idx < cardInputs.length; idx++) {
    const input = cardInputs[idx];
    const dbCard = cardMap.get(input.slug) || dbCards[idx % dbCards.length];
    if (!dbCard) continue;

    const position = spread?.positions.find(
      (p) => p.positionIndex === input.positionIndex
    );

    const card: TarotCard = {
      slug: dbCard.slug,
      name: dbCard.name,
      nameTr: dbCard.nameTr,
      arcanaType: dbCard.arcanaType as 'major' | 'minor',
      suit: (dbCard.suit as any) ?? null,
      number: dbCard.number,
      keywordsUpright: safeParseArray(dbCard.keywordsUpright),
      keywordsReversed: safeParseArray(dbCard.keywordsReversed),
      meaningsUpright: dbCard.meaningsUpright,
      meaningsReversed: dbCard.meaningsReversed,
      astrologicalCorrespondence: dbCard.astrologicalCorrespondence ?? undefined,
      element: (dbCard.element as any) ?? undefined,
      numerologyKey: dbCard.numerologyKey ?? undefined,
    };

    cards.push({
      card,
      isReversed: input.isReversed,
      positionIndex: input.positionIndex,
      positionLabel: position?.labelTr,
      positionMeaning: position?.meaningTr ?? undefined,
    });
  }

  return { cards, spreadName: spread?.nameTr };
}

function safeParseArray(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;

  const rateLimited = applyRateLimit(req, 'ai-interpret', { limit: 20, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  let body: InterpretRequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Geçersiz istek gövdesi' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validasyon & boyut sınırları
  if (
    !isValidSlug(body.styleSlug) ||
    !isValidSlug(body.spreadSlug) ||
    !Array.isArray(body.cards) ||
    body.cards.length === 0 ||
    body.cards.length > 10
  ) {
    return new Response(
      JSON.stringify({ error: 'Geçerli styleSlug, spreadSlug ve 1-10 arası cards zorunludur' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const sanitizedCards = body.cards
    .filter((c) => c && isValidSlug(c.slug, 80) && typeof c.positionIndex === 'number')
    .map((c) => ({
      slug: c.slug,
      isReversed: Boolean(c.isReversed),
      positionIndex: Math.max(0, Math.min(20, Math.floor(c.positionIndex))),
    }));

  if (sanitizedCards.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Geçerli kart verisi bulunamadı' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  body.cards = sanitizedCards;
  body.intentionText = clampText(body.intentionText, 800) || undefined;
  body.userDisplayName = clampText(body.userDisplayName, 60) || undefined;
  if (body.intentionSlug && !isValidSlug(body.intentionSlug)) {
    body.intentionSlug = undefined;
  }
  if (body.chatContext) {
    body.chatContext = {
      question: clampText(body.chatContext.question, 600),
      pillarTitle: clampText(body.chatContext.pillarTitle, 100) || undefined,
      initialReading: clampText(body.chatContext.initialReading, 2000) || undefined,
      history: Array.isArray(body.chatContext.history)
        ? body.chatContext.history
            .slice(-10)
            .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
            .map((m) => ({
              role: m.role,
              content: clampText(m.content, 1500),
            }))
        : undefined,
    };
  }

  // Stil ve açılımı çöz
  const [style, spread] = await Promise.all([
    db.tarotStyle.findUnique({ where: { slug: body.styleSlug } }),
    db.spread.findUnique({ where: { slug: body.spreadSlug } }),
  ]);

  if (!style || !spread) {
    return new Response(
      JSON.stringify({ error: 'Geçersiz tarot stili veya açılımı' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Niyet kategorisini çöz (opsiyonel)
  let intentionCategory: { nameTr: string; promptModifierTr: string } | undefined;
  if (body.intentionSlug) {
    const cat = await db.intentionCategory.findUnique({
      where: { slug: body.intentionSlug },
    });
    if (cat) {
      intentionCategory = {
        nameTr: cat.nameTr,
        promptModifierTr: cat.promptModifierTr,
      };
    }
  }

  // Prompt kartlarını hazırla
  const { cards: promptCards, spreadName } = await preparePromptCards(
    style.id,
    spread.id,
    body.cards
  );

  if (promptCards.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Kartlar bulunamadı' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // === ASTRO + PREVIOUS READING CONTEXT ===
  // Kayıtlı kullanıcı: DB'den natal chart + son 3 fal
  // Misafir: body'den gelen birthChartSnapshot (varsa)
  let astroContext: PromptAstroContext | undefined;
  let previousReadings: PromptPreviousReading[] | undefined;
  let userDisplayName = body.userDisplayName;

  const currentUser = await getCurrentUser();
  if (currentUser) {
    if (!userDisplayName) userDisplayName = currentUser.displayName || undefined;

    // Natal chart DB'den
    const dbUser = await db.user.findUnique({
      where: { id: currentUser.id },
      select: { natalChartJson: true, displayName: true },
    });

    if (dbUser?.natalChartJson) {
      try {
        const natalChart = JSON.parse(dbUser.natalChartJson);
        const transits = calculateCurrentTransits();
        astroContext = {
          natal: {
            sun: natalChart.sunSignFormatted || natalChart.sunSign,
            moon: natalChart.moonSignFormatted || natalChart.moonSign,
            ascendant: natalChart.ascendantFormatted || natalChart.ascendant || 'bilinmiyor',
          },
          transits: {
            date: transits.date,
            major_transits: transits.planets.map(p => ({
              planet: p.nameTr,
              sign: p.sign,
              degree: p.formatted.split(' ')[1] || '',
              note: p.isRetrograde ? 'geri hareket' : undefined,
            })),
          },
        };
      } catch (e) {
        console.error('Natal chart parse error:', e);
      }
    }

    // Son 3 fal
    const prevReadings = await db.reading.findMany({
      where: { userId: currentUser.id, status: 'completed' },
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

    if (prevReadings.length > 0) {
      previousReadings = prevReadings
        .filter(r => r.aiSummaryTr)
        .map(r => ({
          drawnAt: r.drawnAt.toISOString(),
          intentionCategory: r.intentionCategory?.nameTr || 'Genel',
          intentionText: r.intentionText || undefined,
          cardsSummary: r.readingCards.map(rc => `${rc.card.nameTr} (${rc.isReversed ? 'ters' : 'düz'})`).join(', '),
          aiSummary: r.aiSummaryTr!,
          keyThemes: r.keyThemes ? JSON.parse(r.keyThemes) : [],
          predictedArc: r.predictedArc || '',
        }))
        .reverse(); // en eski en önce
    }
  } else if (body.birthChartSnapshot) {
    // Misafir kullanıcı, anlık birth chart + anlık gökyüzü transitleri
    const transits = calculateCurrentTransits();
    astroContext = {
      natal: {
        sun: body.birthChartSnapshot.sunSignFormatted || body.birthChartSnapshot.sunSign || '',
        moon: body.birthChartSnapshot.moonSignFormatted || body.birthChartSnapshot.moonSign || '',
        ascendant: body.birthChartSnapshot.ascendantFormatted || body.birthChartSnapshot.ascendant || 'bilinmiyor',
      },
      transits: {
        date: transits.date,
        major_transits: transits.planets.map((p) => ({
          planet: p.nameTr,
          sign: p.sign,
          degree: p.formatted.split(' ')[1] || '',
          note: p.isRetrograde ? 'geri hareket' : undefined,
        })),
      },
    };
  }

  // Soru-Cevap sohbeti mi yoksa tam fal açılımı mı olduğunu belirle
  const isChatFollowup = Boolean(
    body.chatContext?.question || body.intentionText?.includes('[Mistik Kahin Sohbet Bağlamı:')
  );

  let finalPrompt = '';
  let finalSystemInstruction = MYSTIC_TAROT_SYSTEM_PROMPT;

  if (isChatFollowup) {
    const rawQuestion =
      body.chatContext?.question?.trim() ||
      body.intentionText?.split('\n\n[Mistik Kahin Sohbet Bağlamı:')[0] ||
      body.intentionText ||
      '';
    const cardsSummary = promptCards
      .map((c) => `${c.positionLabel || 'Kart'}: ${c.card.nameTr} (${c.isReversed ? 'Ters' : 'Düz'})`)
      .join(', ');
    const astroSummary = astroContext?.natal
      ? `Güneş: ${astroContext.natal.sun}, Ay: ${astroContext.natal.moon}, Yükselen: ${astroContext.natal.ascendant}`
      : 'Doğal Gökyüzü Enerjisi';
    const transitNote = astroContext?.transits?.major_transits?.length
      ? astroContext.transits.major_transits
          .slice(0, 5)
          .map((t) => `${t.planet} ${t.sign}${t.note ? ` (${t.note})` : ''}`)
          .join(', ')
      : '';
    const historyBlock = body.chatContext?.history?.length
      ? body.chatContext.history
          .slice(-8)
          .map((m) => `${m.role === 'user' ? userDisplayName || 'Yolcu' : 'Kahin'}: ${m.content}`)
          .join('\n\n')
      : '';
    const initialSummary = body.chatContext?.initialReading
      ? body.chatContext.initialReading.slice(0, 1400)
      : '';

    finalPrompt = `
KULLANICI: ${userDisplayName || 'Sevgili Yoldaş'}
${body.chatContext?.pillarTitle ? `SEÇİLEN ALAN: ${body.chatContext.pillarTitle}` : ''}
MASADA AÇIK OLAN KARTLAR: ${cardsSummary}
ASTROLOJİK BAĞLAM: ${astroSummary}
${transitNote ? `GÜNCEL GÖKYÜZÜ TRANSİTLERİ: ${transitNote}` : ''}
${initialSummary ? `\nİLK FAL YORUMU ÖZETİ:\n${initialSummary}` : ''}
${historyBlock ? `\nÖNCEKİ SOHBET GEÇMİŞİ:\n${historyBlock}` : ''}

KULLANICININ YENİ SORUSU: "${rawQuestion}"

GÖREV:
Sen kadim, sezgisel ve bilge bir Mistik Astro-Tarot Kahinisin.
Kullanıcının sorduğu "${rawQuestion}" sorusuna masadaki açık kartların enerjilerini, önceki sohbet akışını ve astrolojik sembolizmini harmanlayarak doğrudan, içten, samimi ve aydınlatıcı bir yanıt ver.
Yanıtın 2 veya 3 akıcı paragraf olsun. Asla genel kart tanıtımı yapma veya önceki yanıtını tekrar etme; doğrudan kullanıcının sorusuna odaklan ve masadaki kartların bu soruya ne yanıt verdiğini derin bir dille açıkla.
`.trim();

    finalSystemInstruction = `Sen bilge, sezgileri yüksek, kadim sembolleri kalbin diliyle konuşturan bir Astro-Tarot Kahinisin. Kullanıcıya "yoldaş" veya "sevgili yoldaş" diye hitap et. Yanıtların doğrudan kullanıcının sorusuna yönelik, samimi, şifalandırıcı, edebi ve pürüzsüz Türkçe olsun.`;
  } else {
    // Normal ilk fal açılımı
    const lifeStage = calculateLifeStage(body.birthDate);

    finalPrompt = buildReadingPrompt({
      cards: promptCards,
      spreadName,
      intentionText: body.intentionText,
      intentionCategory,
      astroContext,
      previousReadings,
      userDisplayName,
      birthDate: body.birthDate,
      lifeStage,
    });
  }

  // ============================================================
  // AI ERISIM POLITIKASI (maliyet korumasi)
  // ============================================================
  // Uye      : AI yorumu acilir, gunluk kota ile sinirlanir (AiCallLog sayaci,
  //            DB'de kalici - serverless instance'lar arasinda tutarlı)
  // Misafir  : yalnizca odeme yapmis oturum (isSessionPaid) ve kalan soru varsa AI
  // Digeri   : yerel prosedurel motor (forceLocal) -> AI maliyeti 0
  const DAILY_LIMIT = parseInt(process.env.AI_DAILY_LIMIT_PER_USER || '20', 10);

  const anonSession = currentUser ? null : await getCurrentSession();
  const guestHasAi = Boolean(
    anonSession && isSessionPaid(anonSession) && getRemainingQuestions(anonSession) > 0
  );

  let allowAi = false;
  let dailyCount = 0;

  if (currentUser) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    dailyCount = await db.aiCallLog.count({
      where: { userId: currentUser.id, createdAt: { gte: startOfDay } },
    });
    allowAi = dailyCount < DAILY_LIMIT;
    if (!allowAi) {
      return new Response(
        JSON.stringify({
          error: `Gunluk AI yorum hakkin doldu (${DAILY_LIMIT}). Yarın tekrar dene veya bir kredi paketi al.`,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } else {
    allowAi = guestHasAi;
  }

  // ============================================================
  // YORUM CACHE (ayni prompt -> AI tekrar cagrilmaz)
  // ============================================================
  const cacheKey = createHash('sha256')
    .update(`${finalSystemInstruction}\n---\n${finalPrompt}`)
    .digest('hex');

  const streamHeaders = {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  };

  if (allowAi) {
    try {
      const cached = await db.interpretationCache.findFirst({
        where: { cacheKey, expiresAt: { gt: new Date() } },
      });
      if (cached) {
        const payload = JSON.parse(cached.responsePayload) as { text?: string };
        if (payload?.text) {
          // Cache HIT: AI cagrisi yapilmaz, maliyet 0
          await db.aiCallLog
            .create({
              data: {
                userId: currentUser?.id ?? null,
                model: 'cache',
                provider: 'cache',
                outputTokens: Math.ceil(payload.text.length / 3),
                cacheHit: true,
                success: true,
              },
            })
            .catch(() => {});
          return new Response(payload.text, { headers: streamHeaders });
        }
      }
    } catch (e) {
      console.warn('Interpretation cache okunamadigi icin AI ile devam:', e);
    }
  }

  // AI API ile mistik yorum stream'ini baslat (Gemini / GLM / MiniMax)
  // forceLocal=true ise hicbir AI saglayicisina gidilmez.
  const textStream = await streamTarotInterpretation({
    prompt: finalPrompt,
    systemInstruction: finalSystemInstruction,
    isChat: isChatFollowup,
    forceLocal: !allowAi,
  });

  const providerInfo = getActiveAiProvider();
  const startedAt = Date.now();

  // Stream sarmalayici: metni toplar, bitince cache + AiCallLog yazar.
  const wrappedStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = textStream.getReader();
      let fullText = '';
      let succeeded = true;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += new TextDecoder().decode(value);
          controller.enqueue(value);
        }
        await controller.close();
      } catch (err) {
        succeeded = false;
        console.error('AI stream hatasi:', err);
        controller.error(err);
      }

      // Akis bittikten sonra: cache + kullanici sayaci (hatalar akisi bozmaz)
      if (allowAi) {
        try {
          if (succeeded && fullText.length > 200) {
            await db.interpretationCache.upsert({
              where: { cacheKey },
              create: {
                cacheKey,
                responsePayload: JSON.stringify({ text: fullText }),
                model: providerInfo.model,
                tokenCount: Math.ceil(fullText.length / 3),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
              update: {
                responsePayload: JSON.stringify({ text: fullText }),
                model: providerInfo.model,
                tokenCount: Math.ceil(fullText.length / 3),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            });
          }

          await db.aiCallLog.create({
            data: {
              userId: currentUser?.id ?? null,
              model: providerInfo.model,
              provider: providerInfo.provider,
              outputTokens: Math.ceil(fullText.length / 3),
              latencyMs: Date.now() - startedAt,
              cacheHit: false,
              success: succeeded,
              errorMessage: succeeded ? null : 'stream error',
            },
          });

          // Misafir: odeme yapilmis oturumun soru kotasini azalt
          if (anonSession && succeeded) {
            await updateSession(anonSession.id, {
              questionsUsed: { increment: 1 },
            }).catch(() => {});
          }
        } catch (e) {
          console.warn('AI post-processing (cache / log / kota) basarisiz:', e);
        }
      }
    },
  });

  return new Response(wrappedStream, {
    headers: streamHeaders,
  });
}
