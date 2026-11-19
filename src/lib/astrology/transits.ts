// @ts-nocheck
/**
 * Günlük Transit Hesaplamaları
 *
 * Bugünkü gezegen pozisyonlarını kullanıcının doğum haritasıyla karşılaştırır.
 * Aktif transitleri, açıları ve kişiselleştirilmiş yorumları üretir.
 */

import {
  calculateTransits,
  calculateChart,
  toJulianDate,
  type Transit,
  type TransitResult,
} from 'celestine';
import { type BirthChart } from './celestine-adapter';
import { longitudeToSign, type ZodiacSign } from './zodiac';

// ─── Interfaces ────────────────────────────────────────────────────

export type LifeArea = 'ask' | 'is' | 'para' | 'saglik';

export interface AreaEffect {
  area: LifeArea;
  areaTr: string;
  effect: string;
}

export interface AreaForecast {
  area: LifeArea;
  title: string;
  summary: string;
  transitCount: number;
  effects: string[];
}

export interface DailyTransit {
  transitingBody: string;
  transitingBodyTr: string;
  natalPoint: string;
  natalPointTr: string;
  aspectType: string;
  aspectTypeTr: string;
  symbol: string;
  deviation: number;
  orb: number;
  phase: string;
  phaseTr: string;
  strength: number;
  isRetrograde: boolean;
  transitSign: string;
  transitSignTr: string;
  signMeaning: string;
  natalHouse: number | null;
  houseMeaning: string;
  interpretation: string;
  areaEffects: AreaEffect[];
  advice: string;
}

export interface DailyTransitReport {
  date: string;
  julianDay: number;
  overallTheme: string;
  overallAdvice: string;
  activeTransits: DailyTransit[];
  significantTransits: DailyTransit[];
  areaForecasts: Record<LifeArea, AreaForecast>;
  retrogradePlanets: string[];
  moonPhase: string;
  moonSign: ZodiacSign;
  narrative: string;
}

// ─── Mapping Tables ────────────────────────────────────────────────

const BODY_NAMES_TR: Record<string, string> = {
  Sun: 'Güneş', Moon: 'Ay', Mercury: 'Merkür', Venus: 'Venüs',
  Mars: 'Mars', Jupiter: 'Jüpiter', Saturn: 'Satürn', Uranus: 'Uranüs',
  Neptune: 'Neptün', Pluto: 'Plüton', ASC: 'Yükselen',
};

const ASPECT_TYPE_TR: Record<string, string> = {
  conjunction: 'Konjunksiyon',
  sextile: 'Sekstil',
  square: 'Kare',
  trine: 'Üçgen',
  opposition: 'Karşıt',
};

const PHASE_TR: Record<string, string> = {
  applying: 'Yaklaşıyor',
  exact: 'Tam',
  separating: 'Ayrılıyor',
};

const SIGN_EN_TR: Record<string, string> = {
  Aries: 'Koç', Taurus: 'Boğa', Gemini: 'İkizler', Cancer: 'Yengeç',
  Leo: 'Aslan', Virgo: 'Başak', Libra: 'Terazi', Scorpio: 'Akrep',
  Sagittarius: 'Yay', Capricorn: 'Oğlak', Aquarius: 'Kova', Pisces: 'Balık',
};

