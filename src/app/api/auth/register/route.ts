/**
 * Kayıt Endpoint
 *
 * POST /api/auth/register
 * { email, password, displayName? } → { ok, user } | { error }
 *
 * Email+şifre alır, User + Account (credentials provider) oluşturur.
 * Kayıt bonusu olarak User.creditsBalance = 1 ücretsiz fal kredisi verilir.
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { applyRateLimit } from '@/lib/security/rate-limit';
import { assertSameOrigin, clampText, isValidEmail } from '@/lib/security/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;

  const rateLimited = applyRateLimit(req, 'auth-register', {
    limit: 6,
    windowMs: 15 * 60_000,
  });
  if (rateLimited) return rateLimited;

  let body: { email?: string; password?: string; displayName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 });
  }

  const email = (body.email || '').toLowerCase().trim();
  const password = typeof body.password === 'string' ? body.password : '';
  const displayName = clampText(body.displayName, 50);

  // Validasyon
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Geçerli bir email adresi girin' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Şifre en az 6 karakter olmalı' }, { status: 400 });
  }

  if (password.length > 100) {
    return NextResponse.json({ error: 'Şifre çok uzun' }, { status: 400 });
  }

  // Email kullanımda mı?
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Bu email zaten kayıtlı' }, { status: 409 });
  }

  // Şifre hash
  const passwordHash = await bcrypt.hash(password, 12);

  // Transaction: User + Account beraber oluştur
  const user = await db.user.create({
    data: {
      email,
      displayName: displayName || email.split('@')[0],
      // Kayıt bonusu: 1 ücretsiz fal kredisi (schema default 1 zaten)
      creditsBalance: 1,
      accounts: {
        create: {
          type: 'credentials',
          provider: 'credentials',
          providerAccountId: passwordHash,
        },
      },
      userSettings: {
        create: {},
      },
    },
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
  });
}
