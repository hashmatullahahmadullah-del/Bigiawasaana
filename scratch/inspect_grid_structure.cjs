const fs = require('fs');

const menuHtml = fs.readFileSync('menu.html', 'utf8');
const gridIdx = menuHtml.indexOf('id="menu-grid"');
console.log('Index of menu-grid:', gridIdx);

// Look at the 200 characters before and after id="menu-grid"
console.log('Before menu-grid:\n', menuHtml.slice(Math.max(0, gridIdx - 200), gridIdx));
console.log('After menu-grid:\n', menuHtml.slice(gridIdx, gridIdx + 500));

// Find where #menu-grid is supposed to end
const afterGrid = menuHtml.slice(gridIdx);
// Let's see the next section after menu-grid
const nextSectionIdx = afterGrid.indexOf('<section id="catering"');
console.log('\nNext section (<section id="catering") index relative to grid:', nextSectionIdx);
const nextDivIdx = afterGrid.indexOf('<div id="seo-item-links"');
console.log('Index of #seo-item-links relative to grid:', nextDivIdx);
