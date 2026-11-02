const fs = require('fs');

const files = ['admin.html', 'catering.html', 'menu.html', 'index.html', 'waiver.html', 'kitchen.html', 'shop.html'];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('&times;') || line.includes('×') || line.includes('✕') || (line.includes('<button') && /close/i.test(line))) {
      console.log(`${file}:${idx + 1}: ${line.trim()}`);
    }
  });
}
