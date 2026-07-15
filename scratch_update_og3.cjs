const fs = require('fs');
const files = [
  ...fs.readdirSync('.').filter(f => f.endsWith('.html')),
  'functions/area-template.html',
  'functions/blog-template.html',
  'functions/item-template.html'
];
files.forEach(f => {
  if(!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  
  content = content.replace(/(<meta\s+property="og:image"\s+content=")https:\/\/bigiawasaana\.com\/[^"{}]+(")/g, '$1https://bigiawasaana.com/logo.png$2');
  content = content.replace(/(<meta\s+name="twitter:image"\s+content=")https:\/\/bigiawasaana\.com\/[^"{}]+(")/g, '$1https://bigiawasaana.com/logo.png$2');
  content = content.replace(/(<meta\s+name="thumbnail"\s+content=")https:\/\/bigiawasaana\.com\/[^"{}]+(")/g, '$1https://bigiawasaana.com/logo.png$2');
  
  if (content !== original) {
    fs.writeFileSync(f, content);
    console.log('Updated', f);
  }
});
