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
  const categoriesMap = {};
  ITEMS.forEach(item => {
    if (!categoriesMap[item.categoryName]) {
      categoriesMap[item.categoryName] = [];
    }
    categoriesMap[item.categoryName].push(item);
  });

  let html = '';
  for (const [catName, items] of Object.entries(categoriesMap)) {
    html += `
    <div class="menu-category-section" style="margin-bottom: 48px;">
      <h2 class="font-lalezar" style="font-size: 32px; color: var(--accent); margin-bottom: 24px; text-transform: uppercase; border-bottom: 1px solid var(--border); padding-bottom: 8px;">${catName}</h2>
      <div class="menu-category-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;">`;

    items.forEach(item => {
      html += `
        <div class="menu-card" data-item-id="${item.id}" style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; display: flex; flex-direction: column;">
          <a href="/item/${item.slug}" aria-label="View details for ${item.name}" style="display: block; width: 100%; aspect-ratio: 4/3; overflow: hidden; background: #1a1a1a;">
            <img src="${item.img}" alt="${item.name}" class="menu-card-img" loading="lazy" width="400" height="300" style="width: 100%; height: 100%; object-fit: cover;">
          </a>
          <div class="menu-card-content" style="padding: 20px; display: flex; flex-direction: column; flex: 1;">
            <a href="/item/${item.slug}" style="text-decoration: none; color: inherit;">
              <h3 class="menu-card-title" style="font-family: 'Barlow Condensed'; font-size: 22px; text-transform: uppercase; margin-bottom: 8px; color: var(--white);">${item.name}</h3>
            </a>
            <p class="menu-card-desc" style="color: var(--gray); font-size: 14px; line-height: 1.5; margin-bottom: 16px; flex: 1;">${item.shortDesc}</p>
            <div class="menu-card-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.05);">
              <span class="menu-card-price" style="font-size: 20px; font-weight: 700; color: var(--accent); font-family: 'Barlow Condensed';">$${item.price.toFixed(2)}</span>
              <button type="button" class="add-to-cart-btn btn-add-cart" onclick="openItemModal('${item.id}')" aria-label="Order ${item.name}">ORDER</button>
            </div>
          </div>
        </div>`;
    });

    html += `
      </div>
    </div>`;
  }

  return html;
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

  // Replace #menu-grid
  const menuGridRegex = /<div id="menu-grid" class="menu-grid reveal">[\s\S]*?<\/div>/i;
  const newMenuGrid = `<div id="menu-grid" class="menu-grid reveal">\n${generateMenuHtml()}\n      </div>`;
  content = content.replace(menuGridRegex, newMenuGrid);

  // Replace #seo-item-links
  const seoLinksRegex = /<div id="seo-item-links" style="[^"]*">[\s\S]*?<\/div>/i;
  const newSeoLinks = `<div id="seo-item-links" style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:20px;padding:20px;border-top:1px solid var(--border);">\n        ${generateSeoItemLinks()}\n      </div>`;
  content = content.replace(seoLinksRegex, newSeoLinks);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Prerendered crawlable menu into: ${filePath}`);
}

['menu.html', 'dist/menu.html'].forEach(f => {
  const full = path.join(process.cwd(), f);
  prerenderMenuFile(full);
});
