/**
 * Fal Oturumu Başlatma Endpoint
 *
 * POST /api/session/start
 *
 * Body:
 *   displayName: string
 *   birthDate: string (YYYY-MM-DD)
 *   birthTime?: string (HH:MM)
 *   birthTimeUnknown: boolean
 *   birthCity: string
 *   spreadSlug: string (single | three-card | celtic-cross)
 *
 * 1. Anonim session oluşturur (cookie)
 * 2. Birth chart hesaplar
 * 3. Provably-fair kart çeker
 * 4. AI'a teaser ürettirir (2-3 cümlelik)
 * 5. Session'a kaydeder
 * 6. Teaser döner (falın tamamı için ödeme gerekli)
 *
 * Yanıt:
 *   { sessionId, teaser, cards: [...], spread, birthChartSummary }
 */

import { NextRequest, NextResponse } from 'next/server';
import { streamTarotInterpretation } from '@/lib/ai/gemini';
import { db } from '@/lib/db';
import { getOrCreateSession, updateSession, addChatMessage } from '@/lib/session/anonymous-session';
import { drawCards } from '@/lib/tarot/cards';
import { calculateBirthChart, calculateProgressedChart } from '@/lib/astrology/chart';
import { generateAstrologyProfile } from '@/lib/astrology/user-profile';
import { findCityByName } from '@/lib/astrology/turkish-cities';
import { getElementalDignitiesPrompt } from '@/lib/tarot/elemental-dignities';
import { TEASER_PROMPT, MYSTIC_CHAT_SYSTEM_PROMPT } from '@/lib/ai/prompts/mystic-chat-prompt';
import { applyRateLimit } from '@/lib/security/rate-limit';
import { assertSameOrigin, clampText, isValidSlug } from '@/lib/security/validation';

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
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface StartRequestBody {
  displayName?: string;
  birthDate: string;
  birthTime?: string;
  birthTimeUnknown?: boolean;
  birthCity: string;
  spreadSlug: string;
}

function parseBirthDateTime(dateStr: string, timeStr?: string): Date {
  // Türkiye UTC+3
  if (timeStr && /^\d{2}:\d{2}$/.test(timeStr)) {
    const [h, m] = timeStr.split(':').map(Number);
    const utcHour = (h - 3 + 24) % 24;
    return new Date(`${dateStr}T${utcHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00Z`);
  }
  return new Date(`${dateStr}T12:00:00Z`);
}

