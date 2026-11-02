const fs = require('fs');
const css = fs.readFileSync('src/mobile-nav.css', 'utf8');
const lines = css.split('\n');
console.log("Lines 1-40:");
console.log(lines.slice(0, 40).join('\n'));
console.log("Lines 415-465:");
console.log(lines.slice(415, 465).join('\n'));
