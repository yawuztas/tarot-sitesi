/**
 * POST /api/auth/forgot-password
 * { email } → { ok, message, devPreviewUrl? }
 *
 * Kullanıcının e-postasına 30 dakika geçerli tek kullanımlık şifre sıfırlama bağlantısı gönderir.
 * Kullanıcı varlığını sızdırmamak (anti-enumeration) için kayıtlı olmayan e-postalarda da
 * aynı 200 OK yanıtı döner. Token'ın yalnızca SHA-256 özeti Veritabanında saklanır.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { buildPasswordResetEmail, sendEmail } from '@/lib/email/mailer';
import { applyRateLimit, checkKeyRateLimit } from '@/lib/security/rate-limit';
import { assertSameOrigin, isValidEmail } from '@/lib/security/validation';

export const runtime = 'nodejs';

const TOKEN_TTL_MS = 30 * 60_000; // 30 dakika
const GENERIC_SUCCESS_MESSAGE =
  'Eğer bu e-posta adresi sistemimizde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.';

function resolveBaseUrl(req: NextRequest): string {
  const configured = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  return req.nextUrl.origin.replace(/\/+$/, '');
}

export async function POST(req: NextRequest) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;

  const rateLimited = applyRateLimit(req, 'auth-forgot-ip', {
    limit: 10,
    windowMs: 15 * 60_000,
  });
  if (rateLimited) return rateLimited;

  try {
    const body = await req.json().catch(() => null);
    if (!body || !isValidEmail(body.email)) {
      return NextResponse.json(
        { error: 'Geçerli bir e-posta adresi girin.' },
        { status: 400 }
      );
    }

    const email = body.email.trim().toLowerCase();

    // DB sorgusundan önce per-email hız sınırı (e-posta varlığı sızmaz)
    const emailAllowed = checkKeyRateLimit('auth-forgot-email', email, 3, 15 * 60_000);
    if (!emailAllowed) {
      return NextResponse.json(
        { error: 'Bu e-posta için çok fazla sıfırlama isteği gönderildi. Lütfen 15 dakika sonra tekrar deneyin.' },
        { status: 429 }
      );
    }

    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        displayName: true,
        name: true,
      },
    });

    if (!user || !user.email) {
      return NextResponse.json({
        ok: true,
        message: GENERIC_SUCCESS_MESSAGE,
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const identifier = `pwd-reset:${email}`;
    const expires = new Date(Date.now() + TOKEN_TTL_MS);

    await db.$transaction(async (tx) => {
      await tx.verificationToken.deleteMany({
        where: { identifier },
      });
      await tx.verificationToken.create({
        data: {
          identifier,
          token: tokenHash,
          expires,
        },
      });
    });

    const baseUrl = resolveBaseUrl(req);
    const resetUrl = `${baseUrl}/sifre-sifirla?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(email)}`;

    const emailContent = buildPasswordResetEmail({
      displayName: user.displayName || user.name,
      resetUrl,
    });

    const mailResult = await sendEmail({
      to: user.email,
      ...emailContent,
    });

    if (!mailResult.sent) {
      console.error('[forgot-password] Mail gönderilemedi:', mailResult.provider, mailResult.error);
    }

    const isDevPreview =
      process.env.NODE_ENV !== 'production' && mailResult.provider === 'dev-preview';

    return NextResponse.json({
      ok: true,
      message: GENERIC_SUCCESS_MESSAGE,
      ...(isDevPreview ? { devPreviewUrl: resetUrl } : {}),
    });
  } catch (err) {
    console.error('[forgot-password] error:', err);
    return NextResponse.json(
      { error: 'İstek işlenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.' },
      { status: 500 }
    );
  }
}
