import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mystic Tarot · Kadim Kartların Simgesel Dili",
  description:
    "Rider-Waite ve Marsilya geleneğinden 156 kart. Astro-Tarot entegrasyonlu, AI destekli mistik fal deneyimi. Provably-fair çekim, kadim sembolik dil.",
  keywords: [
    "tarot", "mistik tarot", "fal", "rider-waite", "marsilya",
    "astro-tarot", "AI fal", "tarot yorumu", "tarot açılımı",
  ],
  authors: [{ name: "Mystic Tarot" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Mystic Tarot · Kadim Kartların Simgesel Dili",
    description:
      "Rider-Waite ve Marsilya geleneğinden 156 kart. AI destekli mistik fal deneyimi.",
    siteName: "Mystic Tarot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mystic Tarot",
    description: "Kadim tarot geleneğiyle modern hayatın yol haritası.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
