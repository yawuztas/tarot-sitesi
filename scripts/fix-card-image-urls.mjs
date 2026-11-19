/**
 * Kart görsel URL'lerini gerçek dosya konumlarıyla eşleştirir.
 *
 * DB'de kayıtlı URL pattern (yanlış):  /cards/{slug}/{size}.webp
 *                                      örnek: /cards/major-00-fool/medium.webp
 *
 * Gerçek dosya konumu (doğru):         /cards/{styleSlug}/{size}-{slug}.webp
 *                                      örnek: /cards/rider-waite/medium-major-00-fool.webp
 *
 * Çalıştırma:  bun run scripts/fix-card-image-urls.mjs
 */
import { db } from '../src/lib/db.ts';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC_DIR = '/home/z/my-project/public';

const SIZES = ['thumb', 'small', 'medium', 'large', 'full'];

async function main() {
  const cards = await db.card.findMany({
    include: { style: { select: { slug: true } } },
  });

  console.log(`📋 ${cards.length} kart bulundu. URL'ler kontrol ediliyor...\n`);

  let updated = 0;
  let skipped = 0;
  let missingFiles = 0;

  for (const card of cards) {
    const styleSlug = card.style.slug;
    const newUrls = {};

    for (const size of SIZES) {
      const newPath = `/cards/${styleSlug}/${size}-${card.slug}.webp`;
      const absPath = join(PUBLIC_DIR, newPath);

      if (existsSync(absPath)) {
        const column = `imageUrl${size.charAt(0).toUpperCase()}${size.slice(1)}`;
        newUrls[column] = newPath;
      } else {
        missingFiles++;
        console.warn(`  ⚠️  Dosya yok: ${absPath}`);
      }
    }

    // Eğer en az full boyut yoksa, atla
    if (!newUrls.imageUrlFull) {
      console.warn(`  ⛔ "${card.slug}" için full boyut bulunamadı, atlanıyor`);
      skipped++;
      continue;
    }

    // Eksik boyutları full'e yönlendir
    for (const size of SIZES) {
      const column = `imageUrl${size.charAt(0).toUpperCase()}${size.slice(1)}`;
      if (!newUrls[column]) {
        newUrls[column] = newUrls.imageUrlFull;
      }
    }

    await db.card.update({
      where: { id: card.id },
      data: newUrls,
    });
    updated++;
  }

  console.log(`\n✅ Tamamlandı:`);
  console.log(`   - Güncellenen kart: ${updated}`);
  console.log(`   - Atlanan (full boyut eksik): ${skipped}`);
  console.log(`   - Eksik dosya sayısı: ${missingFiles}`);

  // Örnek bir kartın yeni URL'lerini göster
  const sample = await db.card.findFirst({
    where: { slug: 'major-00-fool' },
    select: {
      slug: true,
      imageUrlThumb: true,
      imageUrlSmall: true,
      imageUrlMedium: true,
      imageUrlLarge: true,
      imageUrlFull: true,
    },
  });
  console.log(`\n📋 Örnek kart (${sample?.slug}):`);
  console.log(JSON.stringify(sample, null, 2));
}

main()
  .catch((err) => {
    console.error('❌ Hata:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
