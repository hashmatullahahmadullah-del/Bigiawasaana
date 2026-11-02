const { execSync } = require('child_process');
const menu = execSync('git show cbf44d5:menu.html', { encoding: 'utf8' });
const lines = menu.split('\n');
lines.forEach((l, i) => {
  if (l.includes('<section id="menu"') || l.includes('id="menu-grid"')) {
    console.log((i+1) + ': ' + l.trim());
    console.log(lines.slice(i, i + 10).join('\n'));
  }
});
