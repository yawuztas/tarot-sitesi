'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Heart,
  Briefcase,
  Leaf,
  Check,
} from 'lucide-react';
import StackedDeck3D from './StackedDeck3D';
import { TURKISH_CITIES } from '@/lib/astrology/turkish-cities';
import type { PillarType } from './AltarTable';

export type SpreadType = 'three-card' | 'horseshoe' | 'celtic-cross';
export type DeckStyleType = 'rider-waite' | 'marseille';

export const SPREADS_COMPACT: Array<{
  id: SpreadType;
  title: string;
  cardCount: number;
  shortDesc: string;
  badge: string;
}> = [
  {
    id: 'three-card',
    title: 'Üçlü Açılım',
    cardCount: 3,
    shortDesc: 'Geçmiş, şimdi ve geleceğin net özeti',
    badge: 'Hızlı & Net',
  },
  {
    id: 'horseshoe',
    title: 'Kader Yolu',
    cardCount: 7,
    shortDesc: 'Gölgeler, engeller, tavsiye ve nihai çıkış',
    badge: 'Derin Hikaye',
  },
  {
    id: 'celtic-cross',
    title: 'Kelt Haçı',
    cardCount: 10,
    shortDesc: '10 kartlık efsanevi büyük hayat haritası',
    badge: 'Büyük Başyapıt',
  },
];

interface OracleSanctuaryProps {
  selectedPillar: PillarType;
  onSelectPillar: (pillar: PillarType) => void;
  selectedSpread: SpreadType;
  onSelectSpread: (spread: SpreadType) => void;
  selectedStyle: DeckStyleType;
  onSelectStyle: (style: DeckStyleType) => void;
  userName: string;
  onUserNameChange: (name: string) => void;
  intentionText: string;
  onIntentionTextChange: (text: string) => void;
  includeAstro: boolean;
  onIncludeAstroChange: (include: boolean) => void;
  birthDate: string;
  onBirthDateChange: (date: string) => void;
  birthTime: string;
  onBirthTimeChange: (time: string) => void;
  birthTimeUnknown: boolean;
  onBirthTimeUnknownChange: (unknown: boolean) => void;
  birthCity: string;
  onBirthCityChange: (city: string) => void;
  astroSummary: {
    sunSign?: string;
    sunSignFormatted?: string;
    moonSign?: string;
    moonSignFormatted?: string;
    ascendant?: string | null;
    ascendantFormatted?: string | null;
  } | null;
  isCalculatingAstro: boolean;
  onProceedToCards: () => void;
}

const PILLARS_COMPACT: Array<{
  id: PillarType;
  title: string;
  shortDesc: string;
  icon: any;
  activeColor: string;
}> = [
  {
    id: 'love',
    title: 'Aşk & İlişki',
    shortDesc: 'Aklındaki kişi ve bağınız',
    icon: Heart,
    activeColor: 'border-rose-400 bg-rose-500/15 text-rose-300 shadow-[0_0_25px_rgba(244,63,94,0.25)]',
  },
  {
    id: 'career',
    title: 'Para & Kariyer',
    shortDesc: 'İş ve bolluk kapıları',
    icon: Briefcase,
    activeColor: 'border-amber-400 bg-amber-500/15 text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.25)]',
  },
  {
    id: 'spirit',
    title: 'Sağlık & Denge',
    shortDesc: 'Ruhsal şifa ve huzur',
    icon: Leaf,
    activeColor: 'border-emerald-400 bg-emerald-500/15 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.25)]',
  },
];

