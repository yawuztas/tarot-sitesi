'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Heart,
  Briefcase,
  Leaf,
  Star,
  RefreshCw,
  Share2,
  CheckCircle2,
  ShieldCheck,
  Download,
  Printer,
  Flame,
  Droplets,
  Wind,
  Mountain,
} from 'lucide-react';
import AudioOracle from './AudioOracle';
import StoryCardModal from './StoryCardModal';
import ElementalShop from './ElementalShop';
import OracleChat from './OracleChat';
import OracleSanctuary, { type SpreadType, type DeckStyleType } from './OracleSanctuary';
import MysticTableSpread, { type DrawProof } from './MysticTableSpread';
import { analyzeElementalDignities } from '@/lib/tarot/elemental-dignities';

export type PillarType = 'love' | 'career' | 'spirit' | 'daily';

interface PillarConfig {
  id: PillarType;
  title: string;
  subtitle: string;
  cardCount: number;
  icon: any;
  color: string;
  bgGlow: string;
  positions: string[];
}

const PILLARS: Record<PillarType, PillarConfig> = {
  love: {
    id: 'love',
    title: 'Aşk & İlişki Aynası',
    subtitle: 'Kalbinin hisleri, aklındaki kişinin gizli enerjisi ve aranızdaki bağ',
    cardCount: 3,
    icon: Heart,
    color: 'text-rose-400 border-rose-500/40 bg-rose-500/10',
    bgGlow: 'from-rose-600/20 via-purple-600/10 to-transparent',
    positions: ['Senin Kalbin & Enerjin', 'Onun Zihni & Gizli Niyeti', 'İlişkinin Gelecek Rotası'],
  },
  career: {
    id: 'career',
    title: 'Para, Kariyer & Bolluk',
    subtitle: 'Maddi fırsatlar, iş hayatındaki tıkanıklıklar ve zenginlik kapıları',
    cardCount: 3,
    icon: Briefcase,
    color: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
    bgGlow: 'from-amber-600/20 via-indigo-600/10 to-transparent',
    positions: ['Mevcut Maddi Enerjin', 'Önündeki Fırsat & Engel', 'Bolluğun Açılacağı Kapı'],
  },
  spirit: {
    id: 'spirit',
    title: 'Ruh Sağlığı, Şifa & Denge',
    subtitle: 'Zihinsel yorgunluk, çakra enerjin ve ruhunun şifa bulacağı mesaj',
    cardCount: 3,
    icon: Leaf,
    color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
    bgGlow: 'from-emerald-600/20 via-teal-600/10 to-transparent',
    positions: ['Taşıdığın İçsel Yük', 'Şifalanma & Dönüşüm Anahtarı', 'Ruhunun Evrensel Mesajı'],
  },
  daily: {
    id: 'daily',
    title: 'Günün Mistik Fısıltısı',
    subtitle: 'Günün enerjisi ve evrenin sana özel tek kartlık rehberliği',
    cardCount: 1,
    icon: Star,
    color: 'text-violet-400 border-violet-500/40 bg-violet-500/10',
    bgGlow: 'from-violet-600/20 via-purple-600/10 to-transparent',
    positions: ['Günün Anahtar Enerjisi'],
  },
};

interface DrawnCard {
  slug: string;
  name: string;
  nameTr: string;
  isReversed: boolean;
  positionIndex: number;
  positionLabel: string;
  element?: string | null;
  astrologicalCorrespondence?: string | null;
  imageUrlMedium?: string | null;
  isRevealed?: boolean;
}

const PILLAR_TO_INTENTION_SLUG: Record<PillarType, string> = {
  love: 'love',
  career: 'career',
  spirit: 'spiritual',
  daily: 'general',
};

interface AstroSummary {
  sunSign?: string;
  sunSignFormatted?: string;
  moonSign?: string;
  moonSignFormatted?: string;
  ascendant?: string;
  ascendantFormatted?: string;
}

