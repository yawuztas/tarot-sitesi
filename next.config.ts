import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel'de standalone gerekmez (kendi build pipeline'ı var, .nft.json çakışması yapıyor).
  // Lokalde `npm start` için standalone çıktısı korunur.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  // Native addon paketlerini Turbopack/webpack bundle'ına dahil etme — runtime'da require ile yüklenir
  serverExternalPackages: ['bcryptjs', 'celestine'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
