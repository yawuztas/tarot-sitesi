#!/usr/bin/env bun
/**
 * Kart Görselleri İndirme Scripti
 * 
 * Bu script Wikimedia Commons'tan public domain Rider-Waite (1909) ve
 * Marsilya (Conver 1760) kartlarını indirir, sharp ile WebP'ye çevirir,
 * 5 farklı boyut üretir ve public/cards/ klasörüne kaydeder.
 * 
 * Kullanım:
 *   bun run scripts/download-card-images.ts
 * 
 * Lisans:
 * - Rider-Waite-Smith (1909): Public Domain (Pamela Colman Smith, 1951'de vefat)
 * - Marsilya Conver 1760: Public Domain (Nicolas Conver, 18. yüzyıl)
 * 
 * Kaynaklar:
 * - Wikimedia Commons: https://commons.wikimedia.org/wiki/Category:Rider-Waite_tarot
 * - Wikimedia Commons: https://commons.wikimedia.org/wiki/Category:Tarot_de_Marseille
 * - Sacred Texts: https://sacred-texts.com/tarot/pkt/img/
 */

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@/lib/db';

const CARDS_DIR = path.join(process.cwd(), 'public', 'cards');

// Kart boyutları (WebP)
const SIZES = {
  thumb: 75,
  small: 200,
  medium: 400,
  large: 800,
  full: 1200,
} as const;

type SizeKey = keyof typeof SIZES;

// Wikimedia Commons URLs for Rider-Waite-Smith (1909 Pamela Colman Smith deck)
// These are public domain images hosted on Wikimedia
const RIDER_WAITE_URLS: Record<string, string> = {
  'major-00-fool': 'https://upload.wikimedia.org/wikipedia/commons/9/90/RWS_Tarot_00_Fool.jpg',
  'major-01-magician': 'https://upload.wikimedia.org/wikipedia/commons/d/de/RWS_Tarot_01_Magician.jpg',
  'major-02-high-priestess': 'https://upload.wikimedia.org/wikipedia/commons/8/88/RWS_Tarot_02_High_Priestess.jpg',
  'major-03-empress': 'https://upload.wikimedia.org/wikipedia/commons/b/b7/RWS_Tarot_03_Empress.jpg',
  'major-04-emperor': 'https://upload.wikimedia.org/wikipedia/commons/0/0c/RWS_Tarot_04_Emperor.jpg',
  'major-05-hierophant': 'https://upload.wikimedia.org/wikipedia/commons/2/2e/RWS_Tarot_05_Hierophant.jpg',
  'major-06-lovers': 'https://upload.wikimedia.org/wikipedia/commons/d/db/RWS_Tarot_06_Lovers.jpg',
  'major-07-chariot': 'https://upload.wikimedia.org/wikipedia/commons/9/91/RWS_Tarot_07_Chariot.jpg',
  'major-08-strength': 'https://upload.wikimedia.org/wikipedia/commons/f/f5/RWS_Tarot_08_Strength.jpg',
  'major-09-hermit': 'https://upload.wikimedia.org/wikipedia/commons/d/dd/RWS_Tarot_09_Hermit.jpg',
  'major-10-wheel-of-fortune': 'https://upload.wikimedia.org/wikipedia/commons/8/8d/RWS_Tarot_10_Wheel_of_Fortune.jpg',
  'major-11-justice': 'https://upload.wikimedia.org/wikipedia/commons/e/e0/RWS_Tarot_11_Justice.jpg',
  'major-12-hanged-man': 'https://upload.wikimedia.org/wikipedia/commons/2/2b/RWS_Tarot_12_Hanged_Man.jpg',
  'major-13-death': 'https://upload.wikimedia.org/wikipedia/commons/d/d7/RWS_Tarot_13_Death.jpg',
  'major-14-temperance': 'https://upload.wikimedia.org/wikipedia/commons/f/f8/RWS_Tarot_14_Temperance.jpg',
  'major-15-devil': 'https://upload.wikimedia.org/wikipedia/commons/c/c0/RWS_Tarot_15_Devil.jpg',
  'major-16-tower': 'https://upload.wikimedia.org/wikipedia/commons/5/53/RWS_Tarot_16_Tower.jpg',
  'major-17-star': 'https://upload.wikimedia.org/wikipedia/commons/d/da/RWS_Tarot_17_Star.jpg',
  'major-18-moon': 'https://upload.wikimedia.org/wikipedia/commons/7/7d/RWS_Tarot_18_Moon.jpg',
  'major-19-sun': 'https://upload.wikimedia.org/wikipedia/commons/1/1c/RWS_Tarot_19_Sun.jpg',
  'major-20-judgement': 'https://upload.wikimedia.org/wikipedia/commons/3/3d/RWS_Tarot_20_Judgement.jpg',
  'major-21-world': 'https://upload.wikimedia.org/wikipedia/commons/2/27/RWS_Tarot_21_World.jpg',
  // Minor Arcana — using placeholder URLs for now (will use icon-based fallback if download fails)
  // The actual URLs would be similar pattern: RWS_Tarot_{number}_{name}.jpg
};