export default function AltarTable() {
  const [selectedPillar, setSelectedPillar] = useState<PillarType>('love');
  const [selectedSpread, setSelectedSpread] = useState<SpreadType>('three-card');
  const [selectedStyle, setSelectedStyle] = useState<DeckStyleType>('rider-waite');
  const [intentionText, setIntentionText] = useState('');
  const [userName, setUserName] = useState('');

  // Astro-Tarot Doğum Bilgileri
  const [birthDate, setBirthDate] = useState('1998-05-14');
  const [birthTime, setBirthTime] = useState('14:30');
  const [birthTimeUnknown, setBirthTimeUnknown] = useState(false);
  const [birthCity, setBirthCity] = useState('İstanbul');
  const [includeAstro, setIncludeAstro] = useState(true);
  const [astroSummary, setAstroSummary] = useState<AstroSummary | null>(null);
  const [isCalculatingAstro, setIsCalculatingAstro] = useState(false);

  const [phase, setPhase] = useState<'setup' | 'fanning' | 'table' | 'reading'>('setup');
  const [tableCards, setTableCards] = useState<DrawnCard[]>([]);
  const [drawProof, setDrawProof] = useState<DrawProof | null>(null);

  // 5-Saniyelik Reklam/Suspense
  const [isAdSuspense, setIsAdSuspense] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);

  // Gemini AI Stream & Kayıt Durumu
  const [interpretation, setInterpretation] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'guest' | 'error'>('idle');
  const [reportDownloaded, setReportDownloaded] = useState(false);

  // Instagram Story Modalı
  const [storyModalOpen, setStoryModalOpen] = useState(false);

  const readingRef = useRef<HTMLDivElement | null>(null);
  const restoredAstroKeyRef = useRef<string | null>(null);
  const currentPillar = PILLARS[selectedPillar];

  // Açılıma göre dinamik pozisyon başlıkları (referans stabilitesi için memoized)
  const spreadPositions = useMemo(() => {
    if (selectedSpread === 'horseshoe') {
      return [
        '1. Geçmişin Kökleri',
        '2. Şimdiki Durum & Kalbin',
        '3. Gizli Etkiler & Gölgeler',
        '4. Önündeki En Büyük Engel',
        '5. Çevren & Dış Dünyanın Bakışı',
        '6. Kahinin Bilge Tavsiyesi',
        '7. Nihai Çözüm & Kader Kapısı',
      ];
    }
    if (selectedSpread === 'celtic-cross') {
      return [
        '1. Şimdiki Durum (Mesele)',
        '2. Karşıt Enerji & Meydan Okuma',
        '3. Bilinçaltı & Geçmişin Temeli',
        '4. Yakın Geçmişin İzi',
        '5. Taç / Olası En Yüksek Potansiyel',
        '6. Yakın Gelecek (İlk Adım)',
        '7. Kendi Tutumun & Duruşun',
        '8. Çevre ve Dış Dünya Etkisi',
        '9. Umutlar ve Gizli Korkular',
        '10. Nihai Sonuç ve Kader Mührü',
      ];
    }
    return [
      '1. Geçmiş (Kökler & Başlangıç)',
      '2. Şimdi (Mevcut Durum & Enerji)',
      '3. Gelecek (Varılacak Rota)',
    ];
  }, [selectedSpread]);

  // Oturumdan gelen hazır ayarları yükle (Stage 3'ten geçişte)
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const saved = sessionStorage.getItem('tarot_ritual_setup');
        if (!saved) return;
        const data = JSON.parse(saved);
        if (data.userName) setUserName(data.userName);
        if (data.intentionText) setIntentionText(data.intentionText);
        if (data.selectedSpread) setSelectedSpread(data.selectedSpread);
        if (data.selectedPillar) setSelectedPillar(data.selectedPillar);
        if (data.birthDate) setBirthDate(data.birthDate);
        if (data.birthTime) setBirthTime(data.birthTime);
        if (typeof data.birthTimeUnknown === 'boolean') setBirthTimeUnknown(data.birthTimeUnknown);
        if (data.birthCity) setBirthCity(data.birthCity);
        if (typeof data.includeAstro === 'boolean') setIncludeAstro(data.includeAstro);
        if (data.astroSummary) {
          setAstroSummary(data.astroSummary);
          restoredAstroKeyRef.current = `${data.birthDate || ''}|${data.birthTime || ''}|${Boolean(data.birthTimeUnknown)}|${data.birthCity || ''}`;
        }
        if (data.autoProceedToFanning) {
          setPhase('fanning');
        }
      } catch (e) {
        console.warn('Could not restore tarot ritual setup', e);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Doğum haritasını arka planda hesapla (gereksiz tekrar istekleri önlenir)
  useEffect(() => {
    let cancelled = false;

    if (!includeAstro || !birthDate) {
      Promise.resolve().then(() => {
        if (!cancelled) setAstroSummary(null);
      });
      return () => {
        cancelled = true;
      };
    }

    const currentKey = `${birthDate}|${birthTime}|${birthTimeUnknown}|${birthCity}`;
    if (restoredAstroKeyRef.current === currentKey) {
      return () => {
        cancelled = true;
      };
    }

    async function computeChart() {
      setIsCalculatingAstro(true);
      try {
        const resp = await fetch('/api/astrology/chart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            birthDate,
            birthTime: birthTimeUnknown ? undefined : birthTime,
            birthTimeUnknown,
            birthCity,
          }),
        });

        if (!cancelled && resp.ok) {
          const data = await resp.json();
          const chart = data.chart;
          if (chart) {
            setAstroSummary({
              sunSign: chart.sunSign,
              sunSignFormatted: chart.sunSignFormatted,
              moonSign: chart.moonSign,
              moonSignFormatted: chart.moonSignFormatted,
              ascendant: chart.ascendant,
              ascendantFormatted: chart.ascendantFormatted,
            });
            restoredAstroKeyRef.current = currentKey;
          }
        }
      } catch (err) {
        console.warn('Astro calculation failed:', err);
      } finally {
        if (!cancelled) setIsCalculatingAstro(false);
      }
    }

    computeChart();
    return () => {
      cancelled = true;
    };
  }, [includeAstro, birthDate, birthTime, birthTimeUnknown, birthCity]);

  // Hilal Desteye Geç
  const handleProceedToFanning = () => {
    setTableCards([]);
    setDrawProof(null);
    setInterpretation('');
    setSaveStatus('idle');
    setReportDownloaded(false);
    setPhase('fanning');
  };

  const handleSelectionComplete = useCallback((cards: DrawnCard[], proof?: DrawProof) => {
    setTableCards(cards);
    setDrawProof(proof || null);
    setPhase('table');
  }, []);

  const handleFlipCard = (index: number) => {
    setTableCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, isRevealed: !c.isRevealed } : c))
    );
  };

  const handleFlipAllCards = () => {
    setTableCards((prev) => prev.map((c) => ({ ...c, isRevealed: true })));
  };

  const allCardsRevealed = tableCards.length > 0 && tableCards.every((c) => c.isRevealed);

  const elementalAnalysis = useMemo(() => {
    if (tableCards.length === 0) return null;
    return analyzeElementalDignities(
      tableCards.map((c) => ({
        slug: c.slug,
        nameTr: c.nameTr,
        suit: c.slug.startsWith('minor-') ? c.slug.split('-')[1] || null : null,
      }))
    );
  }, [tableCards]);

  const renderCardSlot = (
    card: DrawnCard,
    idx: number,
    options?: { size?: 'celtic' | 'horseshoe' | 'default'; rotateCross?: boolean }
  ) => {
    const sizeMode = options?.size || 'default';
    const sizeClass =
      sizeMode === 'celtic'
        ? 'w-20 h-32 sm:w-24 sm:h-36 xl:w-24 xl:h-38'
        : sizeMode === 'horseshoe'
        ? 'w-24 h-40 sm:w-28 sm:h-44 xl:w-32 xl:h-52'
        : 'w-44 h-72 md:w-52 md:h-80';
    const isSmallText = sizeMode !== 'default';

    return (
      <div key={card.slug + idx} className="flex flex-col items-center">
        <span className={`${isSmallText ? 'text-[10px] mb-1 max-w-[115px] truncate' : 'text-[11px] mb-2 max-w-[150px] line-clamp-2'} font-serif text-purple-300/85 font-medium text-center`} title={card.positionLabel}>
          {card.positionLabel}
        </span>

        {/* 3D Flip Card Container */}
        <div
          onClick={() => handleFlipCard(idx)}
          className={`${sizeClass} cursor-pointer rounded-xl sm:rounded-2xl relative ${
            options?.rotateCross ? 'lg:rotate-90 lg:scale-90' : ''
          }`}
          style={{ perspective: '1200px' }}
        >
          <motion.div
            animate={{ rotateY: card.isRevealed ? 180 : 0 }}
            transition={{ duration: 0.85, ease: 'easeInOut' }}
            className="w-full h-full relative rounded-xl sm:rounded-2xl shadow-2xl"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Kart Arkası (Kapalı - Özel Mistik Arma) */}
            <div
              className="absolute inset-0 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-amber-500/60 transition-all hover:border-amber-300 hover:shadow-[0_0_35px_rgba(217,119,6,0.6)] group"
              style={{
                backfaceVisibility: 'hidden',
                background: '#0e0419',
              }}
            >
              <img
                src="/cards/medium-card-back.webp"
                alt="Mistik Tarot Kart Sırtı"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end justify-center pb-2">
                <span className="text-[9px] sm:text-[10px] font-serif text-amber-200 uppercase tracking-widest bg-black/60 px-2.5 py-0.5 rounded-full border border-amber-400/40 backdrop-blur-sm shadow-lg flex items-center gap-1 group-hover:border-amber-300 group-hover:text-amber-100">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                  Aç
                </span>
              </div>
            </div>

            {/* Kart Önü (Açık - Yüksek Kontrastlı Canlı Çizim) */}
            <div
              className={`absolute inset-0 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-amber-400/70 shadow-[0_0_30px_rgba(217,119,6,0.35)] bg-[#0a0414] ${
                card.isReversed ? 'rotate-180' : ''
              }`}
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <img
                src={card.imageUrlMedium || `/cards/rider-waite/medium-${card.slug}.webp`}
                alt={card.nameTr}
                className="w-full h-full object-cover filter contrast-[1.18] brightness-[1.04] saturate-[1.12]"
                loading="lazy"
              />
            </div>
          </motion.div>
        </div>

        {/* Kart Bilgileri (Açıldıktan sonra belirir) */}
        <div className={`text-center ${isSmallText ? 'mt-1.5 min-h-[2.1rem]' : 'mt-2.5 min-h-[2.75rem]'}`}>
          {card.isRevealed ? (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-0.5"
            >
              <div className={`font-serif ${isSmallText ? 'text-[11px] leading-tight' : 'text-sm md:text-base'} text-amber-200 font-semibold`}>
                {card.nameTr}
              </div>
              <div className="flex items-center justify-center gap-1 flex-wrap">
                {card.isReversed ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-950/70 border border-rose-500/40 text-rose-300 font-medium">
                    Ters
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-medium">
                    Düz
                  </span>
                )}
                {card.element && (
                  <span className="text-[9px] text-zinc-400">· {card.element}</span>
                )}
              </div>
            </motion.div>
          ) : (
            <span className="text-[10px] text-zinc-500 italic">Henüz açılmadı</span>
          )}
        </div>
      </div>
    );
  };

  // 5 Saniyelik Reklam Geri Sayımı
  const handleStartReadingWithSuspense = () => {
    setIsAdSuspense(true);
    setAdCountdown(5);

    const timer = setInterval(() => {
      setAdCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsAdSuspense(false);
          startInterpretationStream();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Gemini AI Astro-Tarot Hibrit Yorum Stream'i + Otomatik Kayıt
  const startInterpretationStream = async () => {
    setPhase('reading');
    setIsStreaming(true);
    setInterpretation('');
    setSaveStatus('idle');

    setTimeout(() => {
      readingRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 200);

    let accumulated = '';
    const intentionSlug = PILLAR_TO_INTENTION_SLUG[selectedPillar] || 'general';
    const resolvedIntention = intentionText || 'Genel Yaşam Haritası ve Kader Rehberliği';

    try {
      const resp = await fetch('/api/readings/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          styleSlug: selectedStyle,
          spreadSlug: selectedSpread,
          intentionSlug,
          intentionText: resolvedIntention,
          userDisplayName: userName || 'Yolcu',
          birthDate: includeAstro ? birthDate : undefined,
          birthChartSnapshot: astroSummary ? {
            sunSign: astroSummary.sunSign,
            sunSignFormatted: astroSummary.sunSignFormatted,
            moonSign: astroSummary.moonSign,
            moonSignFormatted: astroSummary.moonSignFormatted,
            ascendant: astroSummary.ascendant,
            ascendantFormatted: astroSummary.ascendantFormatted,
          } : undefined,
          cards: tableCards.map((c) => ({
            slug: c.slug,
            isReversed: c.isReversed,
            positionIndex: c.positionIndex,
          })),
        }),
      });

      if (!resp.ok) throw new Error('AI yorumu alınamadı');

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('Stream okuyucu açılamadı');

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setInterpretation(accumulated);
      }
    } catch (err) {
      console.error('Yorum stream hatası:', err);
    } finally {
      setIsStreaming(false);
    }

    // Yorum tamamlandıysa falı veritabanına kaydet (kayıtlı kullanıcılar için /fallarim)
    if (accumulated.trim().length > 0) {
      setSaveStatus('saving');
      try {
        const saveResp = await fetch('/api/readings/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            styleSlug: selectedStyle,
            spreadSlug: selectedSpread,
            intentionSlug,
            intentionText: resolvedIntention,
            cards: tableCards.map((c) => ({
              slug: c.slug,
              isReversed: c.isReversed,
              positionIndex: c.positionIndex,
            })),
            seed: drawProof?.seed || `client-${Date.now()}`,
            hash: drawProof?.hash || 'unverified',
            interpretation: accumulated,
            astroContextJson: astroSummary ? JSON.stringify(astroSummary) : undefined,
          }),
        });
        if (saveResp.ok) {
          const saveData = await saveResp.json();
          setSaveStatus(saveData.savedToUser ? 'saved' : 'guest');
        } else {
          setSaveStatus('error');
        }
      } catch {
        setSaveStatus('error');
      }
    }
  };

  const handleDownloadReadingReport = () => {
    const lines = [
      'MYSTIC TAROT — KİŞİSEL KEHANET RAPORU',
      `Tarih: ${new Date().toLocaleString('tr-TR')}`,
      `Yolcu: ${userName || 'Yolcu'}`,
      `Alan: ${currentPillar.title}`,
      `Açılım: ${selectedSpread}`,
      intentionText ? `Niyet: ${intentionText}` : '',
      astroSummary
        ? `Yıldız Haritası: Güneş ${astroSummary.sunSignFormatted || astroSummary.sunSign || '-'} | Ay ${astroSummary.moonSignFormatted || astroSummary.moonSign || '-'} | Yükselen ${astroSummary.ascendantFormatted || astroSummary.ascendant || 'Bilinmiyor'}`
        : '',
      drawProof?.hash ? `Provably-Fair Doğrulama Özeti (SHA-256): ${drawProof.hash}` : '',
      '',
      '--- ÇEKİLEN KARTLAR ---',
      ...tableCards.map(
        (c) => `• ${c.positionLabel}: ${c.nameTr} (${c.isReversed ? 'Ters' : 'Düz'})`
      ),
      '',
      '--- KAHİN YORUMU ---',
      interpretation,
    ]
      .filter(Boolean)
      .join('\n');

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mystic-tarot-kehanet-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setReportDownloaded(true);
  };

  const handleReset = () => {
    setPhase('setup');
    setTableCards([]);
    setDrawProof(null);
    setInterpretation('');
    setSaveStatus('idle');
    setReportDownloaded(false);
    setIsAdSuspense(false);
  };

  return (
    <div className={`relative min-h-screen text-zinc-100 px-4 ${phase === 'fanning' || phase === 'table' ? 'py-4' : 'py-10'}`}>
      {/* Üst Atmosfer Glow */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b ${currentPillar.bgGlow} blur-[140px] pointer-events-none`}
      />

      <div className={`w-full mx-auto relative z-10 transition-all duration-500 ${phase === 'fanning' ? 'max-w-[1720px] 2xl:max-w-[1880px] px-2 sm:px-4' : 'max-w-7xl 2xl:max-w-[1500px]'}`}>
        {/* ======================================================== */}
        {/* FAZ 1 (2. SAYFA): SEÇİM MABEDİ (KÜRE + 3D KART DESTESİ)   */}
        {/* ======================================================== */}
        {phase === 'setup' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <OracleSanctuary
              selectedPillar={selectedPillar}
              onSelectPillar={setSelectedPillar}
              selectedSpread={selectedSpread}
              onSelectSpread={setSelectedSpread}
              selectedStyle={selectedStyle}
              onSelectStyle={setSelectedStyle}
              userName={userName}
              onUserNameChange={setUserName}
              intentionText={intentionText}
              onIntentionTextChange={setIntentionText}
              includeAstro={includeAstro}
              onIncludeAstroChange={setIncludeAstro}
              birthDate={birthDate}
              onBirthDateChange={setBirthDate}
              birthTime={birthTime}
              onBirthTimeChange={setBirthTime}
              birthTimeUnknown={birthTimeUnknown}
              onBirthTimeUnknownChange={setBirthTimeUnknown}
              birthCity={birthCity}
              onBirthCityChange={setBirthCity}
              astroSummary={astroSummary}
              isCalculatingAstro={isCalculatingAstro}
              onProceedToCards={handleProceedToFanning}
            />
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* FAZ 2 (3. SAYFA): MİSTİK MASA, 3D KARIŞTIRMA & YAYILMA   */}
        {/* ======================================================== */}
        {phase === 'fanning' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-2 space-y-4"
          >
            {/* 3. Sayfa: Otantik Mistik Masa, 3D Karıştırma ve Masaya Yayılma */}
            <MysticTableSpread
              positions={spreadPositions}
              spreadSlug={selectedSpread}
              styleSlug={selectedStyle}
              pillarTitle={`${currentPillar.title} — ${selectedSpread === 'three-card' ? '3 Kartlık Açılım' : selectedSpread === 'horseshoe' ? '7 Kartlık Kader Yolu' : '10 Kartlık Kelt Haçı'} (${selectedStyle === 'marseille' ? 'Marsilya' : 'Rider-Waite'})`}
              onSelectionComplete={handleSelectionComplete}
            />

            <button
              onClick={() => setPhase('setup')}
              className="px-5 py-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-purple-500/20 text-zinc-400 hover:text-zinc-200 text-xs tracking-wider transition"
            >
              ← Bilgilere Geri Dön
            </button>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* FAZ 3: MASADAKİ 3D TAKLA ATAN LÜKS KARTLAR */}
        {/* ======================================================== */}
        {(phase === 'table' || phase === 'reading') && (
          <div className="space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {currentPillar.title}
              </div>
              <h2 className="font-serif text-2xl md:text-3xl text-amber-100">
                Kartlarına Dokunarak 3D Çevir
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Her bir karta dokunarak arkasındaki kadim sırrı ve gerçek çizimi açığa çıkar.
              </p>
            </div>

            {/* Masadaki Kart Yuvaları — Açılıma göre tek ekrana sığan formasyon */}
            {selectedSpread === 'celtic-cross' && tableCards.length === 10 ? (
              <>
                {/* Masaüstü Kompakt Kelt Haçı (Haç + 2x2 Asa Sütunu — tek ekrana sığar) */}
                <div className="hidden lg:grid lg:grid-cols-12 gap-5 items-center my-2 max-w-6xl mx-auto">
                  {/* Sol 8 Kolon: Kutsal Haç (1-6) */}
                  <div className="lg:col-span-8 grid grid-cols-3 gap-2 items-center justify-items-center">
                    <div />
                    <div>{renderCardSlot(tableCards[4], 4, { size: 'celtic' })}</div>
                    <div />

                    <div>{renderCardSlot(tableCards[3], 3, { size: 'celtic' })}</div>
                    <div className="flex items-center justify-center gap-3">
                      {renderCardSlot(tableCards[0], 0, { size: 'celtic' })}
                      {renderCardSlot(tableCards[1], 1, { size: 'celtic', rotateCross: true })}
                    </div>
                    <div>{renderCardSlot(tableCards[5], 5, { size: 'celtic' })}</div>

                    <div />
                    <div>{renderCardSlot(tableCards[2], 2, { size: 'celtic' })}</div>
                    <div />
                  </div>

                  {/* Sağ 4 Kolon: 4 Kartlık Asa (2x2 Kompakt Dizilim) */}
                  <div className="lg:col-span-4 grid grid-cols-2 gap-3 justify-items-center border-l border-purple-500/20 pl-5">
                    {[9, 8, 7, 6].map((cardIdx) =>
                      renderCardSlot(tableCards[cardIdx], cardIdx, { size: 'celtic' })
                    )}
                  </div>
                </div>

                {/* Mobil / Tablet Grid */}
                <div className="flex lg:hidden flex-wrap items-center justify-center gap-4 my-4">
                  {tableCards.map((card, idx) => renderCardSlot(card, idx, { size: 'celtic' }))}
                </div>
              </>
            ) : selectedSpread === 'horseshoe' && tableCards.length === 7 ? (
              <div className="flex flex-wrap items-end justify-center gap-3 md:gap-4 my-6 max-w-6xl mx-auto">
                {tableCards.map((card, idx) => {
                  const archOffsets = [
                    'lg:-translate-y-8',
                    'lg:-translate-y-3',
                    'lg:translate-y-2',
                    'lg:translate-y-5',
                    'lg:translate-y-2',
                    'lg:-translate-y-3',
                    'lg:-translate-y-8',
                  ];
                  return (
                    <div key={card.slug + idx} className={`transition-transform ${archOffsets[idx] || ''}`}>
                      {renderCardSlot(card, idx, { size: 'horseshoe' })}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 my-6">
                {tableCards.map((card, idx) => renderCardSlot(card, idx))}
              </div>
            )}

            {/* Kart Çevirme & Kehaneti Başlatma Butonları */}
            <div className="flex items-center justify-center gap-3">
              {!allCardsRevealed && (
                <button
                  onClick={handleFlipAllCards}
                  className="px-5 py-2.5 rounded-xl bg-purple-900/50 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 text-xs tracking-wider font-medium"
                >
                  Tüm Kartları Aç
                </button>
              )}

              {allCardsRevealed && phase !== 'reading' && !isAdSuspense && (
                <button
                  onClick={handleStartReadingWithSuspense}
                  className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-xs tracking-widest uppercase transition-all shadow-[0_0_25px_rgba(217,119,6,0.3)] flex items-center gap-2 animate-bounce"
                >
                  <Sparkles className="w-4 h-4" />
                  Astro-Tarot Kehanetini Al
                </button>
              )}
            </div>

            {/* 5 SANİYELİK MİSTİK REKLAM / SUSPENSE */}
            <AnimatePresence>
              {isAdSuspense && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="max-w-xl mx-auto rounded-2xl bg-[#160a2b] border border-amber-500/40 p-6 text-center shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-amber-500/10 to-purple-600/10 animate-pulse" />
                  <div className="relative z-10 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center mx-auto text-xl font-bold text-amber-300">
                      {adCountdown}
                    </div>
                    <h4 className="font-serif text-lg text-amber-100">Kahin Trans Halinde...</h4>
                    <p className="text-xs text-zinc-400">
                      Doğum haritandaki gökyüzü transitleri ile masadaki kartların frekansı
                      birleşiyor. Kehanet {adCountdown} saniye içinde dökülecek.
                    </p>
                    <div className="mt-4 p-4 rounded-xl border border-dashed border-purple-500/30 bg-black/40 text-[11px] text-zinc-400 flex flex-col items-center justify-center min-h-[90px]">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">
                        Sponsorlu Reklam Alanı (Google AdSense)
                      </span>
                      <span className="text-amber-300/80 font-serif">
                        ✦ Bu seans sponsorlarımızın desteğiyle %100 ücretsizdir ✦
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ======================================================== */}
            {/* FAZ 4: GEMINI AI MİSTİK YORUMU, SESLİ KAHİN & 10 SORULUK SOHBET */}
            {/* ======================================================== */}
            {phase === 'reading' && (
              <motion.div
                ref={readingRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl mx-auto bg-gradient-to-b from-[#180b2d]/90 to-[#0e0419]/95 border border-purple-500/30 rounded-2xl p-6 md:p-10 shadow-2xl space-y-6"
              >
                {/* Yorum Başlığı ve Sesli Kahin */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-purple-500/20">
                  <div className="text-center sm:text-left">
                    <div className="text-xs text-amber-400 uppercase tracking-widest font-serif">
                      ✦ Gemini AI Astro-Tarot Kehaneti ✦
                    </div>
                    <h3 className="font-serif text-xl md:text-2xl text-zinc-100">
                      {userName ? `${userName}'in` : ''} {currentPillar.title} Açılımı
                    </h3>
                  </div>

                  {/* Sesli Fısıldayan Kahin & 432Hz Tibet Çanı */}
                  {interpretation && <AudioOracle textToSpeak={interpretation} />}
                </div>

                {/* Elemental Onurlar & Enerji Dengesi */}
                {elementalAnalysis && (
                  <div className="p-4 rounded-xl bg-purple-950/35 border border-purple-500/25 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-serif font-semibold text-amber-200 uppercase tracking-wider">
                        ✦ Elemental Denge & Kart Uyumu
                      </span>
                      {elementalAnalysis.dominantElement && (
                        <span className="text-[11px] text-purple-200">
                          Baskın Enerji: <strong className="text-amber-300">{elementalAnalysis.dominantElement}</strong>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-200">
                        <Flame className="w-3.5 h-3.5 mx-auto mb-0.5 text-amber-400" />
                        Ateş: <strong>{elementalAnalysis.elementDistribution.fire}</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-200">
                        <Droplets className="w-3.5 h-3.5 mx-auto mb-0.5 text-blue-400" />
                        Su: <strong>{elementalAnalysis.elementDistribution.water}</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/25 text-sky-200">
                        <Wind className="w-3.5 h-3.5 mx-auto mb-0.5 text-sky-400" />
                        Hava: <strong>{elementalAnalysis.elementDistribution.air}</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-200">
                        <Mountain className="w-3.5 h-3.5 mx-auto mb-0.5 text-emerald-400" />
                        Toprak: <strong>{elementalAnalysis.elementDistribution.earth}</strong>
                      </div>
                    </div>

                    {elementalAnalysis.summary && (
                      <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                        {elementalAnalysis.summary}
                      </p>
                    )}
                  </div>
                )}

                {/* Yorum Metni */}
                <div className="font-serif text-zinc-200 text-sm md:text-base leading-relaxed whitespace-pre-line">
                  {interpretation ? (
                    interpretation
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-10 text-amber-300/60 italic text-sm">
                      <Sparkles className="w-5 h-5 animate-spin" />
                      Yıldızlar hizalanıyor, kahin fısıldamaya başladı...
                    </div>
                  )}
                </div>

                {/* Aksiyon Araç Çubuğu & Kayıt / Provably-Fair Durumu */}
                <div className="pt-6 border-t border-purple-500/20 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => setStoryModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-900/50 hover:bg-purple-800/70 border border-purple-400/40 text-purple-200 text-xs font-medium tracking-wide transition-all shadow-md"
                    >
                      <Share2 className="w-4 h-4 text-amber-300" />
                      Instagram Story Kartı Oluştur
                    </button>

                    <button
                      onClick={handleReset}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 text-xs transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Yeni Fal Aç
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap text-[11px]">
                    {drawProof?.hash && (
                      <span
                        title={`Seed: ${drawProof.seed}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 font-mono"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>SHA-256: {drawProof.hash.slice(0, 10)}…</span>
                      </span>
                    )}

                    {saveStatus === 'saved' && (
                      <Link
                        href="/fallarim"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-200 hover:bg-amber-500/25 transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Fal Geçmişine Kaydedildi →</span>
                      </Link>
                    )}

                    {saveStatus === 'guest' && (
                      <Link
                        href="/giris?callbackUrl=/fallarim"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-200 hover:text-amber-200 transition"
                      >
                        <span>Geçmişini saklamak için giriş yap →</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* ======================================================== */}
                {/* 10 SORULUK CANLI FALCI SOHBETİ (Kullanıcının Orijinal Vizyonu) */}
                {/* ======================================================== */}
                <OracleChat
                  userName={userName || 'Yolcu'}
                  spreadSlug={selectedSpread}
                  styleSlug={selectedStyle}
                  sessionKey={drawProof?.hash || `${selectedSpread}-${tableCards.map((c) => c.slug).join('-')}`}
                  astroContext={{
                    sunSign: astroSummary?.sunSignFormatted || astroSummary?.sunSign,
                    sunSignFormatted: astroSummary?.sunSignFormatted,
                    moonSign: astroSummary?.moonSignFormatted || astroSummary?.moonSign,
                    moonSignFormatted: astroSummary?.moonSignFormatted,
                    ascendant: astroSummary?.ascendantFormatted || astroSummary?.ascendant,
                    ascendantFormatted: astroSummary?.ascendantFormatted,
                  }}
                  drawnCards={tableCards}
                  pillarTitle={currentPillar.title}
                  initialReading={interpretation}
                />

                {/* KİŞİYE ÖZEL KEHANET RAPORU İNDİRME & YAZDIRMA */}
                <div className="mt-8 p-5 rounded-xl bg-gradient-to-r from-amber-500/10 via-purple-900/20 to-amber-500/10 border border-amber-400/30 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Kişiye Özel Mistik Kehanet Raporu
                    </div>
                    <p className="text-xs text-zinc-300">
                      Çekilen kartlarını, doğum haritası özetini ve tüm yorumu PDF olarak yazdır veya metin dosyası olarak indir.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => window.print()}
                      disabled={!interpretation || isStreaming}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-900/60 hover:bg-purple-800/70 disabled:opacity-50 border border-purple-400/40 text-purple-100 text-xs font-semibold tracking-wider uppercase transition-all"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-300" />
                      <span>PDF / Yazdır</span>
                    </button>
                    <button
                      onClick={handleDownloadReadingReport}
                      disabled={!interpretation || isStreaming}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-bold tracking-wider uppercase transition-all shadow-md"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{reportDownloaded ? 'İndirildi ✓' : '.txt İndir'}</span>
                    </button>
                  </div>
                </div>

                {/* ELEMENTAL DOĞAL TAŞ MAĞAZASI (KOMİSYONSUZ) */}
                <ElementalShop pillarType={selectedPillar === 'daily' ? 'love' : selectedPillar} />
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Instagram Story Kehanet Kartı Modalı */}
      <StoryCardModal
        isOpen={storyModalOpen}
        onClose={() => setStoryModalOpen(false)}
        cards={tableCards}
        pillarTitle={currentPillar.title}
        userName={userName || 'Yolcu'}
        astroSummary={{
          sunSign: astroSummary?.sunSignFormatted || astroSummary?.sunSign,
          moonSign: astroSummary?.moonSignFormatted || astroSummary?.moonSign,
          ascendant: astroSummary?.ascendantFormatted || astroSummary?.ascendant,
        }}
        quote={
          interpretation.slice(0, 140) ||
          'Kader senin seçimlerinle konuşur; karanlığın bittiği yerde yıldızlar fısıldar.'
        }
      />
    </div>
  );
}
