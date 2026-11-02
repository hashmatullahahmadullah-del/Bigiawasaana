const fs = require('fs');
const content = fs.readFileSync('blog.html', 'utf8');
const idx = content.indexOf('id="blog-feed-container"');
console.log(content.slice(idx, idx + 1000));
