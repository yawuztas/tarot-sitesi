/**
 * Iyzico Ödeme Yardımcıları
 *
 * Iyzico v2 Checkout Form entegrasyonu:
 * 1. Backend: paymentIntent oluştur → iyzico checkout sayfasına yönlendirme URL'si al
 * 2. Kullanıcı ödeme sayfasında kart bilgilerini girer (iyzico'nun secure form'unda)
 * 3. Ödeme başarılı olunca callback URL'e dönülür
 * 4. Webhook ile ödeme durumu doğrulanır
 *
 * Sandbox: https://sandbox-api.iyzipay.com
 * Production: https://api.iyzipay.com
 *
 * Auth: API key + secret key ile HMAC imzası (Authorization: IYZ WS v1)
 *
 * Test kartları (sandbox):
 * - 5528790000000008 (Mastercard)
 * - 4054170000000001 (Visa)
 * - CVV: 123, SKT: herhangi gelecek ay
 */

import crypto from 'crypto';

const API_KEY = process.env.IYZICO_API_KEY || '';
const SECRET_KEY = process.env.IYZICO_SECRET_KEY || '';
const BASE_URL = process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com';

export interface CreatePaymentParams {
  anonymousSessionId: string;
  price: number;          // kuruş (7500 = 75.00 TL)
  description: string;
  buyerEmail: string;
  buyerName: string;
  buyerSurname: string;
  callbackUrl: string;
}

export interface CreatePaymentResult {
  paymentId: string;
  checkoutFormContent: string;  // iyzico'nun HTML form içeriği
  token: string;
  checkoutUrl: string;          // iyzico'nun yönlendirme URL'si
}

/**
 * Iyzico v2 checkout form için ödeme oturumu oluştur
 *
 * Bu fonksiyon Iyzico'ya istek atar ve bir checkout token alır.
 * Frontend bu token ile iyzico'nun secure form'unu render eder.
 */
export async function createIyzicoPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
  const randomString = Math.random().toString(36).substring(2, 12);
  const timestamp = Math.floor(Date.now() / 1000);

  // Iyzico auth header (HMAC-SHA256)
  const authString = API_KEY + randomString + params.buyerEmail + timestamp;
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(authString).digest('hex');

  const body = {
    locale: 'tr',
    conversationId: params.anonymousSessionId,
    price: Math.floor(params.price / 100),  // TL'ye çevir (1.50 → 1.5)
    paidPrice: Math.floor(params.price / 100),
    currency: 'TRY',
    basketId: params.anonymousSessionId,
    paymentGroup: 'PRODUCT',
    callbackUrl: params.callbackUrl,
    enabledInstallments: [1],  // taksit yok
    buyer: {
      id: params.anonymousSessionId,
      name: params.buyerName,
      surname: params.buyerSurname,
      email: params.buyerEmail,
      identityNumber: '00000000000',  // KVKK: gerçek T.C. istemiyoruz, sandbox kabul ediyor
      address: 'Mystic Tarot',          // zorunlu alan
      city: 'Istanbul',
      country: 'Turkey',
      ip: '0.0.0.0',
    },
    shippingAddress: {
      contactName: `${params.buyerName} ${params.buyerSurname}`,
      city: 'Istanbul',
      country: 'Turkey',
      address: 'Mystic Tarot',
    },
    billingAddress: {
      contactName: `${params.buyerName} ${params.buyerSurname}`,
      city: 'Istanbul',
      country: 'Turkey',
      address: 'Mystic Tarot',
    },
    basketItems: [
      {
        id: 'tarot-fal-10-soru',
        name: 'Mistik Tarot - 10 Soru Fal Hakkı',
        category1: 'Fal',
        category2: 'Tarot',
        itemType: 'VIRTUAL',
        price: Math.floor(params.price / 100),
      },
    ],
  };

  const url = `${BASE_URL}/payment/iyzipos/checkoutform/initialize/auth/ecom`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `IYZWS ${API_KEY}:${signature}`,
    'x-iyzi-rnd': randomString,
    'x-iyzi-timestamp': String(timestamp),
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    console.error('Iyzico create error:', resp.status, errorText);
    throw new Error(`Iyzico API hatası: ${resp.status}`);
  }

  const data = await resp.json();
  if (data.status !== 'success') {
    console.error('Iyzico create failed:', data);
    throw new Error(data.errorMessage || 'Iyzico ödeme oturumu oluşturulamadı');
  }

  return {
    paymentId: data.paymentId || '',
    checkoutFormContent: data.checkoutFormContent || '',
    token: data.token || '',
    checkoutUrl: `${BASE_URL}/payment/iyzipos/checkoutform/${data.token}`,
  };
}

/**
 * Iyzico callback doğrulama — ödeme tamamlandıktan sonra iyzico callback URL'e POST atar
 *
 * Bu fonksiyon callback'ten gelen token'ı doğrular ve ödeme durumunu alır.
 */
export async function verifyIyzicoPayment(token: string): Promise<{
  status: 'success' | 'failure';
  paymentId?: string;
  paidPrice?: number;
  error?: string;
}> {
  const randomString = Math.random().toString(36).substring(2, 12);
  const timestamp = Math.floor(Date.now() / 1000);
  const authString = API_KEY + randomString + timestamp;
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(authString).digest('hex');

  const url = `${BASE_URL}/payment/iyzipos/checkoutform/auth/ecom/detail`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `IYZWS ${API_KEY}:${signature}`,
    'x-iyzi-rnd': randomString,
    'x-iyzi-timestamp': String(timestamp),
  };

  const body = {
    locale: 'tr',
    conversationId: token,
    token,
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    return { status: 'failure', error: `API hatası: ${resp.status}` };
  }

  const data = await resp.json();
  if (data.status === 'success' && data.paymentStatus === 'SUCCESS') {
    return {
      status: 'success',
      paymentId: data.paymentId,
      paidPrice: data.paidPrice,
    };
  }

  return {
    status: 'failure',
    error: data.errorMessage || 'Ödeme doğrulanamadı',
  };
}

/**
 * Iyzico test modunda mı?
 */
export function isSandboxMode(): boolean {
  return BASE_URL.includes('sandbox') || API_KEY.startsWith('sandbox-');
}

/**
 * Test kartları (sandbox için)
 */
export const TEST_CARDS = {
  VISA_SUCCESS: '4054170000000001',
  MASTERCARD_SUCCESS: '5528790000000008',
  VISA_FAIL: '4111111111111129',
  MASTERCARD_FAIL: '5528790000000016',
};
