/**
 * Iyzico Ödeme Webhook / Callback
 *
 * POST /api/payment/webhook
 *
 * Iyzico checkout tamamlandığında callback URL'e POST atar.
 * Token parametresini alır, ödemeyi doğrular, başarılıysa:
 * 1. PaymentSession.status = 'paid', paidAt = now
 * 2. AnonymousSession.paidAt = now, questionQuota = 10
 *
 * GET: Tarayıcıdan redirect ile geldiğinde (callbackUrl)
 *   iyzico bazen form submit sonrası GET redirect yapar
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyIyzicoPayment } from '@/lib/payment/iyzico';
import { applyRateLimit } from '@/lib/security/rate-limit';
import { clampText } from '@/lib/security/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const QUOTA = parseInt(process.env.TAROT_READING_QUESTION_QUOTA || '10', 10);

export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'payment-webhook', { limit: 30, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    try {
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
    } catch {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
    }
  }

  const token = clampText(body.token || body.checkoutFormToken, 256);
  if (!token) {
    return NextResponse.json({ error: 'Token bulunamadı' }, { status: 400 });
  }

  // Ödemeyi Iyzico ile doğrula — hata veya başarısızlık durumunda ASLA ödeme onaylama
  let verificationResult;
  try {
    verificationResult = await verifyIyzicoPayment(token);
  } catch (err) {
    console.error('Iyzico verify failed:', err);
    return NextResponse.json({ error: 'Ödeme doğrulanamadı' }, { status: 400 });
  }

  if (verificationResult.status !== 'success') {
    return NextResponse.json({ error: 'Ödeme doğrulanamadı' }, { status: 400 });
  }

  // PaymentSession'ı bul ve güncelle (yalnızca DB'deki token eşleşmesiyle)
  const paymentSession = await db.paymentSession.findFirst({
    where: { providerToken: token },
  });

  if (!paymentSession || !paymentSession.anonymousSessionId) {
    return NextResponse.json({ error: 'Ödeme oturumu bulunamadı' }, { status: 404 });
  }

  if (paymentSession.status !== 'paid') {
    await activateSession(
      paymentSession.anonymousSessionId,
      verificationResult.paymentId || token
    );
  }

  return NextResponse.json({ status: 'success', paid: true });
}

/**
 * GET — iyzico bazen callback URL'ye GET redirect yapar
 * Yalnızca verifyIyzicoPayment(token) başarılı olursa oturumu aktif et
 */
export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'payment-webhook-get', { limit: 30, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  const url = new URL(req.url);
  const token = clampText(url.searchParams.get('token') || url.searchParams.get('checkoutFormToken'), 256);

  let paidQuery = '0';
  if (token) {
    try {
      const result = await verifyIyzicoPayment(token);
      if (result.status === 'success') {
        const paymentSession = await db.paymentSession.findFirst({
          where: { providerToken: token },
        });
        if (paymentSession?.anonymousSessionId && paymentSession.status !== 'paid') {
          await activateSession(paymentSession.anonymousSessionId, result.paymentId || token);
        }
        if (paymentSession) {
          paidQuery = '1';
        }
      }
    } catch (err) {
      console.error('Iyzico GET verify failed:', err);
    }
  }

  return NextResponse.redirect(new URL(`/fal?paid=${paidQuery}`, req.url));
}

/**
 * Session'ı ödendi olarak işaretle + 10 soru hakkı aç
 */
async function activateSession(anonymousSessionId: string, paymentId: string) {
  // PaymentSession güncelle
  await db.paymentSession.updateMany({
    where: { anonymousSessionId },
    data: {
      status: 'paid',
      paidAt: new Date(),
      providerPaymentId: paymentId,
    },
  });

  // AnonymousSession güncelle
  await db.anonymousSession.update({
    where: { id: anonymousSessionId },
    data: {
      paidAt: new Date(),
      questionQuota: QUOTA,
      questionsUsed: 0,
    },
  });
}
