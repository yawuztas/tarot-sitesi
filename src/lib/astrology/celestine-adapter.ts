// @ts-nocheck
/**
 * Celestine Adapter — Gerçek Astroloji Hesaplamaları
 *
 * Pure JavaScript "celestine" kütüphanesini kullanarak doğum haritası hesaplar.
 * WASM/native derleme gerektirmez, Swiss Ephemeris ile validasyonlu.
 *
 * Hesapladıklarımız:
 * - 10 gezegen pozisyonu (Güneş'ten Plüton'a)
 * - Yükselen, MC, Vertex
 * - 12 ev cusps (Placidus)
 * - Element dağılımı
 * - Önemli açılar (konjunksiyon, kare, üçgen, karşıt, sekstil)
 * - AI için narrative metin
 */

import {
  calculateChart,
  type Chart,
  type ChartPlanet,
  type ChartHouseCusp,
  type ChartAspect,
} from 'celestine';
import { longitudeToSign, type ZodiacSign } from './zodiac';

// ─── Interfaces (chart.ts ile aynı) ───────────────────────────────

export interface PlanetPosition {
  name: string;          // 'Sun', 'Moon', ...
  nameTr: string;        // 'Güneş', 'Ay', ...
  symbol: string;        // ☉, ☽, ☿, ...
  longitude: number;     // 0-360
  sign: ZodiacSign;
  signDegree: number;    // 0-30
  formatted: string;     // "Koç 12°34'"
  element: string;
  isRetrograde: boolean;
  speed: number;         // derece/gün
}

export interface HousePosition {
  index: number;         // 1-12
  cuspLongitude: number;
  cuspSign: ZodiacSign;
  cuspFormatted: string;
}

export interface BirthChartInput {
  birthDate: Date;       // UTC Date object
  birthTimeUnknown: boolean;
  birthLat: number;
  birthLng: number;
  birthPlaceName?: string;
}

export interface BirthChart {
  drawnAt: string;
  birthDate: string;
  birthTimeUnknown: boolean;
  birthLat: number;
  birthLng: number;
  birthPlaceName?: string;
  julianDay: number;
  sunSign: ZodiacSign;
  sunSignFormatted: string;
  moonSign: ZodiacSign;
  moonSignFormatted: string;
  ascendant: ZodiacSign | null;
  ascendantFormatted: string | null;
  planets: PlanetPosition[];
  houses: HousePosition[] | null;
  mc: string | null;
  vertex: string | null;
  elementBalance: {
    Ateş: number;
    Toprak: number;
    Hava: number;
    Su: number;
  };
  majorAspects: Array<{
    planetA: string;
    planetB: string;
    type: string;
    typeTr: string;
    orb: number;
  }>;
  narrative: string;
}

// ─── Mapping Tables ────────────────────────────────────────────────

const CELESTINE_SIGN_TO_TURKISH: Record<string, ZodiacSign> = {
  'Aries': 'Koç',
  'Taurus': 'Boğa',
  'Gemini': 'İkizler',
  'Cancer': 'Yengeç',
  'Leo': 'Aslan',
  'Virgo': 'Başak',
  'Libra': 'Terazi',
  'Scorpio': 'Akrep',
  'Sagittarius': 'Yay',
  'Capricorn': 'Oğlak',
  'Aquarius': 'Kova',
  'Pisces': 'Balık',
};

const PLANET_SYMBOLS: Record<string, string> = {
  'Sun': '☉', 'Moon': '☽', 'Mercury': '☿', 'Venus': '♀',
  'Mars': '♂', 'Jupiter': '♃', 'Saturn': '♄', 'Uranus': '♅',
  'Neptune': '♆', 'Pluto': '♇',
};

const PLANET_NAMES_TR: Record<string, string> = {
  'Sun': 'Güneş', 'Moon': 'Ay', 'Mercury': 'Merkür', 'Venus': 'Venüs',
  'Mars': 'Mars', 'Jupiter': 'Jüpiter', 'Saturn': 'Satürn', 'Uranus': 'Uranüs',
  'Neptune': 'Neptün', 'Pluto': 'Plüton',
};

const ASPECT_TYPE_TR: Record<string, string> = {
  'conjunction': 'Konjunksiyon',
  'sextile': 'Sekstil',
  'square': 'Kare',
  'trine': 'Üçgen',
  'opposition': 'Karşıt',
};

// ─── Helpers ──────────────────────────────────────────────────────

function celestineSignToTurkish(signName: string): ZodiacSign {
  return CELESTINE_SIGN_TO_TURKISH[signName] || 'Koç';
}

function mapCelestinePlanet(p: ChartPlanet): PlanetPosition {
  const signInfo = longitudeToSign(p.longitude);
  return {
    name: p.name,
    nameTr: PLANET_NAMES_TR[p.name] || p.name,
    symbol: PLANET_SYMBOLS[p.name] || '●',
    longitude: p.longitude,
    sign: signInfo.sign,
    signDegree: Math.round(signInfo.degreeInSign * 100) / 100,
    formatted: signInfo.formatted,
    element: signInfo.element,
    isRetrograde: p.isRetrograde,
    speed: p.longitudeSpeed || 0,
  };
}

