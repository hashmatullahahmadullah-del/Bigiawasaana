const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('src/admin').filter(f => f.endsWith('.js'));
files.forEach(file => {
  const content = fs.readFileSync(path.join('src/admin', file), 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    if (l.includes('onSnapshot(')) {
      console.log(`${file}:${idx + 1}: ${l.trim()}`);
    }
  });
});
