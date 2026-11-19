'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Sparkles, Music, Loader2 } from 'lucide-react';

interface AudioOracleProps {
  textToSpeak: string;
  tellerName?: string;
}

export default function AudioOracle({
  textToSpeak,
}: AudioOracleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [voiceMode, setVoiceMode] = useState<'idle' | 'gemini' | 'browser'>('idle');
  const [ambientActive, setAmbientActive] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientNodesRef = useRef<any[]>([]);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
      if (ttsUrlRef.current) {
        URL.revokeObjectURL(ttsUrlRef.current);
        ttsUrlRef.current = null;
      }
      try {
        if (audioCtxRef.current) {
          audioCtxRef.current.close();
          audioCtxRef.current = null;
        }
      } catch {
        // ignore
      }
    };
  }, []);

  // Web Audio API ile derin, mistik 432 Hz Tibet çanağı & ethereal ambient drone
  const toggleAmbientMusic = () => {
    if (ambientActive) {
      stopAmbientTone();
    } else {
      startAmbientTone();
    }
  };

  const startAmbientTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      // 432 Hz mistik şifa frekansı ve derin armonikler (108 Hz, 216 Hz, 432 Hz, 648 Hz)
      const freqs = [108, 216, 432, 648];
      const nodes: any[] = [];

      // Reverb / Eko hissi için delay node
      const delay = ctx.createDelay();
      delay.delayTime.setValueAtTime(0.35, ctx.currentTime);
      const delayFeedback = ctx.createGain();
      delayFeedback.gain.setValueAtTime(0.4, ctx.currentTime);
      delay.connect(delayFeedback);
      delayFeedback.connect(delay);
      delay.connect(ctx.destination);

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        // Meditatif yumuşak seviye
        gain.gain.setValueAtTime(0.02 / (idx + 1), ctx.currentTime);

        // Derin nefes alışverişi gibi yavaş LFO
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(0.12 + idx * 0.05, ctx.currentTime);
        lfoGain.gain.setValueAtTime(0.008, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);

        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.connect(delay);

        osc.start();
        lfo.start();
        nodes.push(osc, lfo, gain, lfoGain);
      });

      ambientNodesRef.current = nodes;
      setAmbientActive(true);
    } catch (e) {
      console.warn('Ambient audio could not be initialized:', e);
    }
  };

  const stopAmbientTone = () => {
    try {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      ambientNodesRef.current = [];
      setAmbientActive(false);
    } catch (e) {
      // ignore
    }
  };
  const cleanTextForSpeech = (raw: string) => {
    return raw
      // Parantez içi teknik notları temizle (Örn: "(Not: Gerçek zamanlı Gemini AI ...)")
      .replace(/\(Not:.*?\)/gi, '')
      .replace(/\*\(.*?\)\*/gi, '')
      // Unicode Emojileri ve piktogramları temizle (Böylece ✨ "kıvılcımlar", 🔮 "kristal küre" olarak okunmaz)
      .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Symbol}]/gu, '')
      // Ekstra mistik sembolleri temizle
      .replace(/[✨🔮⭐🌟🌿✦✧★☆•●■◆▶◀▲▼]/g, '')
      // Markdown sembollerini temizle
      .replace(/[*_#`~[\]()]/g, ' ')
      // Üç noktaları yumuşak duraklamaya çevir
      .replace(/\.{2,}/g, '. ')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const stopVoicePlayback = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setVoiceMode('idle');
  };

  const speakWithBrowserFallback = (cleaned: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = 'tr-TR';
    utterance.rate = 0.84;
    utterance.pitch = 0.86;

    const voices = window.speechSynthesis.getVoices();
    const trVoices = voices.filter((v) => v.lang.startsWith('tr'));
    if (trVoices.length > 0) {
      const softVoice =
        trVoices.find((v) => v.name.includes('Yelda') || v.name.includes('Emel') || v.name.includes('Natural')) ||
        trVoices[0];
      utterance.voice = softVoice;
    }

    utterance.onstart = () => {
      setVoiceMode('browser');
      setIsPlaying(true);
    };
    utterance.onend = () => {
      setIsPlaying(false);
      setVoiceMode('idle');
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      setVoiceMode('idle');
    };

    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeech = async () => {
    if (isLoadingAudio) return;

    if (isPlaying) {
      stopVoicePlayback();
      return;
    }

    const cleaned = cleanTextForSpeech(textToSpeak);
    if (!cleaned) return;

    // Ambiyansı otomatik başlat
    if (!ambientActive) {
      startAmbientTone();
    }

    // Önce Gemini Doğal TTS dene, yoksa tarayıcı sesine düş
    setIsLoadingAudio(true);
    try {
      const resp = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleaned }),
      });

      const contentType = resp.headers.get('content-type') || '';
      if (resp.ok && contentType.startsWith('audio/')) {
        const blob = await resp.blob();
        if (ttsUrlRef.current) URL.revokeObjectURL(ttsUrlRef.current);
        const url = URL.createObjectURL(blob);
        ttsUrlRef.current = url;

        const audio = new Audio(url);
        ttsAudioRef.current = audio;
        audio.onended = () => {
          setIsPlaying(false);
          setVoiceMode('idle');
        };
        audio.onerror = () => {
          setIsPlaying(false);
          setVoiceMode('idle');
        };
        await audio.play();
        setVoiceMode('gemini');
        setIsPlaying(true);
        setIsLoadingAudio(false);
        return;
      }
    } catch {
      // Fall back to browser speechSynthesis
    }

    setIsLoadingAudio(false);
    speakWithBrowserFallback(cleaned);
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* 432 Hz Meditatif Tibet Ambiyansı */}
      <button
        onClick={toggleAmbientMusic}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium tracking-wide transition-all border ${
          ambientActive
            ? 'bg-purple-900/60 border-amber-400/60 text-amber-200 shadow-[0_0_20px_rgba(217,119,6,0.3)] animate-pulse'
            : 'bg-zinc-900/80 hover:bg-purple-950/40 border-purple-500/30 text-zinc-300 hover:text-amber-300'
        }`}
        title="432 Hz Mistik Tibet Ambiyansı"
      >
        <Music className="w-3.5 h-3.5 text-amber-400" />
        <span>{ambientActive ? 'Ambiyans Çalıyor' : 'Mistik Çan Müziği'}</span>
        {ambientActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
      </button>

      {/* Kahin Sesli Fısıltı */}
      <button
        onClick={toggleSpeech}
        disabled={isLoadingAudio}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium tracking-wide transition-all border disabled:opacity-60 ${
          isPlaying
            ? 'bg-gradient-to-r from-amber-500/20 via-purple-600/30 to-amber-500/20 border-amber-400/60 text-amber-200 shadow-[0_0_20px_rgba(217,119,6,0.3)] animate-pulse'
            : 'bg-zinc-900/80 hover:bg-purple-950/40 border-purple-500/30 text-zinc-300 hover:text-amber-300'
        }`}
        title={isPlaying ? "Fısıltıyı Durdur" : "Kahin'in Fısıltısını Dinle"}
      >
        {isLoadingAudio ? (
          <>
            <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>Ses Hazırlanıyor...</span>
          </>
        ) : isPlaying ? (
          <>
            <VolumeX className="w-3.5 h-3.5 text-amber-400" />
            <span>Fısıltıyı Durdur {voiceMode === 'gemini' ? '(AI)' : ''}</span>
          </>
        ) : (
          <>
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Kahin&apos;in Sesini Dinle</span>
            <Sparkles className="w-3 h-3 text-amber-300/70" />
          </>
        )}
      </button>
    </div>
  );
}
