/**
 * Kimlik Doğrulama Cevabı Endpoint
 *
 * POST /api/auth/identify/verify
 *
 * Body:
 *   challengeId: string
 *   answer: string
 *
 * 1. Cevabı kontrol eder (case-insensitive, trim)
 * 2. Doğruysa: kullanıcının adını + son falının kısa özetini döner
 *    → Frontend bu bilgiyi "Hoş geldin Ahmet!" karşılama ekranı için kullanır
 *    → Sonra kullanıcı şifresini girer (NextAuth credentials ile)
 *
 * 3. Yanlışsa: attempts'i artır, 3 deneme hakkı var
 *
 * Mistik ton: doğrulama başarılıysa "Kadim kapı açıldı, yoldaş Ahmet..."
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { applyRateLimit } from '@/lib/security/rate-limit';
import { assertSameOrigin, clampText } from '@/lib/security/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface VerifyRequestBody {
  challengeId: string;
  answer: string;
}

export async function POST(req: NextRequest) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;

  const rateLimited = applyRateLimit(req, 'auth-identify-verify', {
    limit: 12,
    windowMs: 15 * 60_000,
  });
  if (rateLimited) return rateLimited;

  let body: VerifyRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 });
  }

  const challengeId = clampText(body.challengeId, 64);
  const answer = clampText(body.answer, 100);
  if (!challengeId || !answer) {
    return NextResponse.json({ error: 'Soru ID ve cevap gerekli' }, { status: 400 });
  }

  const challenge = await db.userIdentityChallenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge) {
    return NextResponse.json({ error: 'Doğrulama sorusu bulunamadı' }, { status: 404 });
  }

  if (challenge.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Süre doldu. Yeni soru iste.' }, { status: 410 });
  }

  if (challenge.verified) {
    return NextResponse.json({ error: 'Bu soru zaten doğrulandı' }, { status: 409 });
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    return NextResponse.json({ error: 'Çok fazla yanlış deneme. Yeni soru iste.' }, { status: 429 });
  }

  // Cevabı kontrol et (case-insensitive, trim)
  const userAnswer = answer.toLocaleLowerCase('tr-TR');
  const expectedAnswer = challenge.expectedAnswer.trim().toLocaleLowerCase('tr-TR');

  if (userAnswer !== expectedAnswer) {
    // Yanlış — attempts artır
    await db.userIdentityChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });

    const remaining = challenge.maxAttempts - challenge.attempts - 1;
    return NextResponse.json({
      verified: false,
      error: 'Yanlış cevap',
      remainingAttempts: Math.max(0, remaining),
    }, { status: 401 });
  }

  // Doğru — verified = true
  await db.userIdentityChallenge.update({
    where: { id: challenge.id },
    data: { verified: true },
  });

  // Şifre doğrulanmadan hassas kullanıcı verisi (fal kartları/email/userId) sızdırma
  const user = await db.user.findUnique({
    where: { id: challenge.userId },
    select: {
      id: true,
      displayName: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
  }

  const welcomePreview = 'Kadim kapının ilk mührü açıldı. Şimdi şifreni girerek oturumunu doğrula.';

  return NextResponse.json({
    verified: true,
    displayName: user.displayName || undefined,
    welcomePreview,
    // Şimdi şifre sor
    nextStep: 'password',
  });
}
