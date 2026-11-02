const fs = require('fs');

const css = fs.readFileSync('src/admin-theme.css', 'utf8');

const lines = css.split('\n');
lines.forEach((l, i) => {
  if (l.includes('overflow-x') || l.includes('min-width') || l.includes('white-space: nowrap') || l.includes('light-theme') || l.includes('[data-theme="light"]')) {
    if (i < 100 || i > lines.length - 200) {
      console.log(`Line ${i+1}: ${l}`);
    }
  }
});
