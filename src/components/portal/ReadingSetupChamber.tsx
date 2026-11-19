'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Sun,
  Compass,
  Layers,
  Heart,
  Briefcase,
  Leaf,
  Star,
  Flame,
} from 'lucide-react';
import type { AstroData } from './AstrologyChamber';

export type SpreadChoice = 'three-card' | 'horseshoe' | 'celtic-cross';
export type DeckStyleChoice = 'rider-waite' | 'marseille';

interface ReadingSetupChamberProps {
  astroData: AstroData | null;
  onBackToAstrology: () => void;
}

const SPREAD_OPTIONS = [
  {
    id: 'three-card' as SpreadChoice,
    title: '3 Kart Açılımı',
    subtitle: 'Geçmiş, Şimdi & Gelecek',
    description: 'Meseleyi doğuran kökler, anın gerçekliği ve varılacak kader çizgisi.',
    cardCount: 3,
    tag: 'Zamanın Akışı',
    isPopular: true,
    color: 'from-purple-500/30 via-amber-500/20 to-purple-500/30 border-amber-400/80 text-amber-200',
  },
  {
    id: 'horseshoe' as SpreadChoice,
    title: '7 Kart Açılımı',
    subtitle: 'Kutsal At Nalı (Kader Yolu)',
    description: 'Kökler, gizli gölgeler, engeller, çevre etkisi, kahin tavsiyesi ve nihai çıkış kapısı.',
    cardCount: 7,
    tag: 'Derin Hikaye',
    color: 'from-amber-500/20 to-purple-600/10 border-amber-500/40 text-amber-300',
  },
  {
    id: 'celtic-cross' as SpreadChoice,
    title: '10 Kart Açılımı',
    subtitle: 'Kadim Kelt Haçı (Büyük Harita)',
    description: 'Bilinçaltı, meydan okuma, taç, yakın gelecek, umutlar, korkular ve nihai kader mührü.',
    cardCount: 10,
    tag: 'Büyük Başyapıt',
    color: 'from-indigo-500/20 to-purple-800/20 border-indigo-400/40 text-indigo-200',
  },
];

const QUICK_INTENTIONS = [
  { icon: Heart, text: 'Aklımdaki kişiyle ilişkimizin geleceği ne olacak?' },
  { icon: Briefcase, text: 'Kariyerimde beklediğim maddi ve mesleki fırsat ne zaman gelecek?' },
  { icon: Leaf, text: 'Ruhumu yoran bu belirsizlikten nasıl şifa ve aydınlık bulurum?' },
  { icon: Star, text: 'Yakın gelecekte beni bekleyen en önemli kader dönüm noktası nedir?' },
];

