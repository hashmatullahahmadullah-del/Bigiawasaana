const fs = require('fs');

const menuHtml = fs.readFileSync('menu.html', 'utf8');

const sectionMatch = menuHtml.match(/<section id="menu"[\s\S]*?<\/section>/);
if (sectionMatch) {
  const section = sectionMatch[0];
  console.log('Total section length:', section.length);
  // Count how many .menu-card are inside this section
  const cards = (section.match(/class="menu-card"/g) || []).length;
  console.log('.menu-card inside section#menu:', cards);

  // Check how many .menu-card are inside #menu-grid vs outside
  const gridStart = section.indexOf('id="menu-grid"');
  const gridRest = section.slice(gridStart);
  // Find where #menu-grid closes
  // If we parse divs
  let depth = 0;
  let gridCloseIdx = -1;
  const tagRegex = /<\/?div\b[^>]*>/gi;
  let match;
  tagRegex.lastIndex = 0;
  while ((match = tagRegex.exec(gridRest)) !== null) {
    if (match[0].startsWith('</')) {
      depth--;
      if (depth === 0) {
        gridCloseIdx = match.index + match[0].length;
        break;
      }
    } else {
      depth++;
    }
  }
  console.log('Depth at end of loop:', depth);
  console.log('gridCloseIdx:', gridCloseIdx);
  if (gridCloseIdx !== -1) {
    const insideGrid = gridRest.slice(0, gridCloseIdx);
    const outsideGrid = gridRest.slice(gridCloseIdx);
    console.log('.menu-card INSIDE #menu-grid:', (insideGrid.match(/class="menu-card"/g) || []).length);
    console.log('.menu-card OUTSIDE #menu-grid (orphaned in section):', (outsideGrid.match(/class="menu-card"/g) || []).length);
  }
}
