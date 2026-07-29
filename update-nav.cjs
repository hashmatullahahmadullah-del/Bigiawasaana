// update-nav.js
const fs = require('fs');
const path = require('path');

const files = [
  'locations.html',
  'menu.html',
  'specials.html',
  'catering.html',
  'faq.html',
  'blog.html'
];

const newNavLinks = `      <ul class="nav-links">
        <li><a href="/menu.html" data-i18n="nav.menu">Menu</a></li>
        <li><a href="/menu.html" class="nav-cta" style="background: var(--accent); color: var(--bg); border: none; padding: 10px 24px; border-radius: 100px; font-weight: 700;">ORDER NOW</a></li>
        <li><a href="/locations.html" data-i18n="nav.location">Location & Hours</a></li>
        <li><a href="/catering.html" data-i18n="nav.catering">Catering</a></li>
        <li><button class="site-lang-toggle btn-outline" aria-label="Switch language" style="padding: 4px 12px; font-size: 12px; font-family: 'Outfit'; cursor: pointer;">EN | فا</button></li>
        <li><a href="tel:+13239211646" class="nav-cta" style="background: transparent; border: 1px solid var(--border); color: var(--white);">(323) 921-1646</a></li>
      </ul>`;

const newMobileDrawer = `  <div class="nav-mobile-drawer" id="nav-mobile-drawer">
    <a href="/menu.html" data-i18n="nav.menu">Menu</a>
    <a href="/menu.html" style="color: var(--accent); font-weight: 700;">Order Now</a>
    <a href="/locations.html" data-i18n="nav.location">Location & Hours</a>
    <a href="/catering.html" data-i18n="nav.catering">Catering</a>
    <button class="site-lang-toggle btn-outline" aria-label="Switch language" style="margin: 0 24px 16px 24px; padding: 6px 12px; font-size: 14px; font-family: 'Outfit'; width: fit-content; cursor: pointer;">EN | فا</button>
    <a href="tel:+13239211646" class="nav-cta">📞 (323) 921-1646</a>
  </div>`;

const newFooterExplore = `        <div class="text-center-mobile">
          <div class="footer-label">Explore</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <a href="/menu.html" class="footer-link">Menu</a>
            <a href="/locations.html" class="footer-link">Location & Hours</a>
            <a href="/catering.html" class="footer-link">Catering</a>
            <a href="/specials.html" class="footer-link">Specials</a>
            <a href="/blog.html" class="footer-link">Blog</a>
            <a href="/faq.html" class="footer-link">FAQ</a>
          </div>
        </div>`;

for (const file of files) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace nav links
  content = content.replace(/<ul class="nav-links">[\s\S]*?<\/ul>/, newNavLinks);
  
  // Replace mobile drawer
  content = content.replace(/<div class="nav-mobile-drawer" id="nav-mobile-drawer">[\s\S]*?<\/div>/, newMobileDrawer);
  
  // Replace footer explore
  // Find the explore block
  const exploreRegex = /<div class="text-center-mobile">\s*<div class="footer-label">Explore<\/div>[\s\S]*?<\/div>\s*<\/div>/;
  content = content.replace(exploreRegex, newFooterExplore);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
}
