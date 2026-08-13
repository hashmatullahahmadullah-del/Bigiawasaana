const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'areas');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the broken script tag
  content = content.replace(
    '<script type="module" crossorigin src="/assets/main.js"></script>',
    '<script type="module" src="/src/main.js"></script>'
  );

  fs.writeFileSync(filePath, content);
});
console.log(`Updated ${files.length} area files.`);
