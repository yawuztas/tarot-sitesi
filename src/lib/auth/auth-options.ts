/**
 * NextAuth Configuration
 *
 * Credentials provider (email + password) kullanır.
 * Tarot uygulamasında kullanıcılar email ve şifre ile kayıt olur.
 *
 * Session strategy: "jwt" — Sunucusuz ortamlar için daha uygun
 * (Session modeli veritabanında tutulur ama jwt tercih edilir çünkü
 * her istekte DB lookup'a gerek kalmaz).
 *
 * Auth gerekli değil: fal deneyimi misafir kullanıcılara da açık.
 * Ancak fal geçmişi + doğum haritası kaydetmek için giriş yapmalı.
 */

import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { checkKeyRateLimit } from '@/lib/security/rate-limit';

/**
 * Dev ortamı için çalışma anında üretilen geçici secret.
 * Repoya gömülü sabit bir secret KULLANILMAZ; production'da
 * NEXTAUTH_SECRET env değişkeni zorunludur (aşağıda kontrol edilir).
 */
function generateEphemeralDevSecret(): string {
  let secret = '';
  while (secret.length < 48) {
    secret += Math.random().toString(36).slice(2);
  }
  return secret.slice(0, 48);
}

function resolveNextAuthSecret(): string {
  const envSecret = process.env.NEXTAUTH_SECRET;
  if (envSecret && envSecret.length >= 32) {
    return envSecret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXTAUTH_SECRET production ortamında en az 32 karakter olarak tanımlanmalıdır.');
  }
  return generateEphemeralDevSecret();
}

export const authOptions: NextAuthOptions = {
  // Database opsiyonel: jwt strategy kullanıyoruz, DB session gerekmez
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 gün
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
  providers: [
    CredentialsProvider({
      name: 'email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Şifre', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();
        if (email.length > 254 || credentials.password.length > 100) {
          return null;
        }

        // Brute-force koruması: aynı email için 15 dakikada en fazla 10 deneme
        if (!checkKeyRateLimit('auth-login-email', email, 10, 15 * 60_000)) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user) return null;

        // Şifre hash'i account tablosunda tutuluyor (provider = 'credentials')
        const account = await db.account.findFirst({
          where: {
            userId: user.id,
            provider: 'credentials',
          },
        });

        if (!account?.providerAccountId) return null;

        // providerAccountId alanında şifre hash'i saklıyoruz (format çakışmasından kaçınmak için)
        // Alternatif: Account'a password_hash alanı ekle, ama mevcut şemayı değiştirmemek için bu yöntemi kullandık
        const isValid = await bcrypt.compare(credentials.password, account.providerAccountId);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.displayName || user.name || user.email.split('@')[0],
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email ?? '';
        token.name = user.name ?? '';
      }
      // Kullanıcı adını DB'den güncelle (profil değişikliklerinde)
      if (token.id && !token.name) {
        const dbUser = await db.user.findUnique({ where: { id: token.id as string } });
        if (dbUser) {
          token.name = dbUser.displayName || dbUser.name || dbUser.email.split('@')[0];
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/giris',
    newUser: '/kayit',
    error: '/giris',
  },
  secret: resolveNextAuthSecret(),
};

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string;
  }
}
