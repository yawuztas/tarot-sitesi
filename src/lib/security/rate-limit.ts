import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  timestamps: number[];
}

const stores = new Map<string, Map<string, RateLimitEntry>>();
let lastPrunedAt = 0;

function pruneExpired(now: number, maxWindowMs: number) {
  if (now - lastPrunedAt < 60_000) return;
  lastPrunedAt = now;
  const cutoff = now - maxWindowMs;
  for (const bucketMap of stores.values()) {
    for (const [key, entry] of bucketMap.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) {
        bucketMap.delete(key);
      }
    }
  }
}

export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return 'unknown-client';
}

export interface RateLimitOptions {
  /** Maksimum istek sayısı */
  limit: number;
  /** Zaman penceresi (milisaniye) */
  windowMs: number;
  /** İsteğe bağlı ek anahtar (ör. email veya userId) */
  identifier?: string;
}

/**
 * Kayan pencere (sliding window) hız sınırlayıcı.
 * Limit aşılırsa 429 NextResponse döner, aksi halde null döner.
 */
export function applyRateLimit(
  req: NextRequest,
  bucket: string,
  options: RateLimitOptions
): NextResponse | null {
  const now = Date.now();
  pruneExpired(now, Math.max(options.windowMs, 3_600_000));

  let bucketMap = stores.get(bucket);
  if (!bucketMap) {
    bucketMap = new Map<string, RateLimitEntry>();
    stores.set(bucket, bucketMap);
  }

  const clientKey = options.identifier
    ? `${getClientIp(req)}:${options.identifier}`
    : getClientIp(req);

  const entry = bucketMap.get(clientKey) || { timestamps: [] };
  const windowStart = now - options.windowMs;
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= options.limit) {
    const oldest = entry.timestamps[0] || now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + options.windowMs - now) / 1000));
    return NextResponse.json(
      {
        error: 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyip tekrar deneyin.',
        retryAfterSeconds: retryAfterSec,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(options.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  entry.timestamps.push(now);
  bucketMap.set(clientKey, entry);
  return null;
}

/**
 * Auth brute-force koruması için saf anahtar bazlı hız sınırlayıcı (NextAuth authorize vb.).
 */
export function checkKeyRateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  pruneExpired(now, Math.max(windowMs, 3_600_000));

  let bucketMap = stores.get(bucket);
  if (!bucketMap) {
    bucketMap = new Map<string, RateLimitEntry>();
    stores.set(bucket, bucketMap);
  }

  const entry = bucketMap.get(key) || { timestamps: [] };
  const windowStart = now - windowMs;
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= limit) {
    bucketMap.set(key, entry);
    return false;
  }

  entry.timestamps.push(now);
  bucketMap.set(key, entry);
  return true;
}
