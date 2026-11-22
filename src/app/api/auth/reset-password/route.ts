/**
 * POST /api/auth/reset-password
 * { email, token, newPassword } → { ok, message }
 *
 * Tek kullanımlık sıfırlama token'ını doğrular, süresini kontrol eder,
 * yeni şifreyi bcrypt (cost 12) ile hashleyip Account(provider='credentials') kaydını günceller
 * ve kullanılan token'ı veritabanından siler.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { applyRateLimit, checkKeyRateLimit } from '@/lib/security/rate-limit';
import { assertSameOrigin, clampText, isValidEmail } from '@/lib/security/validation';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;

  const rateLimited = applyRateLimit(req, 'auth-reset-ip', {
    limit: 10,
    windowMs: 15 * 60_000,
  });
  if (rateLimited) return rateLimited;

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 });
    }

    if (!isValidEmail(body.email)) {
      return NextResponse.json({ error: 'Geçerli bir e-posta adresi girin.' }, { status: 400 });
    }

    const email = body.email.trim().toLowerCase();
    const rawToken = clampText(body.token, 200).trim();
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!rawToken || !/^[a-f0-9]{64}$/i.test(rawToken)) {
      return NextResponse.json(
        { error: 'Sıfırlama bağlantısı geçersiz. Lütfen yeni bir bağlantı isteyin.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Yeni şifre en az 6 karakter olmalı.' },
        { status: 400 }
      );
    }

    if (newPassword.length > 100) {
      return NextResponse.json(
        { error: 'Yeni şifre en fazla 100 karakter olabilir.' },
        { status: 400 }
      );
    }

    const emailAllowed = checkKeyRateLimit('auth-reset-email', email, 8, 15 * 60_000);
    if (!emailAllowed) {
      return NextResponse.json(
        { error: 'Bu hesap için çok fazla deneme yapıldı. Lütfen 15 dakika sonra tekrar deneyin.' },
        { status: 429 }
      );
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const identifier = `pwd-reset:${email}`;

    const verificationToken = await db.verificationToken.findUnique({
      where: { token: tokenHash },
    });

    if (!verificationToken || verificationToken.identifier !== identifier) {
      return NextResponse.json(
        { error: 'Sıfırlama bağlantısı geçersiz veya daha önce kullanılmış.' },
        { status: 400 }
      );
    }

    if (verificationToken.expires.getTime() < Date.now()) {
      await db.verificationToken.deleteMany({
        where: { identifier },
      });
      return NextResponse.json(
        { error: 'Sıfırlama bağlantısının süresi dolmuş. Lütfen yeni bir bağlantı isteyin.' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı hesabı bulunamadı.' },
        { status: 404 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db.$transaction(async (tx) => {
      const existingCredentials = await tx.account.findFirst({
        where: {
          userId: user.id,
          provider: 'credentials',
        },
        select: { id: true },
      });

      if (existingCredentials) {
        await tx.account.update({
          where: { id: existingCredentials.id },
          data: { providerAccountId: passwordHash },
        });
      } else {
        await tx.account.create({
          data: {
            userId: user.id,
            type: 'credentials',
            provider: 'credentials',
            providerAccountId: passwordHash,
          },
        });
      }

      // Kullanılan token ve eski sıfırlama tokenlarını temizle
      await tx.verificationToken.deleteMany({
        where: { identifier },
      });
    });

    return NextResponse.json({
      ok: true,
      message: 'Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.',
    });
  } catch (err) {
    console.error('[reset-password] error:', err);
    return NextResponse.json(
      { error: 'Şifre güncellenirken bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
