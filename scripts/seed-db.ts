/**
 * Database Seed Script
 * 
 * Tüm JSON veri dosyalarını okuyup veritabanına yükler:
 * - 2 tarot tarzı (Rider-Waite, Marsilya)
 * - 78 kart × 2 tarz (Marsilya Minor, Rider-Waite'ten kopyalanır)
 * - 3 açılım (Tek Kart, Üçlü, Kelt Haçı)
 * - 8 niyet kategorisi
 * - 5 kredi paketi
 */

import { db } from '@/lib/db';

// JSON data
import riderWaiteMajor from '@/../prisma/seed-data/rider-waite-major.json';
import riderWaiteMinor from '@/../prisma/seed-data/rider-waite-minor.json';
import marseilleMajor from '@/../prisma/seed-data/marseille-major.json';
import spreadsData from '@/../prisma/seed-data/spreads.json';
import intentionCategoriesData from '@/../prisma/seed-data/intention-categories.json';
import creditPackagesData from '@/../prisma/seed-data/credit-packages.json';

type CardData = {
  slug: string;
  name: string;
  nameTr: string;
  arcanaType: string;
  suit: string | null;
  number: number;
  keywordsUpright: string[];
  keywordsReversed: string[];
  meaningsUpright: string;
  meaningsReversed: string;
  astrologicalCorrespondence?: string;
  element?: string;
  numerologyKey?: string;
};

