const fs = require('fs');
let code = fs.readFileSync('scripts/prerender-menu.cjs', 'utf8');

const featuredPrerenderFunc = `
function prerenderFeaturedIndex(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  const SIGNATURE_SLUGS = [
    'bigi-s-chapli-kabob',
    'bigi-s-kobideh-kabob-skewer',
    'bigi-s-chicken-tikka-kabob-plate',
    'bigi-s-silk-road-wrap-aka-afghan-burger',
    'bigi-s-qabuli-palau-lamb-shank',
    'bigi-s-bolani'
  ];

  const featuredItems = SIGNATURE_SLUGS.map(slug => ITEMS.find(it => it.slug === slug)).filter(Boolean);

  const featuredHtml = featuredItems.map(item => \`
        <div class="menu-card featured-card" style="border-color: var(--accent);">
          <div class="menu-badge">Featured</div>
          <a href="/item/\${item.slug}" aria-label="View \${item.name} details" style="display: block; cursor: pointer; text-decoration: none;">
            <img src="\${item.img}" alt="\${item.name}" class="menu-card-img" width="400" height="300" loading="lazy">
          </a>
          <div class="menu-card-content">
            <a href="/item/\${item.slug}" style="text-decoration: none; color: inherit;">
              <h3 class="menu-card-title" style="cursor: pointer;">\${item.name}</h3>
            </a>
            <p class="menu-card-desc">\${item.shortDesc}</p>
            <div class="menu-card-footer">
              <span class="menu-card-price">$\${item.price.toFixed(2)}</span>
              <button type="button" class="add-to-cart-btn btn-add-cart" onclick="addFeaturedItemToMenu('\${item.id}', event)">ADD</button>
            </div>
          </div>
        </div>\`).join('');

  const regexGrid = /<div id="featured-menu-grid" class="featured-carousel-track"[^>]*>[\\s\\S]*?<\\/div>\\s*<button type="button" class="featured-arrow featured-arrow-next"/;
  const replacement = \`<div id="featured-menu-grid" class="featured-carousel-track" tabindex="0" role="region" aria-label="Featured Items Carousel">\${featuredHtml}
      </div>

      <button type="button" class="featured-arrow featured-arrow-next"\`;

  if (regexGrid.test(content)) {
    content = content.replace(regexGrid, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(\`Prerendered featured items into: \${filePath}\`);
  }
}
`;

if (!code.includes('prerenderFeaturedIndex')) {
  code = code + featuredPrerenderFunc + `
['index.html', 'dist/index.html'].forEach(f => {
  const full = path.join(process.cwd(), f);
  prerenderFeaturedIndex(full);
});
`;
  fs.writeFileSync('scripts/prerender-menu.cjs', code, 'utf8');
  console.log('scripts/prerender-menu.cjs updated with prerenderFeaturedIndex');
} else {
  console.log('prerenderFeaturedIndex already in scripts/prerender-menu.cjs');
}
