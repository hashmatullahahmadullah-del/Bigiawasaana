const fs = require('fs');

let sharedJs = fs.readFileSync('functions/shared.js', 'utf8');

sharedJs = sharedJs.replace(
  /const config = functions\.config\(\)\.square \|\| \{\};/g,
  "let config = {};\n  try { config = functions.config().square || {}; } catch(e) { /* ignore config error */ }"
);

fs.writeFileSync('functions/shared.js', sharedJs, 'utf8');
console.log('Fixed shared.js');
