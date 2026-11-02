const fs = require('fs');
const path = require('path');

const dir = 'src/admin';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

files.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('onSnapshot') || line.includes('getDoc') || line.includes('getDocs')) {
      console.log(`${f}:${idx + 1}: ${line.trim()}`);
    }
  });
});
