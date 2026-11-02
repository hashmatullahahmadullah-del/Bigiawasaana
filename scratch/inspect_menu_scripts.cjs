const fs = require('fs');

const menuHtml = fs.readFileSync('menu.html', 'utf8');

// Check script tags in menu.html
const scripts = [...menuHtml.matchAll(/<script[\s\S]*?<\/script>/gi)].map(m => m[0]);
console.log('Total script tags in menu.html:', scripts.length);
scripts.forEach((s, i) => {
  if (s.includes('type="application/ld+json"')) {
    console.log(`Script ${i}: JSON-LD schema (length: ${s.length})`);
  } else {
    console.log(`Script ${i}: (length: ${s.length})`);
    console.log(s.slice(0, 300) + '...\n');
  }
});
