const fs = require('fs');

// 1. Update scripts/copy-assets.js
let copyAssets = fs.readFileSync('scripts/copy-assets.js', 'utf8');
const oldCopyBlock = `if (fs.existsSync('dist/nav.bundle.js')) {
  if (!fs.existsSync('dist/assets')) fs.mkdirSync('dist/assets', { recursive: true });
  fs.copyFileSync('dist/nav.bundle.js', 'dist/assets/blogTemplate-Dmm92rt3.js');
  fs.copyFileSync('dist/nav.bundle.js', 'dist/assets/nav-DJU4XDt9.js');
  console.log('Aliased nav.bundle.js to legacy blogTemplate and nav asset hashes');
}`;

copyAssets = copyAssets.replace(
  /if \(fs\.existsSync\('dist\/nav\.bundle\.js'\)\) \{[\s\S]*?console\.log\('Aliased nav\.bundle\.js to legacy blogTemplate and nav asset hashes'\);\s*\}/,
  `if (fs.existsSync('dist/nav.bundle.js')) {
  if (!fs.existsSync('dist/assets')) fs.mkdirSync('dist/assets', { recursive: true });
  if (!fs.existsSync('dist/src')) fs.mkdirSync('dist/src', { recursive: true });
  fs.copyFileSync('dist/nav.bundle.js', 'dist/assets/blogTemplate-Dmm92rt3.js');
  fs.copyFileSync('dist/nav.bundle.js', 'dist/assets/nav-DJU4XDt9.js');
  fs.copyFileSync('dist/nav.bundle.js', 'dist/src/main.js');
  fs.copyFileSync('dist/nav.bundle.js', 'dist/src/nav.js');
  console.log('Aliased nav.bundle.js to legacy blogTemplate, nav asset hashes, and dist/src/main.js');
}`
);
fs.writeFileSync('scripts/copy-assets.js', copyAssets, 'utf8');
console.log('Updated scripts/copy-assets.js');

// 2. Update item-template.html
let itemTemplate = fs.readFileSync('item-template.html', 'utf8');
itemTemplate = itemTemplate.replace('<script type="module" src="/src/main.js"></script>', '<script type="module" src="/nav.bundle.js"></script>');
fs.writeFileSync('item-template.html', itemTemplate, 'utf8');
console.log('Updated item-template.html');

// 3. Update area-template.html
let areaTemplate = fs.readFileSync('area-template.html', 'utf8');
areaTemplate = areaTemplate.replace(/<script type="module" src="\/src\/main\.js"><\/script>\s*<script type="module">[\s\S]*?initNav\(\);\s*<\/script>/, '<script type="module" src="/nav.bundle.js"></script>');
fs.writeFileSync('area-template.html', areaTemplate, 'utf8');
console.log('Updated area-template.html');

// 4. Update blog-template.html
let blogTemplate = fs.readFileSync('blog-template.html', 'utf8');
blogTemplate = blogTemplate.replace(/<script type="module" src="\/src\/main\.js"><\/script>\s*<script type="module">[\s\S]*?initNav\(\);\s*<\/script>/, '<script type="module" src="/nav.bundle.js"></script>');
fs.writeFileSync('blog-template.html', blogTemplate, 'utf8');
console.log('Updated blog-template.html');

// 5. Update functions templates if present
const fnTemplates = ['functions/blog-template.html', 'functions/item-template.html', 'functions/area-template.html'];
fnTemplates.forEach(f => {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(/<script type="module" src="\/src\/main\.js"><\/script>\s*(<script type="module">[\s\S]*?initNav\(\);\s*<\/script>)?/, '<script type="module" src="/nav.bundle.js"></script>');
    fs.writeFileSync(f, c, 'utf8');
    console.log(`Updated ${f}`);
  }
});
