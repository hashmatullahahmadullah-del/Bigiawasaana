const { execSync } = require('child_process');
const menu = execSync('git show cbf44d5:menu.html', { encoding: 'utf8' });
const lines = menu.split('\n');
console.log(lines.slice(450, 520).join('\n'));