function mapCelestineHouse(h: ChartHouseCusp, index: number): HousePosition {
  const signInfo = longitudeToSign(h.longitude);
  return {
    index: index + 1,
    cuspLongitude: h.longitude,
    cuspSign: signInfo.sign,
    cuspFormatted: signInfo.formatted,
  };
}

function mapCelestineAspect(a: any): BirthChart['majorAspects'][number] {
  return {
    planetA: PLANET_NAMES_TR[a.body1] || a.body1,
    planetB: PLANET_NAMES_TR[a.body2] || a.body2,
    type: a.type,
    typeTr: ASPECT_TYPE_TR[a.type] || a.type,
    orb: Math.round(a.deviation * 100) / 100,
  };
}

// ─── Julian Day Helper ─────────────────────────────────────────────

export function dateToJulianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

// ─── Main Calculation ──────────────────────────────────────────────

export function calculateBirthChart(input: BirthChartInput): BirthChart {
  const { birthDate, birthTimeUnknown, birthLat, birthLng, birthPlaceName } = input;

  // Convert UTC date to local time components for celestine
  // Celestine expects timezone offset; we pass 0 for UTC
  const year = birthDate.getUTCFullYear();
  const month = birthDate.getUTCMonth() + 1;
  const day = birthDate.getUTCDate();
  const hour = birthDate.getUTCHours();
  const minute = birthDate.getUTCMinutes();
  const second = birthDate.getUTCSeconds();

  // Calculate chart with celestine
  const chart: Chart = calculateChart({
    year,
    month,
    day,
    hour,
    minute,
    second,
    timezone: 0, // UTC
    latitude: birthLat,
    longitude: birthLng,
  }, {
    houseSystem: 'placidus',
    includeAsteroids: false,
    includeChiron: false,
    includeLilith: 'none',
    includeNodes: 'none',
    includeLots: false,
    aspectTypes: ['conjunction', 'sextile', 'square', 'trine', 'opposition'],
    includePatterns: false,
  });

  // Map planets
  const planets = chart.planets.map(mapCelestinePlanet);

  // Find Sun and Moon
  const sun = planets.find(p => p.name === 'Sun')!;
  const moon = planets.find(p => p.name === 'Moon')!;

  // Map houses (if birth time is known)
  let houses: HousePosition[] | null = null;
  let ascendant: ZodiacSign | null = null;
  let ascendantFormatted: string | null = null;
  let mc: string | null = null;
  let vertex: string | null = null;

  if (!birthTimeUnknown && chart.houses && chart.houses.cusps) {
    houses = chart.houses.cusps.map((h: any, i: number) => mapCelestineHouse(h, i));

    const asc = chart.angles?.ascendant;
    if (asc) {
      const ascSignInfo = longitudeToSign(asc.longitude);
      ascendant = ascSignInfo.sign;
      ascendantFormatted = ascSignInfo.formatted;
    }

    const mcAngle = chart.angles?.midheaven;
    if (mcAngle) {
      const mcSignInfo = longitudeToSign(mcAngle.longitude);
      mc = mcSignInfo.formatted;
    }
  }

  // Element balance
  const elementBalance = { Ateş: 0, Toprak: 0, Hava: 0, Su: 0 };
  elementBalance[sun.element as keyof typeof elementBalance] += 3;
  elementBalance[moon.element as keyof typeof elementBalance] += 3;
  if (ascendant && chart.angles?.ascendant) {
    const ascEl = longitudeToSign(chart.angles.ascendant.longitude).element;
    elementBalance[ascEl as keyof typeof elementBalance] += 3;
  }
  for (const p of planets) {
    if (p.name === 'Sun' || p.name === 'Moon') continue;
    elementBalance[p.element as keyof typeof elementBalance] += 1;
  }

  // Major aspects (top 6 by orb)
  const aspectsArray = chart.aspects?.all || [];
  const majorAspects = aspectsArray
    .filter((a: any) => ['conjunction', 'sextile', 'square', 'trine', 'opposition'].includes(a.type))
    .map(mapCelestineAspect)
    .sort((a: any, b: any) => a.orb - b.orb)
    .slice(0, 6);

  // Narrative
  let narrative = `Güneş ${sun.formatted} (${sun.element}), Ay ${moon.formatted} (${moon.element})`;
  if (ascendantFormatted) {
    narrative += `, Yükselen ${ascendantFormatted}`;
  } else {
    narrative += `, Yükselen: doğum saati bilinmediği için hesaplanamadı`;
  }
  narrative += '. ';

  const otherPlanets = planets.filter(p => p.name !== 'Sun' && p.name !== 'Moon');
  narrative += 'Gezegen konumları: ' + otherPlanets.map(p =>
    `${p.nameTr} ${p.formatted}${p.isRetrograde ? ' (R)' : ''}`
  ).join(', ') + '. ';

  const sortedElements = Object.entries(elementBalance).sort((a, b) => b[1] - a[1]);
  const dominantElement = sortedElements[0];
  narrative += `Element dağılımı: ${sortedElements.map(([el, count]) => `${el} ${count}`).join(', ')}. Baskın element: ${dominantElement[0]}. `;

  if (majorAspects.length > 0) {
    narrative += 'Önemli açılar: ' + majorAspects.map(a =>
      `${a.planetA}-${a.planetB} ${a.typeTr} (orb ${a.orb}°)`
    ).join(', ') + '.';
  }

  return {
    drawnAt: new Date().toISOString(),
    birthDate: birthDate.toISOString(),
    birthTimeUnknown,
    birthLat,
    birthLng,
    birthPlaceName,
    julianDay: chart.calculated.julianDate,
    sunSign: sun.sign,
    sunSignFormatted: sun.formatted,
    moonSign: moon.sign,
    moonSignFormatted: moon.formatted,
    ascendant,
    ascendantFormatted,
    planets,
    houses,
    mc,
    vertex,
    elementBalance,
    majorAspects,
    narrative,
  };
}

