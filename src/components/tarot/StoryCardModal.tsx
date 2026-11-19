'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Sparkles, Check } from 'lucide-react';

interface DrawnCard {
  nameTr: string;
  isReversed: boolean;
  positionLabel?: string;
  imageUrlMedium?: string | null;
}

interface StoryCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: DrawnCard[];
  pillarTitle: string;
  userName?: string;
  quote?: string;
  astroSummary?: {
    sunSign?: string;
    moonSign?: string;
    ascendant?: string;
  };
}

function drawFallbackCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: DrawnCard) {
  const cardGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  cardGrad.addColorStop(0, '#2b1055');
  cardGrad.addColorStop(1, '#130424');
  ctx.fillStyle = cardGrad;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(c.nameTr, x + w / 2, y + h / 2);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}

export default function StoryCardModal({
  isOpen,
  onClose,
  cards,
  pillarTitle,
  userName = 'Yolcu',
  quote = 'Kader senin seçimlerinle konuşur; karanlığın bittiği yerde yıldızlar fısıldar.',
  astroSummary,
}: StoryCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function renderStoryCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 9:16 Instagram Story boyutu (1080 x 1920)
    canvas.width = 1080;
    canvas.height = 1920;

    // 1. Arka plan: Derin nebula & kozmik karanlık
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
    bgGrad.addColorStop(0, '#0d061a');
    bgGrad.addColorStop(0.3, '#190a2c');
    bgGrad.addColorStop(0.7, '#11051f');
    bgGrad.addColorStop(1, '#080310');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // 2. Altın Çerçeve & Köşe Süslemeleri
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 3;
    ctx.strokeRect(60, 60, 960, 1800);

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(80, 80, 920, 1760);

    // Köşe süsleme motifleri
    const corners = [
      [60, 60],
      [1020, 60],
      [60, 1860],
      [1020, 1860],
    ];
    corners.forEach(([cx, cy]) => {
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Üst Logo / Başlık
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 34px "Cinzel", "Georgia", serif';
    ctx.fillText('✦ M Y S T I C   T A R O T ✦', 540, 180);

    ctx.fillStyle = 'rgba(226, 232, 240, 0.7)';
    ctx.font = 'italic 28px "Georgia", serif';
    const dateStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    ctx.fillText(`${userName}'in Kehaneti · ${dateStr}`, 540, 230);

    // Odak Alanı Rozeti
    ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
    ctx.beginPath();
    ctx.roundRect(340, 275, 400, 65, 32);
    ctx.fill();
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#fde68a';
    ctx.font = '600 28px sans-serif';
    ctx.fillText(pillarTitle, 540, 318);

    // Astroloji Rozeti (Güneş, Ay, Yükselen)
    if (astroSummary?.sunSign || astroSummary?.moonSign || astroSummary?.ascendant) {
      const astroParts: string[] = [];
      if (astroSummary.sunSign) astroParts.push(`☉ Güneş: ${astroSummary.sunSign}`);
      if (astroSummary.moonSign) astroParts.push(`☽ Ay: ${astroSummary.moonSign}`);
      if (astroSummary.ascendant) astroParts.push(`☿ Yükselen: ${astroSummary.ascendant}`);
      const astroText = astroParts.join('   ·   ');

      ctx.fillStyle = '#fef08a';
      ctx.font = '500 24px "Georgia", serif';
      ctx.fillText(astroText, 540, 375);
    }

    // 4. Kartların Çizimi (Ortada hizalı)
    const cardCount = cards.length;
    const cardWidth = cardCount === 1 ? 400 : 260;
    const cardHeight = cardCount === 1 ? 640 : 420;
    const gap = 35;
    const totalW = cardCount * cardWidth + (cardCount - 1) * gap;
    const startX = (1080 - totalW) / 2;
    const cardY = 440;

    for (let i = 0; i < cardCount; i++) {
      const c = cards[i];
      const x = startX + i * (cardWidth + gap);

      // Kart arkası / önü görseli yükle
      if (c.imageUrlMedium) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = c.imageUrlMedium;
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });

          ctx.save();
          // Ters ise döndür
          if (c.isReversed) {
            ctx.translate(x + cardWidth / 2, cardY + cardHeight / 2);
            ctx.rotate(Math.PI);
            ctx.drawImage(img, -cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
          } else {
            ctx.drawImage(img, x, cardY, cardWidth, cardHeight);
          }
          ctx.restore();
        } catch {
          drawFallbackCard(ctx, x, cardY, cardWidth, cardHeight, c);
        }
      } else {
        drawFallbackCard(ctx, x, cardY, cardWidth, cardHeight, c);
      }

      // Kartın altın çerçevesi
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, cardY, cardWidth, cardHeight);

      // Kartın pozisyonu ve adı
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 26px "Georgia", serif';
      ctx.fillText(c.nameTr, x + cardWidth / 2, cardY + cardHeight + 45);

      if (c.isReversed) {
        ctx.fillStyle = '#f87171';
        ctx.font = '20px sans-serif';
        ctx.fillText('(Ters)', x + cardWidth / 2, cardY + cardHeight + 75);
      } else if (c.positionLabel) {
        ctx.fillStyle = 'rgba(216, 180, 254, 0.8)';
        ctx.font = '20px sans-serif';
        ctx.fillText(c.positionLabel, x + cardWidth / 2, cardY + cardHeight + 75);
      }
    }

    // 5. Mistik Kehanet Sözü (Altta)
    const quoteY = 1350;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.roundRect(140, quoteY, 800, 240, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.font = '40px serif';
    ctx.fillText('“', 180, quoteY + 60);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'italic 30px "Georgia", serif';
    wrapText(ctx, quote, 540, quoteY + 80, 700, 44);

    // 6. Alt Bilgi & Web Sitesi
    ctx.fillStyle = 'rgba(212, 175, 55, 0.6)';
    ctx.font = '24px sans-serif';
    ctx.fillText('Kaderin fısıltısını keşfet · mystictarot.app', 540, 1770);

    setDataUrl(canvas.toDataURL('image/png'));
  }

  useEffect(() => {
    if (isOpen && cards.length > 0) {
      Promise.resolve().then(() => {
        renderStoryCanvas();
      });
    }
  }, [isOpen, cards, pillarTitle, userName, quote]);

  const handleDownload = () => {
    if (!dataUrl) return;
    setDownloading(true);
    const link = document.createElement('a');
    link.download = `mystic-tarot-story-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    setTimeout(() => setDownloading(false), 800);
  };

  const handleShare = async () => {
    if (!dataUrl) return;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], 'tarot-kehaneti.png', { type: 'image/png' });
        await navigator.share({
          title: 'Benim Tarot Kehanetim',
          text: `Bugün baktırdığım ${pillarTitle} falı: "${quote}"`,
          files: [file],
        });
        return;
      } catch (e) {
        // Fallback to copy link
      }
    }
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          className="relative max-w-sm w-full bg-[#110722] border border-amber-500/30 rounded-2xl p-5 shadow-2xl flex flex-col items-center max-h-[95vh] overflow-y-auto"
        >
          {/* Kapat butonu */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-full bg-zinc-800/40"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-3 text-amber-400 text-xs uppercase tracking-widest font-serif">
            <Sparkles className="w-4 h-4" />
            Instagram Story Kehanet Kartı
          </div>

          <p className="text-xs text-zinc-400 text-center mb-4">
            Bu lüks 9:16 kartı Instagram, WhatsApp veya TikTok hikayende tek tıkla paylaşabilirsin!
          </p>

          {/* Gizli Canvas */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Önizleme */}
          <div className="w-full aspect-[9/16] rounded-xl overflow-hidden shadow-2xl border border-amber-500/30 bg-black/40 relative">
            {dataUrl ? (
              <img
                src={dataUrl}
                alt="Story Preview"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-amber-300/50 text-xs">
                Story kartı hazırlanıyor...
              </div>
            )}
          </div>

          {/* Aksiyon Butonları */}
          <div className="grid grid-cols-2 gap-3 w-full mt-4">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-xs tracking-wider transition-all shadow-lg shadow-amber-500/20"
            >
              <Download className="w-4 h-4" />
              Görseli İndir
            </button>

            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-purple-900/60 hover:bg-purple-800/80 border border-purple-400/40 text-purple-200 text-xs tracking-wider transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              {copied ? 'Link Kopyalandı!' : 'Hikayede Paylaş'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
