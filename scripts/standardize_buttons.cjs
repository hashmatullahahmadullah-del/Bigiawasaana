const fs = require('fs');
const path = require('path');

const targetHtmls = [
  'kitchen.html',
  'index.html',
  'menu.html',
  'catering.html',
  'shop.html',
  'order-history.html',
  'locations.html',
  'faq.html',
  'specials.html',
  'admin.html'
];

console.log('--- STANDARDIZING BUTTON ATTRIBUTES ACROSS HTML ---');

targetHtmls.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  // 1. Add type="button" to buttons missing type
  content = content.replace(/<button\b([^>]*)>/gi, (match, attrs) => {
    if (!/type\s*=/i.test(attrs)) {
      modified = true;
      // If it looks like a submit button inside a form, let it be submit, otherwise type="button"
      if (/class=["'][^"']*\b(btn-primary|btn-submit)\b[^"']*["']/i.test(attrs) && !attrs.includes('onclick=')) {
        return `<button type="submit"${attrs}>`;
      }
      return `<button type="button"${attrs}>`;
    }
    return match;
  });

  // 2. Add aria-label to close buttons missing it
  content = content.replace(/<button([^>]*class=["'][^"']*crm-btn-icon[^"']*["'][^>]*)>([\s\S]*?)<\/button>/gi, (match, attrs, inner) => {
    if (!/aria-label\s*=/i.test(attrs)) {
      modified = true;
      const label = attrs.includes('title=') ? attrs.match(/title=["']([^"']+)["']/)[1] : 'Close dialog';
      return `<button${attrs} aria-label="${label}">${inner}</button>`;
    }
    return match;
  });

  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✅ Standardized: ${file}`);
  }
});