export default function OracleSanctuary({
  selectedPillar,
  onSelectPillar,
  selectedSpread,
  onSelectSpread,
  selectedStyle,
  onSelectStyle,
  userName,
  onUserNameChange,
  intentionText,
  onIntentionTextChange,
  includeAstro,
  onIncludeAstroChange,
  birthDate,
  onBirthDateChange,
  birthTime,
  onBirthTimeChange,
  birthTimeUnknown,
  onBirthTimeUnknownChange,
  birthCity,
  onBirthCityChange,
  astroSummary,
  isCalculatingAstro,
  onProceedToCards,
}: OracleSanctuaryProps) {
  // Kart destesi hazır mı
  const isReady = true;

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4 py-6 space-y-8">
      
      {/* ======================================================== */}
      {/* 1. ÜST KISIM: SADE & DÜZENLİ BİLGİ & SEÇİM FORMU        */}
      {/* ======================================================== */}
      <div className="max-w-2xl mx-auto bg-[#10061d]/90 border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-xl">
        
        {/* 1. ADIM: AÇILIM TÜRÜ SEÇİMİ (3, 7 veya 10 KART) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs uppercase tracking-widest text-amber-400 font-serif">
              1. Açılım Derinliğini Seç
            </label>
            <span className="text-[11px] text-purple-300 font-serif font-medium">
              {selectedSpread === 'three-card' ? '3 Kart' : selectedSpread === 'horseshoe' ? '7 Kart' : '10 Kart'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SPREADS_COMPACT.map((s) => {
              const isSelected = selectedSpread === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectSpread(s.id)}
                  className={`relative p-3.5 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/15 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/50'
                      : 'bg-[#180a2c]/60 border-purple-500/20 text-zinc-300 hover:border-purple-400/40 hover:bg-[#200d3a]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-serif font-bold text-amber-300 tracking-wide">{s.cardCount} KART</span>
                    <span className="px-2 py-0.5 rounded text-[9px] bg-purple-950/80 border border-purple-500/30 text-purple-200">{s.badge}</span>
                  </div>
                  <div>
                    <div className="font-serif text-sm font-semibold text-zinc-100">{s.title}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5 leading-snug">{s.shortDesc}</div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Özel Çizim Deste Bilgisi */}
          <div className="mt-4 pt-3 border-t border-purple-500/15 flex items-center justify-between gap-2 text-[11px]">
            <span className="uppercase tracking-wider text-purple-300 font-serif">
              Deste:
            </span>
            <span className="px-3 py-1 rounded-full border border-amber-400/40 bg-amber-500/10 text-amber-200 font-serif">
              ✦ 78 Özel Çizim Mistik Rider-Waite Destesi
            </span>
          </div>
        </div>

        {/* 2. ADIM: NİYETİNİ SÖYLE (SERBEST METİN) */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-amber-400 font-serif mb-2">
            2. Niyetini & Sorunu Söyle (İsteğe Bağlı)
          </label>
          <input
            type="text"
            value={intentionText}
            onChange={(e) => onIntentionTextChange(e.target.value)}
            placeholder="Aklından geçen soruyu veya niyetini fısılda (örneğin aşk, iş, yeni başlangıçlar)..."
            className="w-full bg-[#0a0314] border border-purple-500/30 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-400/70 transition shadow-inner"
          />
        </div>

        {/* 3. ADIM: KİŞİSEL BİLGİLER & YILDIZ HARİTASI SEÇENEĞİ */}
        <div className="pt-2 border-t border-purple-500/20 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="block text-xs uppercase tracking-widest text-purple-300 font-serif mb-1">
                Adın
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => onUserNameChange(e.target.value)}
                placeholder="Sevgili Yolcu..."
                className="w-full sm:w-56 bg-[#0a0314] border border-purple-500/30 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/70"
              />
            </div>

            {/* Yıldız Haritası İstiyorum Toggle */}
            <div className="flex items-center gap-3 pt-2 sm:pt-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAstro}
                  onChange={(e) => onIncludeAstroChange(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
              <span className="text-xs font-serif text-purple-200">
                ✦ Yıldız Haritamı da Falıma Ekle
              </span>
            </div>
          </div>

          {/* Açılır Yıldız Haritası Detayları */}
          <AnimatePresence>
            {includeAstro && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-4 pt-2"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Doğum Tarihi */}
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-1">
                      Doğum Tarihi
                    </label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => onBirthDateChange(e.target.value)}
                      className="w-full bg-[#0a0314] border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-400/60"
                    />
                  </div>

                  {/* Doğum Saati */}
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-1">
                      Doğum Saati
                    </label>
                    <input
                      type="time"
                      disabled={birthTimeUnknown}
                      value={birthTime}
                      onChange={(e) => onBirthTimeChange(e.target.value)}
                      className={`w-full bg-[#0a0414] border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-400/60 ${
                        birthTimeUnknown ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                    />
                    <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer text-[10px] text-zinc-400">
                      <input
                        type="checkbox"
                        checked={birthTimeUnknown}
                        onChange={(e) => onBirthTimeUnknownChange(e.target.checked)}
                        className="rounded border-purple-500/40"
                      />
                      <span>Saati Bilmiyorum</span>
                    </label>
                  </div>

                  {/* Doğum Şehri */}
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-1">
                      Doğum Şehri
                    </label>
                    <select
                      value={birthCity}
                      onChange={(e) => onBirthCityChange(e.target.value)}
                      className="w-full bg-[#0a0414] border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-400/60"
                    >
                      {TURKISH_CITIES.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 2. ALT KISIM: KRİSTAL KÜRE + 3D KART DESTESİ              */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-14 pt-4">
        
        {/* SOL: MİSTİK YAŞAYAN KRİSTAL KÜRE */}
        <div className="relative flex flex-col items-center justify-center">
          {/* Dış Aura Işıması */}
          <div className="absolute w-52 h-52 rounded-full bg-gradient-to-tr from-purple-600/35 via-amber-400/20 to-indigo-600/35 blur-3xl animate-pulse" />

          {/* Kristal Küre Camı */}
          <motion.div
            animate={{
              scale: [1, 1.03, 1],
              rotate: [0, 2, -2, 0],
            }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            className="relative w-40 h-40 sm:w-44 sm:h-44 rounded-full border-2 border-amber-400/60 shadow-[0_0_50px_rgba(168,85,247,0.5)] flex items-center justify-center overflow-hidden backdrop-blur-md"
            style={{
              background:
                'radial-gradient(circle at 35% 35%, rgba(253,230,138,0.35) 0%, rgba(88,28,135,0.75) 60%, rgba(15,3,32,0.95) 100%)',
            }}
          >
            {/* Dönen Kozmik Nebula */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-2 rounded-full opacity-70 blur-[2px]"
              style={{
                background:
                  'conic-gradient(from 0deg, #ec4899, #8b5cf6, #3b82f6, #f59e0b, #ec4899)',
              }}
            />

            {/* Küre İçi Bilgi: Yıldız Haritası Varsa Burçlar, Yoksa Kahin Gözü */}
            <div className="relative z-20 flex flex-col items-center justify-center text-center px-2">
              {includeAstro && astroSummary ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-0.5 text-zinc-100"
                >
                  <div className="text-[11px] font-medium text-amber-300">
                    ☉ {astroSummary.sunSignFormatted || astroSummary.sunSign}
                  </div>
                  <div className="text-[10px] text-purple-200">
                    ☽ {astroSummary.moonSignFormatted || astroSummary.moonSign}
                  </div>
                  {astroSummary.ascendant && (
                    <div className="text-[10px] text-emerald-300">
                      ☿ Yükselen: {astroSummary.ascendant}
                    </div>
                  )}
                </motion.div>
              ) : isCalculatingAstro ? (
                <div className="text-xs text-amber-200 animate-pulse font-serif">
                  Yıldızlar hesaplanıyor...
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Sparkles className="w-7 h-7 text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.9)] animate-pulse" />
                  <span className="text-[9px] tracking-[0.25em] font-serif uppercase text-amber-200/90 mt-1">
                    KAHİN
                  </span>
                </div>
              )}
            </div>

            {/* Speküler Cam Işığı */}
            <div className="absolute top-3.5 left-5 w-8 h-4 rounded-full bg-white/40 blur-[2px] -rotate-45 pointer-events-none" />
          </motion.div>

          {/* Kürenin Altın Kaidesi */}
          <div className="w-28 h-4 rounded-full bg-gradient-to-r from-amber-700 via-amber-400 to-amber-700 shadow-2xl mt-[-6px] border border-amber-300/40" />
        </div>

        {/* ORTA: KÜRE İLE DESTE ARASINDAKİ MİSTİK IŞIK KÖPRÜSÜ */}
        <div className="hidden md:flex items-center justify-center w-12 opacity-60">
          <div className="w-full h-0.5 bg-gradient-to-r from-purple-500/80 via-amber-400 to-purple-500/80 animate-pulse" />
        </div>

        {/* SAĞ: 3D KART DESTESİ (TIKLANINCA 3. SAYFAYA GEÇİRİR) */}
        <div className="relative">
          <StackedDeck3D
            onClick={onProceedToCards}
            isReady={isReady}
            pillarTitle={SPREADS_COMPACT.find((s) => s.id === selectedSpread)?.title}
          />
        </div>
      </div>

    </div>
  );
}
