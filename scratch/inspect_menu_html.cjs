const fs = require('fs');

const menuHtml = fs.readFileSync('menu.html', 'utf8');

// Find all occurrences of #menu-grid
const gridIdx = menuHtml.indexOf('id="menu-grid"');
console.log('id="menu-grid" index:', gridIdx);

const cards = [...menuHtml.matchAll(/class="menu-card"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g)];
console.log('Total menu-card regex matches:', cards.length);

const titles = [...menuHtml.matchAll(/class="menu-card-title"[^>]*>(.*?)<\/h3>/g)].map(m => m[1].trim());
console.log('Total menu-card-title count:', titles.length);
console.log('Sample titles:', titles.slice(0, 10));

const titleCounts = {};
titles.forEach(t => titleCounts[t] = (titleCounts[t] || 0) + 1);
console.log('\nTitle duplicate frequencies:');
console.log(titleCounts);
