const fs = require('fs');
const content = fs.readFileSync('admin.html', 'utf8');
const regex = /data-target="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g;
let m;
const navItems = [];
while ((m = regex.exec(content)) !== null) {
  const target = m[1];
  const labelMatch = m[2].match(/class="label"[^>]*>([^<]+)<\/span>/);
  const label = labelMatch ? labelMatch[1].trim() : m[2].replace(/<[^>]+>/g, '').trim();
  navItems.push({ target, label });
}
console.log('Admin Nav Sections:', navItems);
