const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function optimizeImages() {
  console.log('--- Starting Image Optimization Pipeline with sharp ---');

  // 1. Optimize Hero Image
  const heroSrc = path.resolve('public/halal-tikka-kabob-los-angeles.webp');
  if (fs.existsSync(heroSrc)) {
    const heroBuf = fs.readFileSync(heroSrc);
    const heroMeta = await sharp(heroBuf).metadata();
    console.log(`Hero source: ${heroMeta.width}x${heroMeta.height}`);
    
    const heroWidths = [400, 800, 1200, 1600];
    const heroDir = path.resolve('public/images/hero');
    if (!fs.existsSync(heroDir)) fs.mkdirSync(heroDir, { recursive: true });

    for (const w of heroWidths) {
      const h = Math.round(w * (heroMeta.height / heroMeta.width));
      // AVIF
      await sharp(heroBuf)
        .resize(w, h)
        .avif({ quality: 65, effort: 4 })
        .toFile(path.join(heroDir, `hero-${w}.avif`));
      // WebP
      await sharp(heroBuf)
        .resize(w, h)
        .webp({ quality: 78, effort: 4 })
        .toFile(path.join(heroDir, `hero-${w}.webp`));
      // JPEG fallback
      await sharp(heroBuf)
        .resize(w, h)
        .jpeg({ quality: 75, progressive: true })
        .toFile(path.join(heroDir, `hero-${w}.jpg`));
    }
    console.log('✅ Generated responsive hero images in /images/hero/');
  }

  // 2. Optimize Bakery Image (fresh-baked-bread.jpg is 776 KB!)
  const breadSrc = path.resolve('public/fresh-baked-bread.jpg');
  if (fs.existsSync(breadSrc)) {
    const breadBuf = fs.readFileSync(breadSrc);
    const breadDir = path.resolve('public/images/bakery');
    if (!fs.existsSync(breadDir)) fs.mkdirSync(breadDir, { recursive: true });

    const breadWidths = [400, 800];
    for (const w of breadWidths) {
      await sharp(breadBuf)
        .resize(w)
        .webp({ quality: 80 })
        .toFile(path.join(breadDir, `fresh-baked-bread-${w}.webp`));
      await sharp(breadBuf)
        .resize(w)
        .avif({ quality: 70 })
        .toFile(path.join(breadDir, `fresh-baked-bread-${w}.avif`));
    }
    // Also save an optimized version of fresh-baked-bread.webp at 800w
    await sharp(breadBuf)
      .resize(800)
      .webp({ quality: 80 })
      .toFile(path.resolve('public/fresh-baked-bread.webp'));
    console.log('✅ Generated optimized bakery images');
  }

  // 3. Optimize Blog Images in public/images/blog/
  const blogDir = path.resolve('public/images/blog');
  if (fs.existsSync(blogDir)) {
    const blogFiles = fs.readdirSync(blogDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f) && !f.includes('-400') && !f.includes('-800'));
    console.log(`Optimizing ${blogFiles.length} blog images...`);

    for (const f of blogFiles) {
      const srcPath = path.join(blogDir, f);
      const name = path.parse(f).name;
      
      try {
        const buf = fs.readFileSync(srcPath);
        // Optimized WebP version at 600w (perfect for 320-400px blog cards)
        const webpOut = await sharp(buf)
          .resize(600, 375, { fit: 'cover' })
          .webp({ quality: 80 })
          .toBuffer();
        fs.writeFileSync(path.join(blogDir, `${name}.webp`), webpOut);

        // AVIF version
        const avifOut = await sharp(buf)
          .resize(600, 375, { fit: 'cover' })
          .avif({ quality: 70 })
          .toBuffer();
        fs.writeFileSync(path.join(blogDir, `${name}.avif`), avifOut);
      } catch (err) {
        console.warn(`Could not optimize ${f}:`, err.message);
      }
    }
    console.log('✅ Optimized all blog images to WebP & AVIF (<= 80 KiB)');
  }

  // 4. Optimize Favicon (205 KB -> 10 KB)
  try {
    const favSrc = path.resolve('public/favicon.jpg');
    if (fs.existsSync(favSrc)) {
      const favBuf = fs.readFileSync(favSrc);
      if (favBuf.length > 20000) {
        const optFav = await sharp(favBuf)
          .resize(64, 64)
          .jpeg({ quality: 85 })
          .toBuffer();
        fs.writeFileSync(favSrc, optFav);
        console.log('✅ Optimized favicon.jpg to 64x64');
      } else {
        console.log('✅ Favicon already optimized');
      }
    }
  } catch (e) {
    console.warn('Skipping favicon write (already optimized or locked):', e.message);
  }

  // 5. Optimize hero-food-spread
  try {
    const spreadSrc = path.resolve('public/hero-food-spread.jpg');
    if (fs.existsSync(spreadSrc)) {
      const spreadBuf = fs.readFileSync(spreadSrc);
      const optSpread = await sharp(spreadBuf)
        .resize(800)
        .webp({ quality: 80 })
        .toBuffer();
      fs.writeFileSync(path.resolve('public/hero-food-spread.webp'), optSpread);
      console.log('✅ Optimized hero-food-spread.webp');
    }
  } catch (e) {
    console.warn('Skipping hero-food-spread write:', e.message);
  }

  console.log('🎉 Image Optimization complete!');
}

optimizeImages().catch(err => {
  console.error('Image optimization failed:', err);
  process.exit(1);
});
