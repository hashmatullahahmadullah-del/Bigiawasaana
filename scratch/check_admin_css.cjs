const fs = require('fs');

const adminHtml = fs.readFileSync('admin.html', 'utf8');

const headMatch = adminHtml.match(/<head[\s\S]*?<\/head>/i);
if (headMatch) {
  const styles = headMatch[0].match(/<style[\s\S]*?<\/style>/gi);
  if (styles) {
    styles.forEach((s, i) => console.log(`Style ${i}: length ${s.length}`));
  }
  const links = headMatch[0].match(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi);
  if (links) {
    links.forEach(l => console.log(l));
  }
}
