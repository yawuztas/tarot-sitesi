'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      router.push('/giris');
    }, 2500);
    return () => clearTimeout(timer);
  }, [success, router]);

  const isMissingParams = !token.trim() || !email.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Yeni şifreniz en az 6 karakter olmalıdır.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Girdiğiniz şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          token: token.trim(),
          newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Şifre güncellenemedi.');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-zinc-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 mb-4">
            <Sparkles className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-3xl font-serif font-light tracking-wide text-amber-100">
            Yeni Şifre Belirle
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Hesabınız için güçlü ve yeni bir şifre oluşturun
          </p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 shadow-2xl">
          {isMissingParams ? (
            <div className="space-y-4 text-center py-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 mx-auto">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-medium text-zinc-100">Geçersiz Bağlantı</h2>
                <p className="text-sm text-zinc-400">
                  Şifre sıfırlama bağlantısı eksik veya hatalı görünüyor. Lütfen yeni bir sıfırlama bağlantısı isteyin.
                </p>
              </div>
              <Link
                href="/sifremi-unuttum"
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition text-sm"
              >
                Yeni Bağlantı İste <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 text-center py-2"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 mx-auto">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-medium text-amber-100">Şifreniz Güncellendi</h2>
                <p className="text-sm text-zinc-300">
                  Yeni şifreniz kaydedildi. Giriş sayfasına yönlendiriliyorsunuz...
                </p>
              </div>
              <Link
                href="/giris"
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition text-sm"
              >
                Hemen Giriş Yap <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ) : (
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="rounded-lg bg-zinc-950/80 border border-zinc-800 px-3.5 py-2.5 text-xs text-zinc-400">
                Hesap: <span className="text-amber-200 font-medium">{email}</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                  Yeni Şifre
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    maxLength={100}
                    autoFocus
                    autoComplete="new-password"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-10 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="En az 6 karakter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                  Yeni Şifre (Tekrar)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    maxLength={100}
                    autoComplete="new-password"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="Şifreyi tekrar girin"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-black font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Şifremi Güncelle <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
