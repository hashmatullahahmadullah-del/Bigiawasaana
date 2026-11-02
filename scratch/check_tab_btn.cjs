const fs = require('fs');

const html = fs.readFileSync('waiver.html', 'utf8');

console.log('tab-btn-cash in waiver.html:', html.includes('id="tab-btn-cash"'));
