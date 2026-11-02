const fs = require('fs');
const content = fs.readFileSync('admin.html', 'utf8');

// Find all elements in view-catering or top-level with inline min-width or width > 350
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('min-width') || l.includes('width:') || l.includes('grid-template-columns')) {
    if (l.includes('px') && !l.includes('100%')) {
      const match = l.match(/(?:min-width|width):\s*(\d+)px/);
      if (match && parseInt(match[1], 10) > 350) {
        console.log(`admin.html:${idx+1} [${match[0]}]: ${l.trim()}`);
      }
    }
  }
});
