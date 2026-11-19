const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const destDir = path.join(__dirname, '..', 'public', 'cards', 'rider-waite');
const sizes = { thumb: 75, small: 200, medium: 400, large: 800, full: 1200 };

async function processCard(srcPath, cardSlug) {
  if (!fs.existsSync(srcPath)) {
    console.error(`Source file not found: ${srcPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  for (const [key, width] of Object.entries(sizes)) {
    const dest = path.join(destDir, `${key}-${cardSlug}.webp`);
    await sharp(srcPath)
      .resize({ width, fit: 'inside' })
      .webp({ quality: 92 })
      .toFile(dest);
    console.log(`Generated: ${key}-${cardSlug}.webp`);
  }
  console.log(`Successfully generated all webp sizes for ${cardSlug}!`);
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node scripts/process-card-image.js <srcPath> <cardSlug>');
  process.exit(0);
}

processCard(args[0], args[1]).catch(err => {
  console.error(err);
  process.exit(1);
});