export default function ReadingSetupChamber({
  astroData,
  onBackToAstrology,
}: ReadingSetupChamberProps) {
  const router = useRouter();
  const [selectedSpread, setSelectedSpread] = useState<SpreadChoice>('three-card');
  const [selectedStyle, setSelectedStyle] = useState<DeckStyleChoice>('rider-waite');
  const [intentionText, setIntentionText] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);

  // Yıldız Falı Bilgilerinin Durumu
  const hasAstroData = Boolean(astroData && astroData.isSubmitted && astroData.chart);
  const isBirthTimeMissing = Boolean(
    !hasAstroData || astroData?.birthTimeUnknown || !astroData?.birthTime
  );

  const handleLaunchReading = () => {
    setIsNavigating(true);

    const setupPayload = {
      userName: astroData?.userName || 'Gezgin',
      intentionText: intentionText.trim() || 'Evrenin bana iletmek istediği rehberlik',
      selectedSpread,
      selectedStyle,
      selectedPillar: 'love',
      birthDate: astroData?.birthDate || '1998-05-14',
      birthTime: astroData?.birthTime || '14:30',
      birthTimeUnknown: astroData?.birthTimeUnknown ?? true,
      birthCity: astroData?.birthCity || 'İstanbul',
      includeAstro: hasAstroData,
      astroSummary: astroData?.chart
        ? {
            sunSign: astroData.chart.sunSign,
            sunSignFormatted: astroData.chart.sunSignFormatted,
            moonSign: astroData.chart.moonSign,
            moonSignFormatted: astroData.chart.moonSignFormatted,
            ascendant: astroData.chart.ascendant,
            ascendantFormatted: astroData.chart.ascendantFormatted,
          }
        : null,
      profile: astroData?.profile || null,
      dailyTransit: astroData?.dailyTransit || null,
      autoProceedToFanning: true,
    };

    try {
      sessionStorage.setItem('tarot_ritual_setup', JSON.stringify(setupPayload));
    } catch {}

    setTimeout(() => {
      router.push(`/fal?spread=${selectedSpread}`);
    }, 600);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#05010a] text-zinc-100 flex flex-col justify-between overflow-x-hidden selection:bg-purple-900 selection:text-amber-200">
      {/* Büyük Ekranı Kaplayan Fal Masası Arka Planı */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <Image
          src="/assets/mystic_fortune_table.jpg"
          alt="Kadim Fal Masası ve Sunak"
          fill
          priority
          className="object-cover object-center filter brightness-[0.45] contrast-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05010a] via-[#05010a]/70 to-[#05010a]/50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#030007_85%)]" />
      </div>

      {/* Üst Bar: Geri Dön & Başlık */}
      <header className="relative z-20 container mx-auto px-4 pt-6 pb-2 max-w-6xl flex items-center justify-between">
        <button
          onClick={onBackToAstrology}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-serif tracking-wider text-zinc-300 hover:text-amber-300 border border-purple-500/25 bg-[#090212]/80 backdrop-blur-md hover:border-amber-400/50 transition-all shadow-md group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>← Falcı Kadına Dön (Yıldız Falı)</span>
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-serif uppercase tracking-widest bg-amber-500/15 text-amber-300 border border-amber-500/30 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Aşama 3: Fal Masası & Niyet</span>
        </div>
      </header>

      {/* Ana Çalışma Alanı: Masanın Biraz Üzerinde Niyet ve Masanın Üstünde Seçenekler */}
      <main className="relative z-10 container mx-auto px-4 py-4 md:py-6 max-w-6xl flex-1 flex flex-col justify-center space-y-6">
        
        {/* ÜST BÖLGE: Masanın Biraz Üzerinde Niyetini / Sorunu Yaz Alanı */}
        <section className="w-full max-w-3xl mx-auto space-y-3">
          <div className="text-center space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-purple-200 to-amber-300">
              Niyetini & Kalbindeki Soruyu Evrene Fısılda
            </h1>
            <p className="text-xs text-zinc-400 font-sans">
              Kartlar kalbinin aynasıdır. Sorun ne kadar berrak olursa, kehanet o kadar aydınlık konuşur.
            </p>
          </div>

          <div className="relative group">
            <textarea
              rows={2}
              value={intentionText}
              onChange={(e) => setIntentionText(e.target.value)}
              placeholder="Örn: Kalbimdeki kişiyle geleceğimiz nasıl şekillenecek? / Önümüzdeki günlerde hangi fırsata odaklanmalıyım?..."
              className="w-full px-4 py-3 rounded-2xl bg-[#0e041d]/85 backdrop-blur-md border border-purple-500/30 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 text-sm md:text-base text-zinc-100 placeholder:text-zinc-500 font-sans shadow-xl transition-all resize-none"
            />
            <div className="absolute right-3 bottom-3 text-[10px] text-zinc-500 font-serif pointer-events-none">
              ✦ Zihnini odakla ve mühürle
            </div>
          </div>

          {/* Hızlı Öneri Butonları */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            <span className="text-[11px] font-serif text-amber-300/80 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Örnek Niyetler:</span>
            </span>
            {QUICK_INTENTIONS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setIntentionText(item.text)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sans bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/20 hover:border-amber-400/40 text-zinc-300 hover:text-amber-200 transition-all select-none"
                >
                  <Icon className="w-3 h-3 text-amber-400/80" />
                  <span className="truncate max-w-[200px] sm:max-w-none">{item.text}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ORTA BÖLGE: Masa Üstünde 3 Farklı Tarot Falı Bakma Seçenekleri + Sağda Yıldız Falı Uyarı Alanı */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-w-5xl mx-auto w-full">
          
          {/* SOL-ORTA (8 Kolon): Masa Üstündeki 3 Tarot Seçeneği */}
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-serif font-bold uppercase tracking-wider text-amber-200">
                  Masa Üzerindeki Açılım Türleri
                </span>
              </div>
              <span className="text-[11px] text-zinc-400">Birini seçin</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SPREAD_OPTIONS.map((spread) => {
                const isSelected = selectedSpread === spread.id;
                return (
                  <div
                    key={spread.id}
                    onClick={() => setSelectedSpread(spread.id)}
                    className={`relative p-4 rounded-2xl cursor-pointer border transition-all duration-300 flex flex-col justify-between backdrop-blur-md ${
                      isSelected
                        ? 'bg-gradient-to-b from-[#240c42]/90 to-[#100320]/90 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.35)] scale-102 ring-1 ring-amber-400/50'
                        : 'bg-[#0d031c]/70 border-purple-500/20 hover:border-purple-400/40 hover:bg-[#15062a]/70'
                    }`}
                  >
                    {/* Kart Sayısı Minyatürü / Üst Rozet */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-serif uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-900/60 border border-purple-500/30 text-purple-200">
                        {spread.tag}
                      </span>
                      <div className="flex items-center gap-[2px]">
                        {Array.from({ length: spread.cardCount }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 sm:w-2 h-3.5 sm:h-4 rounded-[2px] border ${
                              isSelected
                                ? 'bg-amber-400 border-amber-200 shadow-sm'
                                : 'bg-purple-950 border-purple-500/40'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Başlık & Bilgi */}
                    <div className="space-y-1 mb-2">
                      <h3 className="font-serif font-bold text-sm text-zinc-100 flex items-center gap-1.5">
                        <span>{spread.title}</span>
                      </h3>
                      <p className="text-[11px] font-serif text-amber-300/80">
                        {spread.subtitle}
                      </p>
                      <p className="text-[10px] text-zinc-400 leading-relaxed font-sans line-clamp-2">
                        {spread.description}
                      </p>
                    </div>

                    {/* Seçildi İşareti */}
                    <div className="pt-2 border-t border-purple-500/15 flex items-center justify-between text-[11px]">
                      <span className="font-serif text-zinc-400">
                        {spread.cardCount} Kart Seçimi
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-amber-400 border-amber-300 text-black'
                            : 'border-zinc-600 bg-black/40'
                        }`}
                      >
                        {isSelected && <span className="text-[10px] font-bold">✓</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SAĞ TARAF (4 Kolon): Yıldız Falı Bilgi Durumu / Eksik Bilgi Uyarısı */}
          <div className="lg:col-span-4 flex flex-col justify-start">
            <div className="p-4 rounded-2xl bg-[#0c031a]/85 backdrop-blur-md border border-purple-500/25 shadow-xl space-y-3">
              <div className="flex items-center gap-2 border-b border-purple-500/15 pb-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-serif font-bold text-zinc-200 uppercase tracking-wider">
                  Yıldız Falı Durumu
                </h4>
              </div>

              {/* DURUM 1: Tam girildiyse */}
              {hasAstroData && !isBirthTimeMissing && (
                <div className="space-y-2 text-xs font-sans">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-serif font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Kozmik Haritanız Mühürlendi</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/20 space-y-1 text-[11px] text-zinc-300">
                    <p>✦ <strong>{astroData?.userName}</strong> ({astroData?.birthCity})</p>
                    <p>☀️ Güneş Burcu: <strong>{astroData?.chart?.sunSign}</strong></p>
                    <p>🌅 Yükselen: <strong>{astroData?.chart?.ascendant}</strong></p>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-serif">
                    Doğum saatiniz ve haritanız kartların kadim sembolizmine harmanlanacaktır.
                  </p>
                </div>
              )}

              {/* DURUM 2: Doğum saati girilmedi veya bilinmiyor */}
              {hasAstroData && isBirthTimeMissing && (
                <div className="space-y-2 text-xs font-sans">
                  <div className="flex items-center gap-1.5 text-amber-400 font-serif font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Doğum Saati Girilmedi</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200 leading-relaxed">
                    Doğum saati girilmediği için <strong>Yükselen Burç</strong> ve <strong>12 Ev Haritası</strong> fala eklenmeyecektir.
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-serif">
                    Falınız Güneş burcunuz ({astroData?.chart?.sunSign}) ve baskın element enerjisi ile yorumlanacaktır.
                  </p>
                  <button
                    type="button"
                    onClick={onBackToAstrology}
                    className="w-full py-1.5 px-3 rounded-lg text-[11px] font-serif text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
                  >
                    Saati Eklemek İçin Geri Dön
                  </button>
                </div>
              )}

              {/* DURUM 3: Yıldız falı bilgileri hiç girilmedi (atlanarak gelindi) */}
              {!hasAstroData && (
                <div className="space-y-2 text-xs font-sans">
                  <div className="flex items-center gap-1.5 text-rose-400 font-serif font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Yıldız Falı Bilgileri Girilmedi</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-800/30 text-[11px] text-rose-200 leading-relaxed">
                    Önceki sayfada doğum bilgileriniz kaydedilmedi. Fala astrolojik doğum haritanız ve gezegen transitleriniz eklenemeyecek.
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-serif">
                    Yalnızca 78 tarot kartının saf sembolizmi ve evrensel enerjisi okunacaktır.
                  </p>
                  <button
                    type="button"
                    onClick={onBackToAstrology}
                    className="w-full py-1.5 px-3 rounded-lg text-[11px] font-serif text-amber-300 hover:text-amber-200 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/30 transition-colors"
                  >
                    Geri Dön ve Bilgileri Gir
                  </button>
                </div>
              )}
            </div>
          </div>

        </section>

        {/* MASANIN AŞAĞISINDA: TAROT FALI ŞEKLİNDE BÜYÜK EYLEM BUTONU */}
        <section className="pt-2 flex flex-col items-center justify-center">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full max-w-md"
          >
            <button
              type="button"
              disabled={isNavigating}
              onClick={handleLaunchReading}
              className="relative w-full py-4 px-6 rounded-2xl overflow-hidden cursor-pointer select-none group border-2 border-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.45)] transition-all duration-300"
              style={{
                background:
                  'linear-gradient(135deg, #2c0e52 0%, #15062a 50%, #2b0b45 100%)',
              }}
            >
              {/* Altın Yaldızlı Kenar & Köşe Motifleri */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-transparent to-amber-400/20 pointer-events-none" />
              <div className="absolute top-1 left-2 text-[10px] text-amber-300 font-serif">✦</div>
              <div className="absolute top-1 right-2 text-[10px] text-amber-300 font-serif">✦</div>
              <div className="absolute bottom-1 left-2 text-[10px] text-amber-300 font-serif">✦</div>
              <div className="absolute bottom-1 right-2 text-[10px] text-amber-300 font-serif">✦</div>

              {/* Buton İçeriği */}
              <div className="relative z-10 flex items-center justify-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-300 group-hover:rotate-12 transition-transform duration-300" />
                <div className="text-center">
                  <span className="block font-serif font-bold text-base sm:text-lg tracking-wider text-amber-200 group-hover:text-amber-100 transition-colors uppercase">
                    {isNavigating ? 'Kader Masası Açılıyor...' : 'Fal Masasına Geç & Kartları Seç'}
                  </span>
                  <span className="block text-[11px] font-sans text-purple-200/80 tracking-wide">
                    {selectedSpread === 'three-card'
                      ? '3 Kartlık Kader Çizgisi Açılımı'
                      : selectedSpread === 'horseshoe'
                      ? '7 Kartlık Kutsal At Nalı Açılımı'
                      : '10 Kartlık Kadim Kelt Haçı Açılımı'}
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-amber-300 group-hover:translate-x-1 transition-transform" />
              </div>

              {/* Hover Işıltısı */}
              <div className="absolute inset-0 bg-gradient-to-t from-amber-400/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </button>
          </motion.div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 py-3 text-center text-[10px] text-zinc-500 font-serif border-t border-purple-500/10">
        <span>© {new Date().getFullYear()} Mystic Tarot · 78 Rider-Waite Arkana & Astroloji Mührü</span>
      </footer>
    </div>
  );
}
