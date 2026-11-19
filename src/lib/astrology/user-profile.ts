/**
 * Kullanıcı Astroloji Profili Üretici
 *
 * Doğum haritası verisini alıp, kullanıcının kişilik özelliklerini,
 * güçlü yönlerini, zorluklarını ve yaşam temalarını üretir.
 *
 * Bu veri:
 * - AI prompt'larına bağlam olarak enjekte edilir
 * - Kullanıcı profil sayfasında gösterilir
 * - Fal yorumlarında kişiselleştirme için kullanılır
 */

import { type BirthChart, type PlanetPosition } from './celestine-adapter';
import { ZODIAC_ELEMENTS, ZODIAC_QUALITIES, type ZodiacSign } from './zodiac';

// ─── Interfaces ────────────────────────────────────────────────────

export interface UserAstrologyProfile {
  // Temel üçlü
  sunSign: ZodiacSign;
  moonSign: ZodiacSign;
  ascendant: ZodiacSign | null;

  // Element & Kalite analizi
  dominantElement: 'Ateş' | 'Toprak' | 'Hava' | 'Su';
  dominantQuality: 'Öncü' | 'Sabit' | 'Değişken';
  elementBalance: Record<string, number>;

  // Kişilik özeti
  personalitySummary: string;
  coreMotivation: string;
  emotionalStyle: string;
  outwardPersona: string | null;

  // Güçlü yönler ve zorluklar
  strengths: string[];
  challenges: string[];
  lifeThemes: string[];

  // İlişki ve kariyer
  relationshipStyle: string;
  careerAptitudes: string[];

  // Spiritüel / mistik
  spiritualGifts: string[];
  shadowWork: string[];

  // Gezegen özeti
  planetHighlights: PlanetHighlight[];

  // AI için ham metin
  narrative: string;
}

interface PlanetHighlight {
  planet: string;
  sign: ZodiacSign;
  house: number | null;
  interpretation: string;
  isRetrograde: boolean;
}

// ─── Interpretation Data ───────────────────────────────────────────

