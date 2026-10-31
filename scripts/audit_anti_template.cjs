const fs = require('fs');
const path = require('path');

const targetFiles = [
  'index.html',
  'catering.html',
  'menu.html',
  'shop.html',
  'locations.html',
  'faq.html',
  'specials.html',
  'waiver.html',
  'quote.html',
  'order-history.html',
  'admin.html',
  'kitchen.html',
  'src/catering-builder.js',
  'src/nav.js',
  'src/main.js',
  'src/waiver.js',
  'src/style.css',
  'src/admin-theme.css'
];

const arrowPatterns = [/&rarr;/gi, /&larr;/gi, /&darr;/gi, /&uarr;/gi, /→/g, /←/g, /↓/g, /↑/g];
const roboticPhrases = [
  /interactive catering calculator/i,
  /build your own catering package/i,
  /discover our culinary/i,
  /elevate your/i,
  /exquisite offering/i,
  /seamless catering/i,
  /experience culinary excellence/i,
  /unlock your/i,
  /premium culinary solutions/i,
  /your journey starts here/i,
  /explore our culinary/i,
  /proceed to checkout/i,
  /discover our story/i,
  /select your desired/i,
  /estimated package calculation/i,
  /tantalize/i,
  /symphony of/i,
  /tapestry/i,
  /look no further/i
];

const results = {
  arrows: [],
  roboticCopy: [],
  shieldBadges: [],
  glowingStyles: []
};

for (const file of targetFiles) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // Arrow check in buttons or links
    if (line.includes('<button') || line.includes('<a') || line.includes('btn') || line.includes('arrow') || line.includes('&rarr;') || line.includes('→') || line.includes('←')) {
      for (const pat of arrowPatterns) {
        if (pat.test(line)) {
          results.arrows.push({ file, line: idx + 1, text: line.trim().substring(0, 140) });
          break;
        }
      }
    }

    // Robotic copy
    for (const pat of roboticPhrases) {
      if (pat.test(line)) {
        results.roboticCopy.push({ file, line: idx + 1, text: line.trim().substring(0, 140), match: pat.toString() });
        break;
      }
    }

    // Shield icons
    if (line.includes('shield') || line.includes('100% ZABIHA') || line.includes('Zabiha Halal Certified')) {
      if (line.includes('<svg') || line.includes('ui-icon') || line.includes('badge')) {
        results.shieldBadges.push({ file, line: idx + 1, text: line.trim().substring(0, 140) });
      }
    }

    // Glowing styles
    if (line.includes('box-shadow') && (line.includes('255, 69, 0') || line.includes('ff4500') || line.includes('255, 106, 0')) && (line.includes('20px') || line.includes('30px') || line.includes('40px') || line.includes('glow'))) {
      results.glowingStyles.push({ file, line: idx + 1, text: line.trim().substring(0, 140) });
    }
  });
}

console.log('--- AUDIT RESULTS ---');
console.log(`Arrow occurrences in interactive elements: ${results.arrows.length}`);
console.log(`Robotic / AI phrases detected: ${results.roboticCopy.length}`);
console.log(`Shield / Halal badge elements: ${results.shieldBadges.length}`);
console.log(`Heavy glowing styles: ${results.glowingStyles.length}`);

fs.writeFileSync('scratch/anti_template_audit.json', JSON.stringify(results, null, 2));
