const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const srcPath = 'C:/Users/yvzta/.gemini/antigravity/brain/7b5673c5-065c-4f00-ba3a-3b46a29f32f9/mystic_card_back_1790682192151.jpg';
const destDirs = [
  path.join(__dirname, '..', 'public', 'cards'),
  path.join(__dirname, '..', 'public', 'cards', 'rider-waite')
];

for (const dir of destDirs) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function processBack() {
  const meta = await sharp(srcPath).metadata();
  console.log('Original dimensions:', meta.width, 'x', meta.height);

  const sizes = [
    { prefix: 'thumb-', width: 120, height: 180, quality: 80 },
    { prefix: 'small-', width: 240, height: 360, quality: 82 },
    { prefix: 'medium-', width: 400, height: 600, quality: 85 },
    { prefix: 'large-', width: 600, height: 900, quality: 88 },
    { prefix: 'full-', width: 896, height: 1344, quality: 90 },
    { prefix: '', width: 500, height: 750, quality: 88 } // default card-back.webp
  ];

  for (const dir of destDirs) {
    for (const s of sizes) {
      const fileName = s.prefix ? (s.prefix + 'card-back.webp') : 'card-back.webp';
      const outPath = path.join(dir, fileName);
      await sharp(srcPath)
        .resize(s.width, s.height, { fit: 'cover' })
        .webp({ quality: s.quality })
        .toFile(outPath);
      console.log('Saved:', outPath);
    }
  }
}

processBack().catch(console.error);
