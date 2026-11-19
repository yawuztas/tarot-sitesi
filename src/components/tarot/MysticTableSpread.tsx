'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, Eye, Check } from 'lucide-react';

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

export interface DrawProof {
  seed: string;
  hash: string;
}

interface MysticTableSpreadProps {
  positions: string[];
  pillarTitle: string;
  spreadSlug?: string;
  styleSlug?: string;
  onSelectionComplete: (cards: DrawnCard[], proof?: DrawProof) => void;
}

export default function MysticTableSpread({
  positions,
  pillarTitle,
  spreadSlug = 'three-card',
  styleSlug = 'rider-waite',
  onSelectionComplete,
}: MysticTableSpreadProps) {
  // Faz: 'shuffling' -> 'spread' -> 'revealed'
  const [phase, setPhase] = useState<'shuffling' | 'spread' | 'revealed'>('shuffling');
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [fetchedCards, setFetchedCards] = useState<DrawnCard[]>([]);
  const [drawProof, setDrawProof] = useState<DrawProof | undefined>(undefined);
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // 1. Arka planda sunucudan CSPRNG ile provably-fair kart çek
  useEffect(() => {
    let cancelled = false;

    async function loadCards() {
      try {
        const resp = await fetch('/api/readings/draw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            styleSlug,
            spreadSlug,
          }),
        });
        if (!resp.ok) {
          throw new Error(`Kart çekimi başarısız (${resp.status})`);
        }
        const data = await resp.json();
        if (cancelled) return;

        const mapped: DrawnCard[] = (data.cards || []).map((c: any, idx: number) => ({
          slug: c.slug,
          name: c.name,
          nameTr: c.nameTr,
          isReversed: Boolean(c.isReversed),
          positionIndex: c.positionIndex ?? idx,
          positionLabel: positions[idx] || data.positions?.[idx]?.labelTr || `Pozisyon ${idx + 1}`,
          element: c.element ?? null,
          astrologicalCorrespondence: c.astrologicalCorrespondence ?? null,
          imageUrlMedium: c.imageUrlMedium || `/cards/${styleSlug}/medium-${c.slug}.webp`,
          isRevealed: false,
        }));

        if (mapped.length > 0) {
          setFetchedCards(mapped);
          if (data.seed && data.hash) {
            setDrawProof({ seed: data.seed, hash: data.hash });
          }
          return;
        }
      } catch (e) {
        console.error('Kart verisi sunucudan çekilemedi, yedek deste devrede:', e);
      }

      if (cancelled) return;

      // Yalnızca sunucu erişilemezse istemci yedek destesi kullanılır
      const FALLBACK_CARDS = [
        { slug: 'major-00-fool', name: 'The Fool', nameTr: 'Deli', element: 'Hava', astro: 'Uranüs' },
        { slug: 'major-01-magician', name: 'The Magician', nameTr: 'Büyücü', element: 'Hava', astro: 'Merkür' },
        { slug: 'major-02-high-priestess', name: 'The High Priestess', nameTr: 'Azize', element: 'Su', astro: 'Ay' },
        { slug: 'major-03-empress', name: 'The Empress', nameTr: 'İmparatoriçe', element: 'Toprak', astro: 'Venüs' },
        { slug: 'major-06-lovers', name: 'The Lovers', nameTr: 'Aşıklar', element: 'Hava', astro: 'İkizler' },
        { slug: 'major-09-hermit', name: 'The Hermit', nameTr: 'Ermiş', element: 'Toprak', astro: 'Başak' },
        { slug: 'major-10-wheel-of-fortune', name: 'The Wheel of Fortune', nameTr: 'Kader Çarkı', element: 'Ateş', astro: 'Jüpiter' },
        { slug: 'major-17-star', name: 'The Star', nameTr: 'Yıldız', element: 'Hava', astro: 'Kova' },
        { slug: 'major-18-moon', name: 'The Moon', nameTr: 'Ay', element: 'Su', astro: 'Balık' },
        { slug: 'major-19-sun', name: 'The Sun', nameTr: 'Güneş', element: 'Ateş', astro: 'Güneş' },
      ];
      const targetCount = positions.length || 3;
      const shuffled = [...FALLBACK_CARDS].sort(() => 0.5 - Math.random());
      setFetchedCards(
        Array.from({ length: targetCount }).map((_, idx) => {
          const picked = shuffled[idx % shuffled.length];
          return {
            slug: picked.slug,
            name: picked.name,
            nameTr: picked.nameTr,
            isReversed: Math.random() < 0.35,
            positionIndex: idx,
            positionLabel: positions[idx] || `${idx + 1}. Kart`,
            element: picked.element,
            astrologicalCorrespondence: picked.astro,
            imageUrlMedium: `/cards/${styleSlug}/medium-${picked.slug}.webp`,
            isRevealed: false,
          };
        })
      );
    }

    loadCards();
    return () => {
      cancelled = true;
    };
  }, [positions, spreadSlug, styleSlug]);

  // 2. Kart Karıştırma Sesi (Synthetic Shuffling Flutter)
  const playShuffleSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const now = ctx.currentTime;
      for (let i = 0; i < 10; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(130 + Math.random() * 90, now + i * 0.18);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(750 + Math.random() * 450, now + i * 0.18);

        gain.gain.setValueAtTime(0.01, now + i * 0.18);
        gain.gain.linearRampToValueAtTime(0.09, now + i * 0.18 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.15);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.18);
        osc.stop(now + i * 0.18 + 0.16);
      }
    } catch {}
  };

  // 3. Karıştırma Animasyonu Başlat ve 2.4 saniye sonra masaya yay
  useEffect(() => {
    playShuffleSound();

    const timer = setTimeout(() => {
      setPhase('spread');
    }, 2400);

    return () => {
      clearTimeout(timer);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Kart Çekme Sesi (Single Card Snap)
  const playCardSnapSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(432, now);
      osc.frequency.exponentialRampToValueAtTime(216, now + 0.25);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } catch {}
  };

  const targetCardCount = positions.length || 3;

  // Kartlar seçilip sunucu destesi hazır olduğunda üst bileşene bildir (race condition korumalı)
  useEffect(() => {
    if (selectedCards.length !== targetCardCount || fetchedCards.length < targetCardCount) return;
    const timer = setTimeout(() => {
      setPhase('revealed');
      onSelectionComplete(fetchedCards.slice(0, targetCardCount), drawProof);
    }, 700);
    return () => clearTimeout(timer);
  }, [selectedCards.length, targetCardCount, fetchedCards, drawProof, onSelectionComplete]);

  // Kullanıcı Masadaki Bir Karta Dokunduğunda
  const handleSelectCard = (index: number) => {
    if (phase !== 'spread') return;
    if (selectedCards.includes(index)) return;
    if (selectedCards.length >= targetCardCount) return;

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(14);
    }
    playCardSnapSound();
    setSelectedCards((prev) => [...prev, index]);
  };

  // 78 Kartı Masaya Ferahça Yaymak İçin 3 Katmana Böl (26 + 26 + 26 = 78 Kart)
  const tier1Cards = Array.from({ length: 26 }, (_, i) => i);
  const tier2Cards = Array.from({ length: 26 }, (_, i) => i + 26);
  const tier3Cards = Array.from({ length: 26 }, (_, i) => i + 52);

  const renderSpreadTier = (cards: number[], baseOffset: number, rowClass: string) => (
    <div className={`flex items-center justify-center min-w-max px-6 sm:px-8 relative ${rowClass}`}>
      {cards.map((cardIndex) => {
        const isSelected = selectedCards.includes(cardIndex);
        const isHovered = hoveredCardIndex === cardIndex;
        const normalized = (cardIndex - baseOffset - 12.5) / 12.5;
        const yCurve = Math.abs(normalized) * 8;
        const rotateDeg = normalized * 5;

        return (
          <motion.div
            key={cardIndex}
            initial={{ opacity: 0, y: 24 + baseOffset * 0.2 }}
            animate={{ opacity: 1, y: yCurve, rotateZ: rotateDeg }}
            transition={{ duration: 0.22, delay: (cardIndex % 26) * 0.006 + (baseOffset / 26) * 0.06 }}
            whileHover={{
              y: -32,
              rotateZ: 0,
              scale: 1.22,
              zIndex: 150,
              transition: { duration: 0.14 },
            }}
            onMouseEnter={() => setHoveredCardIndex(cardIndex)}
            onMouseLeave={() => setHoveredCardIndex(null)}
            onClick={() => handleSelectCard(cardIndex)}
            style={{
              background: 'linear-gradient(145deg, #2e1052 0%, #17072a 60%, #090212 100%)',
            }}
            className={`relative w-12 sm:w-14 md:w-16 lg:w-[70px] h-20 sm:h-24 md:h-28 lg:h-[112px] rounded-lg sm:rounded-xl cursor-pointer transition-all duration-200 -ml-5 sm:-ml-6 md:-ml-7 shadow-xl flex-shrink-0 border overflow-hidden ${
              isSelected
                ? 'opacity-0 pointer-events-none scale-50'
                : isHovered
                ? 'border-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.95)] z-50 ring-2 ring-amber-300/80'
                : 'border-amber-500/40 hover:border-amber-300'
            }`}
          >
            <img
              src="/cards/thumb-card-back.webp"
              alt="Tarot Kart Sırtı"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <div className="relative w-full max-w-[1680px] 2xl:max-w-[1850px] mx-auto px-2 sm:px-4 md:px-6 py-2 flex flex-col items-center justify-between select-none">
      
      {/* ======================================================== */}
      {/* 1. ÜST ALAN: MASA BAŞLIĞI & DİNAMİK KART YUVALARI         */}
      {/* ======================================================== */}
      <div className="w-full text-center space-y-2.5">
        <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full border border-amber-500/40 bg-[#16062b]/85 shadow-[0_0_25px_rgba(245,158,11,0.25)] text-amber-200 text-xs font-serif tracking-widest uppercase">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{pillarTitle}</span>
          <span className="text-zinc-500">•</span>
          <span className="text-amber-300 font-sans font-semibold">
            {selectedCards.length}/{targetCardCount} Kart Seçildi
          </span>
        </div>

        {/* Masadaki Kart Yuvaları (3, 7 veya 10 Kart için tek ekrana sığan düzen) */}
        <div className={`flex flex-wrap items-center justify-center gap-2 sm:gap-3 mx-auto pt-1 pb-1 ${
          targetCardCount > 5 ? 'max-w-7xl' : 'max-w-3xl'
        }`}>
          {positions.map((posTitle, slotIdx) => {
            const isFilled = selectedCards.length > slotIdx;
            const isCompact = targetCardCount > 5;

            return (
              <div key={slotIdx} className="flex flex-col items-center space-y-1">
                <div
                  className={`relative ${
                    isCompact
                      ? 'w-14 sm:w-16 md:w-20 h-22 sm:h-26 md:h-30'
                      : 'w-24 sm:w-32 md:w-36 h-36 sm:h-48 md:h-52'
                  } rounded-xl border-2 transition-all duration-500 flex items-center justify-center overflow-hidden ${
                    isFilled
                      ? 'border-amber-400 bg-gradient-to-b from-[#2e1052] to-[#120422] shadow-[0_0_25px_rgba(245,158,11,0.65)] ring-1 ring-amber-400/50'
                      : 'border-dashed border-purple-500/40 bg-purple-950/20 hover:border-amber-400/40'
                  }`}
                >
                  {isFilled ? (
                    <motion.div
                      initial={{ scale: 0.6, y: 40, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="w-full h-full relative overflow-hidden rounded-xl"
                    >
                      <img
                        src="/cards/medium-card-back.webp"
                        alt="Seçilen Kart"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col items-center justify-between p-1">
                        <span className="text-[8px] text-amber-300">✦</span>
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-amber-400 bg-amber-500/30 flex items-center justify-center shadow-lg backdrop-blur-sm">
                          <Check className="w-3 h-3 text-amber-300 stroke-[3]" />
                        </div>
                        <div className="text-[8px] uppercase tracking-wider text-amber-200 font-serif font-bold bg-black/60 px-1.5 py-0.5 rounded-full border border-amber-400/30 truncate max-w-full">
                          {slotIdx + 1}. Kart
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-center p-1 opacity-60">
                      <div className="w-6 h-6 rounded-full border border-purple-500/50 mx-auto mb-0.5 flex items-center justify-center text-[10px] font-serif text-purple-300 font-semibold">
                        {slotIdx + 1}
                      </div>
                      <span className="text-[9px] text-zinc-400 font-serif hidden sm:inline">Yuva</span>
                    </div>
                  )}
                </div>

                <span className={`font-serif text-amber-100/90 tracking-wide text-center ${isCompact ? 'text-[9px] sm:text-[10px] max-w-[76px] sm:max-w-[92px] truncate' : 'text-[11px] max-w-[120px] line-clamp-2'}`} title={posTitle}>
                  {posTitle}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. OTANTİK KADİFE MASA & 78 KARTIN YAYILIMI               */}
      {/* ======================================================== */}
      <div className="relative w-full mt-3 py-4 sm:py-6 px-3 sm:px-6 rounded-[32px] bg-gradient-to-b from-[#1b0a36]/95 via-[#100322]/98 to-[#06010c] border-2 border-amber-500/35 shadow-[0_0_90px_rgba(88,28,135,0.5)] overflow-hidden min-h-[340px] md:min-h-[390px] flex items-center justify-center">
        
        {/* Kadife Masa Altın Varak & Çift Bordürlü Lüks Kenarlıklar */}
        <div className="absolute inset-3 rounded-[34px] border border-amber-500/25 pointer-events-none" />
        <div className="absolute inset-5 rounded-[30px] border border-purple-500/20 pointer-events-none" />

        {/* Masa Ortasında Dönen Mistik Zodyak Çemberi (Hafif Filigran) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06]">
          <div className="w-[580px] h-[580px] rounded-full border border-amber-400 flex items-center justify-center animate-spin" style={{ animationDuration: '140s' }}>
            <div className="w-[440px] h-[440px] rounded-full border border-dashed border-amber-300 flex items-center justify-center">
              <div className="w-[300px] h-[300px] rounded-full border border-amber-200" />
            </div>
          </div>
        </div>

        {/* Dört Köşede Mistik Yıldız Varakları */}
        <span className="absolute top-5 left-7 text-amber-400/40 text-base font-serif pointer-events-none">✦</span>
        <span className="absolute top-5 right-7 text-amber-400/40 text-base font-serif pointer-events-none">✦</span>
        <span className="absolute bottom-5 left-7 text-amber-400/40 text-base font-serif pointer-events-none">✦</span>
        <span className="absolute bottom-5 right-7 text-amber-400/40 text-base font-serif pointer-events-none">✦</span>

        {/* -------------------------------------------------------- */}
        {/* DURUM A: 3D KART KARIŞTIRMA ANİMASYONU (RIFFLE/SHUFFLE)  */}
        {/* -------------------------------------------------------- */}
        {phase === 'shuffling' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative w-64 h-56 flex items-center justify-center">
              {/* Sol Deste Parçası */}
              <motion.div
                animate={{
                  x: [-65, 20, -50, 0],
                  rotateZ: [-14, 5, -8, 0],
                  scale: [1, 1.06, 0.98, 1],
                }}
                transition={{ duration: 1.1, repeat: 2, ease: 'easeInOut' }}
                className="absolute w-32 sm:w-36 h-48 sm:h-52 rounded-2xl border-2 border-amber-400 shadow-[0_0_35px_rgba(0,0,0,0.9)] overflow-hidden"
              >
                <img
                  src="/cards/rider-waite/medium-card-back.webp"
                  alt="Deste Sol"
                  className="w-full h-full object-cover"
                />
              </motion.div>

              {/* Sağ Deste Parçası */}
              <motion.div
                animate={{
                  x: [65, -20, 50, 0],
                  rotateZ: [14, -5, 8, 0],
                  scale: [1, 1.06, 0.98, 1],
                }}
                transition={{ duration: 1.1, repeat: 2, ease: 'easeInOut' }}
                className="absolute w-32 sm:w-36 h-48 sm:h-52 rounded-2xl border-2 border-amber-400 shadow-[0_0_35px_rgba(0,0,0,0.9)] overflow-hidden"
              >
                <img
                  src="/cards/rider-waite/medium-card-back.webp"
                  alt="Deste Sağ"
                  className="w-full h-full object-cover"
                />
              </motion.div>

              {/* Deste Altı Işıma */}
              <div className="absolute w-48 h-48 bg-amber-400/20 blur-3xl rounded-full pointer-events-none animate-pulse" />
            </div>

            <div className="mt-6 flex items-center gap-2.5 text-xs sm:text-sm font-serif tracking-widest uppercase text-amber-300">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Deste Karıştırılıyor...</span>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------- */}
        {/* DURUM B: 78 KARTIN FERAH ÜÇ KATMANLI YAYILIMI (SPREAD)   */}
        {/* -------------------------------------------------------- */}
        {phase === 'spread' && (
          <div className="w-full flex flex-col items-center justify-center py-4">
            {/* Yönlendirme İpucu */}
            <div className="mb-6 text-xs md:text-sm font-serif text-amber-200 tracking-wide flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-400" />
              <span>Sezgilerinle masaya serilen kartlardan {targetCardCount} tanesini seç</span>
            </div>

            {/* Geniş ve Ferah Masaya Yayılmış Kartlar (3 Katmanlı Şelale Düzeni) */}
            <div className="w-full overflow-x-auto scrollbar-none py-3 px-2 sm:px-4 flex flex-col items-center gap-1">
              {renderSpreadTier(tier1Cards, 0, '')}
              {renderSpreadTier(tier2Cards, 26, '-mt-5 sm:-mt-6 md:-mt-8')}
              {renderSpreadTier(tier3Cards, 52, '-mt-5 sm:-mt-6 md:-mt-8')}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------- */}
        {/* DURUM C: 3 KART SEÇİLDİ & MASADA YERİNİ ALDI             */}
        {/* -------------------------------------------------------- */}
        {phase === 'revealed' && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <div className="w-14 h-14 rounded-full border-2 border-amber-400 bg-amber-500/25 text-amber-300 flex items-center justify-center animate-bounce shadow-[0_0_40px_rgba(245,158,11,0.6)]">
              <Check className="w-7 h-7 stroke-[3]" />
            </div>
            <p className="text-base font-serif text-amber-200">
              {targetCardCount} Kartın da Masaya Yerleşti... Kehanet Çözülüyor!
            </p>
          </div>
        )}

      </div>

    </div>
  );
}
