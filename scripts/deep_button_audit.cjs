const fs = require('fs');

const pages = [
  'index.html',
  'menu.html',
  'catering.html',
  'shop.html',
  'quote.html',
  'waiver.html',
  'kitchen.html',
  'order-history.html',
  'order-status.html',
  'locations.html',
  'faq.html',
  'specials.html',
  'review.html',
  'admin.html'
];

const report = {};

pages.forEach(page => {
  if (!fs.existsSync(page)) return;
  const content = fs.readFileSync(page, 'utf8');
  const items = [];

  // Match all <button> and <a class="*btn*">
  const tagRegex = /<(button|a)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    const [fullTag, tagType, attrs, inner] = match;
    const isButton = tagType.toLowerCase() === 'button';
    const isBtnLink = !isButton && /class=["'][^"']*\bbtn\b[^"']*["']/.test(attrs);

    if (isButton || isBtnLink) {
      const line = content.substring(0, match.index).split('\n').length;
      const textOnly = inner.replace(/<[^>]+>/g, '').trim();
      const hasSvg = inner.includes('<svg');
      const hasDuplicatePlus = hasSvg && />\s*\+\s*[a-zA-Z]/i.test(inner);
      const isIconOnly = !textOnly && hasSvg;
      const hasAriaLabel = /aria-label=["'][^"']+["']/.test(attrs);
      const hasType = isButton ? /type=["'][^"']+["']/.test(attrs) : true;
      const classMatch = attrs.match(/class=["']([^"']+)["']/);
      const classes = classMatch ? classMatch[1] : '';

      items.push({
        line,
        tagType,
        classes,
        text: textOnly.replace(/\s+/g, ' ').substring(0, 40),
        hasSvg,
        hasDuplicatePlus,
        isIconOnly,
        hasAriaLabel,
        hasType,
        raw: fullTag.replace(/\s+/g, ' ').substring(0, 90)
      });
    }
  }
  report[page] = items;
});

console.log('=== DETAILED BUTTON AUDIT SUMMARY ===');
let dupCount = 0;
let iconOnlyNoAria = 0;
let buttonNoType = 0;

Object.entries(report).forEach(([page, items]) => {
  const pageDups = items.filter(i => i.hasDuplicatePlus);
  const pageNoAria = items.filter(i => i.isIconOnly && !i.hasAriaLabel);
  const pageNoType = items.filter(i => i.tagType === 'button' && !i.hasType);
  dupCount += pageDups.length;
  iconOnlyNoAria += pageNoAria.length;
  buttonNoType += pageNoType.length;

  console.log(`\n📄 ${page} (${items.length} controls):`);
  if (pageDups.length) {
    console.log(`  ⚠️ Duplicate Icons (+): ${pageDups.map(d => `L${d.line}: "${d.text}"`).join(', ')}`);
  }
  if (pageNoAria.length) {
    console.log(`  ⚠️ Icon-only without aria-label: ${pageNoAria.map(d => `L${d.line}`).join(', ')}`);
  }
  if (pageNoType.length) {
    console.log(`  ℹ️ Button without type: ${pageNoType.map(d => `L${d.line}: "${d.text}"`).join(', ')}`);
  }
  if (!pageDups.length && !pageNoAria.length && !pageNoType.length) {
    console.log(`  ✅ Clean basic semantics (${items.length} controls)`);
  }
});

console.log(`\nTotal duplicate icons across site: ${dupCount}`);
console.log(`Total icon-only missing aria-label: ${iconOnlyNoAria}`);
console.log(`Total buttons missing explicit type="button": ${buttonNoType}`);
