const fs = require('fs');

['src/style.css', 'src/admin.css', 'src/admin-theme.css', 'admin.html'].forEach(f => {
  if (fs.existsSync(f)) {
    const c = fs.readFileSync(f, 'utf8');
    const idx = c.indexOf('.crm-table');
    if (idx !== -1) {
      console.log(`Found in ${f}:`);
      console.log(c.slice(idx, idx + 300));
    }
  }
});
