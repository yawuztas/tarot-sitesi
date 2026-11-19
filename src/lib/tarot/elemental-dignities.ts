/**
 * Elemental Dignities — Kart Kombinasyonlarında Element Analizi
 *
 * Tarot'ta her suit bir elemente karşılık gelir:
 * - Değnekler (Wands) = Ateş
 * - Kupalar (Cups) = Su
 * - Kılıçlar (Swords) = Hava
 * - Tılsımlar (Pentacles) = Toprak
 *
 * Element ilişkileri:
 * - Aynı element: destekleyici, güçlendirici
 * - Uyumlu elementler: Ateş+Hava, Su+Toprak
 * - Çatışan elementler: Ateş+Su, Hava+Toprak
 *
 * Major Arcana elementleri (Golden Dawn sistemi):
 * - Ateş: İmparator, Savaş Arabası, Kuvvet, Asa, Güneş
 * - Su: İmparatoriçe, Çilekeş, Ölüm, Kupa, Ay
 * - Hava: Sihirbaz, Aşıklar, Adalet, Kılıç, Yıldız
 * - Toprak: Papessa, Ölçülülük, Dünya, Tılsım, Kule
 */

export type Element = 'fire' | 'water' | 'air' | 'earth';

interface CardElement {
  name: string;
  element: Element | null;
  isMajor: boolean;
}

interface ElementPair {
  cardA: string;
  cardB: string;
  elementA: Element;
  elementB: Element;
  relationship: 'same' | 'friendly' | 'neutral' | 'clashing';
  intensity: number; // 1-10
  interpretation: string;
}

// Element uyum matrisi
const ELEMENT_COMPATIBILITY: Record<Element, Record<Element, 'same' | 'friendly' | 'neutral' | 'clashing'>> = {
  fire: {
    fire: 'same',
    water: 'clashing',
    air: 'friendly',
    earth: 'neutral',
  },
  water: {
    fire: 'clashing',
    water: 'same',
    air: 'neutral',
    earth: 'friendly',
  },
  air: {
    fire: 'friendly',
    water: 'neutral',
    air: 'same',
    earth: 'clashing',
  },
  earth: {
    fire: 'neutral',
    water: 'friendly',
    air: 'clashing',
    earth: 'same',
  },
};

// Major Arcana element eşleştirmeleri (Golden Dawn)
const MAJOR_ARCANA_ELEMENTS: Record<string, Element> = {
  'fool': 'air',
  'magician': 'air',
  'high-priestess': 'water',
  'empress': 'water',
  'emperor': 'fire',
  'hierophant': 'earth',
  'lovers': 'air',
  'chariot': 'water',
  'strength': 'fire',
  'hermit': 'earth',
  'wheel-of-fortune': 'fire',
  'justice': 'air',
  'hanged-man': 'water',
  'death': 'water',
  'temperance': 'fire',
  'devil': 'earth',
  'tower': 'earth',
  'star': 'air',
  'moon': 'water',
  'sun': 'fire',
  'judgement': 'fire',
  'world': 'earth',
};

function getCardElement(cardSlug: string, suit: string | null): Element | null {
  // DB slug formatı: "major-00-fool" veya "minor-cups-01-ace"
  if (cardSlug.startsWith('minor-')) {
    const parts = cardSlug.split('-');
    const slugSuit = parts[1];
    const suitToElement: Record<string, Element> = {
      wands: 'fire',
      cups: 'water',
      swords: 'air',
      pentacles: 'earth',
    };
    if (slugSuit && suitToElement[slugSuit]) return suitToElement[slugSuit];
  }

  if (suit) {
    const suitToElement: Record<string, Element> = {
      wands: 'fire',
      cups: 'water',
      swords: 'air',
      pentacles: 'earth',
    };
    if (suitToElement[suit]) return suitToElement[suit];
  }

  // Major Arcana ("major-00-fool" -> "fool")
  const normalizedMajorSlug = cardSlug.replace(/^major-\d{2}-/, '');
  return MAJOR_ARCANA_ELEMENTS[normalizedMajorSlug] || MAJOR_ARCANA_ELEMENTS[cardSlug] || null;
}

function getRelationshipLabel(rel: 'same' | 'friendly' | 'neutral' | 'clashing'): string {
  const labels: Record<string, string> = {
    same: 'Aynı element — güçlü destek',
    friendly: 'Uyumlu element — zenginleşen enerji',
    neutral: 'Nötr element — bağımsız etkiler',
    clashing: 'Çatışan element — gerilim ve dönüşüm',
  };
  return labels[rel];
}

