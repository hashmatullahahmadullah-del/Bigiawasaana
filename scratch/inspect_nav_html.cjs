const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const start = content.indexOf('<nav');
const end = content.indexOf('</nav>');
console.log(content.substring(start, end + 6));
