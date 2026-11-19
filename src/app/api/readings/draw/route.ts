/**
 * Kart Çekme Endpoint
 *
 * Sunucu tarafında CSPRNG ile provably-fair kart çekimi yapar.
 * İstemci bu endpoint'i çağırır; sonuç kart listesi + pozisyonlar +
 * seed + hash içerir. İstemci manipülasyonuna kapalıdır.
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { drawCards, type TarotCard } from '@/lib/tarot/cards';
import { applyRateLimit } from '@/lib/security/rate-limit';
import { assertSameOrigin, isValidSlug } from '@/lib/security/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DrawRequestBody {
  styleSlug: string;     // "rider-waite" | "marseille"
  spreadSlug: string;    // "single" | "three-card" | "celtic-cross"
  seed?: string;         // opsiyonel — test için
}

interface DrawnCardResponse {
  slug: string;
  name: string;
  nameTr: string;
  arcanaType: string;
  suit: string | null;
  number: number;
  element: string | null;
  astrologicalCorrespondence: string | null;
  numerologyKey: string | null;
  keywordsUpright: string[];
  keywordsReversed: string[];
  meaningsUpright: string;
  meaningsReversed: string;
  imageUrlThumb: string | null;
  imageUrlSmall: string | null;
  imageUrlMedium: string | null;
  imageUrlLarge: string | null;
  imageUrlFull: string | null;
  // Çekim bilgileri
  isReversed: boolean;
  positionIndex: number;
  drawOrder: number;
}

interface DrawResponse {
  cards: DrawnCardResponse[];
  positions: Array<{
    positionIndex: number;
    label: string;
    labelTr: string;
    meaningTr: string | null;
  }>;
  seed: string;
  hash: string;
  spread: {
    slug: string;
    nameTr: string;
    name: string;
    cardCount: number;
  };
  style: {
    slug: string;
    nameTr: string;
    name: string;
  };
}

function parseArray(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;

  const rateLimited = applyRateLimit(req, 'readings-draw', { limit: 40, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  let body: DrawRequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Geçersiz istek gövdesi' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isValidSlug(body.styleSlug) || !isValidSlug(body.spreadSlug)) {
    return new Response(
      JSON.stringify({ error: 'Geçerli styleSlug ve spreadSlug zorunludur' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Paralel sorgu
  const [style, spread] = await Promise.all([
    db.tarotStyle.findUnique({ where: { slug: body.styleSlug } }),
    db.spread.findUnique({
      where: { slug: body.spreadSlug },
      include: { positions: { orderBy: { positionIndex: 'asc' } } },
    }),
  ]);

  if (!style) {
    return new Response(JSON.stringify({ error: 'Tarot stili bulunamadı' }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!spread) {
    return new Response(JSON.stringify({ error: 'Açılım bulunamadı' }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Destedeki tüm kartları çek
  const dbCards = await db.card.findMany({
    where: { styleId: style.id },
    orderBy: [{ arcanaType: 'asc' }, { suit: 'asc' }, { number: 'asc' }],
  });

  if (dbCards.length === 0) {
    return new Response(JSON.stringify({ error: 'Bu stilde kart bulunamadı' }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    });
  }

  // drawCards yardımcısına uygun formata dönüştür
  const deck: TarotCard[] = dbCards.map((c) => ({
    slug: c.slug,
    name: c.name,
    nameTr: c.nameTr,
    arcanaType: c.arcanaType as 'major' | 'minor',
    suit: (c.suit as any) ?? null,
    number: c.number,
    keywordsUpright: parseArray(c.keywordsUpright),
    keywordsReversed: parseArray(c.keywordsReversed),
    meaningsUpright: c.meaningsUpright,
    meaningsReversed: c.meaningsReversed,
    astrologicalCorrespondence: c.astrologicalCorrespondence ?? undefined,
    element: (c.element as any) ?? undefined,
    numerologyKey: c.numerologyKey ?? undefined,
  }));

  // CSPRNG ile çek (production ortamında istemciden seed kabul edilmez)
  const { drawn, seed, hash } = drawCards(deck, spread.cardCount, {
    allowReversed: true,
    seed: process.env.NODE_ENV === 'production' ? undefined : body.seed,
  });

  // DB'den görsel URL'lerini eşle
  const cardMap = new Map(dbCards.map((c) => [c.slug, c]));

  const cardsResponse: DrawnCardResponse[] = drawn.map((d) => {
    const dbCard = cardMap.get(d.card.slug)!;
    return {
      slug: dbCard.slug,
      name: dbCard.name,
      nameTr: dbCard.nameTr,
      arcanaType: dbCard.arcanaType,
      suit: dbCard.suit,
      number: dbCard.number,
      element: dbCard.element,
      astrologicalCorrespondence: dbCard.astrologicalCorrespondence,
      numerologyKey: dbCard.numerologyKey,
      keywordsUpright: parseArray(dbCard.keywordsUpright),
      keywordsReversed: parseArray(dbCard.keywordsReversed),
      meaningsUpright: dbCard.meaningsUpright,
      meaningsReversed: dbCard.meaningsReversed,
      imageUrlThumb: dbCard.imageUrlThumb,
      imageUrlSmall: dbCard.imageUrlSmall,
      imageUrlMedium: dbCard.imageUrlMedium,
      imageUrlLarge: dbCard.imageUrlLarge,
      imageUrlFull: dbCard.imageUrlFull,
      isReversed: d.isReversed,
      positionIndex: d.positionIndex,
      drawOrder: d.drawOrder,
    };
  });

  const response: DrawResponse = {
    cards: cardsResponse,
    positions: spread.positions.map((p) => ({
      positionIndex: p.positionIndex,
      label: p.label,
      labelTr: p.labelTr,
      meaningTr: p.meaningTr,
    })),
    seed,
    hash,
    spread: {
      slug: spread.slug,
      nameTr: spread.nameTr,
      name: spread.name,
      cardCount: spread.cardCount,
    },
    style: {
      slug: style.slug,
      nameTr: style.nameTr,
      name: style.name,
    },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
