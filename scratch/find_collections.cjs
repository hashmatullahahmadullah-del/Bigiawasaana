const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.git') && !fullPath.includes('dist')) {
        results = results.concat(walk(fullPath));
      }
    } else if (file.endsWith('.js') || file.endsWith('.html')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk('./src').concat(walk('.').filter(f => f.endsWith('.html')));
const collections = new Set();
const docPaths = new Set();

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const cRegex = /collection\(\s*db\s*,\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = cRegex.exec(content)) !== null) {
    collections.add(`${match[1]} (in ${f})`);
  }
  
  const dRegex = /doc\(\s*db\s*,\s*['"]([^'"]+)['"](?:\s*,\s*['"]([^'"]+)['"])?/g;
  while ((match = dRegex.exec(content)) !== null) {
    if (match[2]) {
      docPaths.add(`${match[1]}/${match[2]} (in ${f})`);
    } else {
      docPaths.add(`${match[1]} (in ${f})`);
    }
  }
});

console.log('=== COLLECTIONS ===');
Array.from(collections).sort().forEach(c => console.log('  ' + c));
console.log('\n=== DOC PATHS ===');
Array.from(docPaths).sort().forEach(d => console.log('  ' + d));
