/**
 * AI Prompt Builder - Mistik Tarot Yorumlama
 * 
 * Bu modül, kart çekiminden AI'ın anlayacağı zengin bir prompt'a kadar
 * tüm katmanları birleştirir.
 * 
 * Katmanlar:
 * 1. Sistem promptu (mistik ton, kurallar)
 * 2. Kart verileri (anlamlar, düz/ters)
 * 3. Pozisyon anlamları (Celtic Cross gibi açılımlarda)
 * 4. Niyet kategorisi modifier'ı
 * 5. Astro bağlam (natal + transits)
 * 6. Önceki fal bağlamı (son 3 falın özeti)
 */

import type { TarotCard } from '@/lib/tarot/cards';

export interface PromptCard {
  card: TarotCard;
  isReversed: boolean;
  positionIndex: number;
  positionLabel?: string;
  positionMeaning?: string;
}

export interface PromptAstroContext {
  natal?: {
    sun: string;       // "Akrep 12°"
    moon: string;
    ascendant: string;
    key_aspects?: string[];  // ["Güneş kare Satürn"]
  };
  transits?: {
    date: string;
    major_transits: Array<{
      planet: string;
      sign: string;
      degree: string;
      aspect?: string;
      note?: string;
    }>;
  };
}

export interface PromptPreviousReading {
  drawnAt: string;       // ISO date
  intentionCategory: string;
  intentionText?: string;
  cardsSummary: string;  // "The Lovers (düz), 2 of Cups (ters)"
  aiSummary: string;     // 50-100 kelime
  keyThemes: string[];
  predictedArc: string;
}

export interface LifeStageInfo {
  age: number;
  stageName: string;
  stageThemes: string;
  toneGuidance: string;
}

/**
 * Doğum tarihinden yaş ve hayat evresi tespiti
 */
