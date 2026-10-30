const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// 1. Files to update in root and public
const htmlFiles = [
  'index.html',
  'blog.html',
  'blog-template.html',
  'menu.html',
  'catering.html',
  'locations.html',
  'specials.html',
  'faq.html',
  'shop.html',
  'privacy.html',
  'terms.html',
  'review.html',
  '404.html',
  'order-history.html',
  'order-status.html',
  'area-template.html',
  'item-template.html',
  'landing.html'
];

let updatedCount = 0;

htmlFiles.forEach(file => {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Canonical link
    content = content.replace(
      /<link\s+rel=["']canonical["']\s+href=["']https:\/\/bigiawasaana\.com([^"']*)["']>/gi,
      '<link rel="canonical" href="https://www.bigiawasaana.com$1">'
    );

    // og:url
    content = content.replace(
      /<meta\s+property=["']og:url["']\s+content=["']https:\/\/bigiawasaana\.com([^"']*)["']>/gi,
      '<meta property="og:url" content="https://www.bigiawasaana.com$1">'
    );

    // Schema URLs inside html
    content = content.replace(/"url":\s*"https:\/\/bigiawasaana\.com([^"]*)"/g, '"url": "https://www.bigiawasaana.com$1"');
    content = content.replace(/"item":\s*"https:\/\/bigiawasaana\.com([^"]*)"/g, '"item": "https://www.bigiawasaana.com$1"');
    content = content.replace(/"@id":\s*"https:\/\/bigiawasaana\.com([^"]*)"/g, '"@id": "https://www.bigiawasaana.com$1"');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated hostname in: ${file}`);
      updatedCount++;
    }
  }
});

// Also update functions/blog-template.html
const fnBlogTemplate = path.join(rootDir, 'functions', 'blog-template.html');
if (fs.existsSync(fnBlogTemplate)) {
  let content = fs.readFileSync(fnBlogTemplate, 'utf8');
  let original = content;
  content = content.replace(/https:\/\/bigiawasaana\.com/g, 'https://www.bigiawasaana.com');
  if (content !== original) {
    fs.writeFileSync(fnBlogTemplate, content, 'utf8');
    console.log(`Updated hostname in: functions/blog-template.html`);
  }
}

// 2. Update public/robots.txt and dist/robots.txt
['public/robots.txt', 'dist/robots.txt'].forEach(relPath => {
  const fullPath = path.join(rootDir, relPath);
  if (fs.existsSync(fullPath)) {
    let robots = fs.readFileSync(fullPath, 'utf8');
    robots = robots.replace(
      /Sitemap:\s*https:\/\/bigiawasaana\.com\/sitemap\.xml/gi,
      'Sitemap: https://www.bigiawasaana.com/sitemap.xml'
    );
    fs.writeFileSync(fullPath, robots, 'utf8');
    console.log(`Updated sitemap URL in: ${relPath}`);
  }
});

console.log(`Phase 1 HTML updates completed. Updated ${updatedCount} files.`);
