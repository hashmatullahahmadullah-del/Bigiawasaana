const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
const target = '<header class="hero">';
const replacement = `<header class="hero">
    <picture class="hero-picture">
      <source type="image/avif" srcset="/images/hero/hero-400.avif 400w, /images/hero/hero-800.avif 800w, /images/hero/hero-1200.avif 1200w" sizes="100vw">
      <source type="image/webp" srcset="/images/hero/hero-400.webp 400w, /images/hero/hero-800.webp 800w, /images/hero/hero-1200.webp 1200w" sizes="100vw">
      <img src="/hero-food-spread.webp" alt="Authentic Afghan Food and Charcoal Grill Feast in Los Angeles" class="hero-bg-img" width="1024" height="768" fetchpriority="high">
    </picture>`;

if (html.includes(target) && !html.includes('hero-picture')) {
  html = html.replace(target, replacement);
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('✅ Added responsive hero picture element to index.html');
} else {
  console.log('Already updated or target not found');
}