function generatePairInterpretation(
  cardA: string,
  cardB: string,
  rel: 'same' | 'friendly' | 'neutral' | 'clashing',
  elA: Element,
  elB: Element
): string {
  const elNames: Record<Element, string> = {
    fire: 'Ateş',
    water: 'Su',
    air: 'Hava',
    earth: 'Toprak',
  };

  switch (rel) {
    case 'same':
      return `${cardA} ve ${cardB} aynı ${elNames[elA]} elementini taşıyor. Bu, kartların temalarının birbirini güçlendirdiğini, enerjinin yoğunlaştığını gösterir. Tek bir mesajın iki farklı yüzü konuşuyor.`;
    case 'friendly':
      return `${cardA} (${elNames[elA]}) ve ${cardB} (${elNames[elB]}) uyumlu elementler. ${elNames[elA]} ve ${elNames[elB]} birlikte çalışarak zengin, çok katmanlı bir enerji yaratıyor. Bu kartlar birbirini tamamlıyor.`;
    case 'neutral':
      return `${cardA} (${elNames[elA]}) ve ${cardB} (${elNames[elB]}) birbirinden bağımsız alanları temsil ediyor. Her kart kendi mesajını ayrı ayrı veriyor; doğrudan etkileşim yok.`;
    case 'clashing':
      return `${cardA} (${elNames[elA]}) ve ${cardB} (${elNames[elB]}) çatışan elementler. ${elNames[elA]} ile ${elNames[elB]} arasındaki gerilim, bir dönüşüm veya zorlu bir öğrenme sürecini işaret ediyor. Bu çatışma, büyüme için gereken enerjiyi taşır.`;
  }
}

/**
 * Birden fazla kart arasındaki element ilişkilerini analiz et
 */
export function analyzeElementalDignities(cards: Array<{
  slug: string;
  nameTr: string;
  suit: string | null;
}>): {
  dominantElement: string | null;
  elementDistribution: Record<string, number>;
  pairs: ElementPair[];
  summary: string;
} {
  // Element dağılımı
  const distribution: Record<string, number> = { fire: 0, water: 0, air: 0, earth: 0 };
  const cardElements: Array<{ card: typeof cards[0]; element: Element | null }> = [];

  for (const card of cards) {
    const el = getCardElement(card.slug, card.suit);
    if (el) {
      distribution[el]++;
      cardElements.push({ card, element: el });
    }
  }

  // Dominant element
  const entries = Object.entries(distribution).filter(([, count]) => count > 0);
  const dominant = entries.length > 0
    ? entries.reduce((a, b) => a[1] > b[1] ? a : b)[0]
    : null;

  // Tüm çiftleri analiz et
  const pairs: ElementPair[] = [];
  for (let i = 0; i < cardElements.length; i++) {
    for (let j = i + 1; j < cardElements.length; j++) {
      const a = cardElements[i];
      const b = cardElements[j];
      if (!a.element || !b.element) continue;

      const rel = ELEMENT_COMPATIBILITY[a.element][b.element];
      pairs.push({
        cardA: a.card.nameTr,
        cardB: b.card.nameTr,
        elementA: a.element,
        elementB: b.element,
        relationship: rel,
        intensity: rel === 'same' ? 8 : rel === 'friendly' ? 6 : rel === 'clashing' ? 7 : 3,
        interpretation: generatePairInterpretation(a.card.nameTr, b.card.nameTr, rel, a.element, b.element),
      });
    }
  }

  // Özet
  const dominantMap: Record<string, string> = {
    fire: 'Ateş (eylem, tutku, irade)',
    water: 'Su (duygu, sezgi, derinlik)',
    air: 'Hava (zihin, iletişim, fikir)',
    earth: 'Toprak (maddi dünya, güvenlik, somutluk)',
  };
  const dominantName = dominant ? (dominantMap[dominant] ?? null) : null;

  const clashCount = pairs.filter(p => p.relationship === 'clashing').length;
  const supportCount = pairs.filter(p => p.relationship === 'same' || p.relationship === 'friendly').length;

  let summary = '';
  if (dominantName) {
    summary += `Bu açılımda baskın element: ${dominantName}. `;
  }
  if (clashCount > 0) {
    summary += `${clashCount} çatışan element çifti var — bu, içsel veya dışsal gerilimlerin dönüştürücü gücünü gösterir. `;
  }
  if (supportCount > 0) {
    summary += `${supportCount} destekleyici element çifti enerjiyi yoğunlaştırıyor. `;
  }
  if (pairs.length === 0) {
    summary = 'Element analizi için yeterli veri yok.';
  }

  return {
    dominantElement: dominantName,
    elementDistribution: distribution,
    pairs,
    summary: summary.trim(),
  };
}

/**
 * AI prompt'u için element analizi metni üret
 */
export function getElementalDignitiesPrompt(cards: Array<{
  slug: string;
  nameTr: string;
  suit: string | null;
}>): string {
  const analysis = analyzeElementalDignities(cards);

  const lines: string[] = [];
  lines.push('## ELEMENT ANALİZİ');
  lines.push(analysis.summary);

  if (analysis.pairs.length > 0) {
    lines.push('\nKart çiftleri arası element ilişkileri:');
    for (const pair of analysis.pairs) {
      lines.push(`- ${pair.cardA} + ${pair.cardB}: ${getRelationshipLabel(pair.relationship)} (${pair.interpretation})`);
    }
  }

  return lines.join('\n');
}
