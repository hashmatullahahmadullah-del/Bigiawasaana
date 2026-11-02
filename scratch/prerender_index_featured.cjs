const fs = require('fs');
const { ITEMS } = require('../scripts/menu-items-data.cjs');

const SIGNATURE_SLUGS = [
  'bigi-s-chapli-kabob',
  'bigi-s-kobideh-kabob-skewer',
  'bigi-s-chicken-tikka-kabob-plate',
  'bigi-s-silk-road-wrap-aka-afghan-burger',
  'bigi-s-qabuli-palau-lamb-shank',
  'bigi-s-bolani'
];

const featuredItems = SIGNATURE_SLUGS.map(slug => ITEMS.find(it => it.slug === slug)).filter(Boolean);

const featuredHtml = featuredItems.map(item => `
        <div class="menu-card featured-card" style="border-color: var(--accent);">
          <div class="menu-badge">Featured</div>
          <a href="/item/${item.slug}" aria-label="View ${item.name} details" style="display: block; cursor: pointer; text-decoration: none;">
            <img src="${item.img}" alt="${item.name}" class="menu-card-img" width="400" height="300" loading="lazy">
          </a>
          <div class="menu-card-content">
            <a href="/item/${item.slug}" style="text-decoration: none; color: inherit;">
              <h3 class="menu-card-title" style="cursor: pointer;">${item.name}</h3>
            </a>
            <p class="menu-card-desc">${item.shortDesc}</p>
            <div class="menu-card-footer">
              <span class="menu-card-price">$${item.price.toFixed(2)}</span>
              <button type="button" class="add-to-cart-btn btn-add-cart" onclick="addFeaturedItemToMenu('${item.id}', event)">ADD</button>
            </div>
          </div>
        </div>`).join('');

let indexHtml = fs.readFileSync('index.html', 'utf8');

const regexGrid = /<div id="featured-menu-grid" class="featured-carousel-track"[^>]*>[\s\S]*?<\/div>\s*<button type="button" class="featured-arrow featured-arrow-next"/;

const replacement = `<div id="featured-menu-grid" class="featured-carousel-track" tabindex="0" role="region" aria-label="Featured Items Carousel">${featuredHtml}
      </div>

      <button type="button" class="featured-arrow featured-arrow-next"`;

if (regexGrid.test(indexHtml)) {
  indexHtml = indexHtml.replace(regexGrid, replacement);
  fs.writeFileSync('index.html', indexHtml, 'utf8');
  console.log('index.html successfully updated with real featured items!');
} else {
  console.error('regexGrid failed on index.html');
}
