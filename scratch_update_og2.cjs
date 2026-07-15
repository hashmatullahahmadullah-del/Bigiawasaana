const fs = require('fs');
const files = ['functions/area-template.html','functions/blog-template.html','functions/item-template.html'];
files.forEach(f => {
  if(!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  
  if (content.includes('og:image')) {
    // Only replace literal URLs, skip things like {{OG_IMAGE}}
    content = content.replace(/content="https:\/\/bigiawasaana\.com\/[^"{}]+"/g, 'content="https://bigiawasaana.com/logo.png"');
    if (content !== original) {
      fs.writeFileSync(f, content);
      console.log('Updated', f);
    }
  }
});
