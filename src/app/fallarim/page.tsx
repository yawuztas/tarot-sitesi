/**
 * Fal Geçmişi Sayfası
 *
 * GET /fallarim
 *
 * Kayıtlı kullanıcının tüm fallarını listeler:
 * - Tarih, niyet, açılım
 * - Kart özeti
 * - AI özeti
 * - Ana temalar (chip'ler halinde)
 * - Gelişim çizgisi
 * - Tam fal metni (modal/açılır panel)
 *
 * Misafir kullanıcıya "kayıt ol" daveti çıkar.
 */

import Link from 'next/link';
import { ArrowLeft, Sparkles, BookOpen, TrendingUp, Flame, Moon, Repeat } from 'lucide-react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import ReadingHistoryList from '@/components/tarot/ReadingHistoryList';
import { calculateDailyTransits, type DailyTransitReport } from '@/lib/astrology/transits';
import { calculateCurrentTransits } from '@/lib/astrology/chart';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Fal Geçmişim · Mystic Tarot',
  description: 'Geçmiş falların, kartların ve AI yorumlarının gelişim çizgisi',
};

async function FalGecmisi() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mb-4">
          <Sparkles className="w-7 h-7 text-amber-400" />
        </div>
        <h2 className="text-2xl font-serif text-amber-100 mb-2">Fal Geçmişin Seni Bekliyor</h2>
        <p className="text-sm text-zinc-400 mb-6">
          Kayıt olduğunda çektiğin tüm fallar, kartların ve gelişim çizgin burada toplanır.
          Mistik yolculuğunu geriye dönüp izleyebilir, kartların sana ne anlattığını takip edebilirsin.
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href="/kayit?callbackUrl=/fallarim"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-medium py-2.5 px-6 rounded-lg transition"
          >
            <Sparkles className="w-4 h-4" />
            Hemen Kayıt Ol
          </Link>
          <Link
            href="/giris?callbackUrl=/fallarim"
            className="text-sm text-zinc-400 hover:text-zinc-300"
          >
            Zaten hesabın var mı? Giriş yap
          </Link>
        </div>
      </div>
    );
  }

  // Kullanıcının tüm fallarını çek
  const readings = await db.reading.findMany({
    where: { userId: user.id, status: 'completed' },
    orderBy: { drawnAt: 'desc' },
    take: 100,
    include: {
      spread: { select: { nameTr: true, name: true, cardCount: true } },
      style: { select: { nameTr: true, slug: true } },
      intentionCategory: { select: { nameTr: true, slug: true, icon: true, color: true } },
      readingCards: {
        orderBy: { positionIndex: 'asc' },
        include: {
          card: {
            select: {
              nameTr: true, slug: true, arcanaType: true,
              imageUrlThumb: true,
            },
          },
        },
      },
    },
  });

  // User stats + natal chart
  const userStats = await db.user.findUnique({
    where: { id: user.id },
    select: {
      totalReadingsCount: true,
      currentStreak: true,
      longestStreak: true,
      lastActiveDate: true,
      natalChartJson: true,
    },
  });

  // Ruhsal Hafıza Analizi: En çok çıkan kartlar, ters oranı ve tekrar eden temalar
  const cardCounts = new Map<string, { nameTr: string; count: number; reversedCount: number; thumb: string | null }>();
  const themeCounts = new Map<string, number>();
  let totalCardsDrawn = 0;
  let reversedTotal = 0;

  for (const r of readings) {
    for (const rc of r.readingCards) {
      totalCardsDrawn += 1;
      if (rc.isReversed) reversedTotal += 1;
      const existing = cardCounts.get(rc.card.slug);
      if (existing) {
        existing.count += 1;
        if (rc.isReversed) existing.reversedCount += 1;
      } else {
        cardCounts.set(rc.card.slug, {
          nameTr: rc.card.nameTr,
          count: 1,
          reversedCount: rc.isReversed ? 1 : 0,
          thumb: rc.card.imageUrlThumb,
        });
      }
    }
    if (r.keyThemes) {
      try {
        const parsed: unknown = JSON.parse(r.keyThemes);
        if (Array.isArray(parsed)) {
          for (const t of parsed) {
            if (typeof t === 'string' && t.trim()) {
              const key = t.trim();
              themeCounts.set(key, (themeCounts.get(key) || 0) + 1);
            }
          }
        }
      } catch {}
    }
  }

  const topCards = Array.from(cardCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3);
  const topThemes = Array.from(themeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const reversedRate = totalCardsDrawn > 0 ? Math.round((reversedTotal / totalCardsDrawn) * 100) : 0;

  // Güncel gökyüzü ve kişisel transit uyarısı
  let dailyTransitReport: DailyTransitReport | null = null;
  if (userStats?.natalChartJson) {
    try {
      const natalChart = JSON.parse(userStats.natalChartJson);
      dailyTransitReport = calculateDailyTransits(natalChart);
    } catch {}
  }
  const skyTransits = calculateCurrentTransits();
  const retrogradePlanets = skyTransits.planets.filter((p) => p.isRetrograde).map((p) => p.nameTr);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Başlık */}
      <div className="text-center">
        <h1 className="text-3xl font-serif text-amber-100 mb-1">Fal Geçmişin</h1>
        <p className="text-sm text-zinc-400">Mistik yolculuğunun izleri ve ruhsal hafızan</p>
      </div>

      {/* İstatistik kartları */}
      {userStats && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<BookOpen className="w-4 h-4" />}
            label="Toplam Fal"
            value={userStats.totalReadingsCount}
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="Güncel Seri"
            value={`${userStats.currentStreak} gün`}
          />
          <StatCard
            icon={<Sparkles className="w-4 h-4" />}
            label="En Uzun Seri"
            value={`${userStats.longestStreak} gün`}
          />
        </div>
      )}

      {/* Güncel Gökyüzü & Transit Uyarısı */}
      <div className="rounded-xl border border-purple-500/25 bg-gradient-to-r from-[#180a2e]/80 via-[#110522]/90 to-[#180a2e]/80 p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-serif text-amber-300 font-semibold">
            <Moon className="w-4 h-4 text-amber-400" />
            <span>
              Gökyüzü Nabzı: {dailyTransitReport?.moonPhase || 'Güncel Ay Fazı'} · Ay{' '}
              {dailyTransitReport?.moonSign || skyTransits.planets.find((p) => p.name === 'Moon')?.sign || ''}
            </span>
          </span>
          {retrogradePlanets.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-950/60 border border-rose-500/30 text-rose-200 text-[10px]">
              Retro: {retrogradePlanets.join(', ')}
            </span>
          )}
        </div>
        {dailyTransitReport?.overallTheme ? (
          <p className="text-xs text-zinc-300 leading-relaxed">
            {dailyTransitReport.overallTheme}
            {dailyTransitReport.activeTransits?.[0]
              ? ` · Öne çıkan açı: ${dailyTransitReport.activeTransits[0].transitingBodyTr} – ${dailyTransitReport.activeTransits[0].natalPointTr} (${dailyTransitReport.activeTransits[0].aspectTypeTr}).`
              : ''}
          </p>
        ) : (
          <p className="text-xs text-zinc-400">
            Doğum haritanı fal masasında mühürlediğinde sana özel gökyüzü transit uyarıları burada görünür.
          </p>
        )}
      </div>

      {/* Ruhsal Hafıza: Tekrar Eden Kartlar & Temalar */}
      {readings.length > 0 && topCards.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-zinc-900/50 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-serif uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5" />
              <span>Ruhsal Hafıza · En Sık Karşına Çıkan Arketipler</span>
            </h2>
            <span className="text-[11px] text-zinc-400">
              {totalCardsDrawn} kart çekimi · %{reversedRate} ters oranı
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {topCards.map(([slug, info]) => (
              <div
                key={slug}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800"
              >
                {info.thumb && (
                  <img
                    src={info.thumb}
                    alt={info.nameTr}
                    className="w-9 h-14 object-cover rounded border border-amber-500/30 shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-serif text-amber-100 truncate">{info.nameTr}</div>
                  <div className="text-[11px] text-amber-400 font-medium">{info.count} kez belirdi</div>
                  <div className="text-[10px] text-zinc-500">
                    {info.reversedCount > 0 ? `${info.reversedCount} kez ters` : 'Hep düz geldi'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {topThemes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-zinc-500 flex items-center gap-1 mr-1">
                <Flame className="w-3 h-3 text-amber-400" />
                Tekrar Eden Temalar:
              </span>
              {topThemes.map(([theme, count]) => (
                <span
                  key={theme}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-200"
                >
                  {theme} ({count})
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fal listesi */}
      {readings.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 mb-3">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="font-serif text-lg text-amber-100 mb-1">Henüz fal yok</h3>
          <p className="text-sm text-zinc-400 mb-4">İlk falını çek, mistik yolculuğun başlasın.</p>
          <Link
            href="/fal"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-medium py-2 px-5 rounded-lg transition"
          >
            <Sparkles className="w-4 h-4" />
            Fal Masasına Geç
          </Link>
        </div>
      ) : (
        <ReadingHistoryList readings={readings} />
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-3 text-center">
      <div className="inline-flex items-center justify-center text-amber-400 mb-1">{icon}</div>
      <div className="text-lg font-serif text-zinc-100">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

export default function FallarimPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
      <div className="border-b border-amber-500/10 bg-violet-950/20">
        <div className="container mx-auto px-4 py-3 max-w-6xl">
          <Link
            href="/fal"
            className="inline-flex items-center gap-2 text-sm text-amber-300/80 hover:text-amber-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Fal Masasına Dön
          </Link>
        </div>
      </div>
      <FalGecmisi />
    </main>
  );
}
