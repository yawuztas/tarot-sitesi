/**
 * Tarot Yardımcı Fonksiyonları
 * Kart çekme, slug üretme, vb.
 */

import crypto from 'crypto';

export type ArcanaType = 'major' | 'minor';
export type Suit = 'wands' | 'cups' | 'swords' | 'pentacles' | null;
export type Element = 'fire' | 'water' | 'air' | 'earth';

export interface TarotCard {
  id?: string;
  slug: string;
  name: string;
  nameTr: string;
  arcanaType: ArcanaType;
  suit: Suit;
  number: number;
  keywordsUpright: string[];
  keywordsReversed: string[];
  meaningsUpright: string;
  meaningsReversed: string;
  astrologicalCorrespondence?: string;
  element?: Element;
  numerologyKey?: string;
}

export interface DrawnCard {
  card: TarotCard;
  isReversed: boolean;
  positionIndex: number;
  drawOrder: number;
}

/**
 * CSPRNG ile güvenli kart çekme
 * Provably-fair: seed + hash üretir
 */
export function drawCards(
  deck: TarotCard[],
  count: number,
  options: { allowReversed?: boolean; seed?: string } = {}
): { drawn: DrawnCard[]; seed: string; hash: string } {
  const allowReversed = options.allowReversed ?? true;
  const seed = options.seed || crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  
  // Seed'den deterministik RNG (provably-fair için)
  const rng = createSeededRng(seed);
  
  // Fisher-Yates shuffle
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // İlk N kartı al
  const drawn: DrawnCard[] = shuffled.slice(0, count).map((card, i) => ({
    card,
    isReversed: allowReversed ? rng() < 0.5 : false,
    positionIndex: i,
    drawOrder: i,
  }));
  
  return { drawn, seed, hash };
}

/**
 * Seed'den deterministik RNG (Mulberry32)
 * Provably-fair: aynı seed aynı sonucu üretir
 */
function createSeededRng(seed: string): () => number {
  // İlk 8 byte'ı al, uint32'ye çevir
  const seedBytes = Buffer.from(seed.slice(0, 16), 'hex');
  let a = seedBytes.readUInt32BE(0);
  
  return function() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Suit Türkçe isimleri
 */
export const SUIT_NAMES_TR: Record<string, string> = {
  wands: 'Değnekler',
  cups: 'Kupalar',
  swords: 'Kılıçlar',
  pentacles: 'Tılsımlar',
};

export const ELEMENT_NAMES_TR: Record<string, string> = {
  fire: 'Ateş',
  water: 'Su',
  air: 'Hava',
  earth: 'Toprak',
};

/**
 * Arcana türü Türkçe
 */
export function getArcanaNameTr(arcanaType: string): string {
  return arcanaType === 'major' ? 'Büyük Arkana' : 'Küçük Arkana';
}

/**
 * Kartın tam Türkçe adı (suit + numara + isim)
 */
export function getCardFullNameTr(card: TarotCard): string {
  if (card.arcanaType === 'major') {
    return card.nameTr;
  }
  const suitName = card.suit ? SUIT_NAMES_TR[card.suit] : '';
  return `${suitName} - ${card.nameTr}`;
}

/**
 * Sayfa, Şövalye, Kraliçe, Kral Türkçe
 */
export function getCardCourtTitleTr(number: number): string | null {
  if (number === 11) return 'Sayfa';
  if (number === 12) return 'Şövalye';
  if (number === 13) return 'Kraliçe';
  if (number === 14) return 'Kral';
  return null;
}

/**
 * Minor kartların numaraları (1-14) için Türkçe etiket
 */
export function getCardNumberLabelTr(number: number): string {
  if (number === 1) return 'As';
  if (number >= 2 && number <= 10) return String(number);
  return getCardCourtTitleTr(number) || String(number);
}
