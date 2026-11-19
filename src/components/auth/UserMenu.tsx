'use client';

/**
 * Kullanıcı Menüsü
 *
 * Header'da gösterilir:
 * - Misafir: "Giriş" ve "Kayıt Ol" butonları
 * - Kayıtlı: Avatar + dropdown (Fal Geçmişim, Fal Masası, Çıkış)
 */

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, BookOpen, ChevronDown, Sparkles } from 'lucide-react';

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (status === 'loading') {
    return <div className="w-20 h-8" />;
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/giris"
          className="text-xs text-zinc-400 hover:text-amber-300 transition px-2 py-1"
        >
          Giriş
        </Link>
        <Link
          href="/kayit"
          className="text-xs bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 px-3 py-1.5 rounded-md transition"
        >
          Kayıt Ol
        </Link>
      </div>
    );
  }

  const initial = (session.user.name || session.user.email || '?')[0].toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-zinc-300 hover:text-amber-300 transition py-1 px-2 rounded-md hover:bg-zinc-800/50"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-violet-600 flex items-center justify-center text-xs font-semibold text-white">
          {initial}
        </div>
        <ChevronDown className={`w-3 h-3 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1 z-50"
          >
            <div className="px-3 py-2 border-b border-zinc-800">
              <div className="text-sm font-medium text-zinc-100 truncate">
                {session.user.name}
              </div>
              <div className="text-xs text-zinc-500 truncate">
                {session.user.email}
              </div>
            </div>

            <Link
              href="/fallarim"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50 hover:text-amber-300 transition"
            >
              <BookOpen className="w-4 h-4" />
              Fal Geçmişim
            </Link>

            <Link
              href="/fal"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50 hover:text-amber-300 transition"
            >
              <Sparkles className="w-4 h-4" />
              Fal Masası
            </Link>

            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:bg-red-500/10 hover:text-red-300 transition border-t border-zinc-800"
            >
              <LogOut className="w-4 h-4" />
              Çıkış Yap
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
