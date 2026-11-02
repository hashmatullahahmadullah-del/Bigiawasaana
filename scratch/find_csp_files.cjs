const fs = require('fs');
const path = require('path');

function searchCSP(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist' && f !== 'scratch') searchCSP(full);
    } else if (f.endsWith('.json') || f.endsWith('.html') || f.endsWith('.js') || f.endsWith('.cjs')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('connect-src')) {
        console.log(`Found connect-src in ${full}`);
      }
    }
  }
}

searchCSP('.');
