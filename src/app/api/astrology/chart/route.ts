/**
 * Doğum Haritası Endpoint
 *
 * POST /api/astrology/chart
 *
 * Body:
 *   birthDate: string (ISO YYYY-MM-DD)
 *   birthTime?: string ("HH:MM" — opsiyonel)
 *   birthTimeUnknown: boolean
 *   birthCity: string (Türkiye şehri adı)
 *
 * Yanıt:
 *   { chart: BirthChart, savedToUser: boolean } | { error: string }
 *
 * Kullanıcı oturum açtıysa: User.natalChartJson'a kaydeder.
 * Oturum yoksa: sadece hesaplar, kaydetmez.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateBirthChart } from '@/lib/astrology/chart';
import { findCityByName, TURKISH_CITIES } from '@/lib/astrology/turkish-cities';
import { getCurrentUser } from '@/lib/auth/session';
import { generateAstrologyProfile } from '@/lib/astrology/user-profile';
import { calculateDailyTransits, type DailyTransitReport } from '@/lib/astrology/transits';
import { applyRateLimit } from '@/lib/security/rate-limit';
import { assertSameOrigin, clampText } from '@/lib/security/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChartRequestBody {
  birthDate: string;        // "1990-05-15"
  birthTime?: string;      // "14:30"
  birthTimeUnknown?: boolean;
  birthCity: string;       // "İstanbul"
  displayName?: string;    // "Aylin"
}

function parseBirthDateTime(dateStr: string, timeStr?: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  // Türkiye yerel saatinden UTC'ye çevrim (UTC+3)
  if (timeStr && /^\d{2}:\d{2}$/.test(timeStr)) {
    const [h, min] = timeStr.split(':').map(Number);
    // Date.UTC (h - 3) negatif olduğunda otomatik olarak önceki güne geçer
    return new Date(Date.UTC(y, m - 1, d, h - 3, min));
  }
  // Saat bilinmiyorsa: UTC 09:00 (Türkiye 12:00 öğle vakti — ortalama konum)
  return new Date(Date.UTC(y, m - 1, d, 9, 0));
}

export async function POST(req: NextRequest) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;

  const rateLimited = applyRateLimit(req, 'astrology-chart', { limit: 30, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  let body: ChartRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 });
  }

  // Validasyon
  if (!body.birthDate) {
    return NextResponse.json({ error: 'Doğum tarihi gerekli' }, { status: 400 });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(body.birthDate)) {
    return NextResponse.json({ error: 'Tarih formatı YYYY-MM-DD olmalı' }, { status: 400 });
  }

  const parsedDate = new Date(body.birthDate);
  if (isNaN(parsedDate.getTime()) || parsedDate.getFullYear() < 1800 || parsedDate.getFullYear() > 2399) {
    return NextResponse.json({ error: 'Tarih 1800-2399 aralığında olmalı' }, { status: 400 });
  }

  const birthTimeUnknown = body.birthTimeUnknown === true || !body.birthTime;
  if (!birthTimeUnknown && body.birthTime && !/^\d{2}:\d{2}$/.test(body.birthTime)) {
    return NextResponse.json({ error: 'Saat formatı HH:MM olmalı' }, { status: 400 });
  }

  // Şehir (varsayılan: İstanbul)
  const city = findCityByName(body.birthCity) || TURKISH_CITIES.find(c => c.name === "İstanbul") || TURKISH_CITIES[0];

  // Tarihi UTC Date'e çevir
  const birthDate = parseBirthDateTime(body.birthDate, birthTimeUnknown ? undefined : body.birthTime);

  // Haritayı hesapla
  const chart = calculateBirthChart({
    birthDate,
    birthTimeUnknown,
    birthLat: city.lat,
    birthLng: city.lng,
    birthPlaceName: city.name,
  });

  // Kullanıcı oturum açtıysa: User'a kaydet
  const user = await getCurrentUser();
  if (user) {
    const cleanDisplayName = clampText(body.displayName, 60);
    await db.user.update({
      where: { id: user.id },
      data: {
        ...(cleanDisplayName ? { displayName: cleanDisplayName } : {}),
        birthDate,
        birthTime: birthTimeUnknown ? null : body.birthTime,
        birthTimeUnknown,
        birthPlaceName: city.name,
        birthLat: city.lat,
        birthLng: city.lng,
        natalChartJson: JSON.stringify(chart),
        astroModeEnabled: true,
      },
    });
  }

  const profile = generateAstrologyProfile(chart);
  let dailyTransit: DailyTransitReport | null = null;
  try {
    dailyTransit = calculateDailyTransits(chart);
  } catch (err) {
    console.warn('Daily transit calculation warning:', err);
  }

  return NextResponse.json({
    chart,
    profile,
    dailyTransit,
    savedToUser: !!user,
  });
}

/**
 * GET: Mevcut kullanıcının kayıtlı doğum haritasını döner.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Giriş yapın' }, { status: 401 });
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      displayName: true,
      natalChartJson: true,
      birthDate: true,
      birthTime: true,
      birthTimeUnknown: true,
      birthPlaceName: true,
      birthLat: true,
      birthLng: true,
      astroModeEnabled: true,
    },
  });

  if (!dbUser?.natalChartJson) {
    return NextResponse.json({ hasChart: false, displayName: dbUser?.displayName || null });
  }

  try {
    const chart = JSON.parse(dbUser.natalChartJson);
    const profile = generateAstrologyProfile(chart);
    let dailyTransit: DailyTransitReport | null = null;
    try {
      dailyTransit = calculateDailyTransits(chart);
    } catch {}
    const birthDateStr = dbUser.birthDate
      ? new Date(dbUser.birthDate.getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10)
      : null;
    return NextResponse.json({
      hasChart: true,
      displayName: dbUser.displayName || null,
      chart,
      profile,
      dailyTransit,
      birthMeta: {
        birthDate: dbUser.birthDate,
        birthDateStr,
        birthTime: dbUser.birthTime,
        birthTimeUnknown: dbUser.birthTimeUnknown,
        birthPlaceName: dbUser.birthPlaceName,
        astroModeEnabled: dbUser.astroModeEnabled,
      },
    });
  } catch {
    return NextResponse.json({ hasChart: false });
  }
}
