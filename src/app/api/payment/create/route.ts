/**
 * Ödeme Oturumu Oluşturma Endpoint
 *
 * POST /api/payment/create
 *
 * Body:
 *   buyerName: string
 *   buyerSurname: string
 *   buyerEmail: string
 *   consentSaveData: boolean (verilerimi sakla)
 *   consentMarketing: boolean (astrolojik günlerde mail)
 *
 * 1. Anonim session kontrolü
 * 2. Iyzico checkout form oluştur
 * 3. PaymentSession kaydı DB'ye
 * 4. Session'a consent kaydet
 * 5. Checkout token + form içeriği dön
 *
 * Frontend: checkoutFormContent'i render eder, kullanıcı kart bilgilerini girer,
 * ödeme başarılı olunca iyzico callback URL'e POST atar → /api/payment/webhook tetiklenir
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentSession, updateSession } from '@/lib/session/anonymous-session';
import { createIyzicoPayment, isSandboxMode } from '@/lib/payment/iyzico';
import { applyRateLimit } from '@/lib/security/rate-limit';
import { assertSameOrigin, clampText, isValidEmail } from '@/lib/security/validation';

const API_KEY = process.env.IYZICO_API_KEY || '';
const SECRET_KEY = process.env.IYZICO_SECRET_KEY || '';
const ALLOW_MOCK_PAYMENT =
  process.env.NODE_ENV !== 'production' && process.env.ALLOW_MOCK_PAYMENT === 'true';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PRICE = parseInt(process.env.TAROT_READING_PRICE_TRY || '7500', 10);
const QUOTA = parseInt(process.env.TAROT_READING_QUESTION_QUOTA || '10', 10);
const CALLBACK_URL = process.env.IYZICO_CALLBACK_URL || 'http://localhost:3000/api/payment/webhook';

interface CreatePaymentBody {
  buyerName: string;
  buyerSurname: string;
  buyerEmail: string;
  consentSaveData: boolean;
  consentMarketing: boolean;
}

export async function POST(req: NextRequest) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;

  const rateLimited = applyRateLimit(req, 'payment-create', { limit: 10, windowMs: 10 * 60_000 });
  if (rateLimited) return rateLimited;

  let body: CreatePaymentBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 });
  }

  // Validasyon
  const buyerEmail = (body.buyerEmail || '').trim().toLowerCase();
  const buyerName = clampText(body.buyerName, 60);
  const buyerSurname = clampText(body.buyerSurname, 60);

  if (!isValidEmail(buyerEmail)) {
    return NextResponse.json({ error: 'Geçerli bir email adresi gir' }, { status: 400 });
  }
  if (!buyerName || !buyerSurname) {
    return NextResponse.json({ error: 'Ad ve soyad gerekli' }, { status: 400 });
  }

  // Session kontrolü
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'Fal oturumu bulunamadı. Lütfen baştan başla.' }, { status: 404 });
  }

  if (!session.teaserText) {
    return NextResponse.json({ error: 'Önce falını başlatmalısın' }, { status: 400 });
  }

  const keysMissing =
    !API_KEY || !SECRET_KEY || API_KEY.startsWith('sandbox-XXX') || SECRET_KEY.startsWith('sandbox-XXX');

  if (keysMissing) {
    if (!ALLOW_MOCK_PAYMENT) {
      return NextResponse.json(
        { error: 'Ödeme altyapısı şu anda yapılandırılmamış.' },
        { status: 503 }
      );
    }

    const mockPaymentId = 'mock-' + Date.now();
    await db.paymentSession.create({
      data: {
        anonymousSessionId: session.id,
        amount: PRICE,
        currency: 'TRY',
        status: 'paid',
        provider: 'iyzico',
        providerPaymentId: mockPaymentId,
        providerToken: 'mock-token',
        description: 'Mistik Tarot - 10 Soru Fal Hakkı (DEV TEST)',
        paidAt: new Date(),
      },
    });

    await updateSession(session.id, {
      paidAt: new Date(),
      questionQuota: QUOTA,
      questionsUsed: 0,
      consentSaveData: Boolean(body.consentSaveData),
      consentMarketing: Boolean(body.consentMarketing),
    });

    return NextResponse.json({
      testMode: true,
      mockPayment: true,
      message: 'Geliştirme test modunda ödeme simüle edildi. 10 soru hakkın açık.',
      skipPayment: true,
    });
  }

  // Gerçek Iyzico ödeme oturumu oluştur — hata durumunda ASLA ücretsiz onay verme
  let paymentResult;
  try {
    paymentResult = await createIyzicoPayment({
      anonymousSessionId: session.id,
      price: PRICE,
      description: 'Mistik Tarot - 10 Soru Fal Hakkı',
      buyerEmail,
      buyerName,
      buyerSurname,
      callbackUrl: CALLBACK_URL,
    });
  } catch (err) {
    console.error('Iyzico payment creation failed:', err);
    return NextResponse.json(
      { error: 'Ödeme oturumu başlatılamadı. Lütfen birazdan tekrar deneyin.' },
      { status: 502 }
    );
  }

  // PaymentSession DB'ye kaydet
  await db.paymentSession.create({
    data: {
      anonymousSessionId: session.id,
      amount: PRICE,
      currency: 'TRY',
      status: 'pending',
      provider: 'iyzico',
      providerPaymentId: paymentResult.paymentId,
      providerToken: paymentResult.token,
      description: 'Mistik Tarot - 10 Soru Fal Hakkı',
    },
  });

  // Session'a consent'ları kaydet (ödeme sonrası soru hakkı webhook'ta açılacak)
  await updateSession(session.id, {
    consentSaveData: body.consentSaveData,
    consentMarketing: body.consentMarketing,
  });

  return NextResponse.json({
    paymentId: paymentResult.paymentId,
    token: paymentResult.token,
    checkoutFormContent: paymentResult.checkoutFormContent,
    checkoutUrl: paymentResult.checkoutUrl,
    sandbox: isSandboxMode(),
    amount: PRICE,
    description: 'Mistik Tarot - 10 Soru Fal Hakkı',
  });
}
