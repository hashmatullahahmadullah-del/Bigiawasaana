const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes('site-lang-toggle') || l.includes('lang-toggle') || l.includes('Switch language')) {
    console.log(`Line ${i + 1}: ${l}`);
  }
});
