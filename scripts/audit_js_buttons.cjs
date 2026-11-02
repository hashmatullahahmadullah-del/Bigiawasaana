const fs = require('fs');
const path = require('path');

function getJsFiles(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'scratch', 'tests'].includes(entry.name)) continue;
      files = files.concat(getJsFiles(full));
    } else if (entry.name.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

const jsFiles = getJsFiles('src');
console.log('=== DYNAMIC BUTTON AUDIT IN SRC JS ===');

let totalDynamic = 0;
const fileCounts = {};

jsFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const buttonMatches = content.match(/<button[\s\S]*?<\/button>/gi) || [];
  const createMatches = content.match(/createElement\(["']button["']\)/gi) || [];
  const count = buttonMatches.length + createMatches.length;
  if (count > 0) {
    fileCounts[f] = { buttonMatches: buttonMatches.length, createMatches: createMatches.length };
    totalDynamic += count;
  }
});

Object.entries(fileCounts)
  .sort((a, b) => (b[1].buttonMatches + b[1].createMatches) - (a[1].buttonMatches + a[1].createMatches))
  .forEach(([file, c]) => {
    console.log(`${file.padEnd(35)}: ${c.buttonMatches} template buttons, ${c.createMatches} createElement`);
  });

console.log(`\nTotal dynamic button sites in JS: ${totalDynamic}`);
