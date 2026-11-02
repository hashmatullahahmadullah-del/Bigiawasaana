const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

const collections = new Set();
files.forEach(file => {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const matches = content.matchAll(/collection\(db,\s*['"]([^'"]+)['"]\)/g);
  for (const m of matches) collections.add(m[1]);
  const docMatches = content.matchAll(/doc\(db,\s*['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/g);
  for (const m of docMatches) collections.add(m[1] + '/' + m[2]);
});
console.log('Admin queries:');
console.log([...collections].sort());
