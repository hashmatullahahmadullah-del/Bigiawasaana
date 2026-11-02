const fs = require('fs');
const path = require('path');

// 1. item-template.html
let it = fs.readFileSync('item-template.html', 'utf8');
it = it.replace(/\/nav\.bundle\.js/g, '/src/nav-entry.js');
it = it.replace(/\/src\/main\.js/g, '/src/nav-entry.js');
fs.writeFileSync('item-template.html', it, 'utf8');
console.log('Updated item-template.html');

// 2. area-template.html
let at = fs.readFileSync('area-template.html', 'utf8');
at = at.replace(/\/nav\.bundle\.js/g, '/src/nav-entry.js');
at = at.replace(/\/src\/main\.js/g, '/src/nav-entry.js');
fs.writeFileSync('area-template.html', at, 'utf8');
console.log('Updated area-template.html');

// 3. blog-template.html
let bt = fs.readFileSync('blog-template.html', 'utf8');
bt = bt.replace(/\/nav\.bundle\.js/g, '/src/nav-entry.js');
bt = bt.replace(/\/src\/main\.js/g, '/src/nav-entry.js');
fs.writeFileSync('blog-template.html', bt, 'utf8');
console.log('Updated blog-template.html');

// 4. areas/*.html and public/areas/*.html
['areas', 'public/areas'].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(f => {
      if (f.endsWith('.html')) {
        const p = path.join(dir, f);
        let c = fs.readFileSync(p, 'utf8');
        c = c.replace(/\/nav\.bundle\.js/g, '/src/nav-entry.js');
        c = c.replace(/\/src\/main\.js/g, '/src/nav-entry.js');
        fs.writeFileSync(p, c, 'utf8');
      }
    });
    console.log(`Updated all ${dir}/*.html to /src/nav-entry.js`);
  }
});

// 5. scripts/prerender-items.cjs
let pi = fs.readFileSync('scripts/prerender-items.cjs', 'utf8');
pi = pi.replace(
  "const templatePath = path.join(process.cwd(), 'item-template.html');",
  "const distTmpl = path.join(process.cwd(), 'dist', 'item-template.html');\nconst templatePath = fs.existsSync(distTmpl) ? distTmpl : path.join(process.cwd(), 'item-template.html');"
);
fs.writeFileSync('scripts/prerender-items.cjs', pi, 'utf8');
console.log('Updated scripts/prerender-items.cjs');
