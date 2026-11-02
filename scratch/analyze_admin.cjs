const fs = require('fs');

const html = fs.readFileSync('admin.html', 'utf8');
const navMatches = [...html.matchAll(/data-target="([^"]+)"/g)].map(m => m[1]);
console.log('Admin nav targets:', navMatches);

const sections = [...html.matchAll(/id="([^"]+-view)"/g)].map(m => m[1]);
console.log('Admin view sections:', sections);
