/**
 * Anonim Session Yardımcıları
 *
 * Misafir kullanıcı tarayıcı cookie'si ile tanımlanır.
 * Cookie'deki ID, AnonymousSession.cookieId ile eşleşir.
 *
 * Cookie adı: mystic_session
 * Ömür: 24 saat (AnonymousSession.expiresAt ile senkron)
 */

import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';

const COOKIE_NAME = 'mystic_session';
const SESSION_TTL_HOURS = 24;

/**
 * Cookie'den anonim session ID'sini okur. Yoksa yeni oluşturur.
 * Server-side kullanım için (next/headers).
 */
export async function getOrCreateSessionCookie(): Promise<string> {
  const cookieStore = await cookies();
  let cookieId = cookieStore.get(COOKIE_NAME)?.value;

  if (!cookieId) {
    cookieId = randomBytes(32).toString('hex');
    cookieStore.set(COOKIE_NAME, cookieId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_TTL_HOURS * 3600,
      path: '/',
    });
  }

  return cookieId;
}

/**
 * Sadece cookie ID'sini oku (yeni oluşturma). Header'lardan da gelebilir.
 */
export async function readSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

/**
 * AnonymousSession kaydını getir veya oluştur.
 */
export async function getOrCreateSession(): Promise<{ session: any; cookieId: string; isNew: boolean }> {
  const cookieId = await getOrCreateSessionCookie();

  let session = await db.anonymousSession.findUnique({
    where: { cookieId },
    include: { relations: { orderBy: { createdAt: 'asc' } } },
  });

  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000);
  const isNew = !session;

  if (!session) {
    session = await db.anonymousSession.create({
      data: {
        cookieId,
        expiresAt,
        questionQuota: 10,
      },
      include: { relations: true },
    });
  } else if (session.expiresAt < new Date()) {
    // Süresi dolmuş — yenile
    session = await db.anonymousSession.update({
      where: { id: session.id },
      data: { expiresAt, questionQuota: 10 },
      include: { relations: true },
    });
  }

  return { session, cookieId, isNew };
}

/**
 * Sadece mevcut session'ı getir (yeni oluşturma).
 */
export async function getCurrentSession() {
  const cookieId = await readSessionCookie();
  if (!cookieId) return null;

  const session = await db.anonymousSession.findUnique({
    where: { cookieId },
    include: { relations: { orderBy: { createdAt: 'asc' } } },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) return null;

  return session;
}

/**
 * Session'ı güncelle.
 */
export async function updateSession(sessionId: string, data: any) {
  return db.anonymousSession.update({
    where: { id: sessionId },
    data,
  });
}

/**
 * Session'a mesaj ekle.
 */
export async function addChatMessage(sessionId: string, role: string, content: string, questionNumber?: number) {
  return db.chatMessage.create({
    data: {
      sessionId,
      role,
      content,
      questionNumber,
    },
  });
}

/**
 * Session'ın önceki mesajlarını getir (sohbet geçmişi).
 */
export async function getSessionMessages(sessionId: string) {
  return db.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Kalan soru sayısı.
 */
export function getRemainingQuestions(session: any): number {
  return Math.max(0, (session.questionQuota || 0) - (session.questionsUsed || 0));
}

/**
 * Ödenmiş mi?
 */
export function isSessionPaid(session: any): boolean {
  return !!session.paidAt && session.questionQuota > 0;
}
