const fs = require('fs');
const path = require('path');

const dirs = ['areas', 'public/areas'];
dirs.forEach(d => {
  if (fs.existsSync(d)) {
    fs.readdirSync(d).forEach(f => {
      if (f.endsWith('.html')) {
        const p = path.join(d, f);
        let c = fs.readFileSync(p, 'utf8');
        if (c.includes('/src/main.js')) {
          c = c.replace(/<script type="module" src="\/src\/main\.js"><\/script>\s*(<script type="module">[\s\S]*?initNav\(\);\s*<\/script>)?/, '<script type="module" src="/nav.bundle.js"></script>');
          fs.writeFileSync(p, c, 'utf8');
          console.log(`Updated ${p}`);
        }
      }
    });
  }
});
