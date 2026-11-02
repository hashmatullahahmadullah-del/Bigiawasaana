const fs = require('fs');

const files = [
  'index.html',
  'menu.html',
  'src/main.js',
  'src/menu.js',
  'scripts/prerender-menu.cjs',
  'scripts/menu-items-data.cjs'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
      if (l.toLowerCase().includes('featured')) {
        console.log(f + ':' + (idx + 1) + ': ' + l.trim().slice(0, 100));
      }
    });
  }
});