export async function POST(req: NextRequest) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;

  const rateLimited = applyRateLimit(req, 'session-start', { limit: 15, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  let body: StartRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 });
  }

  body.displayName = clampText(body.displayName, 60) || undefined;
  const spreadSlug = isValidSlug(body.spreadSlug) ? body.spreadSlug : 'three-card';

  // Validasyon
  if (!body.birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.birthDate)) {
    return NextResponse.json({ error: 'Doğum tarihi gerekli (YYYY-MM-DD)' }, { status: 400 });
  }
  const birthTimeUnknown = body.birthTimeUnknown === true || !body.birthTime;
  if (!birthTimeUnknown && body.birthTime && !/^\d{2}:\d{2}$/.test(body.birthTime)) {
    return NextResponse.json({ error: 'Saat formatı HH:MM olmalı' }, { status: 400 });
  }
  const city = findCityByName(clampText(body.birthCity, 60));
  if (!city) {
    return NextResponse.json({ error: 'Bilinmeyen şehir' }, { status: 400 });
  }

  const [style, spread] = await Promise.all([
    db.tarotStyle.findUnique({ where: { slug: 'rider-waite' } }),
    db.spread.findUnique({
      where: { slug: spreadSlug },
      include: { positions: { orderBy: { positionIndex: 'asc' } } },
    }),
  ]);
  if (!style || !spread) {
    return NextResponse.json({ error: 'Geçersiz açılım' }, { status: 400 });
  }

  // 1. Session
  const { session } = await getOrCreateSession();

  // 2. Birth chart
  const birthDate = parseBirthDateTime(body.birthDate, birthTimeUnknown ? undefined : body.birthTime);
  const birthChart = calculateBirthChart({
    birthDate,
    birthTimeUnknown,
    birthLat: city.lat,
    birthLng: city.lng,
    birthPlaceName: city.name,
  });

  const astrologyProfile = generateAstrologyProfile(birthChart);

  // 3. Provably-fair kart çekimi
  const seed = crypto.randomBytes(32).toString('hex');

  // DB'den o stildeki tüm kartları çek (deck olarak)
  const allCards = await db.card.findMany({
    where: { styleId: style.id },
  });
  const cardDeck = allCards.map(c => ({
    slug: c.slug,
    name: c.name,
    nameTr: c.nameTr,
    number: c.number,
    arcanaType: c.arcanaType as any,
    suit: c.suit as any,
    element: c.element as any,
    astrologicalCorrespondence: c.astrologicalCorrespondence,
    keywordsUpright: c.keywordsUpright ? JSON.parse(c.keywordsUpright) : [],
    keywordsReversed: c.keywordsReversed ? JSON.parse(c.keywordsReversed) : [],
    meaningsUpright: c.meaningsUpright,
    meaningsReversed: c.meaningsReversed,
    numerologyKey: c.numerologyKey,
    imageUrlThumb: c.imageUrlThumb,
    imageUrlSmall: c.imageUrlSmall,
    imageUrlMedium: c.imageUrlMedium,
    imageUrlLarge: c.imageUrlLarge,
    imageUrlFull: c.imageUrlFull,
  }));

  const { drawn: drawnCards, hash } = drawCards(cardDeck as any, spread.cardCount, { seed });

  // Kartları pozisyonlarla eşleştir
  const cardsWithDetails = drawnCards.map((dc, i) => {
    const position = spread.positions[i];
    const keywords = dc.isReversed ? dc.card.keywordsReversed : dc.card.keywordsUpright;
    const meaning = dc.isReversed ? dc.card.meaningsReversed : dc.card.meaningsUpright;
    return {
      slug: dc.card.slug,
      name: dc.card.name,
      nameTr: dc.card.nameTr,
      arcanaType: dc.card.arcanaType,
      suit: dc.card.suit,
      element: dc.card.element,
      astrologicalCorrespondence: dc.card.astrologicalCorrespondence,
      keywords,
      meaning,
      isReversed: dc.isReversed,
      positionIndex: i,
      positionLabel: position?.labelTr,
      positionMeaning: position?.meaningTr,
    };
  });

  // 4. AI teaser üret
  let teaser = '';
  try {
    const teaserContext = buildTeaserContext({
      displayName: body.displayName,
      birthChart,
      cards: cardsWithDetails,
      spreadName: spread.nameTr,
    });

    const stream = await streamTarotInterpretation({
      prompt: teaserContext,
      systemInstruction: MYSTIC_CHAT_SYSTEM_PROMPT + '\n\n' + TEASER_PROMPT,
    });
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      teaser += decoder.decode(value, { stream: true });
    }
    teaser = teaser.trim();
  } catch (err: any) {
    console.error('Teaser generation failed:', err);
    teaser = `Sevgili ${body.displayName || 'yoldaş'}, ${birthChart.sunSignFormatted || ''} Güneşi ve kartlarının enerjisi birleşti; perde aralanıyor...`;
  }

  // 5. Session'a kaydet
  await updateSession(session.id, {
    displayName: body.displayName,
    birthDate,
    birthTime: birthTimeUnknown ? null : body.birthTime,
    birthTimeUnknown,
    birthPlaceName: city.name,
    birthLat: city.lat,
    birthLng: city.lng,
    natalChartJson: JSON.stringify(birthChart),
    spreadSlug: spread.slug,
    drawnCardsJson: JSON.stringify(cardsWithDetails),
    rngSeed: seed,
    rngHash: hash,
    teaserText: teaser,
  });

  // System mesajı kaydet (chat history için)
  await addChatMessage(session.id, 'system', buildChatSystemContext({
    displayName: body.displayName,
    birthChart,
    astrologyProfile,
    cards: cardsWithDetails,
    spreadName: spread.nameTr,
  }));

  // 6. Yanıt
  return NextResponse.json({
    sessionId: session.id,
    teaser,
    spread: {
      slug: spread.slug,
      nameTr: spread.nameTr,
      cardCount: spread.cardCount,
    },
    birthChartSummary: {
      sunSign: birthChart.sunSign,
      sunSignFormatted: birthChart.sunSignFormatted,
      moonSign: birthChart.moonSign,
      moonSignFormatted: birthChart.moonSignFormatted,
      ascendant: birthChart.ascendant,
      ascendantFormatted: birthChart.ascendantFormatted,
      birthTimeUnknown: birthChart.birthTimeUnknown,
      birthPlaceName: birthChart.birthPlaceName,
    },
    astrologyProfile: {
      dominantElement: astrologyProfile.dominantElement,
      dominantQuality: astrologyProfile.dominantQuality,
      personalitySummary: astrologyProfile.personalitySummary,
      strengths: astrologyProfile.strengths,
      challenges: astrologyProfile.challenges,
      lifeThemes: astrologyProfile.lifeThemes,
      relationshipStyle: astrologyProfile.relationshipStyle,
      careerAptitudes: astrologyProfile.careerAptitudes,
      spiritualGifts: astrologyProfile.spiritualGifts,
    },
    cards: cardsWithDetails.map(c => ({
      nameTr: c.nameTr,
      isReversed: c.isReversed,
      positionLabel: c.positionLabel,
    })),
  });
}

