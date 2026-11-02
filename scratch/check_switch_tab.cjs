const fs = require('fs');

const cateringJs = fs.readFileSync('src/admin/catering.js', 'utf8');

const match = cateringJs.match(/function switchCateringTab[\s\S]*?window\.switchCateringTab/);
console.log(match ? match[0] : 'Not found');