// Gezegenin transit geçtiği burcun anlamı — gezegen × burç (10 × 12)
const TRANSIT_SIGN_MEANINGS: Record<string, Record<string, string>> = {
  Venus: {
    Aries: 'Aşkta girişken ve acelecisin; ilk adımı sen atarsın ama söndürmek de hızlıdır. Tutku ateşle başlar.',
    Taurus: 'Aşkta fiziksel dokunuş, sadakat ve haz ön planda. İlişki yavaş ama sağlam temelle kurulur.',
    Gemini: 'Aşk sohbetle başlar; zihinsel uyum olmadan ilgiye devam etmezsin. Flörtöz ve oyuncu bir enerji.',
    Cancer: 'Aşkta duygusal güvenlik ararsın; sevgini besleyerek gösterirsin. Aile kurma isteği güçlenir.',
    Leo: 'Aşkta dramatik ve cömertsin; ilgi ister, karşılığını büyük jestlerle verirsin.',
    Virgo: 'Aşkı pratik hizmetle gösterirsin; sevgilinin küçük ihtiyaçlarını görürsün ama eleştiriye dikkat.',
    Libra: 'Aşkın en zarif hali; uyum, denge ve romantizm ararsın. İlişki olmadan kendini eksik hissedersin.',
    Scorpio: 'Aşk ya hep ya hiç; yoğun, kıskanç ve dönüştürücü bir bağ. Yüzeysel ilişkiye tahammülün yok.',
    Sagittarius: 'Aşkta özgürlük ve macera; birlikte büyüyen, gezen, öğrenen bir ortak ararsın.',
    Capricorn: 'Aşkta ciddiyet ve sorumluluk; ilişkiyi bir yıldırım gibi kurmak istersin, israf etmezsin.',
    Aquarius: 'Aşkta özgünlük; sıra dışı, arkadaşça, geleneksel olmayan bağlar kurarsın.',
    Pisces: 'Aşkta romantik idealizm; ruhsal bağ ve fedakârlık. Sınırları netleştirmek önemli.',
  },
  Mars: {
    Aries: 'Enerji ve arzu dorukta; cesur ve doğrudansın. Harekete geçmek için beklemeye gerek yok.',
    Taurus: 'Arzu yavaş ama bitmek bilmez; fiziksel dayanıklılık ve inatçı bir tutku.',
    Gemini: 'Zihinsel enerji; sözlerle baştan çıkarırsın, tartışma da flörtün parçası olabilir.',
    Cancer: 'Arzun duygulara bağlı; güven hissettiğinde tutkun açılır, hissetmediğinde çekilirsin.',
    Leo: 'Tutku sahnede; büyük jestler, oyun ve dram. İlgisiz kalmak en büyük düşmanın.',
    Virgo: 'Arzu pratik zekayla birleşir; detaylı plan yapar, ihtiyaçları karşılayarak cazibe kurarsın.',
    Libra: 'Çekiciliğin diplomasisi; ilişkide denge ve adil paylaşım için mücadele edersin.',
    Scorpio: 'En yoğun tutku; arzun derin, kıskanç ve dönüştürücü. Yarımla yetinmezsin.',
    Sagittarius: 'Tutku macerayla birleşir; birlikte keşfeden, özgür aşk enerjisi.',
    Capricorn: 'Arzun disiplinli; hedefli, kontrollü ve uzun soluklu bir tutku. Sonuç odaklısın.',
    Aquarius: 'Deneysel tutku; alışılmadık çekimler, zihinsel uyarılma önemli.',
    Pisces: 'Tutku ve romantizm iç içe; arzun hayalperest ve empatik. Kaçış eğilimine dikkat.',
  },
  Saturn: {
    Aries: 'Sorumluluk ve bağımsızlık dersi: kendi ayakların üzerinde durmayı öğrenirsin. İlişkide "ben kimim" sorusu netleşir.',
    Taurus: 'Değerlerin sınanır: para, güvenlik ve sadakat üzerine kalıcı yapılar kurulur.',
    Gemini: 'Sözlerinin ağırlığını öğrenirsin; iletişimde disiplin ve netlik gerektirir.',
    Cancer: 'Aile ve duygusal sorumluluk themes: geçmişle yüzleşip duygusal olgunluğa adım atarsın.',
    Leo: 'Egonun sınırları: takdir beklemeden değer üretmeyi öğrenirsin. Sevgini somutlaştırırsın.',
    Virgo: 'Mükemmeliyetçilik testi: rutin, sağlık ve hizmet alanlarında disiplin kurulur.',
    Libra: 'İlişkilerde büyük sınav: ortaklıklar ya sağlam temele oturur ya da biter. Evlilik kararı olgunlaşır.',
    Scorpio: 'Güç ve güven testi: kontrole dair dersler, derin dönüşüm ve psikolojik olgunluk.',
    Sagittarius: 'İnanç ve özgürlük dersi: hayallerini disiplinle yapılandırırsın.',
    Capricorn: 'Satürn evinde: kariyer ve statü zirvesi; uzun vadeli emeklerin meyvesi.',
    Aquarius: 'Özgünlük ve topluluk dersi: kendi yolunu otoriteyle uzlaştırmayı öğrenirsin.',
    Pisces: 'Sınırlar ve rüyalar: hayalperestliği gerçekçi yapıya çevirme zamanı. Sezgi disiplinle dengelenir.',
  },
  Jupiter: {
    Aries: 'Büyüme cesaretle gelir: yeni girişimler, hızlı fırsatlar ve kendine güven patlaması.',
    Taurus: 'Bolluk maddi dünyada: para, yatırım ve konfor alanında genişleme.',
    Gemini: 'Öğrenme patlaması: yeni fikirler, yazma, öğretme ve networking ile büyüme.',
    Cancer: 'Aile ve duygusal bolluk: yuva genişler, içsel huzur büyür.',
    Leo: 'Yaratıcılık ve sahne: kendini büyük şekilde ifade etme, tanınma ve cömertlik.',
    Virgo: 'Hizmet ve sağlıkta büyüme: rutinleri geliştirip uzmanlık kazanma.',
    Libra: 'İlişkilerde şans: ortaklıklar, evlilik ve sosyal uyum alanında genişleme.',
    Scorpio: 'Derin dönüşümle büyüme: ortak kaynaklar, miras ve psikolojik derinlik.',
    Sagittarius: 'Jüpiter evinde: büyük yolculuklar, felsefe ve özgürlükte expansiyon.',
    Capricorn: 'Kariyer zirvesi: statü, otorite ve uzun vadeli hedeflerde büyüme.',
    Aquarius: 'Topluluk ve gelecek: ağlar, teknoloji ve idealler büyür.',
    Pisces: 'Spiritüel bolluk: sezgi, şefkat ve ruhsal büyüme zirvede.',
  },
  Sun: {
    Aries: 'Kimliğin cesaretle parlar: yeni başlangıçlar ve liderlik enerjisi.',
    Taurus: 'Öz değerin somutlaşır: güvenlik, sabır ve hazza odaklanırsın.',
    Gemini: 'Merak ışığın: öğrenme, iletişim ve çeşitlilik seni besler.',
    Cancer: 'Duygusal derinlik: aile, yuva ve iç dünya önem kazanır.',
    Leo: 'Işığın en parlak hali: yaratıcılık, sahne ve kendini ifade.',
    Virgo: 'Detaylarda mükemmellik: hizmet, sağlık ve analitik zihin.',
    Libra: 'Denge arayışı: ilişkiler, adalet ve estetik önceliğin.',
    Scorpio: 'Dönüşüm ışığı: derinleşme, gizemli konular ve yeniden doğuş.',
    Sagittarius: 'Anlam arayışı: seyahat, felsefe ve iyimserlik.',
    Capricorn: 'Yapısal ışık: hedefler, sorumluluk ve statü.',
    Aquarius: 'Özgün ışık: yenilik, topluluk ve gelecek vizyonu.',
    Pisces: 'Ruhun ışığı: sezgi, şefkat ve spiritüel bağlantı.',
  },
  Moon: {
    Aries: 'Duygular ateşli ve ani: tepkiler hızlı, sinir de coşku da yüksek.',
    Taurus: 'Duygusal güvenlik: haz, dokunuş ve sakinlik ihtiyacı.',
    Gemini: 'Duygular sözle işlenir: konuşarak rahatlarsın, fikirler ruhunu besler.',
    Cancer: 'Duygular en derin ve açık haldе: yuva özlemi ve besleme içgüdüsü.',
    Leo: 'Duygular sahnede: ilgi ister, cömertçe seversin, gurur kolay kırılır.',
    Virgo: 'Duygular pratikleşir: sevdiğini işle gösterirsin, eleştirel olmaya dikkat.',
    Libra: 'Duygular uyum arar: paylaşmak ister, yalnızlık zor gelir.',
    Scorpio: 'Duygular derin ve yoğun: kıskançlık ve sezgi zirvede, yüzeysellik imkânsız.',
    Sagittarius: 'Duygular özgür ve iyimser: macera ruhu duyguları da taşır.',
    Capricorn: 'Duygular kontrollü: sorumluluk hissi ağır basar, sevgini işle gösterirsin.',
    Aquarius: 'Duygular mesafeli ve objektif: bağımsızlığa ihtiyaç duyar, bağı koparmaz.',
    Pisces: 'Duygular deniz gibi: empati, sanat ve kaçış eğilimi yüksek.',
  },
  Mercury: {
    Aries: 'Zihin keskin ve hızlı: hızlı kararlar, keskin sözler; aceleci olmaya dikkat.',
    Taurus: 'Zihin pratik ve sağlam: somut düşünceler, sabırlı kararlar.',
    Gemini: 'Zihin en hızlı hâli: merak, çoklu ilgi, öğrenme coşkusu.',
    Cancer: 'Zihin duygusal: sezgiyle düşünürsün, anılarla konuşursun.',
    Leo: 'Zihin kendinden emin: etkileyici anlatım, dramatik fikirler.',
    Virgo: 'Zihin analitik: detay, plan ve mükemmellik.',
    Libra: 'Zihin diplomatik: her açıdan görür, kararsızlık olabilir.',
    Scorpio: 'Zihin araştırmacı: gizliyi araştırır, derin sorular sorar.',
    Sagittarius: 'Zihin felsefi: büyük resim, iyimser fikirler, öğretme.',
    Capricorn: 'Zihin stratejik: gerçekçi planlar, ciddi kararlar.',
    Aquarius: 'Zihin özgün: sıra dışı fikirler, teknoloji ve gelecek.',
    Pisces: 'Zihin sezgisel: hayal gücü, sanat; yanıltıcı bilgiye dikkat.',
  },
  Uranus: {
    Aries: 'Özgürlük patlaması: kimliğinde ani değişimler, beklenmedik başlangıçlar.',
    Taurus: 'Değerlerde devrim: para ve güvenlik anlayışın kökten değişir.',
    Gemini: 'Zihinde şimşekler: sıra dışı fikirler, ani haberler.',
    Cancer: 'Ailede sarsıntı: yuva ve duygusal kalıplar yeniden yapılanır.',
    Leo: 'Yaratıcılıkta isyan: sıra dışı ifade, sahne değişimi.',
    Virgo: 'Rutinde devrim: iş ve sağlık sistemleri yenilenir.',
    Libra: 'İlişkilerde özgürleşme: ortaklık kalıpları yıkılır ve yeniden kurulur.',
    Scorpio: 'Derin dönüşümde sürprizler: kontrol bırakılır, gerçek ifşa olur.',
    Sagittarius: 'İnançlarda devrim: dünya görüşün ani değişir.',
    Capricorn: 'Yapılarda değişim: kariyer ve otorite kalıpları sarsılır.',
    Aquarius: 'Uranüs evinde: toplumsal dönüşümün öncüsü, geleceğin teknolojisi.',
    Pisces: 'Ruh ani uyanışlar: spiritüel deneyimler, sınırların erimesi.',
  },
  Neptune: {
    Aries: 'Hayaller eyleme karışır: romantik başlangıçlar, yanılsamalara dikkat.',
    Taurus: 'Değerler bulanıklaşır: maddi konularda idealizm, aldatmacaya dikkat.',
    Gemini: 'Zihinde sis: sezgisel düşünceler, ama bilgi bulanıklığı possible.',
    Cancer: 'Duygusal okyanus: derin empati, sınır kaybına dikkat.',
    Leo: 'Hayalperest yaratıcılık: sanatta ilham, egoda şişme riski.',
    Virgo: 'İdealizm ile gerçekçilik mücadelesi: detaylar bulanıklaşabilir.',
    Libra: 'Romantik idealizm zirvede: ilişkide masalsı beklenti, hayal kırıklığı riski.',
    Scorpio: 'Gizemli çekim: manyetik, spiritüel bağ; gizliye dikkat.',
    Sagittarius: 'Ruh yolculuğu: spiritüel arayış, mistik seyahatler.',
    Capricorn: 'Yapılar erimekte: hedeflerde netlik kaybı, gerçekçilik testi.',
    Aquarius: 'Ütopik vizyonlar: toplumsal hayaller, ağlarda bulanıklık.',
    Pisces: 'Neptün evinde: en yüksek sezgi, sanat ve spiritüellik.',
  },
  Pluto: {
    Aries: 'Kimlikte derin dönüşüm: eski benlik ölür, güçlü ben doğar.',
    Taurus: 'Maddi dönüşüm: kaynaklar, para ve değerler kökten yenilenir.',
    Gemini: 'Zihinde derin kazı: gizli bilgi, araştırmacı zihin.',
    Cancer: 'Duygusal arkeoloji: aile kalıpları kökten dönüşür.',
    Leo: 'Yaratıcı güç: sahne ve benlik üzerinden derin dönüşüm.',
    Virgo: 'Hizmette dönüşüm: rutinler, sağlık ve iş yeniden yapılandırılır.',
    Libra: 'İlişkilerde güç dönüşümü: ortaklıklar ya derinleşir ya kökten biter.',
    Scorpio: 'Plüton evinde: en derin dönüşüm, psikolojik yeniden doğuş.',
    Sagittarius: 'İnanç dönüşümü: dünya görüşü kökten değişir.',
    Capricorn: 'Yapıların yıkılışı: kariyer ve otoritede derin dönüşüm.',
    Aquarius: 'Toplumsal dönüşüm: ağlar ve gelecek vizyonu yeniden doğar.',
    Pisces: 'Ruhun dönüşümü: spiritüel derinlik, collective bilinçaltı.',
  },
};