export function calculateLifeStage(birthDateStr?: string): LifeStageInfo | null {
  if (!birthDateStr) return null;
  try {
    const birth = new Date(birthDateStr);
    if (isNaN(birth.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    if (age < 12 || age > 110) return null;

    if (age <= 17) {
      return {
        age,
        stageName: 'İlk Gençlik & Kendini Keşfetme (Ergenlik / Okul)',
        stageThemes: 'Okul ortamı, sınav baskısı, arkadaş çevresinde kabul görme, aileyle bağımsızlık sınırları, ilk masum heyecanlar ve duygusal dalgalanmalar.',
        toneGuidance: 'Ağır iş ortaklığı, evlilik veya gayrimenkul konularına ASLA girme. Karşında genç bir ruh olduğunu bil; okul stresi, gelecek belirsizliği, arkadaşlıklar ve kalbindeki ilk kıpırtılar üzerinden şefkatle konuş.',
      };
    } else if (age <= 24) {
      return {
        age,
        stageName: 'Genç Yetişkinlik & Yol Ayrımı (Üniversite / Gelecek İnşası)',
        stageThemes: 'Üniversite/eğitim, meslek seçimi, ilk kariyer adımları, "Ben kimim ve bu dünyadaki yerim neresi?" arayışı, tutkulu aşklar, özgürlük ve sorumluluk çatışması.',
        toneGuidance: 'Gelecek kaygısını, hayalleri ile gerçekler arasındaki sıkışmışlığını ve kalbindeki coşkulu/kırılgan aşk enerjisini yakala. Cesaret veren bir yol gösterici ol.',
      };
    } else if (age <= 35) {
      return {
        age,
        stageName: 'Hayat İnşası & Köklenme (Kariyer & Ciddiyet Dönemi)',
        stageThemes: 'Kariyerde yükselme, maddi güç kazanma, ilişkilerde ciddiyet/evlilik/uzun vadeli bağlar, çevredeki sahte dostlukları eleme, hayat rotasını sabitleme.',
        toneGuidance: 'Sorumlulukların ağırlığını taşıyan, hem kalbinde hem işinde sağlam adımlar atmak isteyen kararlı ama zaman zaman yorgun ruh haline hitap et. Kararlılık ve iç huzur aşıla.',
      };
    } else if (age <= 50) {
      return {
        age,
        stageName: 'Olgunluk & Hayat Muhasebesi (Dönüşüm & İçsel Değerler)',
        stageThemes: 'Yılların getirdiği tecrübe, aile ve çocuk sorumlulukları, "Ben başkaları için çok koştum, peki ben kendim için ne yaptım?" sorusu, ikinci bahar arzusu.',
        toneGuidance: 'Hayat tecrübesine saygı duyan, fedakarlıklarının kıymetini bilen, içsel huzur ve ikinci bir uyanış arayışına rehberlik eden bilge, derin ve anlayışlı bir ton kullan.',
      };
    } else {
      return {
        age,
        stageName: 'Bilgelik & Ruhsal Dinginlik',
        stageThemes: 'Hayatın iniş çıkışlarını görmüş geçirmişlik, manevi derinlik, aileye ve sevdiklerine dingin bir koruyuculuk, içsel barış ve özgürleşme.',
        toneGuidance: 'Derin saygı, dinginlik, manevi zenginlik ve zamansız bir bilgelik diliyle konuş.',
      };
    }
  } catch {
    return null;
  }
}

export interface BuildPromptParams {
  cards: PromptCard[];
  spreadName?: string;
  intentionText?: string;
  intentionCategory?: {
    nameTr: string;
    promptModifierTr: string;
  };
  astroContext?: PromptAstroContext;
  previousReadings?: PromptPreviousReading[];
  userDisplayName?: string;
  birthDate?: string;
  lifeStage?: LifeStageInfo | null;
}

/**
 * Mistik Tarot Sistem Promptu
 * Faladdin samimiyeti + Kadim Bilgelik + Yaş Evresi Empatisi
 */
export const MYSTIC_TAROT_SYSTEM_PROMPT = `Sen kadim sezgilere sahip, insanın içini bir ayna gibi gören, son derece derin, şefkatli ve bilge bir falcısın.
Sen soğuk bir ansiklopedi veya kitap kurdu değilsin. Karşında oturan insanın gözlerinin içine bakan, yüreğindeki o dile dökülemeyen kırgınlığı, umudu ve tereddütleri bir bakışta hisseden bilge bir yol arkadaşısın.

TEMEL YAKLAŞIM VE SES TONUN:
- İÇİNİ OKUYAN SICAKLIK: Sanki danışanınla loş bir odada baş başa oturmuş, elini tutmuş gibi konuş. Faladdin gibi insanın en gizli duygusal noktalarına dokun; kalbinde taşıdığı ağırlığı, son zamanlarda uyutmayan düşünceleri hissettir.
- YAŞ VE HAYAT EVRESİNE HASSASİYET: Eğer kullanıcının yaşı ve hayat evresi verilmişse, tüm metaforlarını ve hayat bağlamını o yaşa göre kur. 17 yaşındaki birine okul, sınav ve gençlik duyguları; 30 yaşındaki birine kariyer, köklenme ve ciddi bağlar; 45 yaşındakine hayat muhasebesi üzerinden konuş.
- CİNSİYET İNCELİĞİ: İsimden asla cinsiyet tahmini YAPMA (Ali kadın da olabilir, Deniz/Görkem uniseks olabilir). Asla önyargılı cinsiyet kalıplarına girme. İlişkilerden bahsederken "Aklındaki o kişi", "Bağ kurduğun insan", "Kalbinde yer eden ruh" gibi evrensel, incelikli ifadeler kullan.
- TEKNİK RAPOR GİBİ DEĞİL, BİR ROMAN GİBİ: Kartların Latince veya mitolojik isimlerini liste halinde ders verir gibi sıralama! Kartları bir nehrin akışı gibi birbirine bağla. Kartların sembollerini kullanıcının gerçek hayatındaki bir duyguya, bir olaya veya dönüm noktasına dönüştür.
- NİYETİ MERKEZE AL: Kullanıcının aklındaki soru veya niyet falın can damarıdır. Girişten itibaren her kartı doğrudan bu niyetin etrafında ör.
- DİL: Büyüleyici, akıcı, zengin ve pürüzsüz bir Türkçe. Asla mekanik ("Sonuç olarak", "Özetle") ifadeler kullanma.

YASAKLAR:
- "Kozmik arkaların perdesi aralanırken Hermes'in asası..." gibi soğuk, soyut, anlaşılmaz okültist ezberler KULLANMA.
- Tıbbi veya kesin hukuki hüküm verme.
- İngilizce kelimeler ve emoji KULLANMA.
- Markdown başlıkları (# ##) kullanma; düz metin halinde, nefes alan paragraflarla yaz.

FALIN AKIŞI:
1. GİRİŞ: İnsanın ruhunu titreten, kalbindeki son zamanlardaki ruh halini yakalayan samimi bir cümleyle başla (Örn: "Gözlerini kapa ve derin bir nefes al sevgili [İsim]... Biliyorum, son zamanlarda dışarıya karşı güçlü dururken içinde kimseye anlatamadığın sessiz bir düğüm taşıyorsun...").
2. NİYET VE DURUM: Kullanıcının sorusunu kalpten kucakla ve kartların bu soruya nasıl bir ayna tuttuğunu aç.
3. KARTLARIN DİYALOĞU: Pozisyonları sırayla ama birbirine bağlayarak anlat. Geçmişin bıraktığı iz, bugünkü his ve önündeki kapı bir hikaye gibi aksın.
4. GÖKYÜZÜ / ASTRO DOKUNUŞU: Burç veya gökyüzü bilgisi varsa, bunu süs olarak değil, kullanıcının fıtratını ("Senin o sabırlı ve sadık doğan...") açıklamak için doğal bir tonda geçir.
5. BİLGE KAPANIŞ: Kalbe su serpen bir nasihat, içsel bir farkındalık sorusu veya bir niyet ritüeli ile veda et.

Sen kalplerin aynasısın. Şimdi danışanının ruhuna dokun.`;

/**
 * Ana prompt builder fonksiyonu
 */
export function buildReadingPrompt(params: BuildPromptParams): string {
  const sections: string[] = [];
  
  // 1. Fal Tipi ve Niyet
  sections.push(buildIntentionSection(params));
  
  // 2. Astro Bağlam
  if (params.astroContext) {
    sections.push(buildAstroSection(params.astroContext));
  }
  
  // 3. Önceki Fal Bağlamı
  if (params.previousReadings && params.previousReadings.length > 0) {
    sections.push(buildPreviousReadingsSection(params.previousReadings));
  }
  
  // 4. Çekilen Kartlar
  sections.push(buildCardsSection(params.cards));
  
  // 5. Yorumlama Talimatı
  sections.push(buildInterpretationInstruction(params));
  
  return sections.join('\n\n---\n\n');
}

function buildIntentionSection(params: BuildPromptParams): string {
  const parts: string[] = [];
  
  parts.push('[FAL BAĞLAMI]');
  
  if (params.spreadName) {
    parts.push(`Açılım: ${params.spreadName}`);
  }
  
  if (params.intentionCategory) {
    parts.push(`Niyet kategorisi: ${params.intentionCategory.nameTr}`);
  }
  
  if (params.intentionText) {
    parts.push(`Kullanıcının niyeti: "${params.intentionText}"`);
  }
  
  if (params.intentionCategory?.promptModifierTr) {
    parts.push(`Niyet modifier: ${params.intentionCategory.promptModifierTr}`);
  }
  
  if (params.userDisplayName) {
    parts.push(`Danışanın adı: ${params.userDisplayName}`);
  }
  
  if (params.lifeStage) {
    parts.push(`Danışanın Yaşı ve Hayat Evresi: ${params.lifeStage.age} Yaşında - ${params.lifeStage.stageName}`);
    parts.push(`Bu Yaşın Hayat Temaları: ${params.lifeStage.stageThemes}`);
    parts.push(`Bu Yaşa Özel Üslup Rehberi: ${params.lifeStage.toneGuidance}`);
  }
  
  return parts.join('\n');
}

function buildAstroSection(astro: PromptAstroContext): string {
  const parts: string[] = ['[ASTROLOJİK BAĞLAM]'];
  
  if (astro.natal) {
    parts.push('Doğum Haritası (Natal Chart):');
    parts.push(`- Güneş: ${astro.natal.sun}`);
    parts.push(`- Ay: ${astro.natal.moon}`);
    parts.push(`- Yükselen: ${astro.natal.ascendant}`);
    if (astro.natal.key_aspects && astro.natal.key_aspects.length > 0) {
      parts.push(`- Önemli açılar: ${astro.natal.key_aspects.join(', ')}`);
    }
  }
  
  if (astro.transits) {
    parts.push(`\nGüncel Transitler (${astro.transits.date}):`);
    for (const t of astro.transits.major_transits) {
      let line = `- ${t.planet} ${t.sign} ${t.degree}`;
      if (t.aspect) line += ` (${t.aspect})`;
      if (t.note) line += ` - ${t.note}`;
      parts.push(line);
    }
  }
  
  parts.push('\nAstrolojik bağlamı tarot kartlarının sembolik diliyle harmanla. Gezegen-burç-kart karşılıklarını kadim gelenekten al. Transitlerin etkisini "şu anki gökyüzü" olarak yorumla.');
  
  return parts.join('\n');
}

function buildPreviousReadingsSection(readings: PromptPreviousReading[]): string {
  const parts: string[] = ['[ÖNCEKİ FAL BAĞLAMI - Son ' + readings.length + ' Fal]'];
  
  parts.push('Bu fal, kullanıcının önceki fallarından gelen enerji akışının devamıdır. Önceki fal referanslarını doğal şekilde, kullanıcıyı zorlamadan dokundur.');
  parts.push('');
  
  readings.forEach((reading, idx) => {
    const date = new Date(reading.drawnAt).toLocaleDateString('tr-TR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    parts.push(`Fal ${idx + 1} (${date}, niyet: ${reading.intentionCategory}):`);
    if (reading.intentionText) {
      parts.push(`Soru: "${reading.intentionText}"`);
    }
    parts.push(`Kartlar: ${reading.cardsSummary}`);
    parts.push(`Özet: ${reading.aiSummary}`);
    parts.push(`Ana temalar: ${reading.keyThemes.join(', ')}`);
    parts.push(`Gelişim çizgisi: ${reading.predictedArc}`);
    parts.push('');
  });
  
  parts.push('YORUMLAMA: Mevcut falı yorumlarken, önceki falın gelişim çizgisini takip et. Kartlar arasındaki bağlantıları kur. Eğer önceki falda "sabır" teması varsa ve bu falda da sabır kartları geldiyse, bu tekrarı işaret et. Ama mekanik bir şekilde "önceki falda şöyle demiştik" deme; mistik akışa doğal dokundur.');
  
  return parts.join('\n');
}

function buildCardsSection(cards: PromptCard[]): string {
  const parts: string[] = ['[ÇEKİLEN KARTLAR]'];
  
  cards.forEach((pc, idx) => {
    const card = pc.card;
    const orientation = pc.isReversed ? 'TERS' : 'DÜZ';
    
    parts.push(`\nKart ${idx + 1}${pc.positionLabel ? ` - ${pc.positionLabel}` : ''}:`);
    parts.push(`İsim: ${card.nameTr} (${card.name})`);
    parts.push(`Yön: ${orientation}`);
    parts.push(`Arcana: ${card.arcanaType === 'major' ? 'Büyük Arkana' : 'Küçük Arkana'}`);
    if (card.suit) {
      parts.push(`Suit: ${card.suit}`);
    }
    parts.push(`Element: ${card.element || 'belirtilmemiş'}`);
    if (card.astrologicalCorrespondence) {
      parts.push(`Astrolojik karşılık: ${card.astrologicalCorrespondence}`);
    }
    if (card.numerologyKey) {
      parts.push(`Sayısal anahtar: ${card.numerologyKey}`);
    }
    
    if (pc.positionMeaning) {
      parts.push(`Pozisyon anlamı: ${pc.positionMeaning}`);
    }
    
    parts.push(`Anahtar kelimeler (${pc.isReversed ? 'ters' : 'düz'}): ${(pc.isReversed ? card.keywordsReversed : card.keywordsUpright).join(', ')}`);
    parts.push(`Geleneksel anlam: ${pc.isReversed ? card.meaningsReversed : card.meaningsUpright}`);
  });
  
  return parts.join('\n');
}

function buildInterpretationInstruction(params: BuildPromptParams): string {
  const parts: string[] = ['[YORUMLAMA TALİMATI]'];
  
  parts.push('Yukarıdaki tüm bağlamı bir araya getirerek, kadim tarot geleneğine uygun mistik bir fal yorumu yaz.');
  parts.push('');
  parts.push('ÖNCELİK SIRASI:');
  parts.push('1. KULLANICININ NİYETİ & RUH HALİ — Falın kalbidir. Danışanın hislerini, yorgunluğunu veya arayışını doğrudan yakala.');
  if (params.lifeStage) {
    parts.push(`2. YAŞ VE HAYAT DÖNEMİ REZONANSI — Danışan ${params.lifeStage.age} yaşında (${params.lifeStage.stageName}). Metaforlarını ve tavsiyelerini bu yaşın gerçek duygusal iklimine (eğitim/iş/ilişki/sorumluluk) göre ayarla.`);
  }
  parts.push(`${params.lifeStage ? '3' : '2'}. ÇEKİLEN KARTLARIN HİKAYESİ — Pozisyonları bir ders veya rapor gibi değil, akıcı bir roman gibi birbirine bağlayarak anlat.`);
  parts.push(`${params.lifeStage ? '4' : '3'}. KARTLAR ARASI DİYALOG — Kartların birbirine verdiği gizli mesajları ve nihai çıkış kapısını göster.`);
  if (params.astroContext) {
    parts.push(`${params.lifeStage ? '5' : '4'}. ASTROLOJİK FITRAT — Doğum haritası ve gökyüzü transitlerini danışanın kişiliğini ve bugünkü enerjisini aydınlatmak için doğal biçimde kullan.`);
  }
  parts.push('KAPANIŞ: Danışana kalbini ferahlatacak, içindeki düğümü çözecek bilgece bir tavsiye, içsel bir farkındalık sorusu veya minik bir rahatlatıcı ritüel bırak.');
  
  parts.push('');
  parts.push('YASAK: Asla ansiklopedik veya mekanik anlatma ("Bu kart genel olarak şunu temsil eder" demek YASAK). Kartın anlamını danışanın hayatındaki canlı bir hisse ve duruma dönüştür.');
  parts.push('');
  parts.push('Önemli: Fal, kullanıcının özgür iradesine saygı duyar. Geleceği kesin olarak bildirme. Sembolik dili koru ama belirsiz olma. Mistik ama işlevsel ol.');
  
  return parts.join('\n');
}

/**
 * Fal tamamlandıktan sonra özet, ana temalar ve gelişim çizgisi çıkar
 * Bu, sonraki falarda bağlam olarak kullanılacak
 */
export const SUMMARY_EXTRACTION_PROMPT = `Yukarıdaki fal yorumunu analiz et ve aşağıdaki formatta özetle:

[ÖZET] (50-100 kelime, üçüncü tekil şahıs, mistik tonu koru):
Falın ana hatlarını, hangi konulara odaklanıldığını, hangi kartların öne çıktığını kısa ve öz bir şekilde yaz.

[ANA TEMALAR] (virgülle ayrılmış 3-5 tema):
Falın merkezindeki temalar. Örnek: ilişki, sabır, dönüşüm, geçmişin affı

[GELİŞİM ÇİZGİSİ] (1-2 cümle):
Bu falın öngördüğü, sonraki fallarda takip edilebilecek gelişim çizgisi. Örnek: "Açık iletişim kurulduğunda ilişki yenilenebilir; önümüzdeki haftalarda sabır testi gelebilir."

Sadece bu formatı kullan, başka metin ekleme.`;
