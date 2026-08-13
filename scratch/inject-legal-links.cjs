const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory() && !['node_modules', '.git', 'dist'].includes(f)) {
      replaceInDir(p);
    } else if (p.endsWith('.html')) {
      let content = fs.readFileSync(p, 'utf8');
      let changed = false;
      if (content.includes('/faq.html#privacy')) {
        content = content.replace(/\/faq\.html#privacy/g, '/privacy.html');
        changed = true;
      }
      if (content.includes('/faq.html#terms')) {
        content = content.replace(/\/faq\.html#terms/g, '/terms.html');
        changed = true;
      }
      if (changed) {
        fs.writeFileSync(p, content);
        console.log('Updated ' + p);
      }
    }
  });
}

replaceInDir(path.join(__dirname, '..'));
