import fs from 'fs';
import path from 'path';

const filesToCopy = [
  { src: 'src/style.css', dest: 'dist/src/style.css' },
  { src: 'src/mobile-nav.css', dest: 'dist/src/mobile-nav.css' },
  { src: 'src/nav.js', dest: 'dist/src/nav.js' },
  { src: 'logo.webp', dest: 'dist/logo.webp' },
  { src: 'logo.png', dest: 'dist/logo.png' },
  { src: 'favicon.jpg', dest: 'dist/favicon.jpg' },
  { src: 'dist/item-template.html', dest: 'functions/item-template.html' },
  { src: 'dist/blog-template.html', dest: 'functions/blog-template.html' }
];

filesToCopy.forEach(({ src, dest }) => {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  if (fs.existsSync(src)) {
    // If copying an HTML template, rewrite the hashed CSS links to the unhashed stable paths
    if (src.endsWith('.html') && dest.startsWith('functions/')) {
      let content = fs.readFileSync(src, 'utf8');
      content = content.replace(/href="\/assets\/style-[a-zA-Z0-9-_]+\.css"/g, 'href="/src/style.css"');
      content = content.replace(/href="\/assets\/mobile-nav-[a-zA-Z0-9-_]+\.css"/g, 'href="/src/mobile-nav.css"');
      fs.writeFileSync(dest, content);
      console.log(`Copied and rewrote CSS links in ${src} to ${dest}`);
    } else {
      fs.copyFileSync(src, dest);
      console.log(`Copied ${src} to ${dest}`);
    }
  }
});