const SIGN_INTERPRETATIONS: Record<ZodiacSign, {
  coreMotivation: string;
  strengths: string[];
  challenges: string[];
  relationshipStyle: string;
  careerAptitudes: string[];
}> = {
  'Koç': {
    coreMotivation: 'Öncü olmak, yarışmak, kendi yolunu çizmek',
    strengths: ['Cesaret', 'Girişimcilik', 'Doğallık', 'Hızlı karar alma'],
    challenges: ['Sabırsızlık', 'Dürtüsellük', 'Başkalarının hızına uyum sağlayamama'],
    relationshipStyle: 'Tutkulu ve doğrudan; kalbini hızlı verir, sıkılması da hızlıdır',
    careerAptitudes: ['Girişimcilik', 'Satış', 'Spor', 'Askeriye', 'Cerrahi'],
  },
  'Boğa': {
    coreMotivation: 'Güvenlik, konfor, güzellik ve kalıcı değerler yaratmak',
    strengths: ['Kararlılık', 'Pratik zekâ', 'Dayanıklılık', 'Estetik duyarlılığı'],
    challenges: ['İnatçılık', 'Değişime direnç', 'Mal mülk takıntısı'],
    relationshipStyle: 'Sadık ve tutkulu; fiziksel yakınlık çok önemlidir',
    careerAptitudes: ['Finans', 'Mimarlık', 'Aşçılık', 'Sanat', 'Gayrimenkul'],
  },
  'İkizler': {
    coreMotivation: 'Öğrenmek, iletişim kurmak, çeşitlilik aramak',
    strengths: ['Zekâ', 'İletişim', 'Adaptasyon', 'Merak'],
    challenges: ['Dağınıklık', 'Yüzeysellik', 'Kararsızlık', 'Sıkılma'],
    relationshipStyle: 'Zihinsel uyum arar; monotonluk katlanılamaz',
    careerAptitudes: ['Yazarlık', 'Gazetecilik', 'Pazarlama', 'Yazılım', 'Eğitim'],
  },
  'Yengeç': {
    coreMotivation: 'Ait olmak, korumak, duygusal güvenlik yaratmak',
    strengths: ['Empati', 'Sadakat', 'Sezgi', 'Bakım verme'],
    challenges: ['Aşırı duygusallık', 'Geçmişe takılma', 'Kırılganlık'],
    relationshipStyle: 'Derin bağlar kurar; aile kurma isteği güçlüdür',
    careerAptitudes: ['Psikoloji', 'Ebeveynlik', 'Aşçılık', 'Emlak', 'Tarih'],
  },
  'Aslan': {
    coreMotivation: 'İfade etmek, yaratmak, takdir görmek, liderlik etmek',
    strengths: ['Yaratıcılık', 'Cesaret', 'Cömertlik', 'Organizasyon'],
    challenges: ['Kibir', 'Gösteriş merakı', 'Kontrol ihtiyacı'],
    relationshipStyle: 'Tutkulu ve sadık; partnerinin gözünde özel hissetmek ister',
    careerAptitudes: ['Sahne sanatları', 'Yöneticilik', 'Moda', 'Eğlence', 'Eğitim'],
  },
  'Başak': {
    coreMotivation: 'Mükemmelleştirmek, hizmet etmek, düzen yaratmak',
    strengths: ['Analiz', 'Detaycılık', 'Pratiklik', 'Sağlık bilgisi'],
    challenges: ['Aşırı eleştiri', 'Endişe', 'Mükemmeliyetçilik'],
    relationshipStyle: 'Yardımsever ve sadık; pratik gösterilerde bulunur',
    careerAptitudes: ['Sağlık', 'Analiz', 'Editörlük', 'Hayvan bakımı', 'Arşiv'],
  },
  'Terazi': {
    coreMotivation: 'Denge bulmak, güzellik yaratmak, adalet sağlamak',
    strengths: ['Diplomasi', 'Estetik', 'Adalet duygusu', 'Sosyallik'],
    challenges: ['Kararsızlık', 'Bağımlılık', 'Yüzeysel uyum'],
    relationshipStyle: 'İlişki odaklı; partneriyle bütünleşme arzusu güçlüdür',
    careerAptitudes: ['Hukuk', 'Diplomasi', 'Moda', 'Danışmanlık', 'Sanat'],
  },
  'Akrep': {
    coreMotivation: 'Derinliğe dalmak, dönüşmek, güç ve anlam aramak',
    strengths: ['Sezgi', 'Dayanıklılık', 'Araştırmacılık', 'Tutkulu bağlılık'],
    challenges: ['Kontrol', 'Kıskançlık', 'Gizlilik', 'İntikam'],
    relationshipStyle: 'Tümüyle ve derinden sever; ihanet affedilmez',
    careerAptitudes: ['Psikoloji', 'Araştırma', 'Finans', 'Tıp', 'Dedektiflik'],
  },
  'Yay': {
    coreMotivation: 'Keşfetmek, öğretmek, anlam aramak, özgürlük',
    strengths: ['Optimizm', 'Felsefe', 'Macera', 'Dürüstlük'],
    challenges: ['Patavatsızlık', 'Taahhüt korkusu', 'Aşırılık'],
    relationshipStyle: 'Özgürlükseven ama bağlı; zihinsel uyum şart',
    careerAptitudes: ['Akademi', 'Yayıncılık', 'Seyahat', 'Hukuk', 'Felsefe'],
  },
  'Oğlak': {
    coreMotivation: 'İnşa etmek, başarmak, otorite kazanmak, kalıcı eser bırakmak',
    strengths: ['Disiplin', 'Strateji', 'Dayanıklılık', 'Pragmatizm'],
    challenges: ['Soğukluk', 'İşkoliklik', 'Kontrol', 'Pesimizm'],
    relationshipStyle: 'Yavaş ısınır ama sadık; güven inşa edilir',
    careerAptitudes: ['Yöneticilik', 'Mühendislik', 'Finans', 'Hukuk', 'Mimarlık'],
  },
  'Kova': {
    coreMotivation: 'Yenilik yapmak, özgürleştirmek, topluluk için çalışmak',
    strengths: ['Özgünlük', 'İnsan sevgisi', 'Teknoloji', 'Bağımsızlık'],
    challenges: ['Duygusal mesafe', 'Asilik', 'Mantık üstünlüğü'],
    relationshipStyle: 'Arkadaş gibi; özgürlüğüne saygı şart',
    careerAptitudes: ['Teknoloji', 'Sosyal hizmet', 'Bilim', 'Mucitlik', 'Aktivizm'],
  },
  'Balık': {
    coreMotivation: 'Birleşmek, şifa vermek, ruhsal anlam aramak',
    strengths: ['Empati', 'Yaratıcılık', 'Sezgi', 'Spiritüellik'],
    challenges: ['Sınır karmaşası', 'Kaçış', 'Kurban rolü', 'Kararsızlık'],
    relationshipStyle: 'Romantik ve fedakâr; ruhsal bağ arar',
    careerAptitudes: ['Sanat', 'Müzik', 'Şifa', 'Psikoloji', 'Denizcilik'],
  },
};

