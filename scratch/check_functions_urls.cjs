const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('functions').filter(f => f.endsWith('.js'));
files.forEach(f => {
  const content = fs.readFileSync(path.join('functions', f), 'utf8');
  const urls = [...content.matchAll(/https?:\/\/[^\s"'`<>]+/g)].map(m => m[0]);
  const matched = urls.filter(u => u.includes('bigiawasaana.com'));
  if (matched.length > 0) {
    console.log(`=== ${f} ===`);
    Array.from(new Set(matched)).forEach(u => console.log('  ' + u));
  }
});
