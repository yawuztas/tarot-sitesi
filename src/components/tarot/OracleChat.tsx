'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Send, MessageCircle, User, Bot, AlertCircle } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface OracleChatProps {
  userName?: string;
  spreadSlug?: string;
  styleSlug?: string;
  sessionKey?: string;
  astroContext?: {
    sunSign?: string;
    sunSignFormatted?: string;
    moonSign?: string;
    moonSignFormatted?: string;
    ascendant?: string | null;
    ascendantFormatted?: string | null;
  };
  drawnCards: Array<{
    slug?: string;
    nameTr: string;
    isReversed: boolean;
    positionLabel?: string;
  }>;
  pillarTitle: string;
  initialReading?: string;
}

export default function OracleChat({
  userName = 'Yolcu',
  spreadSlug = 'three-card',
  styleSlug = 'rider-waite',
  sessionKey,
  astroContext,
  drawnCards,
  pillarTitle,
  initialReading,
}: OracleChatProps) {
  const storageKey = sessionKey ? `mystic_oracle_chat_${sessionKey}` : null;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [questionsUsed, setQuestionsUsed] = useState(0);
  const maxQuestions = 10;
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const replyAccRef = useRef<string>('');

  const suggestedQuestions = [
    'Aklımdaki kişi bu ay benimle iletişime geçecek mi?',
    'Bu açılımdaki en büyük engelim ne ve nasıl aşarım?',
    'Yıldız haritama göre şanslı dönemim ne zaman başlıyor?',
    'Kariyerimdeki bu düğüm ne zaman çözülecek?',
  ];

  // Oturum sohbetini ve soru sayacını localStorage'dan yükle
  useEffect(() => {
    if (!storageKey) return;
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.messages)) setMessages(parsed.messages);
        if (typeof parsed.questionsUsed === 'number') setQuestionsUsed(parsed.questionsUsed);
      } catch {}
    });
    return () => {
      active = false;
    };
  }, [storageKey]);

  // Mesajlar değiştikçe sohbet geçmişini kalıcı sakla
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ messages, questionsUsed }));
    } catch {}
  }, [storageKey, messages, questionsUsed]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;
    if (questionsUsed >= maxQuestions) return;

    const trimmed = textToSend.trim();
    const priorHistory = messages;
    // Hemen kullanıcı mesajını ve "Kahin fısıldıyor..." bekleme balonunu ekle
    const newMessages: ChatMessage[] = [
      ...priorHistory,
      { role: 'user', content: trimmed },
      { role: 'assistant', content: '' },
    ];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setQuestionsUsed((prev) => prev + 1);
    replyAccRef.current = '';

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 50_000);

    try {
      const resp = await fetch('/api/readings/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          styleSlug,
          spreadSlug,
          intentionText: trimmed,
          userDisplayName: userName,
          birthChartSnapshot: astroContext
            ? {
                sunSign: astroContext.sunSign,
                sunSignFormatted: astroContext.sunSignFormatted || astroContext.sunSign,
                moonSign: astroContext.moonSign,
                moonSignFormatted: astroContext.moonSignFormatted || astroContext.moonSign,
                ascendant: astroContext.ascendant ?? undefined,
                ascendantFormatted: astroContext.ascendantFormatted || astroContext.ascendant || undefined,
              }
            : undefined,
          chatContext: {
            question: trimmed,
            pillarTitle,
            initialReading: initialReading || undefined,
            history: priorHistory.slice(-8),
          },
          cards: drawnCards.map((c, i) => ({
            slug: c.slug || 'major-00-fool',
            isReversed: c.isReversed,
            positionIndex: i,
          })),
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'AI yanıtı alınamadı');
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('Stream açılamadı');

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        replyAccRef.current += chunk;
        const latestContent = replyAccRef.current;

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: latestContent };
          return updated;
        });
      }

      if (!replyAccRef.current.trim()) {
        throw new Error('Boş yanıt');
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      // Hata durumunda soru hakkını iade et ve bekleme balonunu bilgilendirici mesaja çevir
      setQuestionsUsed((prev) => Math.max(0, prev - 1));
      const fallbackText =
        err?.name === 'AbortError'
          ? 'Yıldızların yanıtı yoğunluk sebebiyle gecikti sevgili yolcu. Soru hakkın iade edildi, lütfen tekrar dene.'
          : err?.message && err.message !== 'AI yanıtı alınamadı'
          ? err.message
          : 'Yıldızların enerjisi dalgalandı sevgili yolcu... Soru hakkın iade edildi, lütfen sorunu birazdan tekrar fısılda.';
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: fallbackText };
        return updated;
      });
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const remainingQuestions = Math.max(0, maxQuestions - questionsUsed);

  return (
    <div className="mt-10 rounded-2xl bg-[#110620]/90 border border-purple-500/30 p-6 shadow-2xl space-y-6">
      {/* Başlık ve Soru Sayacı */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-4 border-b border-purple-500/20">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-900/40 text-purple-300 border border-purple-500/30">
            <MessageCircle className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h4 className="font-serif text-lg text-zinc-100">
              Kahin ile Canlı Fal Sohbeti
            </h4>
            <p className="text-xs text-zinc-400">
              Falındaki kartlar ve yıldız haritan hakkında aklına takılan her şeyi sorabilirsin.
            </p>
          </div>
        </div>

        {/* Kalan Soru Sayacı */}
        <div className="px-3.5 py-1.5 rounded-full bg-purple-950/60 border border-amber-500/30 text-xs font-serif shadow">
          <span className="text-zinc-400">Kalan Hak: </span>
          <span className="text-amber-300 font-bold">
            {remainingQuestions} / {maxQuestions} Soru
          </span>
        </div>
      </div>

      {/* Mesaj Listesi */}
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {messages.length === 0 ? (
          <div className="text-center py-6 text-zinc-400 text-xs font-serif italic space-y-2">
            <Sparkles className="w-6 h-6 text-amber-400/60 mx-auto animate-pulse" />
            <p>
              "Perde aralandı {userName}. Bu açılıma veya geleceğine dair kalbini kurcalayan ne varsa bana sorabilirsin..."
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-purple-950 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-2xl p-4 text-xs md:text-sm font-serif leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-100 rounded-tr-none'
                    : 'bg-[#180c2e] border border-purple-500/25 text-zinc-200 rounded-tl-none whitespace-pre-line'
                }`}
              >
                {msg.content || (
                  <span className="text-amber-300/60 italic animate-pulse">
                    Kahin fısıldıyor...
                  </span>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-200 shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </motion.div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Hızlı Öneri Butonları */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSend(q)}
              className="px-3 py-1.5 rounded-full text-[11px] bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/25 text-purple-200 transition-all hover:border-amber-400/40"
            >
              ✦ {q}
            </button>
          ))}
        </div>
      )}

      {/* Mesaj Gönderme Kutusu */}
      {remainingQuestions > 0 ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 pt-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Kahin'e bir soru fısılda..."
            className="flex-1 bg-[#0a0314] border border-purple-500/30 rounded-xl px-4 py-3 text-xs md:text-sm text-zinc-100 focus:outline-none focus:border-amber-400/60 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-xs tracking-wider transition-all disabled:opacity-40 flex items-center gap-1.5"
          >
            <span>Sor</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center text-xs text-amber-300 font-serif">
          ✦ 10 soruluk kutsal sohbet seansın tamamlandı. Yeni bir açılım ile enerjileri tazeleyebilirsin. ✦
        </div>
      )}
    </div>
  );
}