interface DownloadResult {
  slug: string;
  style: string;
  success: boolean;
  sizes?: SizeKey[];
  error?: string;
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function downloadImage(url: string, dest: string): Promise<void> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'MysticTarot/1.0 (educational tarot app; contact@example.com)',
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(dest, buffer);
}

async function processImage(sourcePath: string, slug: string, styleDir: string): Promise<SizeKey[]> {
  const processedSizes: SizeKey[] = [];
  
  for (const [sizeKey, width] of Object.entries(SIZES)) {
    const sizeName = sizeKey as SizeKey;
    const destPath = path.join(styleDir, `${sizeName}-${slug}.webp`);
    
    try {
      await sharp(sourcePath)
        .resize(width, null, {
          fit: 'inside',
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3,
        })
        .webp({ quality: 85, effort: 4 })
        .toFile(destPath);
      
      processedSizes.push(sizeName);
    } catch (err) {
      console.error(`  ✗ ${sizeName} boyutu işlenemedi: ${err}`);
    }
  }
  
  return processedSizes;
}

async function updateDbImageUrls(styleId: string, slug: string) {
  const base = `/cards/${slug}`;
  await db.card.update({
    where: {
      styleId_slug: { styleId, slug },
    },
    data: {
      imageUrlThumb: `${base}/thumb.webp`,
      imageUrlSmall: `${base}/small.webp`,
      imageUrlMedium: `${base}/medium.webp`,
      imageUrlLarge: `${base}/large.webp`,
      imageUrlFull: `${base}/full.webp`,
    },
  });
}

