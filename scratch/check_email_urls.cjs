const fs = require('fs');

const content = fs.readFileSync('functions/emailTemplate.js', 'utf8');
const urls = [...content.matchAll(/https?:\/\/[^\s"'`<>]+/g)].map(m => m[0]);
console.log('URLs in functions/emailTemplate.js:');
Array.from(new Set(urls)).forEach(u => console.log('  ' + u));