// Doğum evi anlamları — transit hangi eve düşüyorsa o alan aydınlanır
const HOUSE_MEANINGS_TR: Record<number, { title: string; meaning: string; loveAngle: string }> = {
  1: { title: '1. Ev (Benlik)', meaning: 'kimliğin, dış görünüşün ve hayata yaklaşım tarzın', loveAngle: 'İlişkide kendini nasıl gösterdiğin değişiyor; karşındakine yansıttığın imajın etkili.' },
  2: { title: '2. Ev (Değerler)', meaning: 'para, özgüven ve kişisel değerler', loveAngle: 'İlişkide maddi güvenlik ve değer hissi gündemde; hediyeler ve ortak kaynaklar konuşuluyor.' },
  3: { title: '3. Ev (İletişim)', meaning: 'iletişim, yakın çevre ve düşünceler', loveAngle: 'Sevgilinle konuşmalar hayatının merkezi; mesajlar, kısa seyahatler ve zihinsel uyum önemli.' },
  4: { title: '4. Ev (Aile)', meaning: 'aile, yuva ve iç dünya', loveAngle: 'İlişkinin aile boyutu gündemde: birlikte yuva kurma, ailelerle tanışma, duygusal güvenlik.' },
  5: { title: '5. Ev (Aşk)', meaning: 'romantizm, flört, yaratıcılık ve keyif', loveAngle: 'AŞK EVİ! Romantizm, flört ve tutku gündemin tam merkezinde. Yeni aşk ya da mevcut ilişkide yeniden aşilanma.' },
  6: { title: '6. Ev (Rutin)', meaning: 'günlük işler, sağlık ve hizmet', loveAngle: 'İlişkinin günlük işleyişi önemli: birlikte rutin kurmak, birbirine bakmak, küçük jestler.' },
  7: { title: '7. Ev (Evlilik)', meaning: 'evlilik, ortaklıklar ve yakın ilişkiler', loveAngle: 'EVLİLİK EVİ! Ciddi ilişki konuları: taahhüt, evlilik, ortaklık ya da ayrılık kararı. İlişkiler büyük sınava oturur.' },
  8: { title: '8. Ev (Yakınlık)', meaning: 'derin yakınlık, ortak kaynaklar ve dönüşüm', loveAngle: 'YAKINLIK EVİ! Fiziksel ve duygusal derinlik, güven, cinsellik ve ortak kaynaklar (para, miras) gündemde.' },
  9: { title: '9. Ev (Anlam)', meaning: 'felsefe, seyahat ve inançlar', loveAngle: 'İlişkide ortak dünya görüşü önemli; uzak mesafe ya da yabancı biriyle bağ possible.' },
  10: { title: '10. Ev (Kariyer)', meaning: 'kariyer, statü ve toplumsal rol', loveAngle: 'İlişkin görünür oluyor: çevreye tanıtım, statü dengesi, ilişkinin geleceği konuşuluyor.' },
  11: { title: '11. Ev (Arkadaşlık)', meaning: 'arkadaşlıklar, gruplar ve umutlar', loveAngle: 'Önce arkadaşlık sonra aşk possible; ortak sosyal çevre ve gelecek hayalleri gündemde.' },
  12: { title: '12. Ev (Gizli)', meaning: 'bilinçaltı, gizli konular ve ruh sağlığı', loveAngle: 'GİZLİ AŞK EVİ! Gizli ilişkiler, tamamlanmamış duygular, ya da ilişkide içe dönüş dönemi.' },
};

