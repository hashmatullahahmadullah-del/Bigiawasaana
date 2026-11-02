const fs = require('fs');

const menuHtml = fs.readFileSync('menu.html', 'utf8');
console.log('menu.html length:', menuHtml.length);
const cardMatches = menuHtml.match(/data-item-id="([^"]+)"/g) || [];
console.log('Total data-item-id in menu.html:', cardMatches.length);

const ids = cardMatches.map(m => m.replace(/data-item-id="([^"]+)"/, '$1'));
const idCounts = {};
ids.forEach(id => idCounts[id] = (idCounts[id] || 0) + 1);
const duplicateIds = Object.entries(idCounts).filter(([id, c]) => c > 1);
console.log('Duplicate IDs in menu.html:', duplicateIds);

const nameMatches = [...menuHtml.matchAll(/<h3[^>]*class="[^"]*menu-item-name[^"]*"[^>]*>(.*?)<\/h3>/gi)];
console.log('Found h3 item names:', nameMatches.length);
const names = nameMatches.map(m => m[1].replace(/<[^>]+>/g, '').trim());
const nameCounts = {};
names.forEach(n => nameCounts[n] = (nameCounts[n] || 0) + 1);
const duplicateNames = Object.entries(nameCounts).filter(([n, c]) => c > 1);
console.log('Duplicate names in menu.html:', duplicateNames);
