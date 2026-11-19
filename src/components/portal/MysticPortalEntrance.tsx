'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Volume2, VolumeX, ArrowRight, Wand2 } from 'lucide-react';
import MysticSmokeCanvas from './MysticSmokeCanvas';
import LivingSageRig from './LivingSageRig';
import LottieRuneSeal from './LottieRuneSeal';

interface MysticPortalEntranceProps {
  onEnter: () => void;
}

const SAGE_DIALOGUES = [
  'Kaderinin mühürlü kapısına hoş geldin, arayış içindeki ruh... Kapıya dokun ve mistik dünyanın sırlarına adım at.',
  'Yolunu aydınlatacak kadim hakikatler kapının ardında bekliyor. Çekinme, kaderine dokun.',
  'Evren tesadüflere inanmaz. Yıldızlar tam şu an senin için hizalandı; kapıyı arala.',
  'Burada sorular cevaplarını, kayıp ruhlar kendi ışıklarını bulur. Eşiği geç.',
];

export default function MysticPortalEntrance({ onEnter }: MysticPortalEntranceProps) {
  const [isHoveringDoor, setIsHoveringDoor] = useState(false);
  const [isHoveringSage, setIsHoveringSage] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dialogueIndex, setDialogueIndex] = useState(0);

  // 3D Animasyon Hareket Fazı: 'idle' -> 'pointing' -> 'summoning'
  const [motionPhase, setMotionPhase] = useState<'idle' | 'pointing'>('idle');
  const [staffGlowing, setStaffGlowing] = useState(false);

  // Mouse Parallax Takibi
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Web Audio Context & Ambient State
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);
  const ambientOscsRef = useRef<OscillatorNode[]>([]);
  const hasStartedAudio = useRef<boolean>(false);

  // Web Audio API Context
  const getAudioContext = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  };

  // Mistik 432 Hz Sürekli Ambiyans Müziği (Tibet Çanağı & Ethereal Drone)
  const startAmbientTone = () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      if (ambientOscsRef.current.length > 0) return;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 2.5);
      masterGain.connect(ctx.destination);
      ambientGainRef.current = masterGain;

      // 432 Hz kutsal geometri frekansları (108 Hz bas drone, 216 Hz, 432 Hz, 648 Hz)
      const freqs = [108, 216, 432, 648];
      const oscs: OscillatorNode[] = [];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        const detuneAmp = (idx + 1) * 3;
        osc.detune.setValueAtTime(detuneAmp, ctx.currentTime);

        const level = idx === 0 ? 0.07 : 0.035 / (idx + 1);
        gain.gain.setValueAtTime(level, ctx.currentTime);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start();
        oscs.push(osc);
      });

      ambientOscsRef.current = oscs;
    } catch {}
  };

  const stopAmbientTone = () => {
    try {
      if (ambientGainRef.current && audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        const now = audioCtxRef.current.currentTime;
        ambientGainRef.current.gain.linearRampToValueAtTime(0.0001, now + 0.8);
        setTimeout(() => {
          ambientOscsRef.current.forEach((o) => {
            try { o.stop(); o.disconnect(); } catch {}
          });
          ambientOscsRef.current = [];
          ambientGainRef.current = null;
        }, 900);
      } else {
        ambientOscsRef.current.forEach((o) => {
          try { o.stop(); o.disconnect(); } catch {}
        });
        ambientOscsRef.current = [];
        ambientGainRef.current = null;
      }
    } catch {}
  };

  const tryStartAudio = () => {
    if (!hasStartedAudio.current && soundEnabled) {
      hasStartedAudio.current = true;
      startAmbientTone();
    }
  };

  // Periyodik Kapıyı Gösterme Hareketi & İlk Etkileşimde Sesi Başlatma & Sayfa Kaydırma Kilidi
  useEffect(() => {
    // Portal açıkken sayfa kaydırma çubuğunu (scrollbar) tamamen kaldır
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const gestureInterval = setInterval(() => {
      setMotionPhase('pointing');
      setStaffGlowing(true);

      setTimeout(() => {
        setMotionPhase('idle');
        setStaffGlowing(false);
      }, 3200);
    }, 6500);

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };

    const handleUserInteraction = () => {
      tryStartAudio();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('pointerdown', handleUserInteraction, { once: true });
    window.addEventListener('keydown', handleUserInteraction, { once: true });

    return () => {
      document.body.style.overflow = originalOverflow;
      clearInterval(gestureInterval);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('pointerdown', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      stopAmbientTone();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [soundEnabled]);

  const toggleSound = () => {
    if (soundEnabled) {
      setSoundEnabled(false);
      stopAmbientTone();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } else {
      setSoundEnabled(true);
      hasStartedAudio.current = true;
      startAmbientTone();
      playStaffChime();
    }
  };

  const playStaffChime = () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      [864, 1080, 1296, 1728].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.16 / (idx + 1), now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 2.9);
      });
    } catch {}
  };

  const playDoorHoverChime = () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      [528, 660, 792].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.001, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.03, now + idx * 0.06 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 1.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 1.2);
      });
    } catch {}
  };

  const speakWisdom = (text: string) => {
    if (!soundEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'tr-TR';
      utterance.pitch = 0.78;
      utterance.rate = 0.90;

      const voices = window.speechSynthesis.getVoices();
      const trVoice = voices.find((v) => v.lang.startsWith('tr'));
      if (trVoice) utterance.voice = trVoice;

      window.speechSynthesis.speak(utterance);
    } catch {}
  };

  const handleSageClick = () => {
    tryStartAudio();
    setMotionPhase('pointing');
    setStaffGlowing(true);
    playStaffChime();

    setTimeout(() => {
      setMotionPhase('idle');
      setStaffGlowing(false);
    }, 3500);

    const nextIdx = (dialogueIndex + 1) % SAGE_DIALOGUES.length;
    setDialogueIndex(nextIdx);
    speakWisdom(SAGE_DIALOGUES[nextIdx]);
  };

  const playPortalSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(96, now);
      subOsc.frequency.exponentialRampToValueAtTime(160, now + 3);

      subGain.gain.setValueAtTime(0.01, now);
      subGain.gain.linearRampToValueAtTime(0.4, now + 0.8);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 4.5);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 4.6);

      [432, 528, 648, 864].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + 0.15);

        gain.gain.setValueAtTime(0.01, now + 0.15);
        gain.gain.linearRampToValueAtTime(0.22 / (idx + 1), now + 0.8);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + 0.15);
        osc.stop(now + 5.6);
      });
    } catch {}
  };

  const handleDoorClick = () => {
    if (isOpening) return;
    tryStartAudio();
    setIsOpening(true);
    setMotionPhase('pointing');
    playPortalSound();

    setTimeout(() => {
      onEnter();
    }, 2800);
  };

  const isPointing = motionPhase === 'pointing' || isHoveringDoor;

  return (
    <div
      onClick={tryStartAudio}
      onPointerDown={tryStartAudio}
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#040008] transition-all duration-[2400ms] ${
        isOpening ? 'scale-125 opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* 1. Mistik Kozmik Arka Plan: Bilgenin Arkasındaki Siyahtan Mor Rengimize Yumuşak Geçiş */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Ana Zemin: Derin Kozmik Mor-Gece */}
        <div className="absolute inset-0 bg-[#040008]" />

        {/* Ortadan Sağa Doğru Parlayan Zengin Mor & İndigo Kozmik Nebula */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_65%_45%,_var(--tw-gradient-stops))] from-purple-900/40 via-[#120426] to-[#040008]" />
        <div className="absolute top-1/2 right-[10%] -translate-y-1/2 w-[850px] h-[850px] bg-gradient-to-tr from-purple-600/25 via-indigo-600/18 to-amber-500/10 rounded-full blur-[170px]" />

        {/* BİLGENİN ÇEVRESİNDEKİ YUMUŞAK RENK GEÇİŞİ:
            Videonun siyahlığı ile birebir örtüşen derin siyah (#000000), 
            çevresine doğru yayılarak mor rengimize pürüzsüzce erir. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 650px 780px at 20% 70%, #000000 0%, #000000 35%, rgba(8,2,18,0.85) 60%, rgba(20,5,40,0.4) 80%, transparent 100%)',
          }}
        />
      </div>

      {/* 2. Gerçek Zamanlı Duman & Yıldız Tozu Kanvası */}
      <MysticSmokeCanvas isDispersing={isOpening} />

      {/* 3. Sağ Üst Kontroller: Ses & Eşiği Atla */}
      <div className="absolute top-6 right-6 z-40 flex items-center gap-3">
        <button
          onClick={toggleSound}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-900/80 border border-purple-500/30 text-xs text-purple-200 hover:text-white hover:border-purple-400 transition shadow-lg backdrop-blur-md"
          title={soundEnabled ? 'Sesi Kapat' : 'Mistik Ambiyans Sesini Aç'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-500" />}
          <span className="hidden sm:inline">{soundEnabled ? 'Mistik Ses Açık' : 'Sessiz'}</span>
        </button>

        <button
          onClick={onEnter}
          className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-zinc-900/80 border border-amber-500/30 text-xs text-amber-200 hover:text-white hover:border-amber-400 transition shadow-lg backdrop-blur-md"
        >
          <span>Eşiği Atla</span>
          <ArrowRight className="w-3 h-3 text-amber-400" />
        </button>
      </div>

      {/* 4. Ana Sahne: Canlı Hareket Eden Bilge Avatarı + Kadim Kapı */}
      <div className="relative z-20 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col md:flex-row items-end justify-center md:justify-between pb-2 md:pb-1">
        
        {/* ======================================================== */}
        {/* SOL: HAREKETLİ & ETKİLEŞİMLİ BİLGE AVATARI (THE SAGE)     */}
        {/* ======================================================== */}
        <div
          className={`relative z-30 flex flex-col items-center md:items-start shrink-0 opacity-100 ${
            isOpening
              ? 'opacity-0 scale-105 blur-2xl brightness-150 transition-all duration-1000'
              : ''
          }`}
        >
          {/* Bilge Konuşma Balonu (İnteraktif & Tıklanabilir) */}
          <div
            onClick={handleSageClick}
            className="cursor-pointer max-w-xs md:max-w-md mb-2 md:mb-3 p-3.5 sm:p-4 rounded-2xl bg-zinc-950/85 border border-purple-500/40 shadow-[0_0_35px_rgba(168,85,247,0.25)] backdrop-blur-md text-left transition-all duration-500 hover:border-purple-400/60 hover:scale-[1.02] opacity-100 scale-100"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-300 animate-spin" style={{ animationDuration: '6s' }} />
                <span className="text-xs font-semibold tracking-widest uppercase text-purple-300 font-serif">
                  Kadim Bilge
                </span>
              </div>
              <span className="text-[10px] text-purple-300/70 italic flex items-center gap-1">
                <Wand2 className="w-3 h-3 text-purple-300" />
                (Dokun ve Dinle)
              </span>
            </div>
            <p className="text-sm md:text-base font-serif leading-relaxed text-zinc-100">
              &ldquo;{SAGE_DIALOGUES[dialogueIndex]}&rdquo;
            </p>
          </div>

          {/* Canlı 2.5D Rig & Organik Animasyonlu Bilge Avatarı */}
          <LivingSageRig
            isPointing={isPointing}
            isHovering={isHoveringSage}
            staffGlowing={staffGlowing}
            mousePos={mousePos}
            onClick={handleSageClick}
            onHoverStart={() => setIsHoveringSage(true)}
            onHoverEnd={() => setIsHoveringSage(false)}
          />
        </div>

        {/* ======================================================== */}
        {/* SAĞ: KADİM MÜHÜRLÜ KAPI (TAM ALANI DOLDURAN GERÇEK KAPI)  */}
        {/* ======================================================== */}
        <div className="relative z-20 flex flex-col items-center md:items-end self-end shrink-0 mb-6 sm:mb-10 md:mb-14 lg:mb-16">
          {/* Kapı Konteyneri (3D Perspektif) */}
          <div
            onClick={handleDoorClick}
            onMouseEnter={() => {
              setIsHoveringDoor(true);
              playDoorHoverChime();
            }}
            onMouseLeave={() => setIsHoveringDoor(false)}
            style={{
              perspective: '1400px',
              transform: `perspective(1200px) rotateY(${mousePos.x * -4}deg) rotateX(${mousePos.y * 3}deg)`,
              transition: 'transform 0.3s ease-out',
            }}
            className={`relative cursor-pointer group select-none transition-transform duration-500 ${
              isHoveringDoor && !isOpening ? 'scale-[1.02]' : 'scale-100'
            }`}
          >
            {/* Kapı Arka Işık Huzmesi */}
            <div
              className={`absolute inset-0 -z-10 rounded-t-full transition-all duration-1000 ${
                isOpening
                  ? 'bg-gradient-to-b from-purple-600 via-indigo-600 to-purple-950 blur-[90px] opacity-100 scale-125'
                  : 'bg-purple-950/25 blur-[60px] opacity-50'
              }`}
            />

            {/* Kapı Alanı: Yerden Yukarı Kaldırılmış Zarif Portal */}
            <div className="relative h-[46vh] sm:h-[54vh] md:h-[62vh] lg:h-[68vh] aspect-[436/655] max-w-[90vw] md:max-w-[44vw] rounded-t-full overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
              
              {/* Açılma Anında Arkada Görünen Mistik Galaksi & Yıldız Işığı */}
              <div className="absolute inset-0 rounded-t-full bg-gradient-to-b from-[#1c0836] via-[#100220] to-[#04010a] flex items-center justify-center overflow-hidden">
                <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-400 via-purple-600 to-indigo-950 opacity-90 animate-pulse" />
                <div className="absolute text-center">
                  <Sparkles className="w-12 h-12 text-purple-200 animate-spin mx-auto mb-2" style={{ animationDuration: '4s' }} />
                  <p className="text-xs sm:text-sm uppercase tracking-widest text-purple-200 font-serif">Kader Aralanıyor...</p>
                </div>
              </div>

              {/* 3D Açılan Gerçek Kapı Kanadı (Arka Plan Yok, %100 Kapı) */}
              <div
                style={{
                  transformOrigin: 'left center',
                  transformStyle: 'preserve-3d',
                  transform: isOpening ? 'rotateY(-85deg)' : isHoveringDoor ? 'rotateY(-12deg)' : 'rotateY(0deg)',
                  transition: isOpening
                    ? 'transform 2.2s cubic-bezier(0.16, 1, 0.3, 1)'
                    : 'transform 0.4s ease-out',
                }}
                className="relative w-full h-full rounded-t-full overflow-hidden shadow-[12px_0_35px_rgba(0,0,0,0.85)] z-20"
              >
                <Image
                  src="/assets/mystic_door_leaf.png"
                  alt="Kadim Mistik Kapı"
                  fill
                  sizes="(max-width: 768px) 90vw, 550px"
                  className="object-cover object-center filter brightness-105 contrast-105"
                  priority
                />

                {/* Lottie Kadim Rün Mührü (Kapının Merkezinde Dönen Canlı Vektör Mühür) */}
                <div className="absolute inset-0 flex items-center justify-center z-25 pointer-events-none">
                  <LottieRuneSeal isHovered={isHoveringDoor || isPointing} isOpening={isOpening} />
                </div>
              </div>

              {/* Kapı Eşiği Duman Efekti */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#040008] via-[#040008]/80 to-transparent z-30 pointer-events-none" />
            </div>
          </div>
        </div>

      </div>

      {/* Alt Bilgi İpucu (Zarif ve Minimal) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-center pointer-events-none z-30 opacity-60">
        <p className="text-[11px] tracking-widest uppercase text-zinc-400 font-serif">
          Kadim Kehanet Eşiği • Astroloji & 78 Kart Rider-Waite
        </p>
      </div>
    </div>
  );
}
