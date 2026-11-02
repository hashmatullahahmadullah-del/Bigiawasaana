const fs = require('fs');
const html = fs.readFileSync('admin.html', 'utf8');
const lines = html.split('\n');
const found = [];

lines.forEach((line, idx) => {
  if (line.includes('background') || line.includes('var(--surface') || line.includes('var(--bg')) {
    // check if it uses dark hex or var(--surface) or var(--bg)
    if (line.includes('#1') || line.includes('#2') || line.includes('#0') || line.includes('var(--surface)') || line.includes('var(--bg)') || line.includes('var(--white)')) {
      found.push({ line: idx + 1, content: line.trim() });
    }
  }
});

console.log('Found ' + found.length + ' occurrences');
found.forEach(f => console.log(`L${f.line}: ${f.content.substring(0, 120)}`));
