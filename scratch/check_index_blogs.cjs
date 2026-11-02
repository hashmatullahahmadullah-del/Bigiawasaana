const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const start = content.indexOf('id="latest-blog-grid"');
const end = content.indexOf('</section>', start);
const grid = content.slice(start, end);
const count = (grid.match(/<h3/g) || []).length;
console.log('Total h3 blog titles in index.html #latest-blog-grid:', count);
