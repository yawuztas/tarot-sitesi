'use client';

/**
 * Fal Geçmişi Listesi
 *
 * Server'dan gelen Reading[] dizisini interaktif kart listesi olarak gösterir.
 * Her kart: tarih, niyet, açılım, kart thumb'ları, AI özeti, ana temalar.
 * Tıklayınca tam fal metni açılır (modal).
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, ChevronDown, Sparkles, Heart, Layers, X, Moon,
} from 'lucide-react';

interface ReadingCard {
  id: string;
  card: {
    nameTr: string;
    slug: string;
    arcanaType: string;
    imageUrlThumb: string | null;
  };
  isReversed: boolean;
  positionIndex: number;
}

interface Reading {
  id: string;
  drawnAt: Date;
  intentionText: string | null;
  aiInterpretation: string | null;
  aiSummaryTr: string | null;
  keyThemes: string | null;
  predictedArc: string | null;
  astroContextJson: string | null;
  spread: { nameTr: string; name: string; cardCount: number };
  style: { nameTr: string; slug: string };
  intentionCategory: { nameTr: string; slug: string; icon: string | null; color: string | null } | null;
  readingCards: ReadingCard[];
}

export default function ReadingHistoryList({ readings }: { readings: Reading[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const expandedReading = readings.find(r => r.id === expandedId);

  return (
    <>
      <div className="space-y-3">
        {readings.map((reading, idx) => {
          const themes: string[] = reading.keyThemes ? JSON.parse(reading.keyThemes) : [];
          const astroContext = reading.astroContextJson ? JSON.parse(reading.astroContextJson) : null;
          const date = new Date(reading.drawnAt);
          const dateStr = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
          const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

          return (
            <motion.button
              key={reading.id}
              layout
              onClick={() => setExpandedId(reading.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="w-full text-left bg-zinc-900/40 hover:bg-zinc-900/60 border border-zinc-800 hover:border-amber-500/30 rounded-xl p-4 transition group cursor-pointer"
            >
              <div className="flex items-start gap-4">
                {/* Kart thumb'ları */}
                <div className="flex -space-x-2 shrink-0">
                  {reading.readingCards.slice(0, 4).map((rc, i) => (
                    <div
                      key={i}
                      className="w-10 h-14 rounded overflow-hidden border border-zinc-700 bg-zinc-950 shadow-md"
                      style={{ zIndex: 10 - i }}
                    >
                      {rc.card.imageUrlThumb ? (
                        <img
                          src={rc.card.imageUrlThumb}
                          alt={rc.card.nameTr}
                          className={`w-full h-full object-cover ${rc.isReversed ? 'rotate-180' : ''}`}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                          <Moon className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}
                  {reading.readingCards.length > 4 && (
                    <div className="w-10 h-14 rounded border border-zinc-700 bg-zinc-950 flex items-center justify-center text-xs text-zinc-500 shadow-md">
                      +{reading.readingCards.length - 4}
                    </div>
                  )}
                </div>

                {/* İçerik */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {reading.intentionCategory && (
                      <span
                        className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border"
                        style={{
                          borderColor: (reading.intentionCategory.color || '#f59e0b') + '40',
                          color: reading.intentionCategory.color || '#f59e0b',
                        }}
                      >
                        {reading.intentionCategory.nameTr}
                      </span>
                    )}
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                      {reading.spread.nameTr}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1.5">
                    <Calendar className="w-3 h-3" />
                    <span>{dateStr}</span>
                    <span className="text-zinc-700">·</span>
                    <span>{timeStr}</span>
                  </div>
                  {reading.aiSummaryTr && (
                    <p className="text-xs text-zinc-300 line-clamp-2 italic leading-relaxed">
                      {reading.aiSummaryTr}
                    </p>
                  )}
                  {themes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {themes.slice(0, 4).map((t, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-amber-500/10 text-amber-300/80 px-1.5 py-0.5 rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-amber-300 transition shrink-0 mt-1" />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Modal: Tam fal metni */}
      <AnimatePresence>
        {expandedReading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setExpandedId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-amber-500/20 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal header */}
              <div className="border-b border-amber-500/15 p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {expandedReading.intentionCategory && (
                      <span
                        className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border"
                        style={{
                          borderColor: (expandedReading.intentionCategory.color || '#f59e0b') + '40',
                          color: expandedReading.intentionCategory.color || '#f59e0b',
                        }}
                      >
                        {expandedReading.intentionCategory.nameTr}
                      </span>
                    )}
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                      {expandedReading.spread.nameTr}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Calendar className="w-3 h-3" />
                    {new Date(expandedReading.drawnAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <button
                  onClick={() => setExpandedId(null)}
                  className="text-zinc-500 hover:text-zinc-300 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal body */}
              <div className="overflow-y-auto p-5 space-y-5">
                {/* Kartlar */}
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-amber-300 mb-2 flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Çekilen Kartlar
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {expandedReading.readingCards.map((rc, i) => (
                      <div key={i} className="text-center">
                        <div className="w-16 h-24 rounded overflow-hidden border border-amber-500/20 bg-zinc-950">
                          {rc.card.imageUrlThumb ? (
                            <img
                              src={rc.card.imageUrlThumb}
                              alt={rc.card.nameTr}
                              className={`w-full h-full object-cover ${rc.isReversed ? 'rotate-180' : ''}`}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Moon className="w-4 h-4 text-zinc-700" />
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-1 max-w-[80px] truncate">
                          {rc.card.nameTr}
                        </div>
                        <div className="text-[9px] text-zinc-600">
                          {rc.isReversed ? 'ters' : 'düz'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Niyet */}
                {expandedReading.intentionText && (
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-amber-300 mb-1 flex items-center gap-1">
                      <Heart className="w-3 h-3" /> Niyet
                    </h3>
                    <p className="text-sm text-zinc-300 italic">{expandedReading.intentionText}</p>
                  </div>
                )}

                {/* AI Yorumu */}
                {expandedReading.aiInterpretation && (
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-amber-300 mb-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Mistik Yorum
                    </h3>
                    <div className="prose prose-invert max-w-none">
                      <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap font-serif">
                        {expandedReading.aiInterpretation}
                      </p>
                    </div>
                  </div>
                )}

                {/* Ana temalar */}
                {expandedReading.keyThemes && (
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-amber-300 mb-2">Ana Temalar</h3>
                    <div className="flex flex-wrap gap-2">
                      {JSON.parse(expandedReading.keyThemes).map((t: string, i: number) => (
                        <span
                          key={i}
                          className="text-xs bg-amber-500/10 text-amber-300/80 px-2 py-1 rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gelişim çizgisi */}
                {expandedReading.predictedArc && (
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-amber-300 mb-1">Gelişim Çizgisi</h3>
                    <p className="text-sm text-zinc-300 italic">{expandedReading.predictedArc}</p>
                  </div>
                )}

                {/* Astro bağlam */}
                {expandedReading.astroContextJson && (() => {
                  const astro = JSON.parse(expandedReading.astroContextJson);
                  return astro?.natal ? (
                    <div>
                      <h3 className="text-xs uppercase tracking-wider text-violet-300 mb-1">Yıldız Haritası Bağlamı</h3>
                      <p className="text-xs text-zinc-400">
                        Güneş: {astro.natal.sun} · Ay: {astro.natal.moon} · Yükselen: {astro.natal.ascendant}
                      </p>
                    </div>
                  ) : null;
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
