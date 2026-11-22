'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Mail,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devPreviewUrl, setDevPreviewUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'İstek gönderilemedi.');
        return;
      }

      setSuccessMessage(
        data.message ||
          'Eğer bu e-posta adresi sistemimizde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.'
      );
      setDevPreviewUrl(typeof data.devPreviewUrl === 'string' ? data.devPreviewUrl : null);
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
            Şifremi Unuttum
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Kayıtlı e-posta adresinize tek kullanımlık sıfırlama bağlantısı gönderelim
          </p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 shadow-2xl">
          {successMessage ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 text-center py-2"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 mx-auto">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>

              <div className="space-y-2">
                <h2 className="text-lg font-medium text-amber-100">Bağlantı Hazırlandı</h2>
                <p className="text-sm text-zinc-300 leading-relaxed">{successMessage}</p>
                <p className="text-xs text-zinc-500">
                  Bağlantı 30 dakika geçerlidir. Gelen kutunuzda göremezseniz gereksiz (spam) klasörünü kontrol edin.
                </p>
              </div>

              {devPreviewUrl && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-left space-y-2">
                  <p className="text-xs font-medium text-amber-200">
                    Geliştirme Modu Önizlemesi (SMTP/Resend tanımlı değil):
                  </p>
                  <Link
                    href={devPreviewUrl}
                    className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 underline break-all"
                  >
                    Şifre Sıfırlama Bağlantısını Aç <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </Link>
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMessage(null);
                    setDevPreviewUrl(null);
                  }}
                  className="w-full py-2.5 rounded-lg border border-zinc-700 hover:border-zinc-600 text-xs text-zinc-300 hover:text-white transition"
                >
                  Farklı bir e-posta dene
                </button>
                <Link
                  href="/giris"
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition text-sm"
                >
                  Giriş Sayfasına Dön <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                  E-posta Adresi
                </label>
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
                    Sıfırlama Bağlantısı Gönder <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.form>
          )}
        </div>

        <p className="text-center text-xs text-zinc-500 mt-6">
          <Link href="/giris" className="inline-flex items-center gap-1.5 text-amber-400 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" /> Giriş ekranına geri dön
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
