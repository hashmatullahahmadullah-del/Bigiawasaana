const fs = require('fs');
let content = fs.readFileSync('functions/package.json', 'utf8');
content = content.replace(/"node":\s*"20"/, '"node": "22"');
fs.writeFileSync('functions/package.json', content, 'utf8');
console.log('Updated functions/package.json to Node 22');
