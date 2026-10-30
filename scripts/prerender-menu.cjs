const fs = require('fs');
const path = require('path');
const { ITEMS } = require('./menu-items-data.cjs');

function generateMenuSchema() {
  const categoriesMap = {};
  ITEMS.forEach(item => {
    if (!categoriesMap[item.categoryName]) {
      categoriesMap[item.categoryName] = [];
    }
    categoriesMap[item.categoryName].push(item);
  });

  const sections = Object.entries(categoriesMap).map(([catName, items]) => ({
    "@type": "MenuSection",
    "name": catName,
    "hasMenuItem": items.map(item => ({
      "@type": "MenuItem",
      "name": item.name,
      "description": item.shortDesc,
      "image": `https://www.bigiawasaana.com${item.img}`,
      "offers": {
        "@type": "Offer",
        "price": item.price.toFixed(2),
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      },
      "suitableForDiet": "https://schema.org/HalalDiet",
      "url": `https://www.bigiawasaana.com/item/${item.slug}`
    }))
  }));

  const menuSchema = {
    "@context": "https://schema.org",
    "@type": "Menu",
    "name": "Bigi Awasaana Halal Afghan Menu",
    "url": "https://www.bigiawasaana.com/menu",
    "isPartOf": {
      "@type": "Restaurant",
      "name": "Bigi Awasaana",
      "url": "https://www.bigiawasaana.com",
      "telephone": "+13239211646",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "18411 Victory Blvd",
        "addressLocality": "Reseda",
        "addressRegion": "CA",
        "postalCode": "91335",
        "addressCountry": "US"
      }
    },
    "hasMenuSection": sections
  };

  return `<script type="application/ld+json">\n${JSON.stringify(menuSchema, null, 2)}\n</script>`;
}

function generateMenuHtml() {
  return ITEMS.map(item => `
        <div class="menu-card" data-item-id="${item.id}">
          <a href="/item/${item.slug}" onclick="if(!event.ctrlKey&&!event.metaKey){event.preventDefault();openItemModal('${item.id}');}" aria-label="View details for ${item.name}" style="cursor: pointer; display: block; text-decoration: none;">
            <img src="${item.img}" alt="${item.name}" class="menu-card-img" loading="lazy" width="400" height="300">
          </a>
          <div class="menu-card-content">
            <a href="/item/${item.slug}" onclick="if(!event.ctrlKey&&!event.metaKey){event.preventDefault();openItemModal('${item.id}');}" style="text-decoration: none; color: inherit;">
              <h3 class="menu-card-title" style="cursor: pointer;">${item.name}</h3>
            </a>
            <p class="menu-card-desc">${item.shortDesc}</p>
            <div class="menu-card-footer">
              <span class="menu-card-price">$${item.price.toFixed(2)}</span>
              <button class="add-to-cart-btn btn-add-cart" onclick="openItemModal('${item.id}')">ADD</button>
            </div>
          </div>
        </div>`).join('\n');
}

function generateSeoItemLinks() {
  return ITEMS.map(item => 
    `<a href="/item/${item.slug}" style="padding: 8px 16px; background: #181818; border: 1px solid var(--border); border-radius: 4px; color: var(--gray-light); text-decoration: none; font-size: 13px;">${item.name} ($${item.price.toFixed(2)})</a>`
  ).join('\n        ');
}

function prerenderMenuFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace title & meta
  content = content.replace(/<title>.*?<\/title>/i, '<title>Halal Afghan Menu in Reseda | Kabobs, Shawarma &amp; Burgers | Bigi Awasaana</title>');
  content = content.replace(/<meta\s+name=["']keywords["'].*?>\r?\n\s*/i, '');
  content = content.replace(/<meta property=["']og:title["'] content=["'].*?["']>/i, '<meta property="og:title" content="Halal Afghan Menu in Reseda | Kabobs, Shawarma &amp; Burgers | Bigi Awasaana">');
  content = content.replace(/<meta name=["']twitter:title["'] content=["'].*?["']>/i, '<meta name="twitter:title" content="Halal Afghan Menu in Reseda | Kabobs, Shawarma &amp; Burgers | Bigi Awasaana">');

  // Replace menu schema
  const schemaRegex = /<!-- Menu Schema -->[\s\S]*?<\/script>/i;
  const newSchema = `<!-- Menu Schema -->\n  ${generateMenuSchema()}`;
  if (schemaRegex.test(content)) {
    content = content.replace(schemaRegex, newSchema);
  }

  // Replace #menu-grid with strict boundary markers
  const menuGridRegex = /<!-- MENU_GRID_START -->[\s\S]*?<!-- MENU_GRID_END -->/i;
  const newMenuGrid = `<!-- MENU_GRID_START -->\n      <div id="menu-grid" class="menu-grid reveal">\n${generateMenuHtml()}\n      </div>\n      <!-- MENU_GRID_END -->`;
  
  if (menuGridRegex.test(content)) {
    content = content.replace(menuGridRegex, newMenuGrid);
  } else {
    // Fallback if boundary markers are missing
    const rawGridRegex = /<div id="menu-grid" class="menu-grid reveal">[\s\S]*?<\/div>/i;
    content = content.replace(rawGridRegex, newMenuGrid);
  }

  // Replace #seo-item-links with strict boundary markers
  const seoLinksRegex = /<!-- SEO_LINKS_START -->[\s\S]*?<!-- SEO_LINKS_END -->/i;
  const newSeoLinks = `<!-- SEO_LINKS_START -->\n      <div id="seo-item-links" style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:20px;padding:20px;border-top:1px solid var(--border);">\n        ${generateSeoItemLinks()}\n      </div>\n      <!-- SEO_LINKS_END -->`;
  
  if (seoLinksRegex.test(content)) {
    content = content.replace(seoLinksRegex, newSeoLinks);
  } else {
    const fallbackSeoRegex = /<div id="seo-item-links"[^>]*>[\s\S]*?<\/div>/i;
    content = content.replace(fallbackSeoRegex, newSeoLinks);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Prerendered crawlable menu into: ${filePath}`);
}

['menu.html', 'dist/menu.html'].forEach(f => {
  const full = path.join(process.cwd(), f);
  prerenderMenuFile(full);
});