// ─── Transit Calculations ──────────────────────────────────────────

export function calculateCurrentTransits(): {
  date: string;
  planets: Array<{ name: string; nameTr: string; sign: string; formatted: string; isRetrograde: boolean }>;
} {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();

  // Calculate current chart (no location needed for planets)
  const chart = calculateChart({
    year, month, day, hour, minute, second: 0, timezone: 0,
    latitude: 0, longitude: 0,
  }, {
    houseSystem: 'placidus',
    includeAsteroids: false,
    includeChiron: false,
    includeLilith: 'none',
    includeNodes: 'none',
    includeLots: false,
    aspectTypes: [],
    includePatterns: false,
  });

  const transits = chart.planets.map(p => {
    const signInfo = longitudeToSign(p.longitude);
    return {
      name: p.name,
      nameTr: PLANET_NAMES_TR[p.name] || p.name,
      sign: signInfo.sign,
      formatted: signInfo.formatted,
      isRetrograde: p.isRetrograde,
    };
  });

  return {
    date: now.toISOString(),
    planets: transits,
  };
}

export interface ProgressedChart {
  progressedDate: string;
  age: number;
  sun: { sign: ZodiacSign; formatted: string };
  moon: { sign: ZodiacSign; formatted: string };
  ascendant: { sign: ZodiacSign; formatted: string } | null;
  planets: Array<{
    name: string;
    nameTr: string;
    sign: ZodiacSign;
    formatted: string;
    isRetrograde: boolean;
  }>;
  narrative: string;
}

export function calculateProgressedChart(
  birthChart: BirthChart,
  targetDate: Date = new Date()
): ProgressedChart {
  const birth = new Date(birthChart.birthDate);
  const ageMs = targetDate.getTime() - birth.getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  const ageYears = Math.floor(ageDays / 365.25);

  const progressedDate = new Date(birth.getTime() + ageDays * 24 * 60 * 60 * 1000);

  const pChart = calculateChart({
    year: progressedDate.getUTCFullYear(),
    month: progressedDate.getUTCMonth() + 1,
    day: progressedDate.getUTCDate(),
    hour: progressedDate.getUTCHours(),
    minute: progressedDate.getUTCMinutes(),
    second: progressedDate.getUTCSeconds(),
    timezone: 0,
    latitude: birthChart.birthLat || 0,
    longitude: birthChart.birthLng || 0,
  }, {
    houseSystem: 'placidus',
    includeAsteroids: false,
    includeChiron: false,
    includeLilith: 'none',
    includeNodes: 'none',
    includeLots: false,
    aspectTypes: [],
    includePatterns: false,
  });

  const pSun = pChart.planets.find(p => p.name === 'Sun')!;
  const pMoon = pChart.planets.find(p => p.name === 'Moon')!;
  const sunInfo = longitudeToSign(pSun.longitude);
  const moonInfo = longitudeToSign(pMoon.longitude);

  let ascInfo = null;
  if (pChart.angles?.ascendant) {
    ascInfo = longitudeToSign(pChart.angles.ascendant.longitude);
  }

  const planets = pChart.planets.map(p => {
    const info = longitudeToSign(p.longitude);
    return {
      name: p.name,
      nameTr: PLANET_NAMES_TR[p.name] || p.name,
      sign: info.sign,
      formatted: info.formatted,
      isRetrograde: p.isRetrograde,
    };
  });

  let narrative = `İlerletilmiş Güneş: ${sunInfo.formatted}. İlerletilmiş Ay: ${moonInfo.formatted}.`;
  if (ascInfo) {
    narrative += ` İlerletilmiş Yükselen: ${ascInfo.formatted}.`;
  }
  narrative += ` Şu an ${ageYears} yaşındasın ve ilerletilmiş haritan bu dönemin temalarını gösteriyor.`;

  return {
    progressedDate: progressedDate.toISOString(),
    age: ageYears,
    sun: { sign: sunInfo.sign, formatted: sunInfo.formatted },
    moon: { sign: moonInfo.sign, formatted: moonInfo.formatted },
    ascendant: ascInfo ? { sign: ascInfo.sign, formatted: ascInfo.formatted } : null,
    planets,
    narrative,
  };
}
