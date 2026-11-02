const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('src/admin').filter(f => f.endsWith('.js'));
files.forEach(f => {
  const content = fs.readFileSync(path.join('src/admin', f), 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    if (l.includes('getDoc') || l.includes('onSnapshot') || l.includes('getDocs')) {
      console.log(`${f}:${idx + 1}: ${l.trim()}`);
    }
  });
});