async function main() {
  console.log('🌱 Seed başlıyor...\n');

  // === 1. TAROT STİLLERİ ===
  console.log('📚 Tarot stilleri yükleniyor...');
  
  const rwStyle = await db.tarotStyle.upsert({
    where: { slug: riderWaiteMajor.style.slug },
    update: {
      name: riderWaiteMajor.style.name,
      nameTr: riderWaiteMajor.style.nameTr,
      description: riderWaiteMajor.style.description,
      descriptionTr: riderWaiteMajor.style.descriptionTr,
      imageTheme: riderWaiteMajor.style.imageTheme,
      isActive: true,
      sortOrder: riderWaiteMajor.style.sortOrder,
    },
    create: {
      slug: riderWaiteMajor.style.slug,
      name: riderWaiteMajor.style.name,
      nameTr: riderWaiteMajor.style.nameTr,
      description: riderWaiteMajor.style.description,
      descriptionTr: riderWaiteMajor.style.descriptionTr,
      imageTheme: riderWaiteMajor.style.imageTheme,
      isActive: true,
      sortOrder: riderWaiteMajor.style.sortOrder,
    },
  });
  console.log(`  ✓ Rider-Waite stili (id: ${rwStyle.id})`);

  const marseilleStyle = await db.tarotStyle.upsert({
    where: { slug: marseilleMajor.style.slug },
    update: {
      name: marseilleMajor.style.name,
      nameTr: marseilleMajor.style.nameTr,
      description: marseilleMajor.style.description,
      descriptionTr: marseilleMajor.style.descriptionTr,
      imageTheme: marseilleMajor.style.imageTheme,
      isActive: true,
      sortOrder: marseilleMajor.style.sortOrder,
    },
    create: {
      slug: marseilleMajor.style.slug,
      name: marseilleMajor.style.name,
      nameTr: marseilleMajor.style.nameTr,
      description: marseilleMajor.style.description,
      descriptionTr: marseilleMajor.style.descriptionTr,
      imageTheme: marseilleMajor.style.imageTheme,
      isActive: true,
      sortOrder: marseilleMajor.style.sortOrder,
    },
  });
  console.log(`  ✓ Marsilya stili (id: ${marseilleStyle.id})\n`);

  // === 2. KARTLAR ===
  console.log('🃏 Kartlar yükleniyor...');

  // Rider-Waite Major Arcana
  for (const cardData of riderWaiteMajor.cards as CardData[]) {
    await upsertCard(rwStyle.id, cardData);
  }
  console.log(`  ✓ Rider-Waite Büyük Arkana: ${riderWaiteMajor.cards.length} kart`);

  // Rider-Waite Minor Arcana
  for (const cardData of riderWaiteMinor.cards as CardData[]) {
    await upsertCard(rwStyle.id, cardData);
  }
  console.log(`  ✓ Rider-Waite Küçük Arkana: ${riderWaiteMinor.cards.length} kart`);

  // Marsilya Major Arcana
  for (const cardData of marseilleMajor.cards as CardData[]) {
    await upsertCard(marseilleStyle.id, cardData);
  }
  console.log(`  ✓ Marsilya Büyük Arkana: ${marseilleMajor.cards.length} kart`);

  // Marsilya Minor Arcana — Rider-Waite Minor'dan kopyala (anlamlar aynı)
  for (const cardData of riderWaiteMinor.cards as CardData[]) {
    await upsertCard(marseilleStyle.id, cardData);
  }
  console.log(`  ✓ Marsilya Küçük Arkana: ${riderWaiteMinor.cards.length} kart (Rider-Waite'ten kopyalandı)`);

  const totalCards = riderWaiteMajor.cards.length + riderWaiteMinor.cards.length + marseilleMajor.cards.length + riderWaiteMinor.cards.length;
  console.log(`  Toplam: ${totalCards} kart\n`);

  // === 3. AÇILIMLAR ===
  console.log('🔮 Açılımlar yükleniyor...');
  
  for (const spread of spreadsData.spreads) {
    const existing = await db.spread.findUnique({ where: { slug: spread.slug } });
    
    const spreadRecord = existing
      ? await db.spread.update({
          where: { id: existing.id },
          data: {
            name: spread.name,
            nameTr: spread.nameTr,
            description: spread.description,
            descriptionTr: spread.descriptionTr,
            cardCount: spread.cardCount,
            category: spread.category,
            difficulty: spread.difficulty,
            isActive: true,
            sortOrder: spread.sortOrder,
          },
        })
      : await db.spread.create({
          data: {
            slug: spread.slug,
            name: spread.name,
            nameTr: spread.nameTr,
            description: spread.description,
            descriptionTr: spread.descriptionTr,
            cardCount: spread.cardCount,
            category: spread.category,
            difficulty: spread.difficulty,
            isActive: true,
            sortOrder: spread.sortOrder,
          },
        });
    
    // Pozisyonları sil ve yeniden ekle
    await db.spreadPosition.deleteMany({ where: { spreadId: spreadRecord.id } });
    
    for (const position of spread.positions) {
      await db.spreadPosition.create({
        data: {
          spreadId: spreadRecord.id,
          positionIndex: position.positionIndex,
          label: position.label,
          labelTr: position.labelTr,
          meaning: position.meaning,
          meaningTr: position.meaningTr,
          isOptional: (position as any).isOptional || false,
        },
      });
    }
    
    console.log(`  ✓ ${spread.nameTr} (${spread.cardCount} kart)`);
  }
  console.log('');

  // === 4. NİYET KATEGORİLERİ ===
  console.log('💭 Niyet kategorileri yükleniyor...');
  
  for (const cat of intentionCategoriesData.intentionCategories) {
    const existing = await db.intentionCategory.findUnique({ where: { slug: cat.slug } });
    
    if (existing) {
      await db.intentionCategory.update({
        where: { id: existing.id },
        data: {
          name: cat.name,
          nameTr: cat.nameTr,
          description: cat.description,
          descriptionTr: cat.descriptionTr,
          promptModifierTr: cat.promptModifierTr,
          icon: cat.icon,
          color: cat.color,
          sortOrder: cat.sortOrder,
          isActive: true,
        },
      });
    } else {
      await db.intentionCategory.create({
        data: {
          slug: cat.slug,
          name: cat.name,
          nameTr: cat.nameTr,
          description: cat.description,
          descriptionTr: cat.descriptionTr,
          promptModifierTr: cat.promptModifierTr,
          icon: cat.icon,
          color: cat.color,
          sortOrder: cat.sortOrder,
          isActive: true,
        },
      });
    }
    
    console.log(`  ✓ ${cat.nameTr}`);
  }
  console.log('');

  // === 5. KREDİ PAKETLERİ ===
  console.log('💰 Kredi paketleri yükleniyor...');
  
  for (const pkg of creditPackagesData.creditPackages) {
    const existing = await db.creditPackage.findFirst({
      where: { name: pkg.name },
    });
    
    if (existing) {
      await db.creditPackage.update({
        where: { id: existing.id },
        data: {
          creditAmount: pkg.creditAmount,
          priceTl: pkg.priceTl,
          discountPercentage: pkg.discountPercentage,
          description: pkg.description,
          badge: pkg.badge,
          isActive: true,
          sortOrder: pkg.sortOrder,
        },
      });
    } else {
      await db.creditPackage.create({
        data: {
          name: pkg.name,
          creditAmount: pkg.creditAmount,
          priceTl: pkg.priceTl,
          discountPercentage: pkg.discountPercentage,
          description: pkg.description,
          badge: pkg.badge,
          isActive: true,
          sortOrder: pkg.sortOrder,
        },
      });
    }
    
    console.log(`  ✓ ${pkg.name}: ${pkg.creditAmount} kredi / ${pkg.priceTl} TL${pkg.badge ? ` (${pkg.badge})` : ''}`);
  }
  console.log('');

  console.log('✅ Seed tamamlandı!\n');
  
  // İstatistikler
  const stats = {
    styles: await db.tarotStyle.count(),
    cards: await db.card.count(),
    spreads: await db.spread.count(),
    spreadPositions: await db.spreadPosition.count(),
    intentionCategories: await db.intentionCategory.count(),
    creditPackages: await db.creditPackage.count(),
  };
  
  console.log('📊 Veritabanı İstatistikleri:');
  console.log(`  Tarot stilleri: ${stats.styles}`);
  console.log(`  Kartlar: ${stats.cards}`);
  console.log(`  Açılımlar: ${stats.spreads}`);
  console.log(`  Açılım pozisyonları: ${stats.spreadPositions}`);
  console.log(`  Niyet kategorileri: ${stats.intentionCategories}`);
  console.log(`  Kredi paketleri: ${stats.creditPackages}`);
}

async function upsertCard(styleId: string, cardData: CardData) {
  const existing = await db.card.findUnique({
    where: {
      styleId_slug: {
        styleId,
        slug: cardData.slug,
      },
    },
  });
  
  const cardFields = {
    name: cardData.name,
    nameTr: cardData.nameTr,
    arcanaType: cardData.arcanaType,
    suit: cardData.suit,
    number: cardData.number,
    keywordsUpright: JSON.stringify(cardData.keywordsUpright),
    keywordsReversed: JSON.stringify(cardData.keywordsReversed),
    meaningsUpright: cardData.meaningsUpright,
    meaningsReversed: cardData.meaningsReversed,
    astrologicalCorrespondence: cardData.astrologicalCorrespondence || null,
    element: cardData.element || null,
    numerologyKey: cardData.numerologyKey || null,
  };
  
  if (existing) {
    await db.card.update({ where: { id: existing.id }, data: cardFields });
  } else {
    await db.card.create({
      data: {
        styleId,
        slug: cardData.slug,
        ...cardFields,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
