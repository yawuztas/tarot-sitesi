'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  ChevronRight,
  Sun,
  Moon,
  Compass,
  Flame,
  Droplets,
  Wind,
  Mountain,
  Heart,
  Shield,
  Eye,
  ScrollText,
  Star,
  BookOpen,
  Coins,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { TURKISH_CITIES } from '@/lib/astrology/turkish-cities';
import StackedDeck3D from '@/components/tarot/StackedDeck3D';

export interface AstroProfileData {
  personalitySummary?: string;
  coreMotivation?: string;
  outwardPersona?: string | null;
  strengths?: string[];
  challenges?: string[];
  relationshipStyle?: string;
  dominantElement?: string;
  dominantQuality?: string;
}

export interface DailyHoroscopeData {
  date?: string;
  overallTheme?: string;
  overallAdvice?: string;
  moonSign?: string;
  moonPhase?: string;
  narrative?: string;
  activeTransits?: Array<{
    transitingBodyTr: string;
    natalPointTr: string;
    aspectTypeTr: string;
    interpretation: string;
    advice?: string;
  }>;
}

export interface AstroData {
  userName: string;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  birthCity: string;
  isSubmitted: boolean;
  chart?: {
    sunSign: string;
    sunSignFormatted: string;
    moonSign: string;
    moonSignFormatted: string;
    ascendant: string | null;
    ascendantFormatted: string | null;
    elementBalance?: {
      Ateş: number;
      Toprak: number;
      Hava: number;
      Su: number;
    };
  } | null;
  profile?: AstroProfileData | null;
  dailyTransit?: DailyHoroscopeData | null;
}

interface AstrologyChamberProps {
  onProceedToReadingSetup: (astroData: AstroData) => void;
  initialData?: AstroData | null;
}

interface ConciseDailyForecast {
  spot: string;
  love: string;
  career: string;
  warning: string;
  luckyEnergy: string;
}