const ELEMENT_INTERPRETATIONS: Record<string, {
  personality: string;
  spiritualGift: string;
  shadow: string;
}> = {
  'Ateş': {
    personality: 'Enerjik, cesur, girişimci ve tutkulusunuz. Harekete geçmekten korkmazsınız.',
    spiritualGift: 'İlham verme ve başkalarını harekete geçirme gücü',
    shadow: 'Sabırsızlık, öfke patlamaları, başkalarını yakma riski',
  },
  'Toprak': {
    personality: 'Pratik, güvenilir, sabırlı ve somut sonuçlar üreten birisiniz.',
    spiritualGift: 'Bolluk ve güvenlik yaratma; başkalarını besleme',
    shadow: 'Aşırı tutuculuk, maddesellik, değişime direnç',
  },
  'Hava': {
    personality: 'Zihinsel olarak meraklı, iletişimci, sosyal ve fikir odaklısınız.',
    spiritualGift: 'Bilgi aktarımı ve farklı bakış açıları sunma',
    shadow: 'Duygusal mesafe, yüzeysellik, aşırı analiz',
  },
  'Su': {
    personality: 'Duygusal, sezgisel, derin ve empati dolu birisiniz.',
    spiritualGift: 'Şifa ve dönüşüm; derin duygusal anlayış',
    shadow: 'Aşırı duygusallık, kurban rolü, sınır karmaşası',
  },
};

const HOUSE_MEANINGS: Record<number, string> = {
  1: 'kimlik, dış görünüm, beden, yaklaşım tarzı',
  2: 'para, değerler, güvenlik, yetenekler',
  3: 'iletişim, kardeşler, kısa seyahatler, öğrenme',
  4: 'aile, ev, kökler, iç dünya, anne figürü',
  5: 'aşk, yaratıcılık, çocuklar, keyif, risk',
  6: 'iş, sağlık, rutin, hizmet, detaylar',
  7: 'ilişkiler, evlilik, ortaklıklar, açık düşmanlar',
  8: 'dönüşüm, ortak kaynaklar, miras, cinsellik, psişik güçler',
  9: 'felsefe, yüksek öğrenim, seyahat, inanç, genişleme',
  10: 'kariyer, statü, toplumsal rol, baba figürü, otorite',
  11: 'arkadaşlık, gruplar, idealler, gelecek, teknoloji',
  12: 'bilinçaltı, spiritüellik, gizli düşmanlar, yalnızlık, şifa',
};

// ─── Helper Functions ──────────────────────────────────────────────

function getDominantElement(balance: Record<string, number>): 'Ateş' | 'Toprak' | 'Hava' | 'Su' {
  const entries = Object.entries(balance).sort((a, b) => b[1] - a[1]);
  return (entries[0]?.[0] || 'Ateş') as 'Ateş' | 'Toprak' | 'Hava' | 'Su';
}

function getDominantQuality(sunSign: ZodiacSign, moonSign: ZodiacSign, ascendant: ZodiacSign | null): 'Öncü' | 'Sabit' | 'Değişken' {
  const counts = { 'Öncü': 0, 'Sabit': 0, 'Değişken': 0 };
  const signs = [sunSign, moonSign, ascendant].filter(Boolean) as ZodiacSign[];
  for (const sign of signs) {
    const q = ZODIAC_QUALITIES[sign];
    counts[q]++;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0][0] as 'Öncü' | 'Sabit' | 'Değişken';
}

