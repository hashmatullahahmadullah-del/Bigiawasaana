const fs = require('fs');
const html = fs.readFileSync('admin.html', 'utf8');

const lines = html.split('\n');
let depth = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/<div(\s|>)/gi) || []).length;
  const closes = (line.match(/<\/div>/gi) || []).length;
  if (line.includes('id="cat-tab-packages"')) {
    console.log('cat-tab-packages start at line ' + (i+1) + ', depth: ' + depth);
  }
  if (line.includes('id="cat-tab-catalog"')) {
    console.log('cat-tab-catalog start at line ' + (i+1) + ', depth: ' + depth);
  }
  if (line.includes('id="quote-editor-modal"')) {
    console.log('quote-editor-modal at line ' + (i+1) + ', depth: ' + depth);
  }
  depth += (opens - closes);
}
console.log('Final div depth (should be 0):', depth);