/**
 * Teaser için bağlam metni
 */
function buildTeaserContext(params: {
  displayName?: string;
  birthChart: any;
  cards: any[];
  spreadName: string;
}): string {
  const parts: string[] = [];

  if (params.displayName) {
    parts.push(`Kullanıcının adı: ${params.displayName}`);
  }
  parts.push(`Açılım: ${params.spreadName}`);
  parts.push(`Güneş: ${params.birthChart.sunSignFormatted}`);
  parts.push(`Ay: ${params.birthChart.moonSignFormatted}`);
  if (params.birthChart.ascendantFormatted) {
    parts.push(`Yükselen: ${params.birthChart.ascendantFormatted}`);
  }

  parts.push('\nÇekilen kartlar:');
  params.cards.forEach((c, i) => {
    let line = `${i + 1}. ${c.nameTr} (${c.isReversed ? 'TERS' : 'düz'})`;
    if (c.positionLabel) line += ` — ${c.positionLabel}`;
    if (c.astrologicalCorrespondence) line += ` [astro: ${c.astrologicalCorrespondence}]`;
    if (c.element) line += ` [element: ${c.element}]`;
    parts.push(line);
    if (c.keywords?.length > 0) {
      parts.push(`   Anahtar temalar: ${c.keywords.join(', ')}`);
    }
    if (c.meaning) {
      parts.push(`   Kart anlamı: ${c.meaning}`);
    }
  });

  parts.push('\nYukarıdaki bağlamla, kullanıcıya 2-3 cümlelik bir teaser üret. Ödeme yapıp tüm falı dinlemesi için merak uyandır.');
  return parts.join('\n');
}

/**
 * Chat için system prompt bağlamı (AI'ın tüm sohbet boyunca hatırlayacağı)
 */