const ZODIAC_DAILY_ORACLES: Record<string, {
  spot: string;
  love: string;
  career: string;
  warning: string;
  luckyStone: string;
  powerColor: string;
}> = {
  'Koç': {
    spot: 'Ateşin öncü kıvılcımı seninle; bugün beklemek yerine ilk adımı cesaretle atan sen olmalısın.',
    love: 'Aşkta lafı dolandırma; hislerini açık ve samimi ifade ettiğinde karşı tarafın tüm gardı düşecek.',
    career: 'Zihnin yeni fikirlerle kaynıyor; ertelediğin cesur bir teklif bugün beklenmedik bir kapı açabilir.',
    warning: 'Sabırsızlığın seni fevri çıkışlara sürüklemesin; sakin kalmak gücünü ikiye katlar.',
    luckyStone: 'Lal & Yakut',
    powerColor: 'Kızıl Mercan',
  },
  'Boğa': {
    spot: 'Toprağın sarsılmaz bereketi seninle; sabırla ektiğin tohumlar bugün meyve vermeye başlıyor.',
    love: 'Güven ve şefkat ihtiyacın yüksek; aklındaki kişiyle arandaki sessiz bağ derinleşiyor.',
    career: 'Maddi konularda elini güçlendirecek somut bir haber kapıda; bütçeni sağlam tut.',
    warning: 'Değişime ve anlık plan bozulmalarına inat etme; esnek olmak bugün kazandırır.',
    luckyStone: 'Zümrüt',
    powerColor: 'Zümrüt Yeşili',
  },
  'İkizler': {
    spot: 'Merkür zihninde şimşekler çaktırıyor; bugün alacağın ani haberler kader çizgini hızlandıracak.',
    love: 'Zihinsel çekim tavan; uzun zamandır beklediğin o mesaj veya konuşma aniden gelebilir.',
    career: 'İletişim ve yazışmalarda çok şanslısın; birden fazla fırsat aynı anda masana düşebilir.',
    warning: 'Aynı anda her şeye yetişmeye çalışıp odağını dağıtma; tek bir hedefe kilitlen.',
    luckyStone: 'Akik & Sitrin',
    powerColor: 'Altın Sarısı',
  },
  'Yengeç': {
    spot: 'Ay’ın koruyucu sezgileri ruhunu sarıyor; bugün kalbinin "evet" dediği hiçbir şey seni yanıltmayacak.',
    love: 'Duygusal derinlik artıyor; sevdiğin kişinin bir bakışından bile gerçek niyetini çözeceksin.',
    career: 'Maddi güvence arayışın için güzel bir kapı var; sezgilerine güvenerek adım at.',
    warning: 'Eski kırgınlıkları zihninde tekrar tekrar yaşatma; geçmişi geçmişte bırak.',
    luckyStone: 'Aytaşı & İnci',
    powerColor: 'Gümüş Beyazı',
  },
  'Aslan': {
    spot: 'Güneş’in parlak aurası üstünde; bugün girdiğin her ortamda doğal olarak dikkatleri üzerine çekeceksin.',
    love: 'Gururu bir kenara bıraktığında aranızdaki tutku alevlenecek; cömert kalbini göster.',
    career: 'Liderlik ve vizyon günün; üstlerin veya iş ortaklarının gözünde yıldızın parlıyor.',
    warning: 'Övgü beklemek yerine kendi değerini bil; kontrol takıntısı yorgunluk getirebilir.',
    luckyStone: 'Kehribar',
    powerColor: 'Güneş Sarısı',
  },
  'Başak': {
    spot: 'Kozmik düzen senin lehine işliyor; karmaşık görünen düğümler bugün pratik zekanla çözülecek.',
    love: 'Küçük bir jest, sevdiğin kişinin kalbini fethedecek; kelimeler yerine eylemler konuşsun.',
    career: 'Detaylara verdiğin önem sana kazandıracak; gözden kaçan bir fırsatı ilk sen fark edeceksin.',
    warning: 'Hem kendini hem etrafındakileri kusursuzluk baskısıyla yorma; akışa güven.',
    luckyStone: 'Yeşim & Safir',
    powerColor: 'Orman Yeşili',
  },
  'Terazi': {
    spot: 'Venüs’ün zarafeti ve çekim gücü etrafında; bugün adalet, güzellik ve uyum senin pusulan.',
    love: 'Aşk kapıyı çalıyor; uyum ve romantizm arzun karşılık bulacak. Kararsızlığı bırak.',
    career: 'Ortaklıklar ve ikili görüşmeler çok bereketli; uzlaşmacı tavrın masada kazandıracak.',
    warning: 'Herkesi mutlu etmeye çalışırken kendi sınırlarını feda etme; hayır demeyi bil.',
    luckyStone: 'Pembe Kuvars',
    powerColor: 'Pudra Pembe',
  },
  'Akrep': {
    spot: 'Gizem perdesi aralanıyor; derin bakışların ve yüksek sezgin sayesinde görünmeyeni görüyorsun.',
    love: 'Aklındaki kişiyle aranda telepatik bir çekim var; sessizlik bile aranızdaki tutkuyu büyütüyor.',
    career: 'Stratejik ve gizli bir hamle sana avantaj sağlayacak; planlarını erken açık etme.',
    warning: 'Şüpheciliği kuruntuya dönüştürme; kontrolü biraz serbest bırakmak sana şifa verecek.',
    luckyStone: 'Obsidyen & Granat',
    powerColor: 'Mürdüm & Bordo',
  },
  'Yay': {
    spot: 'Jüpiter’in şans rüzgarı kanatlarının altında; yeni ufuklar ve büyük fırsatlar seni çağırıyor.',
    love: 'Birlikte gülebildiğin, özgür hissettiren bağlar parlıyor; sürpriz bir buluşma gündemde.',
    career: 'Yolculuklar, eğitim ya da vizyon projelerinde şans senden yana; ufkunu geniş tut.',
    warning: 'Tutamayacağın sözler verme; aşırı iyimserlikle riskleri hafife alma.',
    luckyStone: 'Mavi Topaz',
    powerColor: 'Gece Mavisi',
  },
  'Oğlak': {
    spot: 'Zirveye giden basamaklar sağlamlaşıyor; disiplinin ve kararlılığın meyvesini toplama vakti.',
    love: 'Sadakat ve ciddiyet arıyorsun; aklındaki kişi senin bu güven veren duruşuna hayran.',
    career: 'Maddi konularda uzun vadeli bir başarı kapıda; sabırlı adımların takdir görecek.',
    warning: 'Hayatı sadece görevlerden ibaret görme; kalbine ve dinlenmeye de vakit ayır.',
    luckyStone: 'Oniks & Dumanlı Kuvars',
    powerColor: 'Kömür Grisi',
  },
  'Kova': {
    spot: 'Kozmik ilham kanalların açık; sıradışı fikirlerin bugün geleceğini şekillendirebilir.',
    love: 'Sıradan ilişkiler sana göre değil; seni zihnen besleyen ve özgür bırakan bağ kuvvetleniyor.',
    career: 'Teknoloji, ekip çalışmaları ve yenilikçi projelerde büyük bir aydınlanma yaşayabilirsin.',
    warning: 'Duygusal mesafeyi aşırı abartma; karşındakinin kalbine dokunmaktan çekinme.',
    luckyStone: 'Ametist',
    powerColor: 'Elektrik Mavisi',
  },
  'Balık': {
    spot: 'Ruhunun mistik kanatları açılıyor; evren bugün sana işaretler ve güçlü sezgiler fısıldıyor.',
    love: 'Ruh eşi enerjisi çok güçlü; aklındaki kişiyle arandaki manevi bağ kader çizgisine oturuyor.',
    career: 'Yaratıcı ve sezgisel konularda ilham yağmuru var; kalbinin sesini maddi kazanca dönüştür.',
    warning: 'Kendi hayal dünyanda kaybolup somut gerçekleri görmezden gelme; sınırlarını koru.',
    luckyStone: 'Akuamarin & Florit',
    powerColor: 'Deniz Mavisi',
  },
};

