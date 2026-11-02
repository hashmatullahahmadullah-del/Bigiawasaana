const fs = require('fs');
const path = require('path');

function getAllFiles(dir, exts) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'scratch', '.gemini', 'brain'].includes(entry.name)) continue;
      files = files.concat(getAllFiles(fullPath, exts));
    } else if (exts.some(e => entry.name.endsWith(e))) {
      files.push(fullPath);
    }
  }
  return files;
}

const htmlFiles = getAllFiles('.', ['.html']);
const jsFiles = getAllFiles('src', ['.js']).concat(getAllFiles('functions', ['.js']));

console.log(`Auditing ${htmlFiles.length} HTML files and ${jsFiles.length} JS files...`);

const findings = {
  duplicateIcons: [],
  missingTypeButtonInForms: [],
  emptyOrNoAccessibleName: [],
  hardcodedInlineStyles: [],
  asyncHandlersWithoutLoading: []
};

// 1. Audit HTML files
htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Find all <button> tags
  const buttonRegex = /<button([^>]*)>([\s\S]*?)<\/button>/gi;
  let match;
  while ((match = buttonRegex.exec(content)) !== null) {
    const [fullBtn, attrs, inner] = match;
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    // Check for duplicate icon: SVG + "+ Word"
    const hasSvg = inner.includes('<svg') || /class=["'][^"']*icon[^"']*["']/.test(inner);
    const hasTextPlus = />\s*\+\s*[a-zA-Z]/i.test(inner) || /^\s*\+\s*[a-zA-Z]/i.test(inner.trim());
    if (hasSvg && hasTextPlus) {
      findings.duplicateIcons.push({
        file,
        line: lineNum,
        snippet: fullBtn.replace(/\s+/g, ' ').substring(0, 100)
      });
    }

    // Check for accessible name in icon-only buttons
    const textOnly = inner.replace(/<[^>]+>/g, '').trim();
    const hasAriaLabel = /aria-label=["'][^"']+["']/.test(attrs) || /title=["'][^"']+["']/.test(attrs);
    if (!textOnly && !hasAriaLabel) {
      findings.emptyOrNoAccessibleName.push({
        file,
        line: lineNum,
        snippet: fullBtn.replace(/\s+/g, ' ').substring(0, 100)
      });
    }

    // Check for type="button" vs default submit
    const hasType = /type=["'][^"']+["']/.test(attrs);
    if (!hasType) {
      // Check if inside a form
      const beforeStr = content.substring(0, match.index);
      const lastFormOpen = beforeStr.lastIndexOf('<form');
      const lastFormClose = beforeStr.lastIndexOf('</form>');
      if (lastFormOpen > lastFormClose) {
        findings.missingTypeButtonInForms.push({
          file,
          line: lineNum,
          snippet: fullBtn.replace(/\s+/g, ' ').substring(0, 100)
        });
      }
    }
  }
});

console.log('\n--- FINDINGS SUMMARY ---');
console.log(`Duplicate Icons (+ and SVG): ${findings.duplicateIcons.length}`);
findings.duplicateIcons.forEach(f => console.log(`  [${f.file}:${f.line}] ${f.snippet}`));

console.log(`\nButtons Missing Accessible Name: ${findings.emptyOrNoAccessibleName.length}`);
findings.emptyOrNoAccessibleName.slice(0, 15).forEach(f => console.log(`  [${f.file}:${f.line}] ${f.snippet}`));

console.log(`\nButtons Missing type="button" inside <form>: ${findings.missingTypeButtonInForms.length}`);
findings.missingTypeButtonInForms.slice(0, 15).forEach(f => console.log(`  [${f.file}:${f.line}] ${f.snippet}`));
