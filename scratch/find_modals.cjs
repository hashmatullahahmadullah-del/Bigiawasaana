const fs = require('fs');
const code = fs.readFileSync('menu.html', 'utf8');
const matches = code.match(/id="[^"]*modal[^"]*"/gi);
console.log(matches);
