const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  const collections = new Set();
  const docRoots = new Set();

  files.forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) return;
    if (!f.endsWith('.js') && !f.endsWith('.html')) return;
    const content = fs.readFileSync(full, 'utf8');
    const colMatches = content.matchAll(/collection\s*\(\s*db\s*,\s*['"]([^'"]+)['"]/g);
    for (const m of colMatches) collections.add(m[1]);
    const docMatches = content.matchAll(/doc\s*\(\s*db\s*,\s*['"]([^'"]+)['"]/g);
    for (const m of docMatches) docRoots.add(m[1]);
  });
  return { collections: Array.from(collections), docRoots: Array.from(docRoots) };
}

const adminResult = scanDir('src/admin');
console.log('src/admin collections:', adminResult.collections);
console.log('src/admin doc roots:', adminResult.docRoots);

const srcResult = scanDir('src');
console.log('src collections:', srcResult.collections);
console.log('src doc roots:', srcResult.docRoots);