function getConciseDailyForecast(
  sunSign: string,
  element: string,
  userName?: string,
  transitData?: DailyHoroscopeData | null
): ConciseDailyForecast {
  const base = ZODIAC_DAILY_ORACLES[sunSign] || ZODIAC_DAILY_ORACLES['Koç'];
  const firstTransit = transitData?.activeTransits?.[0];
  const secondTransit = transitData?.activeTransits?.[1];

  const luckyHour = 13 + (sunSign.charCodeAt(0) % 6);
  const luckyNum = 2 + ((sunSign.charCodeAt(1) || 7) % 9);

  const spot = transitData?.overallTheme
    ? `${transitData.overallTheme} (${element} enerjin bugün ${transitData.moonSign ? `Ay ${transitData.moonSign} burcundayken` : 'gökyüzüyle'} titreşiyor).`
    : base.spot;

  const love = firstTransit
    ? `${firstTransit.transitingBodyTr} – ${firstTransit.natalPointTr} (${firstTransit.aspectTypeTr}) etkisi: ${firstTransit.interpretation}`
    : base.love;

  const career = secondTransit
    ? `${secondTransit.transitingBodyTr} – ${secondTransit.natalPointTr} (${secondTransit.aspectTypeTr}) açısı: ${secondTransit.interpretation}`
    : base.career;

  const warning = transitData?.overallAdvice || firstTransit?.advice || base.warning;

  const luckyEnergy = `${transitData?.moonSign ? `Günün Ay Burcu: ${transitData.moonSign} · ` : ''}Şanslı Saat: ${luckyHour}:00 - ${luckyHour + 2}:00 · Doğal Taş: ${base.luckyStone} · Uğurlu Sayı: ${luckyNum}`;

  return {
    spot: userName ? `${userName}, ${spot.charAt(0).toLowerCase()}${spot.slice(1)}` : spot,
    love,
    career,
    warning,
    luckyEnergy,
  };
}