function getPlanetInHouseInterpretation(planet: PlanetPosition, houseNumber: number | null): string {
  const houseDesc = houseNumber ? HOUSE_MEANINGS[houseNumber] || 'hayat alanı' : 'perde arkasında (ev bilinmiyor)';
  return `${planet.nameTr} ${planet.formatted} — ${houseDesc} alanında ${planet.isRetrograde ? 'retrograde ' : ''}konumlanıyor.`;
}

function generateLifeThemes(chart: BirthChart): string[] {
  const themes: string[] = [];

  // Element tema
  const dominantEl = getDominantElement(chart.elementBalance);
  themes.push(`${dominantEl} elementinin baskınlığı: ${ELEMENT_INTERPRETATIONS[dominantEl].personality}`);

  // Güneş-Ay ilişkisi
  const sunMoonDiff = Math.abs(
    chart.planets.find(p => p.name === 'Sun')!.longitude -
    chart.planets.find(p => p.name === 'Moon')!.longitude
  );
  const phase = sunMoonDiff > 180 ? 360 - sunMoonDiff : sunMoonDiff;
  if (phase < 10) themes.push('Yeni Ay doğumlu: Yeni başlangıçlar, taze enerji, kaderinizi kendiniz yaratma teması');
  else if (phase > 170) themes.push('Dolunay doğumlu: Tamamlama, ilişkilerde dramatik zirveler, içsel çatışma ve aydınlanma');
  else if (phase > 80 && phase < 100) themes.push('İlk Dördün / Son Dördün: Eyleme geçme, engelleri aşma, karar verme teması');

  // Retrograde gezegenler
  const retrogrades = chart.planets.filter(p => p.isRetrograde);
  if (retrogrades.length > 0) {
    themes.push(`Retrograde gezegenler (${retrogrades.map(p => p.nameTr).join(', ')}): İçselleştirilmiş, derinlemesine çalışılması gereken alanlar`);
  }

  // Yükselen varsa
  if (chart.ascendant) {
    themes.push(`Yükselen ${chart.ascendant}: Dünyaya ${SIGN_INTERPRETATIONS[chart.ascendant].coreMotivation} ile yaklaşırsınız`);
  }

  return themes;
}

function generateSpiritualGifts(chart: BirthChart): string[] {
  const gifts: string[] = [];
  const dominantEl = getDominantElement(chart.elementBalance);
  gifts.push(ELEMENT_INTERPRETATIONS[dominantEl].spiritualGift);

  // Ay burcuna göre sezgi
  const moonSign = chart.moonSign;
  if (['Yengeç', 'Akrep', 'Balık'].includes(moonSign)) {
    gifts.push('Güçlü sezgi ve empati yeteneği');
  }
  if (['Koç', 'Aslan', 'Yay'].includes(moonSign)) {
    gifts.push('İlham verici ve motive edici enerji');
  }

  // Merkür konumu
  const mercury = chart.planets.find(p => p.name === 'Mercury');
  if (mercury && ['İkizler', 'Başak', 'Kova'].includes(mercury.sign)) {
    gifts.push('Analitik zekâ ve iletişim yeteneği');
  }

  // Jüpiter konumu
  const jupiter = chart.planets.find(p => p.name === 'Jupiter');
  if (jupiter) {
    gifts.push(`Şans ve bolluk ${jupiter.formatted} bölgesinde sizinle`);
  }

  return gifts;
}

function generateShadowWork(chart: BirthChart): string[] {
  const shadows: string[] = [];
  const dominantEl = getDominantElement(chart.elementBalance);
  shadows.push(ELEMENT_INTERPRETATIONS[dominantEl].shadow);

  // Satürn zorlukları
  const saturn = chart.planets.find(p => p.name === 'Saturn');
  if (saturn) {
    shadows.push(`Satürn ${saturn.formatted}: Hayat dersleri ve sorumluluk alanı`);
  }

  // Plüton dönüşüm alanı
  const pluto = chart.planets.find(p => p.name === 'Pluto');
  if (pluto) {
    shadows.push(`Plüton ${pluto.formatted}: Güç, kontrol ve derin dönüşüm temaları`);
  }

  return shadows;
}