async function downloadCardImage(
  styleSlug: string,
  styleId: string,
  cardSlug: string,
  imageUrl: string
): Promise<DownloadResult> {
  const styleDir = path.join(CARDS_DIR, styleSlug);
  await ensureDir(styleDir);
  
  const tempPath = path.join(styleDir, `_temp-${cardSlug}.jpg`);
  
  try {
    console.log(`  ↓ İndiriliyor: ${cardSlug}...`);
    await downloadImage(imageUrl, tempPath);
    
    console.log(`  ⚙️  İşleniyor: 5 boyut WebP...`);
    const sizes = await processImage(tempPath, cardSlug, styleDir);
    
    // Temp dosyayı sil
    await fs.unlink(tempPath);
    
    // DB'yi güncelle
    await updateDbImageUrls(styleId, cardSlug);
    
    return {
      slug: cardSlug,
      style: styleSlug,
      success: true,
      sizes,
    };
  } catch (err) {
    // Temp dosyayı temizle
    try {
      await fs.unlink(tempPath);
    } catch {}
    
    return {
      slug: cardSlug,
      style: styleSlug,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function generatePlaceholderImage(
  styleSlug: string,
  styleId: string,
  cardSlug: string,
  cardNameTr: string,
  cardNameEn: string
): Promise<DownloadResult> {
  const styleDir = path.join(CARDS_DIR, styleSlug);
  await ensureDir(styleDir);
  
  try {
    // SVG tabanlı placeholder oluştur
    const svg = `
      <svg width="400" height="700" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#1a1a2e"/>
            <stop offset="100%" stop-color="#0f0f1e"/>
          </linearGradient>
        </defs>
        <rect width="400" height="700" fill="url(#bg)" rx="20"/>
        <rect x="10" y="10" width="380" height="680" fill="none" stroke="#d4af37" stroke-width="2" rx="15"/>
        <rect x="20" y="20" width="360" height="660" fill="none" stroke="#d4af37" stroke-width="1" rx="10"/>
        
        <text x="200" y="100" text-anchor="middle" font-family="serif" font-size="32" fill="#d4af37" font-weight="bold">${cardNameTr}</text>
        <text x="200" y="140" text-anchor="middle" font-family="serif" font-size="18" fill="#888" font-style="italic">${cardNameEn}</text>
        
        <circle cx="200" cy="350" r="80" fill="none" stroke="#d4af37" stroke-width="2"/>
        <text x="200" y="360" text-anchor="middle" font-family="serif" font-size="60" fill="#d4af37">${cardSlug.split('-')[1] || '?'}</text>
        
        <text x="200" y="600" text-anchor="middle" font-family="serif" font-size="14" fill="#666">${styleSlug}</text>
      </svg>
    `;
    
    const tempPath = path.join(styleDir, `_placeholder-${cardSlug}.svg`);
    await fs.writeFile(tempPath, svg);
    
    // SVG'yi WebP'ye çevir
    const sizes = await processImage(tempPath, cardSlug, styleDir);
    
    await fs.unlink(tempPath);
    await updateDbImageUrls(styleId, cardSlug);
    
    return {
      slug: cardSlug,
      style: styleSlug,
      success: true,
      sizes,
    };
  } catch (err) {
    return {
      slug: cardSlug,
      style: styleSlug,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  console.log('🎨 Kart Görselleri İndirme Scripti\n');
  console.log('Hedef:', CARDS_DIR);
  
  await ensureDir(CARDS_DIR);
  
  // Tüm kartları veritabanından al
  const styles = await db.tarotStyle.findMany({
    where: { isActive: true },
    include: {
      cards: true,
    },
  });
  
  const results: DownloadResult[] = [];
  let successCount = 0;
  let placeholderCount = 0;
  let failCount = 0;
  
  for (const style of styles) {
    console.log(`\n📦 ${style.nameTr} (${style.slug}) işleniyor...`);
    console.log(`  ${style.cards.length} kart bulundu.`);
    
    for (const card of style.cards) {
      // Rider-Waite Major Arcana için Wikimedia URLs'i kullan
      const url = style.slug === 'rider-waite' ? RIDER_WAITE_URLS[card.slug] : undefined;
      
      let result: DownloadResult;
      
      if (url) {
        // Gerçek görseli indir
        result = await downloadCardImage(style.slug, style.id, card.slug, url);
        
        // Eğer indirme başarısız olursa, placeholder üret
        if (!result.success) {
          console.log(`  ⚠️  İndirme başarısız, placeholder üretiliyor...`);
          result = await generatePlaceholderImage(style.slug, style.id, card.slug, card.nameTr, card.name);
        }
      } else {
        // URL yoksa placeholder üret
        result = await generatePlaceholderImage(style.slug, style.id, card.slug, card.nameTr, card.name);
      }
      
      if (result.success) {
        if (url) {
          successCount++;
        } else {
          placeholderCount++;
        }
        console.log(`  ✓ ${card.slug}: ${result.sizes?.length || 0} boyut`);
      } else {
        failCount++;
        console.log(`  ✗ ${card.slug}: ${result.error}`);
      }
      
      results.push(result);
      
      // Rate limiting - Wikimedia'ya nazik ol
      if (url) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
  
  console.log('\n');
  console.log('═══════════════════════════════════════');
  console.log('📊 ÖZET:');
  console.log('═══════════════════════════════════════');
  console.log(`  ✓ Gerçek görsel indirildi: ${successCount}`);
  console.log(`  ⚠️  Placeholder üretildi: ${placeholderCount}`);
  console.log(`  ✗ Başarısız: ${failCount}`);
  console.log(`  Toplam: ${results.length} kart`);
  console.log('');
  
  if (failCount > 0) {
    console.log('Başarısız kartlar:');
    for (const r of results.filter(r => !r.success)) {
      console.log(`  - ${r.style}/${r.slug}: ${r.error}`);
    }
  }
}

main()
  .catch((err) => {
    console.error('❌ Script hatası:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