// Yaşam alanları ve gezegen-alan yönetimleri
const AREA_TR: Record<LifeArea, string> = {
  ask: 'Aşk & İlişkiler',
  is: 'İş & Kariyer',
  para: 'Para & Finans',
  saglik: 'Sağlık & Enerji',
};

const PLANET_AREAS: Record<string, LifeArea[]> = {
  Sun: ['is'],
  Moon: ['saglik', 'ask'],
  Mercury: ['is', 'para'],
  Venus: ['ask', 'para'],
  Mars: ['is', 'saglik', 'ask'],
  Jupiter: ['para', 'is'],
  Saturn: ['is', 'para'],
  Uranus: ['is', 'para'],
  Neptune: ['saglik', 'para'],
  Pluto: ['para', 'is'],
};

const NATAL_POINT_AREAS: Record<string, LifeArea[]> = {
  Sun: ['is'], Moon: ['saglik', 'ask'], Mercury: ['is'],
  Venus: ['ask', 'para'], Mars: ['ask', 'saglik'], Jupiter: ['para'],
  Saturn: ['is'], Uranus: ['is'], Neptune: ['saglik'], Pluto: ['para'],
  ASC: ['saglik'],
};

const HOUSE_AREA_MAP: Record<number, LifeArea[]> = {
  1: [], 2: ['para'], 3: [], 4: [],
  5: ['ask'], 6: ['saglik', 'is'], 7: ['ask'],
  8: ['para', 'ask'], 9: [], 10: ['is'], 11: [], 12: ['saglik'],
};

const ASPECT_QUALITY: Record<string, string> = {
  trine: 'Bu akış kolay ve destekleyici',
  sextile: 'Bu fırsat kapısı açık',
  conjunction: 'Bu etki yoğun ve kaçınılmaz',
  square: 'Bu test zorlayıcı ama büyütücü',
  opposition: 'Bu gerilim denge ister',
};

// Gezegen × yaşam alanı anlamları (10 gezegen × 4 alan)
const PLANET_AREA_MEANINGS: Record<string, Record<LifeArea, string>> = {
  Sun: {
    ask: 'Aşk hayatında parlama ve görünürlük; ilişkide gurur ve tanınma gündemde',
    is: 'Kariyer ve toplumsal rolün aydınlanıyor; liderlik ve görünürlük fırsatı',
    para: 'Özgüven artışı maddi değere yansıyor; kendini değerli hissetme kazanç getirir',
    saglik: 'Vital enerji ve yaşam gücü yükseliyor; kendini yenilenmiş hissedersin',
  },
  Moon: {
    ask: 'Duygusal bağlar ve güven ihtiyacı ön planda; ilişkide empati ve yakınlık arayışı',
    is: 'İş ortamındaki duygusal dinamikler; iş arkadaşlığı ve aidiyet hissi',
    para: 'Güvenlik içgüdüsü maddi kararlara yansıyor; tasarruf ve birikim eğilimi',
    saglik: 'Ruh sağlığı ve duygusal denge öncelikli; dinlenme ve beslenme ihtiyacı',
  },
  Mercury: {
    ask: 'Sevgilinle konuşmalar ve mesajlar belirleyici; zihinsel uyum ilişkinin motoru',
    is: 'İş görüşmeleri, yazışmalar ve projelerde zihinsel canlılık; network zamanı',
    para: 'Ticari zeka ve pazarlık gücü yüksek; sözleşmeleri satır satır oku',
    saglik: 'Sinir sistemi yorgunluğuna dikkat; zihinsel dinlenme gerekli',
  },
  Venus: {
    ask: 'Aşk, çekim ve romantizm akıyor; ilişkilerde uyum ve güzellik arayışı',
    is: 'İş yerinde popülerlik ve diplomatik ilişkiler; sanatsal projeler destekli',
    para: 'Para akışı ve lüks harcamalar; estetik yatırımlar ve kazanç fırsatları',
    saglik: 'Haz ve dengenin bedene yansıması; şeker ve böbrek dengesine özen',
  },
  Mars: {
    ask: 'Tutku ve arzu yükseliyor; ilişkide ateş var ama çatışma riski de aynı anda',
    is: 'Girişimcilik ve rekabet gücü; projelere liderlik etme ve hız',
    para: 'Kazanç için mücadele ve cesur yatırımlar; acele harcamaya dikkat',
    saglik: 'Fiziksel enerji zirvede ama yaralanma ve iltihap riski; sporu dozunda yap',
  },
  Jupiter: {
    ask: 'Aşkta büyüme ve cömertlik; ilişkiyi genişletecek fırsatlar kapıda',
    is: 'Kariyerde yükselme ve tanınma; terfi ve yeni kapılar',
    para: 'Bolluk ve bereket dönemi; yatırımlar ve gelir artışı destekli',
    saglik: 'İyimserlik şifa verir ama aşırılığa dikkat; kilo ve karaciğer hassas',
  },
  Saturn: {
    ask: 'İlişkilerde ciddiyet testi; taahhüt ya da ayrılık kararı olgunlaşıyor',
    is: 'Kariyerde sorumluluk ve disiplin; emeğin karşılığı uzun vadede gelir',
    para: 'Mali disiplin ve yapılandırma; borçlarla yüzleşme ve sağlam bütçe',
    saglik: 'Enerji düşük; kemikler, dişler ve kronik yorgunluk hassas; dinlen şart',
  },
  Uranus: {
    ask: 'İlişkide beklenmedik gelişmeler; özgürlük ihtiyacı ve ani değişimler',
    is: 'Kariyerde sürpriz değişiklikler; teknoloji ve yenilik fırsatları',
    para: 'Ani kazanç veya kayıplar; beklenmedik faturalar ya da gelirler',
    saglik: 'Sinir sistemi hassas; uykusuzluk ve enerji dalgalanmaları',
  },
  Neptune: {
    ask: 'Romantik hayaller ve idealizm; ama yanılsama ve belirsizliğe dikkat',
    is: 'İşte ilham ve yaratıcılık; ama netlik kaybı ve karışıklık riski',
    para: 'Mali belirsizlik ve aldatmaca riski; sözleşmeleri iki kez oku',
    saglik: 'Bağışıklık ve uyku düzeni hassas; sezgisel şifa gücü yüksek',
  },
  Pluto: {
    ask: 'İlişkide derin dönüşüm ve güç dinamikleri; bağ ya derinleşir ya biter',
    is: 'Kariyerde güç mücadelesi ve yeniden yapılanma; dönüşüm kaçınılmaz',
    para: 'Ortak kaynaklar, borçlar ve yatırımlarda kökten değişim',
    saglik: 'Detoks ve derin iyileşme; zorlu ama dönüştürücü süreçler',
  },
};

