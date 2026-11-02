const fs = require('fs');

function searchAll(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = dir + '/' + f;
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist' && f !== 'scratch') searchAll(full);
    } else if (f.endsWith('.html') || f.endsWith('.js') || f.endsWith('.css')) {
      const c = fs.readFileSync(full, 'utf8');
      if (c.includes('site-lang-toggle') || c.includes('EN | فا') || c.includes('EN |') || c.includes('| فا')) {
        console.log(`Found in: ${full}`);
      }
    }
  }
}

searchAll('.');
