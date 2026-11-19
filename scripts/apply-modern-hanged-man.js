const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const src = 'C:/Users/yvzta/.gemini/antigravity/brain/7b5673c5-065c-4f00-ba3a-3b46a29f32f9/modern_hanged_man_1790196867398.jpg';
const destDir = 'D:/AI/websites/tarotsitesi/public/cards/rider-waite';
const sizes = { thumb: 75, small: 200, medium: 400, large: 800, full: 1200 };

async function run() {
  if (!fs.existsSync(src)) {
    console.error('Source not found:', src);
    process.exit(1);
  }
  for (const [key, width] of Object.entries(sizes)) {
    const dest = path.join(destDir, `${key}-major-12-hanged-man.webp`);
    await sharp(src)
      .resize({ width, fit: 'inside' })
      .webp({ quality: 92 })
      .toFile(dest);
    console.log('Saved:', dest);
  }
  console.log('Successfully updated all webp formats for major-12-hanged-man!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