// Transit etkileri: transiting → natal
const TRANSIT_INTERPRETATIONS: Record<string, Record<string, string>> = {
  Saturn: {
    Sun: 'Sorumluluklar gündeme geliyor. Hayatının yapısını gözden geçirme zamanı.',
    Moon: 'Duygusal olgunluk ve sınırlar. Ailevi sorumluluklar artabilir.',
    Mercury: 'Zihinsel disiplin ve ciddi kararlar. İletişimde net ol.',
    Venus: 'İlişkilerde ciddiyet ve bağlılık testi. Uzun vadeli taahhütler.',
    Mars: 'Enerjini kontrollü kullan. Sabır ve dayanıklılık gereken mücadeleler.',
    Jupiter: 'Büyüme sınırları. Aşırı iyimserliğe dikkat, gerçekçi ol.',
    Saturn: 'Satürn dönüşü! Hayatının yeniden yapılandırılması. Önemli bir dönüm noktası.',
    Uranus: 'Geleneksel olmayan yapılanmalar. Özgürlük ve sorumluluk dengesi.',
    Neptune: 'Hayaller ve sınırlar. İdealizme karşı gerçekçilik.',
    Pluto: 'Derin dönüşüm ve yeniden doğuş. Güç mücadeleleri.',
  },
  Jupiter: {
    Sun: 'Büyüme ve fırsatlar dönemi. Kendine güvenin artıyor, şans seninle.',
    Moon: 'Duygusal genişleme ve mutluluk. Aile içinde bolluk.',
    Mercury: 'Öğrenme, seyahat ve yeni fikirler. Zihinsel genişleme.',
    Venus: 'Aşk ve güzellikte bolluk. İlişkilerde şans ve büyüme.',
    Mars: 'Enerjik ve girişimci dönem. Cesurca harekete geç.',
    Jupiter: 'Jüpiter dönüşü! Hayatında büyük genişleme ve şans dönemi.',
    Saturn: 'Sorumlulukların meyvesini topla. Disiplinli çabaların ödülleniyor.',
    Uranus: 'Özgürlük ve fırsatlar. Beklenmedik şanslar ve mucizeler.',
    Neptune: 'Spiritüel genişleme ve sezgi. Hayallerin gerçek olabilir.',
    Pluto: 'Derin dönüşüm ve güçlü yenilenme. Kader değiştiren fırsatlar.',
  },
  Mars: {
    Sun: 'Enerji ve irade gücün zirvede. Harekete geçme zamanı, ama sabırlı ol.',
    Moon: 'Duygusal patlamalar ve tahammülsüzlük. Öfkeyi kontrollü kullan.',
    Mercury: 'Zihinsel çatışmalar ve hızlı kararlar. Kavgaya değil, mücadeleye giriş.',
    Venus: 'Tutku ve çekim. İlişkilerde gerginlik veya yoğun yakınlık.',
    Mars: 'Mars dönüşü! Fiziksel enerji zirvesinde. Spor, mücadele, başlangıçlar.',
    Jupiter: 'Cesaret ve girişimcilik. Büyük hedeflere ulaşma enerjisi.',
    Saturn: 'Engeller ve direnç. Sabır gerektiren mücadeleler.',
    Uranus: 'Ani patlamalar ve beklenmedik eylemler. Dikkatli ol.',
    Neptune: 'Enerjini dağıtma riski. Hayalperestlikten kaçın.',
    Pluto: 'Derin güç mücadeleleri. Dönüştürücü eylemler.',
  },
  Venus: {
    Sun: 'Aşk ve güzellik ışığı yayılıyor. Romantizm ve uyum dönemi.',
    Moon: 'Duygusal tatmin ve romantizm. Kalp ile hissetme zamanı.',
    Mercury: 'Zihinsel uyum ve güzel iletişim. Sanatsal fikirler.',
    Venus: 'Venus dönüşü! Aşk ve güzellikte yenilenme. Değerlerini gözden geçir.',
    Mars: 'Tutku ve çekim. Fiziksel yakınlık ve romantik maceralar.',
    Jupiter: 'Aşkta şans ve bolluk. Güzel fırsatlar ve hediyeler.',
    Saturn: 'İlişkilerde ciddiyet. Uzun vadeli taahhütler ve sadakat.',
    Uranus: 'Beklenmedik aşk ve çekim. Özgürleştirici ilişkiler.',
    Neptune: 'Romantik idealizm ve ruhsal aşk. Hayalperestlikten kaçın.',
    Pluto: 'Yoğun tutku ve dönüştürücü aşk. Bağımlılığa dikkat.',
  },
  Mercury: {
    Sun: 'Zihinsel canlılık ve iletişim. Fikirlerini ifade etme zamanı.',
    Moon: 'Duygusal düşünceler ve sezgisel iletişim. Kalbini dinle.',
    Mercury: 'Merkür dönüşü! Zihinsel yenilenme ve yeni bakış açıları.',
    Venus: 'Güzel sözler ve romantik iletişim. Sanatsal ifadeler.',
    Mars: 'Hızlı düşünme ve keskin iletişim. Tartışmalara dikkat.',
    Jupiter: 'Geniş perspektif ve öğrenme. Felsefi düşünceler.',
    Saturn: 'Ciddi düşünce ve planlama. Detaylara odaklan.',
    Uranus: 'Özgün fikirler ve ani aydınlanmalar. Yaratıcı çözümler.',
    Neptune: 'Sezgisel zeka ve hayal gücü. Yanıltıcı bilgiye dikkat.',
    Pluto: 'Derin araştırma ve keşifler. Gizli gerçekleri ortaya çıkarma.',
  },
  Moon: {
    Sun: 'Duygusal ihtiyaçlar ve bilinç arasındaki denge. İçsel uyum.',
    Moon: 'Ay dönüşü! Duygusal yenilenme ve yeni başlangıçlar.',
    Mercury: 'Duygusal düşünceler ve sezgisel iletişim.',
    Venus: 'Romantik duygular ve estetik haz. Aşkla ilgili duygusal kararlar.',
    Mars: 'Duygusal tepkiler ve harekete geçme isteği. Sabırlı ol.',
    Jupiter: 'Duygusal genişleme ve mutluluk. İçsel huzur.',
    Saturn: 'Duygusal sınırlar ve olgunluk. Sorumluluk alma.',
    Uranus: 'Ani duygusal değişimler. Beklenmedik duygusal durumlar.',
    Neptune: 'Yüksek sezgi ve empati. Duygusal sınırlara dikkat.',
    Pluto: 'Derin duygusal dönüşüm. Eski duygusal kalıpları bırakma.',
  },
  Sun: {
    Sun: 'Güneş dönüşü! Doğum günün kutlu olsun. Yeni yaşam yılı başlıyor.',
    Moon: 'Bilinç ve bilinçaltı uyumu. Duygusal kendini ifade etme.',
    Mercury: 'Zihinsel odaklanma ve net düşünme. Önemli kararlar.',
    Venus: 'Aşk ve güzellikte parlama. Romantik fırsatlar.',
    Mars: 'Enerji ve irade gücü. Harekete geçme ve liderlik.',
    Jupiter: 'Şans ve büyüme. Hayatında olumlu genişleme.',
    Saturn: 'Olgunluk ve sorumluluk. Hayat dersleri ve yapılanma.',
    Uranus: 'Özgürlük ve yenilik. Beklenmedik değişimler.',
    Neptune: 'Spiritüel aydınlanma ve sezgi. Hayaller ve gerçekler.',
    Pluto: 'Derin kişisel dönüşüm. Güç ve kontrol temaları.',
  },
  Uranus: {
    Sun: 'Özgürlük ve yenilik arzusu. Beklenmedik değişimler ve sürprizler.',
    Moon: 'Duygusal özgürleşme. Ani duygusal değişimler.',
    Mercury: 'Özgün fikirler ve ani aydınlanmalar. Yaratıcı düşünme.',
    Venus: 'Beklenmedik aşk ve çekim. İlişkilerde özgürlük arayışı.',
    Mars: 'Ani patlamalar ve beklenmedik eylemler. Dikkatli ol.',
    Jupiter: 'Büyük fırsatlar ve özgürleşme. Mucizeler mümkün.',
    Saturn: 'Geleneksel yapıları yıkma. Özgürlük ve sorumluluk çatışması.',
    Uranus: 'Uranüs dönüşü! Hayatında büyük özgürleşme ve değişim.',
    Neptune: 'Spiritüel özgürleşme ve sezgi. Hayallerin gerçekleşmesi.',
    Pluto: 'Derin ve kalıcı dönüşüm. Güç yapılarındaki değişim.',
  },
  Neptune: {
    Sun: 'Spiritüel aydınlanma ve sezgi. Hayaller ve gerçekler arasında denge.',
    Moon: 'Yüksek empati ve sezgi. Duygusal sınırlara dikkat.',
    Mercury: 'Sezgisel zeka ve yaratıcı düşünme. Yanıltıcı bilgiye dikkat.',
    Venus: 'Romantik idealizm ve ruhsal aşk. Hayalperestlikten kaçın.',
    Mars: 'Enerjini dağıtma riski. Spiritüel eylemler ve fedakarlık.',
    Jupiter: 'Spiritüel genişleme ve hayallerin gerçekleşmesi. Mucizeler.',
    Saturn: 'Hayaller ve sınırlar. İdealizme karşı gerçekçilik.',
    Uranus: 'Spiritüel özgürleşme ve sezgi. Beklenmedik hayaller.',
    Neptune: 'Neptün dönüşü! Spiritüel uyanış ve derin sezgi dönemi.',
    Pluto: 'Derin spiritüel dönüşüm. Gizli gerçeklerin ortaya çıkması.',
  },
  Pluto: {
    Sun: 'Derin kişisel dönüşüm. Güç ve kontrol temaları. Yeniden doğuş.',
    Moon: 'Derin duygusal dönüşüm. Eski kalıpları bırakma ve yenilenme.',
    Mercury: 'Derin araştırma ve keşifler. Gizli gerçekleri ortaya çıkarma.',
    Venus: 'Yoğun tutku ve dönüştürücü aşk. Bağımlılığa dikkat.',
    Mars: 'Derin güç mücadeleleri. Dönüştürücü eylemler ve yenilenme.',
    Jupiter: 'Kader değiştiren fırsatlar. Derin büyüme ve genişleme.',
    Saturn: 'Yapıların dönüşümü. Sorumluluklarda derin değişim.',
    Uranus: 'Kalıcı ve beklenmedik dönüşüm. Güç yapılarındaki devrim.',
    Neptune: 'Spiritüel ve gizli gerçeklerin ortaya çıkması. Derin sezgi.',
    Pluto: 'Pluto dönüşü! Hayatında derin ve kalıcı dönüşüm dönemi.',
  },
};