// ─── Main Profile Generator ────────────────────────────────────────

export function generateAstrologyProfile(chart: BirthChart): UserAstrologyProfile {
  const sunInterp = SIGN_INTERPRETATIONS[chart.sunSign];
  const moonInterp = SIGN_INTERPRETATIONS[chart.moonSign];
  const ascInterp = chart.ascendant ? SIGN_INTERPRETATIONS[chart.ascendant] : null;

  const dominantElement = getDominantElement(chart.elementBalance);
  const dominantQuality = getDominantQuality(chart.sunSign, chart.moonSign, chart.ascendant);

  // Planet highlights
  const planetHighlights: PlanetHighlight[] = chart.planets
    .filter(p => ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].includes(p.name))
    .map(p => {
      const house = chart.houses?.find(h => {
        // Planet is in this house if it's after the cusp and before the next cusp
        const nextCusp = chart.houses![h.index % 12].cuspLongitude;
        const cusp = h.cuspLongitude;
        if (cusp < nextCusp) {
          return p.longitude >= cusp && p.longitude < nextCusp;
        } else {
          // Wrap around 360
          return p.longitude >= cusp || p.longitude < nextCusp;
        }
      });

      return {
        planet: p.nameTr,
        sign: p.sign,
        house: house?.index || null,
        interpretation: getPlanetInHouseInterpretation(p, house?.index || null),
        isRetrograde: p.isRetrograde,
      };
    });

  // Build narrative
  let narrative = `# ${chart.sunSign} Burcu Astroloji Profili\n\n`;
  narrative += `## Temel Üçlü\n`;
  narrative += `- **Güneş ${chart.sunSign}**: ${sunInterp.coreMotivation}\n`;
  narrative += `- **Ay ${chart.moonSign}**: ${moonInterp.coreMotivation}\n`;
  if (chart.ascendant) {
    narrative += `- **Yükselen ${chart.ascendant}**: ${ascInterp!.coreMotivation}\n`;
  }
  narrative += `\n## Element ve Kalite\n`;
  narrative += `- Baskın Element: **${dominantElement}**\n`;
  narrative += `- Baskın Kalite: **${dominantQuality}**\n`;
  narrative += `\n## Güçlü Yönler\n`;
  sunInterp.strengths.forEach(s => narrative += `- ${s}\n`);
  narrative += `\n## Zorluklar\n`;
  sunInterp.challenges.forEach(c => narrative += `- ${c}\n`);
  narrative += `\n## Gezegen Konumları\n`;
  planetHighlights.forEach(ph => {
    narrative += `- ${ph.interpretation}\n`;
  });
  narrative += `\n## Önemli Açılar\n`;
  chart.majorAspects.forEach(a => {
    narrative += `- ${a.planetA} ${a.typeTr} ${a.planetB} (orb ${a.orb}°)\n`;
  });

  return {
    sunSign: chart.sunSign,
    moonSign: chart.moonSign,
    ascendant: chart.ascendant,
    dominantElement,
    dominantQuality,
    elementBalance: chart.elementBalance,
    personalitySummary: `${chart.sunSign} Güneş'i ile ${sunInterp.coreMotivation} güdüsüne sahipsiniz. ` +
      `${chart.moonSign} Ay'ı duygusal dünyanıza ${moonInterp.coreMotivation.toLowerCase()} yaklaşımı getiriyor.` +
      (chart.ascendant ? ` Yükselen ${chart.ascendant} ise dış dünyaya ${ascInterp!.coreMotivation.toLowerCase()} şeklinde yansıyor.` : ''),
    coreMotivation: sunInterp.coreMotivation,
    emotionalStyle: moonInterp.coreMotivation,
    outwardPersona: ascInterp?.coreMotivation || null,
    strengths: sunInterp.strengths,
    challenges: sunInterp.challenges,
    lifeThemes: generateLifeThemes(chart),
    relationshipStyle: sunInterp.relationshipStyle,
    careerAptitudes: sunInterp.careerAptitudes,
    spiritualGifts: generateSpiritualGifts(chart),
    shadowWork: generateShadowWork(chart),
    planetHighlights,
    narrative,
  };
}
