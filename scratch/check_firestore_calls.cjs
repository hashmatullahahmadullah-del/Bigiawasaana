const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('onSnapshot(') || line.includes('getDocs(') || line.includes('getDoc(')) {
      console.log(file + ':' + (idx + 1) + ': ' + line.trim().slice(0, 100));
    }
  });
});
