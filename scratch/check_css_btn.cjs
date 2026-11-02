const fs = require('fs');

['src/style.css', 'src/mobile-nav.css'].forEach(f => {
  if (fs.existsSync(f)) {
    const c = fs.readFileSync(f, 'utf8');
    if (c.includes('crm-btn-icon')) {
      console.log(`Found in ${f}`);
    }
  }
});
