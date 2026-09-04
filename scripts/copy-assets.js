import fs from 'fs';
import path from 'path';

const filesToCopy = [
  { src: 'src/style.css', dest: 'dist/src/style.css' },
  { src: 'src/mobile-nav.css', dest: 'dist/src/mobile-nav.css' },
  { src: 'src/nav.js', dest: 'dist/src/nav.js' },
  { src: 'logo.webp', dest: 'dist/logo.webp' },
  { src: 'favicon.jpg', dest: 'dist/favicon.jpg' },
  { src: 'dist/item-template.html', dest: 'functions/item-template.html' },
  { src: 'dist/blog-template.html', dest: 'functions/blog-template.html' },
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
      // Re-inject CSS links that Vite strips from SSR templates
      // These raw CSS files are copied to dist/src/ and served via Firebase Hosting
      if (!content.includes('/src/style.css') && !content.includes('style-')) {
        content = content.replace(
          '</head>',
          '  <link rel="stylesheet" href="/src/style.css">\n  <link rel="stylesheet" href="/src/mobile-nav.css">\n</head>'
        );
      }
      // Re-inject nav.js script if Vite stripped it
      if (!content.includes('/src/nav.js') && !content.includes('nav-')) {
        content = content.replace(
          '</body>',
          '  <script type="module">\n    import { initNav } from "/src/nav.js";\n    initNav();\n  </script>\n</body>'
        );
      }
      fs.writeFileSync(dest, content);
      console.log(`Copied ${src} to ${dest}`);
    } else {
      fs.copyFileSync(src, dest);
      console.log(`Copied ${src} to ${dest}`);
    }
  }
});
