const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDir = fs.statSync(dirPath).isDirectory();
    if (isDir) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist') {
        walkDir(dirPath, callback);
      }
    } else {
      callback(path.join(dir, f));
    }
  });
}

let modifiedCount = 0;
walkDir('.', (filePath) => {
  if (filePath.endsWith('.html')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('site-lang-toggle btn-outline')) {
      content = content.replace(/class="site-lang-toggle btn-outline"/g, 'class="site-lang-toggle"');
      fs.writeFileSync(filePath, content, 'utf8');
      modifiedCount++;
      console.log(`Updated ${filePath}`);
    }
  }
});

console.log(`Finished updating ${modifiedCount} HTML files.`);
