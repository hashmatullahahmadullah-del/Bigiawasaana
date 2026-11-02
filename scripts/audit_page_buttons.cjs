const fs = require('fs');

const pages = [
  'index.html',
  'menu.html',
  'catering.html',
  'shop.html',
  'quote.html',
  'waiver.html',
  'admin.html',
  'kitchen.html',
  'order-status.html',
  'order-history.html',
  'locations.html',
  'faq.html',
  'specials.html',
  'review.html',
  'tv1.html',
  'tv2.html',
  'customer-display.html'
];

console.log('=== PAGE BUTTON INVENTORY ===');
let totalButtons = 0;
let totalLinks = 0;

pages.forEach(p => {
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    const buttons = content.match(/<button[\s\S]*?<\/button>/gi) || [];
    const btnLinks = content.match(/<a[^>]*class=["'][^"']*(?:btn|button)[^"']*["'][\s\S]*?<\/a>/gi) || [];
    totalButtons += buttons.length;
    totalLinks += btnLinks.length;
    console.log(`${p.padEnd(22)}: ${String(buttons.length).padStart(3)} <button>, ${String(btnLinks.length).padStart(2)} <a.btn>`);
  }
});

console.log(`\nTotal static buttons: ${totalButtons}, Total button links: ${totalLinks}`);