function resolveDominantElement(balance?: {
  Ateş: number;
  Toprak: number;
  Hava: number;
  Su: number;
}) {
  if (!balance) return 'Su';
  const entries = Object.entries(balance) as [string, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

export default function AstrologyChamber({
  onProceedToReadingSetup,
  initialData,
}: AstrologyChamberProps) {
  const { status: authStatus } = useSession();
  const [userName, setUserName] = useState(initialData?.userName || '');
  const [birthDate, setBirthDate] = useState(initialData?.birthDate || '1998-05-14');
  const [birthTime, setBirthTime] = useState(initialData?.birthTime || '14:30');
  const [birthTimeUnknown, setBirthTimeUnknown] = useState(
    initialData?.birthTimeUnknown ?? false
  );
  const [birthCity, setBirthCity] = useState(initialData?.birthCity || 'İstanbul');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(initialData?.isSubmitted ?? false);
  const [chartData, setChartData] = useState<AstroData['chart']>(
    initialData?.chart || null
  );
  const [profileData, setProfileData] = useState<AstroProfileData | null>(
    initialData?.profile || null
  );
  const [dailyTransitData, setDailyTransitData] = useState<DailyHoroscopeData | null>(
    initialData?.dailyTransit || null
  );
  const [dominantElement, setDominantElement] = useState<string | null>(
    initialData?.profile?.dominantElement || null
  );
  const [formError, setFormError] = useState<string | null>(null);

  // Sağ taraftaki Kehanet Kartı Sekmesi: 'character' | 'horoscope'
  const [activeOracleTab, setActiveOracleTab] = useState<'character' | 'horoscope'>('character');

  // Ethereal audio context for chimes
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Giriş yapmış kullanıcının kayıtlı doğum bilgilerini ve haritasını otomatik yükle
  useEffect(() => {
    if (authStatus !== 'authenticated' || initialData?.isSubmitted) return;
    let cancelled = false;

    async function loadSavedChart() {
      try {
        const resp = await fetch('/api/astrology/chart');
        if (!resp.ok || cancelled) return;
        const data = await resp.json();
        if (cancelled) return;

        if (data.displayName) setUserName(data.displayName);
        if (data.hasChart && data.chart) {
          if (data.birthMeta?.birthDateStr) setBirthDate(data.birthMeta.birthDateStr);
          if (data.birthMeta?.birthTime) setBirthTime(data.birthMeta.birthTime);
          if (typeof data.birthMeta?.birthTimeUnknown === 'boolean') {
            setBirthTimeUnknown(data.birthMeta.birthTimeUnknown);
          }
          if (data.birthMeta?.birthPlaceName) setBirthCity(data.birthMeta.birthPlaceName);

          const cData = {
            sunSign: data.chart.sunSign,
            sunSignFormatted: data.chart.sunSignFormatted,
            moonSign: data.chart.moonSign,
            moonSignFormatted: data.chart.moonSignFormatted,
            ascendant: data.chart.ascendant,
            ascendantFormatted: data.chart.ascendantFormatted,
            elementBalance: data.chart.elementBalance,
          };
          setChartData(cData);
          const domElem =
            data.profile?.dominantElement || resolveDominantElement(data.chart.elementBalance);
          setDominantElement(domElem);
          setProfileData(data.profile || null);
          setDailyTransitData(data.dailyTransit || null);
          setIsSaved(true);
        }
      } catch {}
    }

    loadSavedChart();
    return () => {
      cancelled = true;
    };
  }, [authStatus, initialData?.isSubmitted]);

  const playCelestialChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const freqs = [528, 660, 792, 1056, 1320];
      const now = ctx.currentTime;
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.001, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.12 / (idx + 1), now + idx * 0.08 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 2.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 2.6);
      });
    } catch {}
  };

  // Formu Onayla ve Haritayı Çıkar
  const handleSubmitAstro = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError(null);

    if (!birthDate) {
      setFormError('Lütfen doğum tarihinizi belirtin.');
      return;
    }

    setIsLoading(true);
    try {
      const resp = await fetch('/api/astrology/chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: userName.trim() || undefined,
          birthDate,
          birthTime: birthTimeUnknown ? undefined : birthTime,
          birthTimeUnknown,
          birthCity,
        }),
      });

      if (!resp.ok) {
        throw new Error('Yıldız haritası hesaplanırken bir sorun oluştu.');
      }

      const data = await resp.json();
      const chart = data.chart;
      const profile = data.profile;
      const dailyTransit = data.dailyTransit;

      if (chart) {
        const cData = {
          sunSign: chart.sunSign,
          sunSignFormatted: chart.sunSignFormatted,
          moonSign: chart.moonSign,
          moonSignFormatted: chart.moonSignFormatted,
          ascendant: chart.ascendant,
          ascendantFormatted: chart.ascendantFormatted,
          elementBalance: chart.elementBalance,
        };
        setChartData(cData);

        const domElem = profile?.dominantElement || resolveDominantElement(chart.elementBalance);
        setDominantElement(domElem);
        setProfileData(profile || null);
        setDailyTransitData(dailyTransit || null);
        setIsSaved(true);
        playCelestialChime();

        // Local storage / session storage sync
        const payload: AstroData = {
          userName: userName.trim() || 'Gezgin',
          birthDate,
          birthTime,
          birthTimeUnknown,
          birthCity,
          isSubmitted: true,
          chart: cData,
          profile: profile || null,
          dailyTransit: dailyTransit || null,
        };
        try {
          sessionStorage.setItem('mystic_astro_data', JSON.stringify(payload));
        } catch {}
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Yıldız haritası hesaplanamadı.');
    } finally {
      setIsLoading(false);
    }
  };

  // Tarot Destesine Dokunulduğunda 3. Sayfaya Geç
  const handleProceed = () => {
    const payload: AstroData = {
      userName: userName.trim() || 'Gezgin',
      birthDate,
      birthTime,
      birthTimeUnknown,
      birthCity,
      isSubmitted: isSaved,
      chart: chartData,
      profile: profileData,
      dailyTransit: dailyTransitData,
    };
    try {
      sessionStorage.setItem('mystic_astro_data', JSON.stringify(payload));
    } catch {}
    onProceedToReadingSetup(payload);
  };

  // Element ikonu yardımcısı
  const renderElementIcon = (elem: string | null) => {
    switch (elem) {
      case 'Ateş':
        return <Flame className="w-3.5 h-3.5 text-amber-400 inline" />;
      case 'Toprak':
        return <Mountain className="w-3.5 h-3.5 text-emerald-400 inline" />;
      case 'Hava':
        return <Wind className="w-3.5 h-3.5 text-sky-400 inline" />;
      case 'Su':
      default:
        return <Droplets className="w-3.5 h-3.5 text-blue-400 inline" />;
    }
  };

  // Günün Türkçe tarihi
  const todayFormatted = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="relative min-h-screen w-full bg-[#06020c] text-zinc-100 flex flex-col justify-between overflow-x-hidden selection:bg-purple-900 selection:text-amber-200">
      {/* Mistik Derinlik Arka Planı & Kozmik Parıltılar */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-950/40 via-[#06020c] to-[#030007]" />
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[160px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[650px] h-[650px] bg-amber-500/10 rounded-full blur-[180px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,#030007_90%)]" />
      </div>

      {/* Ana Gövde: 3 Kolonlu Ezoterik Salon */}
      <div className="relative z-10 container mx-auto px-4 py-6 md:py-10 max-w-[1520px] flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start">
          
          {/* SOL KOLON (3 Kolon): Falcı Kadın Görseli & Ekrana Yönlendiren Duruş */}
          <div className="lg:col-span-3 flex flex-col items-center justify-center relative group">
            <div className="relative w-full max-w-[320px] sm:max-w-[360px] lg:max-w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(40,10,70,0.6)] border border-purple-500/20">
              <Image
                src="/assets/fortune_teller_woman.jpg"
                alt="Kadim Falcı ve Yıldız Bilgesi"
                fill
                priority
                className="object-cover object-center filter contrast-105 brightness-95 group-hover:scale-102 transition-transform duration-700"
              />
              {/* Yumuşak Sağ & Alt Maske Geçişi */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#06020c] via-transparent to-transparent opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#06020c]/60 hidden lg:block" />

              {/* Falcının Mistik Sözü */}
              <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-2xl bg-[#0a0314]/85 backdrop-blur-md border border-purple-500/30 text-center shadow-lg">
                <p className="text-xs sm:text-sm font-serif italic text-amber-200/90 leading-relaxed">
                  &ldquo;Yıldızların dizilişi bir tesadüf değildir yabancı... Doğduğun anı fısılda, küren aydınlansın.&rdquo;
                </p>
                <span className="block mt-1 text-[10px] tracking-[0.2em] uppercase font-sans text-purple-300/70">
                  ✦ Kadim Yıldız Bilgesi ✦
                </span>
              </div>
            </div>
          </div>

          {/* ORTA KOLON (4 Kolon): Yıldız Falı Bilgi Giriş Formu */}
          <div className="lg:col-span-4 flex flex-col justify-center">
            <div className="bg-[#0e051d]/75 backdrop-blur-xl border border-purple-500/25 rounded-3xl p-5 sm:p-7 shadow-[0_0_40px_rgba(20,5,40,0.7)] relative overflow-hidden">
              {/* Zarif Üst Başlık & Açıklama */}
              <div className="mb-5 text-center space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-serif uppercase tracking-widest bg-amber-500/10 text-amber-300 border border-amber-500/25">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Kozmik Giriş Kapısı</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-purple-200 to-amber-300">
                  Hoş geldin yabancı, yıldız falın için bilgilerini ver
                </h1>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                  Gök kubbedeki doğum haritan çözülsün, burç karakterin ve bugünkü fal yorumun parlasın.
                </p>
              </div>

              {/* Form Alanları */}
              <form onSubmit={handleSubmitAstro} className="space-y-3.5">
                {/* 1. İsim / Hitap */}
                <div className="space-y-1">
                  <label className="text-xs font-serif text-zinc-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>Adın veya Ruhunun Hitabı</span>
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Örn: Aylin, Gezgin..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 text-sm text-zinc-100 placeholder:text-zinc-600 font-sans transition-all"
                  />
                </div>

                {/* 2. Doğum Tarihi */}
                <div className="space-y-1">
                  <label className="text-xs font-serif text-zinc-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Doğum Tarihin *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 text-sm text-zinc-100 font-sans transition-all cursor-pointer"
                  />
                </div>

                {/* 3. Doğum Saati & Bilmiyorum Seçeneği */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-serif text-zinc-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Doğum Saatin (Yükselen Burç İçin)</span>
                    </label>
                  </div>
                  <div className="space-y-1.5">
                    <input
                      type="time"
                      disabled={birthTimeUnknown}
                      value={birthTime}
                      onChange={(e) => setBirthTime(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-sans transition-all cursor-pointer ${
                        birthTimeUnknown
                          ? 'bg-zinc-900/40 border-zinc-800 text-zinc-600 cursor-not-allowed'
                          : 'bg-purple-950/30 border-purple-500/30 focus:border-amber-400 text-zinc-100'
                      }`}
                    />
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={birthTimeUnknown}
                        onChange={(e) => setBirthTimeUnknown(e.target.checked)}
                        className="rounded border-purple-500/40 bg-purple-950/40 text-amber-400 focus:ring-0 focus:ring-offset-0 cursor-pointer w-3.5 h-3.5"
                      />
                      <span className="text-[11px] text-zinc-400 hover:text-zinc-300 transition-colors">
                        Doğum saatimi tam olarak bilmiyorum
                      </span>
                    </label>
                  </div>
                </div>

                {/* 4. Doğum Yeri (Şehir) */}
                <div className="space-y-1">
                  <label className="text-xs font-serif text-zinc-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>Doğduğun Şehir</span>
                  </label>
                  <select
                    value={birthCity}
                    onChange={(e) => setBirthCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 text-sm text-zinc-100 font-sans transition-all cursor-pointer"
                  >
                    {TURKISH_CITIES.map((c) => (
                      <option key={c.name} value={c.name} className="bg-[#120726] text-zinc-100">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Hata Mesajı */}
                {formError && (
                  <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 p-2 rounded-xl text-center">
                    {formError}
                  </p>
                )}

                {/* Onayla Butonu */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full mt-2 py-3 rounded-xl font-serif text-sm tracking-wider font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
                    isSaved
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                      : 'bg-gradient-to-r from-amber-500 via-purple-600 to-amber-600 hover:from-amber-400 hover:via-purple-500 hover:to-amber-500 text-black font-bold border border-amber-300/60 shadow-[0_0_25px_rgba(245,158,11,0.35)]'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin text-amber-200" />
                      <span>Yıldızlar & Günlük Fal Hesaplanıyor...</span>
                    </>
                  ) : isSaved ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>Harita, Karakter & Günlük Fal Çıkarıldı</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-900" />
                      <span>Bilgileri Onayla & Yıldız Falımı Çıkar</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* SAĞ KOLON (5 Kolon): Fal Masası, Falcı Küresi, Burç Karakteri & Günlük Yorumu + 3D Tarot Destesi */}
          <div className="lg:col-span-5 flex flex-col items-center justify-start space-y-4">
            
            {/* ÜST BÖLÜM: Falcı Küresi ve Yanında/Altında Çıkan Bilgiler */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-[#0d041c]/60 p-4 rounded-3xl border border-purple-500/20 backdrop-blur-md shadow-xl">
              
              {/* Kristal Falcı Küresi (Sol Taraf / 5 Kolon) */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center">
                <div className="relative flex items-center justify-center w-40 h-40 sm:w-44 sm:h-44">
                  {/* Küre Kaidesi / Işık Halesi */}
                  <div
                    className={`absolute inset-0 rounded-full blur-2xl transition-all duration-1000 ${
                      isSaved
                        ? 'bg-gradient-to-tr from-amber-400/40 via-purple-600/40 to-cyan-400/40 scale-110 opacity-100 animate-pulse'
                        : 'bg-purple-900/20 scale-95 opacity-50'
                    }`}
                  />

                  {/* 3D Kristal Küre */}
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full border border-purple-300/40 shadow-[inset_0_0_35px_rgba(168,85,247,0.6),0_0_25px_rgba(147,51,234,0.4)] flex items-center justify-center overflow-hidden backdrop-blur-sm"
                    style={{
                      background: isSaved
                        ? 'radial-gradient(circle at 35% 30%, rgba(255, 235, 170, 0.4) 0%, rgba(139, 92, 246, 0.5) 45%, rgba(15, 6, 30, 0.95) 90%)'
                        : 'radial-gradient(circle at 35% 30%, rgba(147, 51, 234, 0.25) 0%, rgba(88, 28, 135, 0.4) 50%, rgba(10, 3, 20, 0.95) 95%)',
                    }}
                  >
                    {/* Yansıma */}
                    <div className="absolute top-2 left-3 w-10 h-5 bg-white/35 rounded-full blur-[2px] -rotate-45 pointer-events-none" />

                    {/* Küre İçeriği */}
                    {!isSaved ? (
                      <div className="text-center px-2 space-y-1 z-10 select-none">
                        <div className="w-5 h-5 mx-auto rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs">
                          ✦
                        </div>
                        <p className="text-[10px] font-serif text-purple-300/70 tracking-wider">
                          Küre Sessiz
                        </p>
                        <p className="text-[8px] text-zinc-500 leading-tight">
                          Bilgilerini onayla, küren aydınlansın
                        </p>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="text-center px-1.5 py-1 z-10 select-none space-y-0.5"
                      >
                        <div className="text-[10px] font-serif font-bold text-amber-200 tracking-wider truncate max-w-[120px] mx-auto">
                          ✦ {userName || 'Gezgin'} ✦
                        </div>
                        <div className="text-[10px] text-purple-100 flex items-center justify-center gap-1">
                          <Sun className="w-3 h-3 text-amber-400" />
                          <span className="font-semibold">{chartData?.sunSign}</span>
                        </div>
                        <div className="text-[9px] text-purple-200 flex items-center justify-center gap-1">
                          <Compass className="w-2.5 h-2.5 text-cyan-400" />
                          <span>
                            Yükselen: <strong className="text-amber-300">{chartData?.ascendant || 'Bilinmiyor'}</strong>
                          </span>
                        </div>
                        <div className="text-[9px] text-purple-300 flex items-center justify-center gap-1">
                          {renderElementIcon(dominantElement)}
                          <span>Element: <strong>{dominantElement}</strong></span>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Küre Kaidesi */}
                  <div className="absolute -bottom-2 w-24 h-5 bg-gradient-to-r from-amber-800 via-amber-600 to-amber-900 rounded-full border border-amber-500/40 shadow-xl flex items-center justify-center">
                    <div className="w-16 h-1 bg-amber-400/50 rounded-full blur-[1px]" />
                  </div>
                </div>

                <span className="mt-3 text-[11px] font-serif tracking-widest uppercase text-amber-300/80">
                  {isSaved ? '✨ Kozmik Fal Küresi' : 'Falcı Küresi'}
                </span>
              </div>

              {/* Kürenin Sağ Yanı: Hızlı Özet veya Bekleme Çağrısı (7 Kolon) */}
              <div className="sm:col-span-7 flex flex-col justify-center space-y-2">
                {!isSaved ? (
                  <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/20 text-center sm:text-left space-y-1">
                    <span className="text-[11px] font-serif text-amber-300 font-semibold flex items-center gap-1 justify-center sm:justify-start">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Kozmik Bilgeliğin Kilidi</span>
                    </span>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                      Formu onayladığında burç karakterin, mizaç özelliklerin ve bugüne özel kozmik fal yorumun burada açılacaktır.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 border-b border-purple-500/20 pb-1.5">
                      <span className="text-xs font-serif font-bold text-amber-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Kozmik Portre Özeti</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 ml-auto flex items-center gap-1 font-serif">
                        <CheckCircle2 className="w-3 h-3" /> Mühürlendi
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-500/20">
                        <span className="text-[10px] text-zinc-400 block font-serif">Güneş Burcu:</span>
                        <strong className="text-amber-200">{chartData?.sunSignFormatted || chartData?.sunSign}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-500/20">
                        <span className="text-[10px] text-zinc-400 block font-serif">Yükselen Burç:</span>
                        <strong className="text-cyan-200">
                          {chartData?.ascendantFormatted || (chartData?.ascendant ? chartData.ascendant : 'Bilinmiyor')}
                        </strong>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-500/20 text-[11px] flex items-center justify-between">
                      <span className="text-zinc-300">Baskın Element / Mizaç:</span>
                      <strong className="text-amber-300 flex items-center gap-1">
                        {renderElementIcon(dominantElement)} {dominantElement} Ruhu
                      </strong>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* ORTA BÖLÜM: BURÇ KARAKTERİ & GÜNLÜK FAL YORUMU KARTI */}
            {isSaved && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full bg-[#0d031c]/80 rounded-3xl border border-purple-500/30 p-4 sm:p-5 shadow-2xl backdrop-blur-md space-y-3.5"
              >
                {/* 2 Sekmeli Başlık (Burç Karakteri / O Günkü Fal Yorumu) */}
                <div className="flex items-center gap-2 p-1 rounded-2xl bg-purple-950/40 border border-purple-500/20">
                  <button
                    type="button"
                    onClick={() => setActiveOracleTab('character')}
                    className={`flex-1 py-2 px-3 rounded-xl font-serif text-xs font-semibold tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                      activeOracleTab === 'character'
                        ? 'bg-gradient-to-r from-amber-500/30 to-purple-600/40 text-amber-200 border border-amber-400/50 shadow-md'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-purple-900/20'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>1. Burç Karakteri</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveOracleTab('horoscope')}
                    className={`flex-1 py-2 px-3 rounded-xl font-serif text-xs font-semibold tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                      activeOracleTab === 'horoscope'
                        ? 'bg-gradient-to-r from-amber-500/30 to-purple-600/40 text-amber-200 border border-amber-400/50 shadow-md'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-purple-900/20'
                    }`}
                  >
                    <ScrollText className="w-3.5 h-3.5 text-amber-400" />
                    <span>2. O Günkü Fal Yorumu</span>
                  </button>
                </div>

                {/* 1. SEKMELİ İÇERİK: BURÇ KARAKTERİ & KOZMİK MİZAÇ */}
                {activeOracleTab === 'character' && (
                  <motion.div
                    key="tab-char"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    {/* Kişilik Özeti & Motivasyon */}
                    <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/20 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-amber-300">
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>Ruhun Temel Güdüsü & Arketipi</span>
                      </div>
                      <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                        {profileData?.personalitySummary ||
                          `${chartData?.sunSign} Güneşi ve ${dominantElement} elementi ile doğuştan yüksek irade, sezgisel derinlik ve dönüştürücü bir yaratıcı güce sahipsiniz.`}
                      </p>
                    </div>

                    {/* Yükselen Burç & Dış Dünya Maskesi */}
                    <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/20 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-cyan-300">
                        <Compass className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Dış Dünyaya Yansıyan Auran (Yükselen)</span>
                      </div>
                      <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                        {chartData?.ascendant
                          ? profileData?.outwardPersona ||
                            `Yükselen ${chartData.ascendant}, etrafınızdaki insanların sizi ilk bakışta güçlü, dikkat çekici ve saygı uyandıran bir aura ile algılamasını sağlar.`
                          : 'Doğum saati girilmediği için yükselen auran gizli kaldı; ancak Güneş burcun ve elementin karakterine berrak bir ışık tutuyor.'}
                      </p>
                    </div>

                    {/* Güçlü Yönler Rozetleri */}
                    {profileData?.strengths && profileData.strengths.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-serif text-amber-200/90 block">
                          ✦ Öne Çıkan Güçlü Yönlerin:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {profileData.strengths.map((s, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-full text-[11px] font-sans font-medium bg-amber-500/15 border border-amber-500/30 text-amber-300"
                            >
                              ✓ {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* İlişki ve Kalp Tarzı */}
                    {profileData?.relationshipStyle && (
                      <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/15 flex items-start gap-2 text-xs text-zinc-300">
                        <Heart className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-rose-300 font-serif block">Kalp & Aşk Enerjin:</strong>
                          <span>{profileData.relationshipStyle}</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 2. SEKMELİ İÇERİK: O GÜNKÜ FAL YORUMU (ÖZET & MERAK EDİLENLER) */}
                {activeOracleTab === 'horoscope' && (() => {
                  const forecast = getConciseDailyForecast(
                    chartData?.sunSign || 'Koç',
                    dominantElement || 'Ateş',
                    userName,
                    dailyTransitData
                  );

                  return (
                    <motion.div
                      key="tab-horo"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-2.5"
                    >
                      {/* Günün Tarihi ve Göksel Faz */}
                      <div className="flex items-center justify-between text-xs border-b border-purple-500/20 pb-1.5">
                        <span className="font-serif text-amber-300 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>{todayFormatted}</span>
                        </span>
                        <span className="text-[11px] text-purple-300 font-sans">
                          🌙 {dailyTransitData?.moonPhase || 'Ay Hilal Fazında'}
                        </span>
                      </div>

                      {/* Günün Vurucu Spotu */}
                      <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-purple-600/15 to-amber-500/15 border border-amber-500/30 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                        <p className="text-xs text-amber-200 font-serif leading-snug">
                          <strong>Günün Spotu:</strong> {forecast.spot}
                        </p>
                      </div>

                      {/* İnsanların Asıl Merak Ettiği 4 Kritik Alan */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* 1. Aşk & İlişki */}
                        <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/25 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-rose-300">
                            <Heart className="w-3.5 h-3.5 text-rose-400" />
                            <span>Aşk & Kalp Durumu</span>
                          </div>
                          <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                            {forecast.love}
                          </p>
                        </div>

                        {/* 2. Para & Kariyer */}
                        <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/25 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-emerald-300">
                            <Coins className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Para & Kariyer Kapısı</span>
                          </div>
                          <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                            {forecast.career}
                          </p>
                        </div>

                        {/* 3. Günün Uyarısı */}
                        <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/25 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-amber-300">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Günün Uyarısı</span>
                          </div>
                          <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                            {forecast.warning}
                          </p>
                        </div>

                        {/* 4. Şans & Kozmik Enerji */}
                        <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/25 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-purple-300">
                            <Zap className="w-3.5 h-3.5 text-purple-400" />
                            <span>Şans & Enerji Notu</span>
                          </div>
                          <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                            {forecast.luckyEnergy}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}
              </motion.div>
            )}

            {/* ALT BÖLÜM: BİZİM TAROT FAL KAĞITLARIMIZ ÜSTÜSTE (3D DESTE) */}
            <div className="w-full flex flex-col items-center pt-2 border-t border-purple-500/15">
              <StackedDeck3D
                onClick={handleProceed}
                isReady={true}
                label="Tarot Masasına Geç & Kartları Seç"
              />
            </div>

          </div>

        </div>
      </div>

      {/* Alt Bilgi */}
      <div className="relative z-10 py-3 text-center text-[11px] text-zinc-500 font-serif border-t border-purple-500/10">
        <span>Kadim Rider-Waite ve Swiss Ephemeris astroloji hesaplamaları ile korunmaktadır.</span>
      </div>
    </div>
  );
}
