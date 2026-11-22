# 🔮 Mystic Tarot — AI-Powered Tarot Reading Platform

A production-grade, AI-powered tarot reading platform built with Next.js 16:
multi-provider LLM interpretations with graceful cascade fallback, provably
fair card draws, credits & payments, authentication, and text-to-speech
readings.

> **Türkçe özet için aşağı kaydırın** / *Scroll down for the Turkish summary.*

## ✨ Features

- **🔮 AI Tarot Interpretations** — a mystic-coach reading engine with a
  multi-provider cascade: **Google Gemini → Zhipu GLM → MiniMax → local
  fallback engine**. If a provider is missing or errors, the next one takes
  over seamlessly
- **🎲 Provably Fair Draws** — CSPRNG card selection with seed + SHA-256 hash
  published for every reading
- **🌊 Streaming Readings** — Server-Sent Events stream interpretation tokens
  as they are generated
- **🧭 Guided Sessions** — multi-step reading sessions with chat history
  (`/api/session/start → chat → finalize`)
- **🗣️ Text-to-Speech** — spoken readings via Gemini TTS
- **👤 Authentication** — NextAuth credentials provider (bcrypt), JWT sessions,
  per-key rate limiting; guest readings allowed
- **💳 Credits & Payments** — credit packages (100–250 credit spreads), payment
  sessions & webhook endpoints, TRY pricing
- **🌍 Astro Add-ons** — birth-chart snapshots, live transit calculations and
  astro-context enriched prompts
- **🛡️ Security** — same-origin assertions, input clamping, rate limits, strict
  security headers (X-Frame-Options DENY, CSP-friendly headers)
- **💰 AI Cost Protection** — guests get a local procedural reading (zero AI
  cost); AI interpretations unlock after payment (İyzico) or for members, bounded
  by a per-user daily quota; identical prompts are served from a 30-day
  interpretation cache instead of re-calling the model

## 🛠 Tech Stack

| Layer | Tools |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Database | PostgreSQL via [Neon](https://neon.tech) + Prisma ORM (24 models) |
| UI | Tailwind CSS 4 + shadcn/ui + Radix primitives |
| AI | Google Gemini (`@google/genai`), Zhipu GLM, MiniMax |
| Auth | NextAuth v4 (credentials + JWT + bcryptjs) |
| Astro | astronomia, sweph-wasm, js-ephemeris |
| Payments | custom payment session + webhook flow |

## 🚀 Getting Started

```bash
npm install
npx prisma db push        # create schema
npx tsx scripts/seed-db.ts # seed 156 cards, spreads, styles, credit packages
npm run dev
```

### Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon) |
| `NEXTAUTH_SECRET` | Session signing secret (≥32 chars in production) |
| `NEXTAUTH_URL` | Public base URL |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Primary AI provider |
| `MINIMAX_API_KEY` / `MINIMAX_MODEL` | Fallback provider |
| `GLM_API_KEY` / `GLM_MODEL` | Optional Zhipu GLM provider |
| `TAROT_READING_PRICE_TRY` | Reading price (TRY) |
| `TAROT_READING_QUESTION_QUOTA` | Free question quota per user |
| `AI_DAILY_LIMIT_PER_USER` | Daily AI interpretations per member (default 20) |
| `RESEND_API_KEY` | Resend API key (password-reset e-mails) |
| `EMAIL_FROM` | Sender address, e.g. `Mystic Tarot <noreply@yourdomain.com>` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` | SMTP fallback when Resend is not configured |
| `NEXT_PUBLIC_WHATSAPP_PHONE` | Contact number shown in UI |

> **Sending domain:** with a plain Resend account you can only send to the
> account owner's address (`onboarding@resend.dev`). Add a real sending domain
> in the Resend dashboard (with the DNS records it gives you) before sending
> password-reset mails to actual customers.
| `RESEND_API_KEY` | Resend email API key for password reset emails (preferred if set) |
| `EMAIL_FROM` | Sender address (e.g., `Tarot Atolyesi <noreply@domain.com>`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` | Optional SMTP fallback when `RESEND_API_KEY` is not configured |

**AI without keys:** if no provider key is set, a built-in local fallback
engine still produces structural readings — the app never hard-fails.

## 📁 Project Structure

```
src/
├── app/
│   ├── api/            # readings (draw/interpret/save), session (start/chat/
│   │                   # finalize), tts, auth, payment, astrology
│   └── fal, fallarim, giris, kayit   # reading UI, history, auth pages
├── lib/
│   ├── ai/             # provider cascade + prompt builder (mystic persona)
│   ├── auth/           # NextAuth options (ephemeral dev secret, prod guard)
│   ├── db.ts           # Prisma client singleton
│   ├── security/       # rate limiting, validation
│   └── tarot/          # provably-fair draw, cards, elemental dignities
└── components/         # shadcn/ui based UI kit
prisma/seed-data/       # 156 cards (RWS + Marseille), spreads, intentions
```

## 📄 License

All rights reserved. Personal project — see repository settings.

---

## 🇹🇷 Türkçe Özet

**Mystic Tarot**, Next.js 16 ile geliştirilmiş, yapay zeka destekli bir online
tarot fal platformudur.

- **🔮 AI Yorum Motoru:** Çoklu sağlayıcı zinciri — **Gemini → GLM → MiniMax →
  yerel fallback**. Bir sağlayıcı yoksa/hata verirse diğeri devralır; uygulama
  asla çökmez
- **🎲 Provably-fair kart çekimi:** Her fal için CSPRNG + SHA-256 hash yayımlanır
- **🌊 Streaming:** Yorum, SSE ile kelime kelime akar
- **👤 Kimlik doğrulama:** NextAuth (e-posta + şifre, bcrypt, JWT), konuk
  kullanıcılara fal deneyimi açık
- **💳 Kredi sistemi:** Puanlı açılımlar (100–250 puan), ödeme oturumları ve
  webhook'lar
- **🌍 Astro eklentiler:** Doğum haritası + canlı transit hesapları ile zengin
  prompt bağlamı
- **🗣️ Sesli fal:** Gemini TTS ile okuma
- **💰 Maliyet koruması:** Misafirlere AI yerine **yerel prosedürel yorum** (maliyet 0);
  AI yorumu ödeme (İyzico) sonrası ya da üyelere açık ve **günlük kota** ile
  sınırlı; aynı prompt'lar 30 günlük **cache**'ten döner, model tekrar çağrılmaz

**Veritabanı:** Neon PostgreSQL üzerinde 24 Prisma modeli; 156 kart, 4 açılım,
8 niyet kategorisi ve 5 kredi paketi seed verisi hazır gelir.
**Çalıştırma:** `npm install && npx prisma db push && npm run dev`