// ─── Helper Functions ──────────────────────────────────────────────

function houseOf(longitude: number, houses: BirthChart['houses']): number | null {
  if (!houses || houses.length < 12) return null;
  const cusps = houses.map(h => h.cuspLongitude);
  for (let i = 0; i < 12; i++) {
    const start = cusps[i];
    const end = cusps[(i + 1) % 12];
    const inHouse = start <= end
      ? (longitude >= start && longitude < end)
      : (longitude >= start || longitude < end);
    if (inHouse) return i + 1;
  }
  return null;
}

function buildAreaEffects(params: {
  transitingBody: string;
  natalPoint: string;
  natalHouse: number | null;
  aspectType: string;
}): AreaEffect[] {
  const { transitingBody, natalPoint, natalHouse, aspectType } = params;

  const relevantAreas = new Set<LifeArea>();
  (PLANET_AREAS[transitingBody] || []).forEach(a => relevantAreas.add(a));
  (NATAL_POINT_AREAS[natalPoint] || []).forEach(a => relevantAreas.add(a));
  if (natalHouse) {
    (HOUSE_AREA_MAP[natalHouse] || []).forEach(a => relevantAreas.add(a));
  }

  const quality = ASPECT_QUALITY[aspectType] || 'Bu etki farkında olmayı gerektirir';
  const houseNote = natalHouse ? ` (${natalHouse}. evde)` : '';

  return Array.from(relevantAreas).map(area => {
    const planetMeaning = PLANET_AREA_MEANINGS[transitingBody]?.[area];
    if (!planetMeaning) return null;
    return {
      area,
      areaTr: AREA_TR[area],
      effect: `${planetMeaning}${houseNote}. ${quality}.`,
    };
  }).filter(Boolean) as AreaEffect[];
}

