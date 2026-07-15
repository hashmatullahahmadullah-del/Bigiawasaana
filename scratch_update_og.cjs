const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  
  if (content.includes('og:image')) {
    content = content.replace(/content="https:\/\/bigiawasaana\.com\/[^"]+"/g, 'content="https://bigiawasaana.com/logo.png"');
    if (content !== original) {
      fs.writeFileSync(f, content);
      console.log('Updated', f);
    }
  }
});
