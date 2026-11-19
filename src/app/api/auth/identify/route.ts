/**
 * Kimlik Doğrulama Endpoint (Mistik Ritüel)
 *
 * POST /api/auth/identify
 *
 * Body:
 *   email: string
 *
 * 1. Email'i kontrol eder
 * 2. Kayıtlı kullanıcı varsa, onun için kişisel bir soru üretir
 *    ("Hangi gün doğmuştun?", "Hangi ay doğmuştun?", "Adının ilk harfi ne?")
 * 3. Doğru cevap beklenen değeri döner (YANLIŞ DEĞİL, sadece soru)
 *
 * POST /api/auth/identify/verify
 *
 * Body:
 *   challengeId: string
 *   answer: string
 *
 * 1. Cevabı kontrol eder
 * 2. Doğruysa: kullanıcının adını + son fal özetini döner (önizleme için)
 *    Giriş için kullanıcının NextAuth ile devam etmesi gerekir (şifre girmesi gerekir)
 *    YA DA: doğrulanmış challenge'ı kullanarak otomatik giriş yapılabilir
 *
 * Mistik ton: "Kadim kapıyı açmak için bir kelime bilmen gerek..."
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { applyRateLimit } from '@/lib/security/rate-limit';
import { assertSameOrigin, isValidEmail } from '@/lib/security/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface IdentifyRequestBody {
  email: string;
}

export async function POST(req: NextRequest) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;

  const rateLimited = applyRateLimit(req, 'auth-identify', {
    limit: 10,
    windowMs: 15 * 60_000,
  });
  if (rateLimited) return rateLimited;

  let body: IdentifyRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 });
  }

  const email = (body.email || '').toLowerCase().trim();
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Geçerli bir email adresi gir' }, { status: 400 });
  }

  // Kayıtlı kullanıcı var mı?
  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      displayName: true,
      birthDate: true,
      birthTimeUnknown: true,
      natalChartJson: true,
    },
  });

  if (!user) {
    // Kullanıcı yoksa: mistik bir şekilde "perde arkasında kimse yok" de
    // Ama müstakbel kullanıcıya fal baktırma yolunu açık tut
    return NextResponse.json({
      exists: false,
      message: 'Bu email perdenin arkasında bir yoldaş bulamadı. İlk falını çekmek ister misin?',
      redirect: '/fal',
    });
  }

  // Kişisel soru üret
  const challenge = generateChallenge(user);

  // Challenge'ı DB'ye kaydet (10 dakika geçerli)
  const challengeRecord = await db.userIdentityChallenge.create({
    data: {
      userId: user.id,
      email: user.email,
      questionType: challenge.type,
      questionText: challenge.question,
      expectedAnswer: challenge.expected,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 dk
    },
  });

  return NextResponse.json({
    exists: true,
    challengeId: challengeRecord.id,
    question: challenge.question,
    hint: challenge.hint,
  });
}

/**
 * Kullanıcı için kişisel doğrulama sorusu üret
 */
function generateChallenge(user: any): {
  type: string;
  question: string;
  expected: string;
  hint: string;
} {
  // Doğum tarihi varsa: en güvenli
  if (user.birthDate) {
    const d = new Date(user.birthDate);
    const day = d.getDate();
    const month = d.toLocaleDateString('tr-TR', { month: 'long' });

    const variants = [
      {
        type: 'birth_day',
        question: 'Hangi gün doğmuştun? (örn: 15)',
        expected: String(day),
        hint: 'Sadece gün sayısı',
      },
      {
        type: 'birth_month',
        question: 'Hangi ayda doğmuştun? (örn: Mayıs)',
        expected: month.toLowerCase(),
        hint: 'Ay adı küçük harfle',
      },
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  }

  // Doğum tarihi yoksa: display name ilk harfi
  if (user.displayName) {
    return {
      type: 'name_first_letter',
      question: 'Adının ilk harfi ne? (örn: A)',
      expected: user.displayName[0].toLowerCase(),
      hint: 'Tek harf, küçük/büyük fark etmez',
    };
  }

  // Hiç bilgi yoksa: email'in @ öncesi ilk 3 harfi
  const emailPrefix = user.email.split('@')[0].slice(0, 3).toLowerCase();
  return {
    type: 'email_prefix',
    question: 'Email adresinin ilk 3 harfi ne?',
    expected: emailPrefix,
    hint: 'İlk 3 harf, küçük harfle',
  };
}