function getTransitAdvice(transit: DailyTransit): string {
  const bodyAdvice: Record<string, string> = {
    Saturn: 'Sabır ve disiplin göster. Uzun vadeli planlar yap.',
    Jupiter: 'Fırsatları değerlendir. Risk al ama mantıklı ol.',
    Mars: 'Enerjini yapıcı kanallara yönlendir. Aceleci olma.',
    Venus: 'Güzellik ve uyum arayışında ol. İlişkilerine özen göster.',
    Mercury: 'İletişimine dikkat et. Yeni bilgiler öğren.',
    Moon: 'Duygularını dinle. Sezgisel kararlar al.',
    Sun: 'Özgüvenin yükselsin. Liderlik et ve kendini ifade et.',
    Uranus: 'Açık fikirli ol. Beklenmedik değişimlere hazır ol.',
    Neptune: 'Sezgilerine güven. Ama gerçeklerden kaçma.',
    Pluto: 'Derin dönüşüme izin ver. Eski kalıpları bırak.',
  };
  return bodyAdvice[transit.transitingBody] || 'Farkındalıkla hareket et.';
}

function calculateStrength(transit: Transit): number {
  // Strength based on: deviation (closer = stronger), body importance, aspect type
  let baseStrength = 100 - (transit.deviation / transit.orb) * 100;
  
  // Outer planets transits are more significant and longer-lasting
  const outerPlanets = ['Saturn', 'Uranus', 'Neptune', 'Pluto'];
  if (outerPlanets.includes(transit.transitingBody)) {
    baseStrength *= 1.2;
  }
  
  // Luminaries (Sun/Moon) transits are personally significant
  const luminaries = ['Sun', 'Moon'];
  if (luminaries.includes(transit.transitingBody) || luminaries.includes(transit.natalPoint)) {
    baseStrength *= 1.15;
  }
  
  // Conjunctions and oppositions are most powerful
  if (transit.aspectType === 'conjunction' || transit.aspectType === 'opposition') {
    baseStrength *= 1.1;
  }
  
  // Applying transits are more active
  if (transit.phase === 'applying') {
    baseStrength *= 1.05;
  }
  
  return Math.min(100, Math.round(baseStrength));
}

function generateOverallTheme(transits: DailyTransit[]): string {
  if (transits.length === 0) {
    return 'Bugün gökyüzü nispeten sakin. İçsel dengeni koru ve rutin işlerine odaklan.';
  }
  
  const strongest = transits[0];
  const themes: string[] = [];
  
  // Check for major patterns
  const hasSaturn = transits.some(t => t.transitingBody === 'Saturn');
  const hasJupiter = transits.some(t => t.transitingBody === 'Jupiter');
  const hasMars = transits.some(t => t.transitingBody === 'Mars');
  const hasVenus = transits.some(t => t.transitingBody === 'Venus');
  
  if (hasSaturn && hasJupiter) {
    themes.push('Büyüme ve sınırlar arasında denge kurma zamanı. Fırsatlar var ama disiplin gerekiyor.');
  } else if (hasJupiter) {
    themes.push('Şans ve büyüme gündemde. Yeni fırsatlar kapını çalabilir.');
  } else if (hasSaturn) {
    themes.push('Sorumluluklar ve yapılanma ön planda. Ciddi kararlar alma zamanı.');
  }
  
  if (hasMars) {
    themes.push('Enerji ve aksiyon gündemde. Harekete geçme gücün yüksek.');
  }
  
  if (hasVenus) {
    themes.push('Aşk, güzellik ve uyum temaları öne çıkıyor.');
  }
  
  if (themes.length === 0) {
    themes.push(`${strongest.transitingBodyTr} etkisiyle ${strongest.natalPointTr} alanında değişim ve dönüşüm.`);
  }
  
  return themes.join(' ');
}

function buildAreaForecasts(significantTransits: DailyTransit[]): Record<LifeArea, AreaForecast> {
  const areas: LifeArea[] = ['ask', 'is', 'para', 'saglik'];
  const result = {} as Record<LifeArea, AreaForecast>;

  for (const area of areas) {
    const affecting = significantTransits
      .filter(t => t.areaEffects.some(ae => ae.area === area))
      .sort((a, b) => b.strength - a.strength);

    const effects = affecting
      .slice(0, 3)
      .map(t => {
        const ae = t.areaEffects.find(x => x.area === area)!;
        return `${t.transitingBodyTr} ${t.transitSignTr} → ${t.aspectTypeTr} ${t.natalPointTr} (güç %${t.strength}): ${ae.effect}`;
      });

    result[area] = {
      area,
      title: AREA_TR[area],
      summary: effects.length > 0
        ? effects[0]
        : 'Bugün bu alanda belirgin bir gökyüzü etkisi yok; kendi ritminle ilerle.',
      transitCount: affecting.length,
      effects,
    };
  }

  return result;
}

// ─── Main Calculation ──────────────────────────────────────────────

