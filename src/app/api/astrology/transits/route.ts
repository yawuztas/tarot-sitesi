/**
 * Günlük Transit Endpoint
 *
 * GET /api/astrology/transits
 *
 * Query params:
 *   sessionId: string (opsiyonel - anonim session)
 *
 * Yanıt:
 *   { transits: DailyTransitReport } | { error: string }
 *
 * Kullanıcının doğum haritasındaki gezegenlere karşı
 * bugünkü transit açıları hesaplar ve yorumlar.
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateDailyTransits } from '@/lib/astrology/transits';
import { getCurrentSession } from '@/lib/session/anonymous-session';
import { applyRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'astrology-transits', { limit: 30, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  try {
    // Session'dan doğum bilgilerini al
    const session = await getCurrentSession();
    
    if (!session?.natalChartJson) {
      return NextResponse.json(
        { error: 'Doğum haritası bulunamadı. Önce fal başlatın.' },
        { status: 400 }
      );
    }
    
    // Parse stored birth chart
    let birthChart;
    try {
      birthChart = JSON.parse(session.natalChartJson);
    } catch {
      return NextResponse.json(
        { error: 'Doğum haritası verisi bozuk' },
        { status: 500 }
      );
    }
    
    // Calculate daily transits
    const transitReport = calculateDailyTransits(birthChart);
    
    return NextResponse.json({
      transits: transitReport,
    });
  } catch (error) {
    console.error('Transit calculation error:', error);
    return NextResponse.json(
      { error: 'Transit hesaplanamadı.' },
      { status: 500 }
    );
  }
}
