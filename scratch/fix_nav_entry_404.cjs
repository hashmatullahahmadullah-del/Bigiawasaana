const fs = require('fs');

// 1. Update scripts/copy-assets.js to copy dist/nav.bundle.js to dist/src/nav-entry.js
let copyAssets = fs.readFileSync('scripts/copy-assets.js', 'utf8');
copyAssets = copyAssets.replace(
  "fs.copyFileSync('dist/nav.bundle.js', 'dist/src/nav.js');",
  "fs.copyFileSync('dist/nav.bundle.js', 'dist/src/nav.js');\n  fs.copyFileSync('dist/nav.bundle.js', 'dist/src/nav-entry.js');"
);
fs.writeFileSync('scripts/copy-assets.js', copyAssets, 'utf8');
console.log('Updated scripts/copy-assets.js');

// 2. Update blog-template.html and functions/blog-template.html
['blog-template.html', 'functions/blog-template.html'].forEach(f => {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(/\/src\/nav-entry\.js/g, '/nav.bundle.js');
    fs.writeFileSync(f, c, 'utf8');
    console.log(`Updated ${f} to /nav.bundle.js`);
  }
});

// Also manually copy right now to dist/src/nav-entry.js
if (fs.existsSync('dist/nav.bundle.js')) {
  if (!fs.existsSync('dist/src')) fs.mkdirSync('dist/src', { recursive: true });
  fs.copyFileSync('dist/nav.bundle.js', 'dist/src/nav-entry.js');
  console.log('Copied dist/nav.bundle.js to dist/src/nav-entry.js');
}
