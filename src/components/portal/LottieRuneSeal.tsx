'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Lottie } from 'lottie-react';

// 12 Burç ve Kadim Hermetik Rün Geometrisi Lottie JSON Tanımı (Hafif Vektör)
const RUNE_SEAL_LOTTIE_DATA = {
  v: "5.7.4",
  fr: 60,
  ip: 0,
  op: 180,
  w: 300,
  h: 300,
  nm: "HermeticSeal",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "OuterRuneRing",
      sr: 1,
      ks: {
        o: { a: 0, k: 90 },
        r: {
          a: 1,
          k: [
            { t: 0, s: [0], e: [360] },
            { t: 180, s: [360] }
          ]
        },
        p: { a: 0, k: [150, 150, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] }
      },
      ao: 0,
      shapes: [
        {
          ty: "gr",
          it: [
            {
              ty: "el",
              d: 1,
              s: { a: 0, k: [260, 260] },
              p: { a: 0, k: [0, 0] }
            },
            {
              ty: "st",
              c: { a: 0, k: [0.96, 0.75, 0.25, 1] },
              o: { a: 0, k: 80 },
              w: { a: 0, k: 3 },
              d: [{ n: "d", v: { a: 0, k: 12 } }, { n: "g", v: { a: 0, k: 8 } }]
            },
            {
              ty: "tr",
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 }
            }
          ]
        }
      ]
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: "InnerSealHexagram",
      sr: 1,
      ks: {
        o: { a: 0, k: 85 },
        r: {
          a: 1,
          k: [
            { t: 0, s: [360], e: [0] },
            { t: 180, s: [0] }
          ]
        },
        p: { a: 0, k: [150, 150, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] }
      },
      ao: 0,
      shapes: [
        {
          ty: "gr",
          it: [
            {
              ty: "sr",
              sy: 1,
              d: 1,
              pt: { a: 0, k: 8 },
              p: { a: 0, k: [0, 0] },
              r: { a: 0, k: 0 },
              ir: { a: 0, k: 65 },
              is: { a: 0, k: 0 },
              or: { a: 0, k: 100 },
              os: { a: 0, k: 0 }
            },
            {
              ty: "st",
              c: { a: 0, k: [0.82, 0.55, 0.98, 1] },
              o: { a: 0, k: 70 },
              w: { a: 0, k: 2 }
            },
            {
              ty: "tr",
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 }
            }
          ]
        }
      ]
    }
  ]
};

interface LottieRuneSealProps {
  isHovered: boolean;
  isOpening: boolean;
}

export default function LottieRuneSeal({ isHovered, isOpening }: LottieRuneSealProps) {
  return (
    <div className="relative w-48 h-48 sm:w-60 sm:h-60 md:w-72 md:h-72 lg:w-80 lg:h-80 flex items-center justify-center pointer-events-none">
      {/* 1. Lottie Vektör Animasyon Motoru */}
      <motion.div
        animate={{
          scale: isOpening ? [1, 1.4, 0] : isHovered ? 1.15 : 1,
          opacity: isOpening ? [1, 1, 0] : 1,
          rotate: isHovered ? 180 : 0,
        }}
        transition={{
          scale: { duration: isOpening ? 1.5 : 0.4 },
          rotate: { duration: 1.2, ease: 'easeInOut' },
        }}
        className="w-full h-full"
      >
        <Lottie
          src={RUNE_SEAL_LOTTIE_DATA as any}
          loop
          autoplay
          style={{ width: '100%', height: '100%' }}
        />
      </motion.div>

      {/* 2. Mührün Merkezindeki Parlayan Altın Kristal Göz */}
      <motion.div
        animate={{
          scale: isOpening ? [1, 2.5, 0] : [1, 1.15, 1],
          opacity: isOpening ? [1, 1, 0] : [0.7, 1, 0.7],
        }}
        transition={{
          duration: isOpening ? 1.2 : 2.5,
          repeat: isOpening ? 0 : Infinity,
          ease: 'easeInOut',
        }}
        className="absolute w-10 h-10 rounded-full bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-200 shadow-[0_0_35px_12px_rgba(245,158,11,0.8)] border border-amber-100 flex items-center justify-center"
      >
        <div className="w-3.5 h-3.5 rounded-full bg-white shadow-inner animate-ping opacity-75" />
      </motion.div>
    </div>
  );
}
