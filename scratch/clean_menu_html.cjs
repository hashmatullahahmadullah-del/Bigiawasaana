const fs = require('fs');

let content = fs.readFileSync('menu.html', 'utf8');

// Find where <section id="menu" starts
const menuSectionStart = content.indexOf('<section id="menu"');
if (menuSectionStart === -1) {
  console.error('<section id="menu" not found!');
  process.exit(1);
}

// Find where <footer class="footer" starts
const footerStart = content.indexOf('<footer class="footer"');
if (footerStart === -1) {
  console.error('<footer class="footer" not found!');
  process.exit(1);
}

// Everything before <section id="menu"
const before = content.slice(0, menuSectionStart);
// Everything after and including <footer class="footer"
const after = content.slice(footerStart);

const cleanMenuSection = `<!-- Interactive Menu (Populated by main.js) -->
  <section id="menu" class="menu-section py-l">
    <div class="container">
      <div class="cat-scroll reveal" style="margin-bottom: 32px;"></div>
      <!-- MENU_GRID_START -->
      <div id="menu-grid" class="menu-grid reveal"></div>
      <!-- MENU_GRID_END -->
    </div>
  </section>

  </main>

  <!-- Footer -->
  
  <!-- SEO Item Links -->
  <section class="section" style="background-color: var(--surface); padding: 40px 0; border-top: 1px solid var(--border);">
    <div class="container text-center-mobile">
      <h2 style="font-family: 'Barlow Condensed'; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; color: var(--accent); margin-bottom: 16px;">Order Individual Menu Items</h2>
      <!-- SEO_LINKS_START -->
      <div id="seo-item-links" style="display:flex;flex-wrap:gap:12px;justify-content:center;margin-top:20px;padding:20px;border-top:1px solid var(--border);"></div>
      <!-- SEO_LINKS_END -->
    </div>
  </section>

  `;

content = before + cleanMenuSection + after;
fs.writeFileSync('menu.html', content, 'utf8');
console.log('Successfully cleaned menu.html! New length:', content.length);
