'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Hand, ChevronRight, Eye } from 'lucide-react';

interface StackedDeck3DProps {
  onClick: () => void;
  isReady?: boolean;
  label?: string;
  pillarTitle?: string;
}

export default function StackedDeck3D({
  onClick,
  isReady = true,
  label = 'Kartlarını Seç',
  pillarTitle,
}: StackedDeck3DProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Kart destesi katman sayısı (derinlik hissi)
  const deckLayers = [
    { offset: 16, rot: 1.5, opacity: 0.5 },
    { offset: 12, rot: -1.2, opacity: 0.65 },
    { offset: 8, rot: 0.8, opacity: 0.8 },
    { offset: 4, rot: -0.5, opacity: 0.9 },
    { offset: 0, rot: 0, opacity: 1 },
  ];

  return (
    <div className="relative flex flex-col items-center justify-center py-4">
      {/* 1. Mistik Hazır Olma / Yönlendirme Balonu */}
      <motion.div
        animate={
          isReady
            ? { y: [0, -6, 0], scale: [1, 1.03, 1] }
            : { y: 0, scale: 1 }
        }
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        className={`mb-4 flex items-center gap-2 px-5 py-2 rounded-full border transition-all duration-500 backdrop-blur-md select-none ${
          isReady
            ? 'bg-gradient-to-r from-amber-500/20 via-purple-600/30 to-amber-500/20 border-amber-400/60 shadow-[0_0_25px_rgba(245,158,11,0.4)] text-amber-200'
            : 'bg-zinc-900/60 border-zinc-700/40 text-zinc-400'
        }`}
      >
        <Sparkles
          className={`w-4 h-4 ${
            isReady ? 'text-amber-300 animate-spin' : 'text-zinc-500'
          }`}
          style={{ animationDuration: '4s' }}
        />
        <span className="text-xs md:text-sm font-serif font-medium tracking-wide">
          {isReady
            ? '✨ Niyetin mühürlendi... Desteye dokun ve kartlarını seç'
            : 'Niyetini belirle ve desteye dokun'}
        </span>
      </motion.div>

      {/* 2. 3D Kart Destesi Konteyneri */}
      <div
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ perspective: 1200 }}
        className="relative cursor-pointer group select-none flex items-center justify-center p-6"
      >
        {/* Deste Altı Işık Halkası */}
        <div
          className={`absolute w-44 h-60 rounded-3xl transition-all duration-700 blur-2xl -z-10 ${
            isReady || isHovered
              ? 'bg-gradient-to-tr from-amber-500/40 via-purple-600/40 to-amber-400/40 opacity-100 scale-110 animate-pulse'
              : 'bg-purple-900/20 opacity-40'
          }`}
        />

        {/* Katmanlı 3D Deste Kartları */}
        <div className="relative w-36 sm:w-40 md:w-44 h-56 sm:h-64 md:h-68">
          {deckLayers.map((layer, idx) => {
            const isTop = idx === deckLayers.length - 1;

            return (
              <motion.div
                key={idx}
                animate={
                  isHovered && isTop
                    ? { y: -20, rotateZ: -4, scale: 1.05 }
                    : isHovered && idx === deckLayers.length - 2
                    ? { y: -10, rotateZ: 3, scale: 1.02 }
                    : { y: layer.offset, rotateZ: layer.rot, scale: 1 }
                }
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  transformOrigin: 'bottom center',
                  background: 'linear-gradient(145deg, #2e1052 0%, #17072a 60%, #090212 100%)',
                }}
                className={`rounded-2xl border transition-colors shadow-2xl overflow-hidden ${
                  isTop
                    ? isReady
                      ? 'border-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.5)] ring-2 ring-amber-400/30'
                      : 'border-amber-500/40'
                    : 'border-amber-600/30'
                }`}
              >
                {/* Altın Yaldızlı Kenar Kesimi */}
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-300 via-amber-500 to-amber-400 opacity-80" />
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-300 via-amber-500 to-amber-400 opacity-80" />

                {/* En Üst Kartın Mistik Sırt Deseni (Özel Arma) */}
                {isTop ? (
                  <div className="w-full h-full relative overflow-hidden rounded-2xl">
                    <img
                      src="/cards/rider-waite/small-card-back.webp"
                      alt="Tarot Deste Sırtı"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 flex flex-col items-center justify-between p-3 pointer-events-none">
                      <div className="w-full flex justify-between text-[10px] text-amber-300">
                        <span>✦</span>
                        <span>✦</span>
                      </div>
                      <div className="text-[10px] font-serif uppercase tracking-[0.25em] text-amber-200 bg-black/60 px-3 py-1 rounded-full border border-amber-400/40 backdrop-blur-sm shadow-md">
                        78 KART
                      </div>
                    </div>
                    {/* Hover Parlaması */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-t from-amber-400/30 via-transparent to-amber-300/10 transition-opacity duration-300 ${
                        isHovered ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full relative overflow-hidden rounded-2xl">
                    <img
                      src="/cards/rider-waite/thumb-card-back.webp"
                      alt="Deste Katmanı"
                      className="w-full h-full object-cover opacity-80"
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Deste Altı Gölge Efekti */}
        <div className="absolute -bottom-1 w-32 h-4 bg-black/80 rounded-full blur-md -z-10" />
      </div>

      {/* Deste Altı Tıklama İpucu */}
      <motion.div
        animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
        className="mt-2 flex items-center gap-1.5 text-xs font-serif text-amber-300/90 tracking-wider"
      >
        <span>Desteyi Aç</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </motion.div>
    </div>
  );
}