function buildChatSystemContext(params: {
  displayName?: string;
  birthChart: any;
  astrologyProfile?: any;
  cards: any[];
  spreadName: string;
}): string {
  const parts: string[] = [];

  parts.push('# FAL BAĞLAMI');
  if (params.displayName) {
    parts.push(`Yoldaşın adı: ${params.displayName}`);
  }
  parts.push(`Açılım: ${params.spreadName}`);

  parts.push('\n## DOĞUM HARİTASI');
  parts.push(`Güneş: ${params.birthChart.sunSignFormatted}`);
  parts.push(`Ay: ${params.birthChart.moonSignFormatted}`);
  if (params.birthChart.ascendantFormatted) {
    parts.push(`Yükselen: ${params.birthChart.ascendantFormatted}`);
  } else {
    parts.push('Yükselen: doğum saati bilinmediği için perde arkasında');
  }
  if (params.birthChart.elementBalance) {
    const el = params.birthChart.elementBalance;
    parts.push(`Element dağılımı: Ateş ${el.Ateş || 0}, Toprak ${el.Toprak || 0}, Hava ${el.Hava || 0}, Su ${el.Su || 0}`);
  }
  if (params.birthChart.majorAspects?.length > 0) {
    parts.push(`Önemli açılar: ${params.birthChart.majorAspects.slice(0, 4).map(a => `${a.planetA}-${a.planetB} ${a.typeTr}`).join(', ')}`);
  }

  if (params.astrologyProfile) {
    parts.push('\n## KULLANICI PROFİLİ');
    parts.push(`Kişilik: ${params.astrologyProfile.personalitySummary}`);
    parts.push(`Güçlü yönler: ${params.astrologyProfile.strengths.join(', ')}`);
    parts.push(`İlişki tarzı: ${params.astrologyProfile.relationshipStyle}`);
    if (params.astrologyProfile.lifeThemes?.length > 0) {
      parts.push(`Yaşam temaları: ${params.astrologyProfile.lifeThemes.slice(0, 3).join('; ')}`);
    }
  }

  const progressedChart = calculateProgressedChart(params.birthChart);
  parts.push('\n## İLERLETİLMİŞ HARİTA (Secondary Progressions)');
  parts.push(`Şu anki yaş: ${progressedChart.age}`);
  parts.push(`İlerletilmiş Güneş: ${progressedChart.sun.formatted} — şu anki yaşam döneminin temel teması`);
  parts.push(`İlerletilmiş Ay: ${progressedChart.moon.formatted} — duygusal ihtiyaçlar ve içsel huzur`);
  if (progressedChart.ascendant) {
    parts.push(`İlerletilmiş Yükselen: ${progressedChart.ascendant.formatted} — dışarıya yansıyan yeni kimlik`);
  }
  parts.push(`Özet: ${progressedChart.narrative}`);

  parts.push('\n## ÇEKİLEN KARTLAR');
  params.cards.forEach((c, i) => {
    let line = `${i + 1}. ${c.nameTr} (${c.isReversed ? 'TERS' : 'düz'})`;
    if (c.positionLabel) line += ` — pozisyon: ${c.positionLabel}`;
    if (c.positionMeaning) line += ` (pozisyon anlamı: ${c.positionMeaning})`;
    if (c.astrologicalCorrespondence) line += ` [astrolojik: ${c.astrologicalCorrespondence}]`;
    if (c.element) line += ` [element: ${c.element}]`;
    parts.push(line);
    if (c.keywords?.length > 0) {
      parts.push(`   Anahtar temalar: ${c.keywords.join(', ')}`);
    }
    if (c.meaning) {
      parts.push(`   Kart anlamı: ${c.meaning}`);
    }
  });

  const elementalAnalysis = getElementalDignitiesPrompt(params.cards.map(c => ({
    slug: c.slug,
    nameTr: c.nameTr,
    suit: c.suit,
  })));
  if (elementalAnalysis) {
    parts.push('\n' + elementalAnalysis);
  }

  parts.push('\n## TALİMAT');
  parts.push('Yukarıdaki bağlamla, kullanıcının sorularını mistik bir falcı gibi yanıtla. Kart yorumlarını MUTLAKA verilen "Kart anlamı" ve "Anahtar temalar" metinlerine dayandır — kartın gerçek sembolizmini kullan, uydurma genel yorum yapma. Ters kartların anlamını ters yön metninden al. Kartları + doğum haritasını + bugünkü transitleri birleştirerek kişiye özel yanıtlar ver.');
  parts.push('Kart kombinasyonlarında element ilişkilerini dikkate al: aynı element destekler, uyumlu elementler zenginleştirir, çatışan elementler gerilim ve dönüşüm taşır. Bu element dinamiklerini yorumlarına doğal şekilde entegre et.');

  return parts.join('\n');
}
