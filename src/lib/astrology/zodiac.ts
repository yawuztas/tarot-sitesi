/**
 * Zodyak / Burç Sistemleri
 *
 * Tropical (Batı) astrolojide 12 burç, her biri 30°.
 * Swiss Ephemeris varsayılan olarak tropical döner; ayanamsa
 * eklersek sidereal olur (Hint astrolojisi). Biz tropical kullanıyoruz.
 */

export const ZODIAC_SIGNS = [
  'Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak',
  'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık',
] as const;

export type ZodiacSign = typeof ZODIAC_SIGNS[number];

export const ZODIAC_ELEMENTS: Record<ZodiacSign, 'Ateş' | 'Toprak' | 'Hava' | 'Su'> = {
  'Koç': 'Ateş', 'Aslan': 'Ateş', 'Yay': 'Ateş',
  'Boğa': 'Toprak', 'Başak': 'Toprak', 'Oğlak': 'Toprak',
  'İkizler': 'Hava', 'Terazi': 'Hava', 'Kova': 'Hava',
  'Yengeç': 'Su', 'Akrep': 'Su', 'Balık': 'Su',
};

export const ZODIAC_QUALITIES: Record<ZodiacSign, 'Öncü' | 'Sabit' | 'Değişken'> = {
  'Koç': 'Öncü', 'Yengeç': 'Öncü', 'Terazi': 'Öncü', 'Oğlak': 'Öncü',
  'Boğa': 'Sabit', 'Aslan': 'Sabit', 'Akrep': 'Sabit', 'Kova': 'Sabit',
  'İkizler': 'Değişken', 'Başak': 'Değişken', 'Yay': 'Değişken', 'Balık': 'Değişken',
};

export const ZODIAC_RULERS: Record<ZodiacSign, string> = {
  'Koç': 'Mars', 'Boğa': 'Venüs', 'İkizler': 'Merkür', 'Yengeç': 'Ay',
  'Aslan': 'Güneş', 'Başak': 'Merkür', 'Terazi': 'Venüs', 'Akrep': 'Mars/Plüton',
  'Yay': 'Jüpiter', 'Oğlak': 'Satürn', 'Kova': 'Satürn/Uranüs', 'Balık': 'Jüpiter/Neptün',
};

/**
 * Derece → burç + burç içi derece çevirisi.
 * 0° → Koç 0°, 30° → Boğa 0°, 360° → Koç 0° (tekrar).
 */
export function longitudeToSign(longitude: number): {
  sign: ZodiacSign;
  degreeInSign: number;
  formatted: string; // "Koç 12°34'"
  element: 'Ateş' | 'Toprak' | 'Hava' | 'Su';
  quality: 'Öncü' | 'Sabit' | 'Değişken';
  ruler: string;
} {
  // Normalize: 0-360 aralığına getir
  const normalized = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const degreeInSign = normalized - signIndex * 30;
  const sign = ZODIAC_SIGNS[signIndex];

  const totalDegrees = Math.floor(degreeInSign);
  const totalMinutes = Math.floor((degreeInSign - totalDegrees) * 60);

  return {
    sign,
    degreeInSign,
    formatted: `${sign} ${totalDegrees}°${totalMinutes.toString().padStart(2, '0')}'`,
    element: ZODIAC_ELEMENTS[sign],
    quality: ZODIAC_QUALITIES[sign],
    ruler: ZODIAC_RULERS[sign],
  };
}

/**
 * Burç sembolü (unicode glyph).
 */
export function zodiacGlyph(sign: ZodiacSign): string {
  const glyphs: Record<ZodiacSign, string> = {
    'Koç': '♈', 'Boğa': '♉', 'İkizler': '♊', 'Yengeç': '♋',
    'Aslan': '♌', 'Başak': '♍', 'Terazi': '♎', 'Akrep': '♏',
    'Yay': '♐', 'Oğlak': '♑', 'Kova': '♒', 'Balık': '♓',
  };
  return glyphs[sign];
}
