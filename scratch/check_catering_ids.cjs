const fs = require('fs');
const html = fs.readFileSync('admin.html', 'utf8');
const start = html.indexOf('id="catering-view"');
const end = html.indexOf('id="marketing-view"');
const cateringViewHTML = html.slice(start, end);
const ids = cateringViewHTML.match(/id="[^"]+"/g);
console.log('IDs in catering-view:', ids);
