const fs = require('fs');

const d = fs.readFileSync('dist/menu.html', 'utf8');
const cardMatches = d.match(/data-item-id="([^"]+)"/g) || [];
console.log('dist/menu.html data-item-id count:', cardMatches.length);

const ids = cardMatches.map(m => m.replace(/data-item-id="([^"]+)"/, '$1'));
const idCounts = {};
ids.forEach(id => idCounts[id] = (idCounts[id] || 0) + 1);
const duplicateIds = Object.entries(idCounts).filter(([id, c]) => c > 1);
console.log('Duplicate IDs in dist/menu.html:', duplicateIds);

const titles = [...d.matchAll(/class="menu-card-title"[^>]*>(.*?)<\/h3>/g)].map(m => m[1].trim());
console.log('Total menu-card-title count in dist/menu.html:', titles.length);

const titleCounts = {};
titles.forEach(t => titleCounts[t] = (titleCounts[t] || 0) + 1);
const duplicateTitles = Object.entries(titleCounts).filter(([t, c]) => c > 1);
console.log('Duplicate titles in dist/menu.html:', duplicateTitles);
console.log('\nAll 21 item titles:');
titles.forEach((t, i) => console.log(`${i+1}. ${t}`));
