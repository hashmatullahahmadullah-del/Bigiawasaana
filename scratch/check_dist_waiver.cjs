const fs = require('fs');

const html = fs.readFileSync('dist/waiver.html', 'utf8');

console.log('tab-btn-cash in dist/waiver.html:', html.includes('id="tab-btn-cash"'));
