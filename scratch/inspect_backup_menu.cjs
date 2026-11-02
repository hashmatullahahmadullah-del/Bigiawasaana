const { execSync } = require('child_process');
const menu = execSync('git show 899c8e3:menu.html', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
const lines = menu.split('\n');
console.log('Total lines in 899c8e3:menu.html:', lines.length);
lines.forEach((l, i) => {
  if (l.includes('<section id="menu"') || l.includes('id="menu-grid"') || l.includes('id="seo-item-links"')) {
    console.log((i+1) + ': ' + l.trim());
  }
});
