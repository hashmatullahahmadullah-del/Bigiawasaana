const fs = require('fs');

const builderJs = fs.readFileSync('src/catering-builder.js', 'utf8');

const match = builderJs.match(/function updatePriceBreakdown[\s\S]*?function /);
console.log(match ? match[0].slice(0, 800) : 'Not found');
