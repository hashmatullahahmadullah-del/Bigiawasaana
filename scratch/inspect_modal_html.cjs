const fs = require('fs');
const html = fs.readFileSync('catering.html', 'utf8');
const lines = html.split('\n');
let start = -1;
lines.forEach((l, i) => {
  if (l.includes('id="catering-package-builder-modal"')) {
    start = i;
  }
});
console.log('Found modal at line:', start);
for (let i = start; i < start + 120; i++) {
  if (lines[i]) console.log((i+1) + ': ' + lines[i]);
}
