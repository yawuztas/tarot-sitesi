/**
 * Auth Server Helpers
 *
 * Server component'lerinde ve API route'larında oturum açmış kullanıcıyı bulmak için.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from './auth-options';
import { db } from '@/lib/db';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  hasBirthChart: boolean;
  creditsBalance: number;
}

/**
 * Server-side: mevcut oturumdan kullanıcıyı döner.
 * Oturum açılmamışsa null döner.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      displayName: true,
      natalChartJson: true,
      creditsBalance: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    hasBirthChart: !!user.natalChartJson,
    creditsBalance: user.creditsBalance ?? 0,
  };
}

/**
 * Server-side: kullanıcı doğrulama zorunluysa.
 * Oturum yoksa hata fırlatır (API route'larında kullanım için).
 */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}
