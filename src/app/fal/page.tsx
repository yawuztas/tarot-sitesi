'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowLeft } from 'lucide-react';
import AltarTable from '@/components/tarot/AltarTable';
import UserMenu from '@/components/auth/UserMenu';

export default function FalPage() {
  return (
    <main className="min-h-screen bg-[#090312] text-zinc-100 relative overflow-hidden">
      {/* Mistik Arka Plan Efektleri */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#140624] via-[#090312] to-[#05010a]" />
        <div className="absolute top-1/4 -left-32 w-[600px] h-[600px] bg-purple-700/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-20 border-b border-purple-500/15 bg-[#090312]/60 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3.5 max-w-6xl flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-amber-300 text-xs tracking-wider transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Ana Sayfa</span>
          </Link>

          <Link href="/" className="inline-flex items-center gap-2 text-amber-400 group">
            <Sparkles className="w-4 h-4 group-hover:animate-spin" />
            <span className="text-sm tracking-[0.2em] uppercase font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-purple-300 to-amber-300">
              Mystic Tarot
            </span>
          </Link>

          <UserMenu />
        </div>
      </header>

      {/* Ana Fal Masası */}
      <div className="relative z-10">
        <AltarTable />
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-purple-500/10 py-6 text-center text-xs text-zinc-500 font-serif">
        <div className="container mx-auto px-4">
          <p>© {new Date().getFullYear()} Mystic Tarot · Tüm kehanetler kişisel farkındalık ve eğlence amaçlıdır.</p>
        </div>
      </footer>
    </main>
  );
}
