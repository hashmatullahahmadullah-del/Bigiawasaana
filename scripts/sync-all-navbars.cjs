const fs = require('fs');
const path = require('path');

const indexContent = fs.readFileSync('index.html', 'utf8');

const navMatch = indexContent.match(/<nav class="site-nav">[\s\S]*?<\/nav>/);
const drawerMatch = indexContent.match(/<div class="nav-mobile-drawer"[^>]*>[\s\S]*?<\/div>/);

if (!navMatch || !drawerMatch) {
  console.error('Could not find nav or drawer in index.html');
  process.exit(1);
}

const stdNav = navMatch[0];
const stdDrawer = drawerMatch[0];

console.log('Standard Nav found length:', stdNav.length);
console.log('Standard Drawer found length:', stdDrawer.length);

const targets = [
  'menu.html',
  'order-history.html',
  'catering.html',
  'locations.html',
  'blog.html',
  'shop.html',
  'specials.html',
  'faq.html',
  'privacy.html',
  'terms.html',
  'area-template.html',
  'blog-template.html',
  'item-template.html',
  'functions/area-template.html',
  'functions/blog-index-template.html',
  'functions/blog-template.html',
  'functions/blog.html',
  'functions/item-template.html',
  'functions/shop-template.html'
];

let updatedCount = 0;

targets.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace site-nav
  content = content.replace(/<nav class="site-nav">[\s\S]*?<\/nav>/, stdNav);

  // Replace mobile-drawer
  content = content.replace(/<div class="nav-mobile-drawer"[^>]*>[\s\S]*?<\/div>/, stdDrawer);

  // Restore active class if appropriate
  if (file === 'menu.html') {
    content = content.replace('<a href="/menu" data-i18n="nav.menu">Menu</a>', '<a href="/menu" data-i18n="nav.menu" class="active">Menu</a>');
  } else if (file === 'catering.html') {
    content = content.replace('<a href="/catering" data-i18n="nav.catering">Catering</a>', '<a href="/catering" data-i18n="nav.catering" class="active">Catering</a>');
  } else if (file === 'locations.html') {
    content = content.replace('<a href="/locations" data-i18n="nav.location">Location & Hours</a>', '<a href="/locations" data-i18n="nav.location" class="active">Location & Hours</a>');
  } else if (file === 'blog.html' || file === 'functions/blog.html') {
    content = content.replace('<a href="/blog">Blog</a>', '<a href="/blog" class="active">Blog</a>');
  } else if (file === 'shop.html' || file === 'functions/shop-template.html') {
    content = content.replace('<a href="/shop"', '<a href="/shop" class="active"');
  } else if (file === 'order-history.html') {
    content = content.replace('<a href="/order-history.html" data-i18n="nav.orders">My Orders</a>', '<a href="/order-history.html" data-i18n="nav.orders" class="active">My Orders</a>');
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated nav in ${file}`);
    updatedCount++;
  }
});

console.log(`Nav sync complete. Updated ${updatedCount} files.`);
