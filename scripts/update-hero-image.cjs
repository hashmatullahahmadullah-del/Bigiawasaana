const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const newHeroSource = 'C:/Users/User/.gemini/antigravity/brain/6320e95d-64c8-4ec3-9718-6034f9efc967/.user_uploaded/media_1793492094645_a70d61ed.jpg';

async function updateHero() {
  console.log('Reading new hero image from:', newHeroSource);
  const buf = fs.readFileSync(newHeroSource);
  const meta = await sharp(buf).metadata();
  console.log(`Uploaded Image dimensions: ${meta.width}x${meta.height}`);

  // 1. Write original high quality jpg to public/hero-food-spread.jpg
  await sharp(buf)
    .jpeg({ quality: 88, progressive: true })
    .toFile(path.resolve('public/hero-food-spread.jpg'));
  console.log('✅ Updated public/hero-food-spread.jpg');

  // 2. Write optimized webp to public/hero-food-spread.webp
  await sharp(buf)
    .webp({ quality: 85 })
    .toFile(path.resolve('public/hero-food-spread.webp'));
  console.log('✅ Updated public/hero-food-spread.webp');

  // 3. Update public/halal-tikka-kabob-los-angeles.webp
  await sharp(buf)
    .webp({ quality: 85 })
    .toFile(path.resolve('public/halal-tikka-kabob-los-angeles.webp'));
  console.log('✅ Updated public/halal-tikka-kabob-los-angeles.webp');

  // 4. Generate responsive images in public/images/hero/
  const heroDir = path.resolve('public/images/hero');
  if (!fs.existsSync(heroDir)) fs.mkdirSync(heroDir, { recursive: true });

  const widths = [400, 800, 1024, 1200, 1600];
  for (const w of widths) {
    const h = Math.round(w * (meta.height / meta.width));
    await sharp(buf)
      .resize(w, h, { fit: 'cover' })
      .avif({ quality: 80 })
      .toFile(path.join(heroDir, `hero-${w}.avif`));

    await sharp(buf)
      .resize(w, h, { fit: 'cover' })
      .webp({ quality: 82 })
      .toFile(path.join(heroDir, `hero-${w}.webp`));

    await sharp(buf)
      .resize(w, h, { fit: 'cover' })
      .jpeg({ quality: 85, progressive: true })
      .toFile(path.join(heroDir, `hero-${w}.jpg`));
  }
  console.log('✅ Generated all responsive hero sizes in public/images/hero/');
}

updateHero().catch(err => {
  console.error('Failed to update hero image:', err);
  process.exit(1);
});
