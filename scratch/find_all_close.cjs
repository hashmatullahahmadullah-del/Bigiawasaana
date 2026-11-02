const fs = require('fs');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = dir + '/' + file;
    if (fs.statSync(full).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') searchDir(full);
    } else if (file.endsWith('.html') || file.endsWith('.js')) {
      const content = fs.readFileSync(full, 'utf8');
      const matches = content.match(/<button[^>]*>[^<]*[×✕xX][^<]*<\/button>/g);
      if (matches) {
        console.log(`=== ${full} ===`);
        matches.forEach(m => console.log(m));
      }
    }
  }
}

searchDir('.');
