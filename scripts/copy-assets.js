import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// 1. Build standalone nav.bundle.js for SSR templates and stable loading
try {
  console.log('Building dist/nav.bundle.js with esbuild...');
  execSync('npx esbuild src/nav-entry.js --bundle --minify --format=esm --outfile=dist/nav.bundle.js', { stdio: 'inherit' });
} catch (e) {
  console.error('Failed to bundle nav.bundle.js:', e);
}

const filesToCopy = [
  { src: 'src/style.css', dest: 'dist/src/style.css' },
  { src: 'src/mobile-nav.css', dest: 'dist/src/mobile-nav.css' },
  { src: 'src/account-auth.css', dest: 'dist/src/account-auth.css' },
  { src: 'src/nav.js', dest: 'dist/src/nav.js' },
  { src: 'logo.webp', dest: 'dist/logo.webp' },
  { src: 'favicon.jpg', dest: 'dist/favicon.jpg' },
  { src: 'blog-template.html', dest: 'dist/blog-template.html' },
  { src: 'blog-template.html', dest: 'functions/blog-template.html' },
  { src: 'dist/item-template.html', dest: 'functions/item-template.html' },
  { src: 'dist/blog.html', dest: 'functions/blog.html' },
  { src: 'dist/area-template.html', dest: 'functions/area-template.html' },
  { src: 'src/lib/deals-evaluator.js', dest: 'functions/deals-evaluator.js' }
];

filesToCopy.forEach(({ src, dest }) => {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  if (fs.existsSync(src)) {
    if (src.endsWith('.html') && dest.startsWith('functions/')) {
      let content = fs.readFileSync(src, 'utf8');

      // Ensure Google Fonts are in SSR templates
      if (!content.includes('fonts.googleapis.com')) {
        content = content.replace(
          '</head>',
          '  <link rel="preconnect" href="https://fonts.googleapis.com">\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=Lalezar&family=Outfit:wght@300;400;600;700&family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet">\n</head>'
        );
      }

      // Re-inject stable CSS links so SSR functions NEVER 404 regardless of Vite asset hashing
      if (!content.includes('/src/style.css')) {
        content = content.replace(
          '</head>',
          '  <link rel="stylesheet" href="/src/style.css">\n  <link rel="stylesheet" href="/src/mobile-nav.css">\n  <link rel="stylesheet" href="/src/account-auth.css">\n</head>'
        );
      }

      // Re-inject nav script if missing
      if (!content.includes('nav.bundle.js') && !content.includes('/src/nav.js')) {
        content = content.replace(
          '</body>',
          '  <script type="module" src="/nav.bundle.js"></script>\n</body>'
        );
      }
      fs.writeFileSync(dest, content);
      console.log(`Copied and processed ${src} to ${dest}`);
    } else {
      fs.copyFileSync(src, dest);
      console.log(`Copied ${src} to ${dest}`);
    }
  }
});

fs.copyFileSync('dist/shop.html', 'functions/shop-template.html');
console.log('Copied shop-template.html');

// Copy public/m-img to dist/m-img
if (fs.existsSync('public/m-img')) {
  fs.cpSync('public/m-img', 'dist/m-img', { recursive: true });
  console.log('Copied public/m-img to dist/m-img');
}

// Create fallback aliases in dist/assets for known previous CSS and JS hashes to prevent any 404s
const distAssets = fs.existsSync('dist/assets') ? fs.readdirSync('dist/assets') : [];
const latestStyleCss = distAssets.find(f => f.startsWith('style-') && f.endsWith('.css'));
if (latestStyleCss) {
  fs.copyFileSync(path.join('dist/assets', latestStyleCss), path.join('dist/assets', 'style-ro-evaky.css'));
  fs.copyFileSync(path.join('dist/assets', latestStyleCss), path.join('dist/assets', 'style-BtRm5i1F.css'));
  console.log(`Aliased ${latestStyleCss} to legacy CSS hashes`);
}
const latestMobileNavCss = distAssets.find(f => f.startsWith('mobile-nav-') && f.endsWith('.css'));
if (latestMobileNavCss) {
  fs.copyFileSync(path.join('dist/assets', latestMobileNavCss), path.join('dist/assets', 'mobile-nav-DddCCUSr.css'));
  console.log(`Aliased ${latestMobileNavCss} to legacy mobile-nav CSS hash`);
}
if (fs.existsSync('dist/nav.bundle.js')) {
  if (!fs.existsSync('dist/assets')) fs.mkdirSync('dist/assets', { recursive: true });
  fs.copyFileSync('dist/nav.bundle.js', 'dist/assets/blogTemplate-Dmm92rt3.js');
  fs.copyFileSync('dist/nav.bundle.js', 'dist/assets/nav-DJU4XDt9.js');
  console.log('Aliased nav.bundle.js to legacy blogTemplate and nav asset hashes');
}
