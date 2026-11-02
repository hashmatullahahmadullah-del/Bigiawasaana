const fs = require('fs');

['admin.html', 'catering.html', 'index.html', 'quote.html', 'menu.html'].forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.match(/<button[^>]*class=["'][^"']*(?:close|modal-close|close-btn)[^"']*["'][^>]*>[\s\S]*?<\/button>/gi);
  if (matches) {
    console.log(`=== ${file} ===`);
    matches.forEach(m => console.log(m.replace(/\s+/g, ' ').slice(0, 150)));
  }
});