export function calculateDailyTransits(birthChart: BirthChart): DailyTransitReport {
  // Build natal points from birth chart
  const natalPoints = birthChart.planets.map(p => ({
    name: p.name,
    longitude: p.longitude,
    type: (p.name === 'Sun' || p.name === 'Moon') ? 'luminary' as const : 'planet' as const,
  }));
  
  // Add ascendant if available
  if (birthChart.houses && birthChart.houses.length > 0) {
    const asc = birthChart.houses.find(h => h.index === 1);
    if (asc) {
      natalPoints.push({
        name: 'ASC',
        longitude: asc.cuspLongitude,
        type: 'angle' as const,
      });
    }
  }
  
  // Calculate today's Julian Day
  const now = new Date();
  const jd = toJulianDate({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    second: 0,
    timezone: 3, // Turkey UTC+3
  });
  
  // Calculate transits
  const transitResult: TransitResult = calculateTransits(natalPoints, jd, {
    aspectTypes: ['conjunction', 'sextile', 'square', 'trine', 'opposition'],
  });
  
  // Bugünkü gezegen konumları + retrograde bilgisi (calculateChart üzerinden)
  const todayChart = calculateChart({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    second: 0,
    timezone: 3,
    latitude: birthChart.birthLat || 39.93,
    longitude: birthChart.birthLng || 32.86,
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
  const retrogradePlanets = todayChart.planets
    .filter(p => p.isRetrograde)
    .map(p => BODY_NAMES_TR[p.name] || p.name);
  
  // Map transits to our format
  const allTransits: DailyTransit[] = transitResult.transits.map((t: Transit) => {
    const strength = calculateStrength(t);
    const aspectMeaning = TRANSIT_INTERPRETATIONS[t.transitingBody]?.[t.natalPoint] 
      || `${t.transitingBody} ${t.natalPoint} alanında ${t.aspectType} açı yapıyor. Bu etkiyi farkında ol.`;

    const todayPlanet = todayChart.planets.find(b => b.name === t.transitingBody);
    const transitSign = todayPlanet?.signName || '';
    const transitSignTr = SIGN_EN_TR[transitSign] || transitSign;
    const signMeaning = TRANSIT_SIGN_MEANINGS[t.transitingBody]?.[transitSign] || '';
    const natalHouse = todayPlanet ? houseOf(todayPlanet.longitude, birthChart.houses) : null;
    const houseInfo = natalHouse ? HOUSE_MEANINGS_TR[natalHouse] : null;

    const signPart = transitSignTr ? ` ${transitSignTr} burcundayken` : '';
    const housePart = houseInfo ? ` ve ${houseInfo.title} üzerinden` : '';
    const interpretation = `${aspectMeaning}${signPart}${housePart} etkisini gösteriyor.`;

    return {
      transitingBody: t.transitingBody,
      transitingBodyTr: BODY_NAMES_TR[t.transitingBody] || t.transitingBody,
      natalPoint: t.natalPoint,
      natalPointTr: BODY_NAMES_TR[t.natalPoint] || t.natalPoint,
      aspectType: t.aspectType,
      aspectTypeTr: ASPECT_TYPE_TR[t.aspectType] || t.aspectType,
      symbol: t.symbol,
      deviation: Math.round(t.deviation * 100) / 100,
      orb: t.orb,
      phase: t.phase,
      phaseTr: PHASE_TR[t.phase] || t.phase,
      strength,
      isRetrograde: todayPlanet?.isRetrograde || false,
      transitSign,
      transitSignTr,
      signMeaning,
      natalHouse,
      houseMeaning: houseInfo?.meaning || 'doğum saati bilinmediği için ev pozisyonu perde arkasında',
      interpretation,
      areaEffects: buildAreaEffects({
        transitingBody: t.transitingBody,
        natalPoint: t.natalPoint,
        natalHouse,
        aspectType: t.aspectType,
      }),
      advice: getTransitAdvice({ transitingBody: t.transitingBody } as DailyTransit),
    };
  });
  
  // Sort by strength (descending)
  allTransits.sort((a, b) => b.strength - a.strength);
  
  // Filter significant transits (strength > 40)
  const significantTransits = allTransits.filter(t => t.strength > 40);
  const areaForecasts = buildAreaForecasts(significantTransits);
  
  // Get Moon & Sun info for real phase
  const sunBody = todayChart.planets.find(b => b.name === 'Sun');
  const moonBody = todayChart.planets.find(b => b.name === 'Moon');
  const moonSign = moonBody ? longitudeToSign(moonBody.longitude).sign : 'Koç';

  let moonPhaseName = 'Hilal';
  if (sunBody && moonBody) {
    const diff = ((moonBody.longitude - sunBody.longitude) % 360 + 360) % 360;
    if (diff < 22.5 || diff >= 337.5) moonPhaseName = 'Yeniay';
    else if (diff < 67.5) moonPhaseName = 'Hilal';
    else if (diff < 112.5) moonPhaseName = 'İlkdördün';
    else if (diff < 157.5) moonPhaseName = 'Büyüyen Ay';
    else if (diff < 202.5) moonPhaseName = 'Dolunay';
    else if (diff < 247.5) moonPhaseName = 'Küçülen Ay';
    else if (diff < 292.5) moonPhaseName = 'Son Dördün';
    else moonPhaseName = 'Balzamik Hilal';
  }
  
  // Generate narrative
  let narrative = `# Bugünkü Gökyüzü Etkileri (${now.toLocaleDateString('tr-TR')})\n\n`;
  
  if (retrogradePlanets.length > 0) {
    narrative += `## Retrograde Gezegenler\n`;
    narrative += `${retrogradePlanets.join(', ')} şu an geri harekette. Geçmişi gözden geçirme ve içselleştirme zamanı.\n\n`;
  }
  
  narrative += `## Genel Tema\n${generateOverallTheme(significantTransits)}\n\n`;
  
  if (significantTransits.length > 0) {
    narrative += `## Aktif Transitler\n`;
    significantTransits.forEach(t => {
      narrative += `- **${t.transitingBodyTr} ${t.transitSignTr} burcunda → ${t.aspectTypeTr} ${t.natalPointTr}** (${t.phaseTr}, güç: %${t.strength}${t.isRetrograde ? ', retrograde' : ''})\n`;
      if (t.natalHouse) {
        narrative += `  Doğum evin: ${HOUSE_MEANINGS_TR[t.natalHouse].title}\n`;
      }
      narrative += `  ${t.interpretation}\n`;
      if (t.signMeaning) {
        narrative += `  ${t.transitingBodyTr} ${t.transitSignTr}: ${t.signMeaning}\n`;
      }
      t.areaEffects.forEach(ae => {
        narrative += `  • ${ae.areaTr}: ${ae.effect}\n`;
      });
      narrative += `  *Tavsiye: ${t.advice}*\n\n`;
    });
  }

  narrative += `## Günlük Alan Yorumları\n`;
  (['ask', 'is', 'para', 'saglik'] as LifeArea[]).forEach(area => {
    const f = areaForecasts[area];
    narrative += `### ${f.title} (${f.transitCount} transit)\n`;
    f.effects.forEach(e => narrative += `- ${e}\n`);
    if (f.effects.length === 0) narrative += `- ${f.summary}\n`;
    narrative += `\n`;
  });
  
  narrative += `## Ay Burcu\nBugün Ay ${moonSign} burcunda. Duygusal enerjin ${moonSign.toLowerCase()} temaları taşıyor.\n`;
  
  return {
    date: now.toISOString(),
    julianDay: jd,
    overallTheme: generateOverallTheme(significantTransits),
    overallAdvice: significantTransits.length > 0 
      ? significantTransits[0].advice 
      : 'Bugün enerjini içsel dengeye yönlendir.',
    activeTransits: allTransits,
    significantTransits,
    areaForecasts,
    retrogradePlanets,
    moonPhase: moonPhaseName,
    moonSign,
    narrative,
  };
}

// ─── Quick Transit Check (for AI prompts) ─────────────────────────

export function getTransitSummaryForPrompt(birthChart: BirthChart): string {
  const report = calculateDailyTransits(birthChart);
  
  const lines: string[] = [];
  lines.push(`## Bugünkü Gökyüzü (${new Date().toLocaleDateString('tr-TR')})`);
  
  if (report.retrogradePlanets.length > 0) {
    lines.push(`Retrograde: ${report.retrogradePlanets.join(', ')}`);
  }
  
  lines.push(`Ay: ${report.moonSign} burcunda`);
  
  if (report.significantTransits.length > 0) {
    lines.push('Aktif Transitler:');
    report.significantTransits.slice(0, 5).forEach(t => {
      lines.push(`- ${t.transitingBodyTr} ${t.aspectTypeTr} ${t.natalPointTr} (%${t.strength} güç)`);
    });
  }
  
  return lines.join('\n');
}
