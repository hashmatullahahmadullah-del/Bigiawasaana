const fs = require('fs');
const content = fs.readFileSync('dist/assets/main-BtC-w6S0.js', 'utf8');
const match = content.match(/([a-zA-Z0-9_$]+)\s*=\s*`sq0[^`]+`/g);
console.log('Matches:', match);
const matchLoc = content.match(/([a-zA-Z0-9_$]+)\s*=\s*`LVVN[^`]+`/g);
console.log('Location matches:', matchLoc);
