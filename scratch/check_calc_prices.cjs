const fs = require('fs');

const builderJs = fs.readFileSync('src/catering-builder.js', 'utf8');

const match = builderJs.match(/function calculatePackagePrices[\s\S]*?function /);
console.log(match ? match[0] : 'Not found');
