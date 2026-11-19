'use client';

/**
 * Giriş Sayfası — Mistik Kimlik Doğrulama
 *
 * 3 Adım:
 * 1. Email gir
 * 2. "Hangi gün doğmuştun?" gibi kişisel soru (sistem üretir)
 * 3. Şifre gir → NextAuth credentials ile giriş
 *
 * Eğer email kayıtlı değilse → kayıt daveti
 */

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Mail, KeyRound, Loader2, AlertCircle, Check, Lock, ShieldCheck } from 'lucide-react';
import { sanitizeCallbackUrl } from '@/lib/security/validation';

type Step = 'email' | 'challenge' | 'password' | 'success';

function GirisForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallbackUrl(searchParams.get('callbackUrl'), '/fal');

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [challengeQuestion, setChallengeQuestion] = useState('');
  const [challengeHint, setChallengeHint] = useState('');
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [welcomePreview, setWelcomePreview] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Email gönder → challenge al
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const resp = await fetch('/api/auth/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setError(data.error || 'Bir hata oluştu');
        return;
      }

      if (!data.exists) {
        setError(data.message || 'Bu email kayıtlı değil');
        // Kayıt olmaya yönlendir
        setTimeout(() => router.push('/kayit'), 2000);
        return;
      }

      setChallengeId(data.challengeId);
      setChallengeQuestion(data.question);
      setChallengeHint(data.hint);
      setStep('challenge');
    } catch (err) {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  }

  // 2. Challenge cevapla
  async function handleChallengeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const resp = await fetch('/api/auth/identify/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, answer: challengeAnswer }),
      });

      const data = await resp.json();

      if (!resp.ok || !data.verified) {
        setError(data.error || 'Yanlış cevap');
        if (data.remainingAttempts !== undefined) {
          setError(`${data.error || 'Yanlış cevap'} · ${data.remainingAttempts} deneme hakkın kaldı`);
        }
        return;
      }

      // Doğrulandı
      setDisplayName(data.displayName || '');
      setWelcomePreview(data.welcomePreview || '');
      setStep('password');
    } catch (err) {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  }

  // 3. Şifre ile giriş
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Şifre hatalı');
        return;
      }

      setStep('success');
      setTimeout(() => {
        router.push(callbackUrl);
        router.refresh();
      }, 1500);
    } catch (err) {
      setError('Giriş yapılamadı');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-zinc-100 flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-amber-400 mb-3">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm tracking-widest uppercase">Mystic Tarot</span>
          </Link>
          <h1 className="text-2xl font-serif text-zinc-100">Kadim Kapıyı Aç</h1>
          <p className="text-xs text-zinc-400 mt-1">Üç kademeli kimlik doğrulama</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[
            { key: 'email', icon: Mail, label: 'Email' },
            { key: 'challenge', icon: ShieldCheck, label: 'Tanıdık' },
            { key: 'password', icon: KeyRound, label: 'Şifre' },
          ].map((s, i) => {
            const stepOrder = ['email', 'challenge', 'password', 'success'];
            const currentIndex = stepOrder.indexOf(step);
            const myIndex = stepOrder.indexOf(s.key);
            const isActive = myIndex === currentIndex;
            const isDone = myIndex < currentIndex;

            return (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold transition ${
                    isDone
                      ? 'bg-amber-500 text-black'
                      : isActive
                      ? 'bg-amber-500/30 border border-amber-500 text-amber-200'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {isDone ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className={`text-[10px] uppercase tracking-wider ${isActive ? 'text-amber-200' : 'text-zinc-500'}`}>
                  {s.label}
                </span>
                {i < 2 && <div className={`w-3 h-px ${isDone ? 'bg-amber-500' : 'bg-zinc-700'}`} />}
              </div>
            );
          })}
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 shadow-2xl">
          <AnimatePresence mode="wait">
            {/* Step 1: Email */}
            {step === 'email' && (
              <motion.form
                key="email"
                onSubmit={handleEmailSubmit}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      autoComplete="email"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      placeholder="ornek@email.com"
                    />
                  </div>
                </div>

                {error && <ErrorMessage message={error} />}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-black font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Devam Et <ArrowRight className="w-4 h-4" /></>}
                </button>
              </motion.form>
            )}

            {/* Step 2: Challenge */}
            {step === 'challenge' && (
              <motion.form
                key="challenge"
                onSubmit={handleChallengeSubmit}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-3 text-xs text-violet-200/80 flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>Seni tanıdığımıza emin olmam gerek. Bu soruya yanıt ver:</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-amber-100 mb-2">{challengeQuestion}</label>
                  <input
                    type="text"
                    value={challengeAnswer}
                    onChange={(e) => setChallengeAnswer(e.target.value)}
                    required
                    autoFocus
                    autoComplete="off"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                    placeholder={challengeHint || 'Cevabın'}
                  />
                </div>

                {error && <ErrorMessage message={error} />}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Doğrula <ArrowRight className="w-4 h-4" /></>}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="w-full text-xs text-zinc-500 hover:text-zinc-300"
                >
                  ← Geri
                </button>
              </motion.form>
            )}

            {/* Step 3: Password */}
            {step === 'password' && (
              <motion.form
                key="password"
                onSubmit={handlePasswordSubmit}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Hoş geldin mesajı */}
                {welcomePreview && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-xs text-emerald-200/80 leading-relaxed italic font-serif">
                    {welcomePreview}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Şifre</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoFocus
                      autoComplete="current-password"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && <ErrorMessage message={error} />}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-black font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Perdeyi Arala <ArrowRight className="w-4 h-4" /></>}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('challenge')}
                  className="w-full text-xs text-zinc-500 hover:text-zinc-300"
                >
                  ← Geri
                </button>
              </motion.form>
            )}

            {/* Success */}
            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-4"
                >
                  <Check className="w-8 h-8 text-black" strokeWidth={3} />
                </motion.div>
                <h2 className="font-serif text-xl text-amber-100 mb-1">Hoş geldin, {displayName}!</h2>
                <p className="text-xs text-zinc-400">Fal masasına yönlendiriliyorsun...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="text-center mt-6">
          <Link href="/kayit" className="text-xs text-zinc-500 hover:text-zinc-400">
            Hesabın yok mu? Kayıt ol
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-lg px-3 py-2 flex items-center gap-2">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      {message}
    </div>
  );
}

export default function GirisPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <GirisForm />
    </Suspense>
  );
}
