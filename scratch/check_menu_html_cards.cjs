const fs = require('fs');
const html = fs.readFileSync('menu.html', 'utf8');

const cards = [...html.matchAll(/class="menu-card"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g)];
console.log('Total menu cards in menu.html:', cards.length);

cards.slice(0, 10).forEach(c => {
  const text = c[0];
  const title = text.match(/class="menu-card-title"[^>]*>([^<]+)/)?.[1];
  const price = text.match(/class="menu-card-price"[^>]*>([^<]+)/)?.[1];
  const img = text.match(/src="([^"]+)"/)?.[1];
  console.log(`- ${title} (${price}) -> ${img}`);
});
