'use client';

import React, { useState, useSyncExternalStore } from 'react';
import { Sparkles, DoorOpen } from 'lucide-react';
import UserMenu from '@/components/auth/UserMenu';
import MysticPortalEntrance from '@/components/portal/MysticPortalEntrance';
import AstrologyChamber, { type AstroData } from '@/components/portal/AstrologyChamber';
import ReadingSetupChamber from '@/components/portal/ReadingSetupChamber';

export type FlowStage = 'portal' | 'oracle-chamber' | 'reading-setup';

const emptySubscribe = () => () => {};

export default function HomePage() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [stage, setStage] = useState<FlowStage>('portal');
  const [astroData, setAstroData] = useState<AstroData | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = sessionStorage.getItem('mystic_astro_data');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 1. Kapı Açıldığında: 2. Aşamaya (Falcı Kadın & Yıldız Falı Odası) Geç
  const handlePortalEnter = () => {
    setStage('oracle-chamber');
  };

  // 2. Tarot Deste Kartlarına Dokunulduğunda: 3. Aşamaya (Fal Masası & Niyet Odası) Geç
  const handleProceedToReadingSetup = (data: AstroData) => {
    setAstroData(data);
    setStage('reading-setup');
  };

  // 3. Aşamadan Geri Dönmek İsterse: 2. Aşamaya Geri Al
  const handleBackToAstrology = () => {
    setStage('oracle-chamber');
  };

  if (!mounted) {
    return <div className="min-h-screen bg-[#040008]" />;
  }

  return (
    <main className="min-h-screen bg-[#06020c] text-zinc-100 relative overflow-hidden">
      
      {/* 1. AŞAMA: SİNEMATİK AKSAKALLI BİLGE & 3D KADİM KAPI GİRİŞİ */}
      {stage === 'portal' && (
        <MysticPortalEntrance onEnter={handlePortalEnter} />
      )}

      {/* 2. AŞAMA: FALCI KADIN, YILDIZ FALI BİLGİ GİRİŞİ, FALCI KÜRESİ & TAROT DESTESİ */}
      {stage === 'oracle-chamber' && (
        <div className="animate-in fade-in duration-700">
          {/* Üst Zarif Header */}
          <header className="relative z-20 border-b border-purple-500/15 bg-[#06020c]/80 backdrop-blur-md">
            <div className="container mx-auto px-4 py-3 max-w-7xl flex items-center justify-between">
              <div className="inline-flex items-center gap-2.5">
                <div className="relative">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <div className="absolute inset-0 bg-amber-400/40 blur-md rounded-full" />
                </div>
                <span className="text-sm sm:text-base tracking-[0.25em] uppercase font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-purple-300 to-amber-300">
                  Mystic Tarot · Yıldızlar Tapınağı
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStage('portal')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-serif tracking-wider text-purple-200 border border-purple-500/30 hover:border-purple-400 bg-purple-500/10 hover:bg-purple-500/20 transition-all shadow-sm"
                  title="Kadim Kapı Girişine Tekrar Dön"
                >
                  <DoorOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Kapı Ritüeli</span>
                </button>
                <UserMenu />
              </div>
            </div>
          </header>

          <AstrologyChamber
            initialData={astroData}
            onProceedToReadingSetup={handleProceedToReadingSetup}
          />
        </div>
      )}

      {/* 3. AŞAMA: BÜYÜK EKRAN FAL MASASI, NİYET GİRİŞİ, 3 SEÇENEK & ASTROLOJİ UYARI ALANI */}
      {stage === 'reading-setup' && (
        <div className="animate-in fade-in duration-700">
          <ReadingSetupChamber
            astroData={astroData}
            onBackToAstrology={handleBackToAstrology}
          />
        </div>
      )}

    </main>
  );
}
