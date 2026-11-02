const fs = require('fs');
const html = fs.readFileSync('catering.html', 'utf8');
const lines = html.split('\n');
let start = -1;
lines.forEach((l, i) => {
  if (l.includes('id="catering-form"') || l.includes('id="cat-name"')) {
    if (start === -1) start = i;
  }
});
console.log('Found catering form around line:', start);
for (let i = Math.max(0, start - 15); i < start + 65; i++) {
  if (lines[i]) console.log((i+1) + ': ' + lines[i]);
}
