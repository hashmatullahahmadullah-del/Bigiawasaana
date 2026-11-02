const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const src = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\6320e95d-64c8-4ec3-9718-6034f9efc967\\what_is_doogh_afghan_yogurt_drink_1793493830795.jpg';
const destJpg = path.resolve('public/images/blog/what-is-doogh-afghan-yogurt-drink.jpg');
const destWebp = path.resolve('public/images/blog/what-is-doogh-afghan-yogurt-drink.webp');
const destAvif = path.resolve('public/images/blog/what-is-doogh-afghan-yogurt-drink.avif');

async function processImage() {
  const buf = fs.readFileSync(src);
  const meta = await sharp(buf).metadata();
  console.log(`Original dimensions: ${meta.width}x${meta.height}`);

  // 16:9 resize to 1280x720 if larger
  await sharp(buf)
    .resize(1280, 720, { fit: 'cover' })
    .jpeg({ quality: 85, progressive: true })
    .toFile(destJpg);
  console.log('✅ Wrote', destJpg);

  await sharp(buf)
    .resize(1280, 720, { fit: 'cover' })
    .webp({ quality: 80 })
    .toFile(destWebp);
  console.log('✅ Wrote', destWebp);

  await sharp(buf)
    .resize(1280, 720, { fit: 'cover' })
    .avif({ quality: 75 })
    .toFile(destAvif);
  console.log('✅ Wrote', destAvif);
}

processImage().catch(e => {
  console.error(e);
  process.exit(1);
});
