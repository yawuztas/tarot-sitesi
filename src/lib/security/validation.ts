import { NextRequest, NextResponse } from 'next/server';

const SLUG_REGEX = /^[a-z0-9-]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Metni temizler (null byte ve kontrol karakterlerini atar) ve maksimum uzunlukla sınırlar.
 */
export function clampText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen);
}

export function isValidSlug(value: unknown, maxLen = 64): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLen && SLUG_REGEX.test(value);
}

export function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && EMAIL_REGEX.test(value.trim());
}

/**
 * Production ortamında cross-origin state-changing istekleri (CSRF) engeller.
 * Origin header'ı yoksa (ör. sunucu-içi veya curl/API testi) izin verir;
 * Origin varsa Host veya NEXTAUTH_URL ile eşleşmek zorundadır.
 */
export function assertSameOrigin(req: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV !== 'production') return null;
  const origin = req.headers.get('origin');
  if (!origin) return null;

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  let allowedHosts: string[] = [];
  if (host) allowedHosts.push(host.toLowerCase());
  if (process.env.NEXTAUTH_URL) {
    try {
      allowedHosts.push(new URL(process.env.NEXTAUTH_URL).host.toLowerCase());
    } catch {}
  }

  try {
    const originHost = new URL(origin).host.toLowerCase();
    if (allowedHosts.length > 0 && !allowedHosts.includes(originHost)) {
      return NextResponse.json({ error: 'Geçersiz istek kaynağı' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Geçersiz Origin başlığı' }, { status: 403 });
  }

  return null;
}

/**
 * Open Redirect saldırılarını önlemek için callbackUrl'i yalnızca göreli yollarla sınırlar.
 */
export function sanitizeCallbackUrl(raw: string | null | undefined, fallback = '/fal'): string {
  if (!raw || typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return fallback;
  }
  return trimmed;
}
