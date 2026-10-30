const fs = require('fs');
const path = require('path');
const { ITEMS } = require('./menu-items-data.cjs');

const distTmpl = path.join(process.cwd(), 'dist', 'item-template.html');
const templatePath = fs.existsSync(distTmpl) ? distTmpl : path.join(process.cwd(), 'item-template.html');
const template = fs.readFileSync(templatePath, 'utf8');

const outDir = path.join(process.cwd(), 'dist', 'item');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const keptAreas = [
  { slug: 'reseda', name: 'Reseda' },
  { slug: 'tarzana', name: 'Tarzana' },
  { slug: 'winnetka', name: 'Winnetka' },
  { slug: 'lake-balboa', name: 'Lake Balboa' },
  { slug: 'northridge', name: 'Northridge' },
  { slug: 'canoga-park', name: 'Canoga Park' },
  { slug: 'west-hills', name: 'West Hills' },
  { slug: 'van-nuys', name: 'Van Nuys' },
  { slug: 'encino', name: 'Encino' },
  { slug: 'woodland-hills', name: 'Woodland Hills' }
];

let count = 0;
for (const item of ITEMS) {
  const title = `${item.name} in Reseda | Halal Afghan ${item.categoryName} | Bigi Awasaana`;
  const description = `Order fresh ${item.name} in Reseda ($${item.price.toFixed(2)}). 100% Zabiha Halal. ${item.shortDesc}`;
  const canonicalUrl = `https://www.bigiawasaana.com/item/${item.slug}`;
  const itemImg = `https://www.bigiawasaana.com${item.img}`;

  const relatedItems = ITEMS.filter(i => item.relatedSlugs && item.relatedSlugs.includes(i.slug)).slice(0, 3);

  const schema = `
  <script type="application/ld+json">
  [
    {
      "@context": "https://schema.org",
      "@type": "MenuItem",
      "name": "${item.name.replace(/"/g, '\\"')}",
      "description": "${item.shortDesc.replace(/"/g, '\\"')}",
      "image": "${itemImg}",
      "suitableForDiet": "https://schema.org/HalalDiet",
      "offers": {
        "@type": "Offer",
        "price": "${item.price.toFixed(2)}",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "url": "${canonicalUrl}"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": ${JSON.stringify(item.faqs.map(f => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": f.a
        }
      })))}
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.bigiawasaana.com/" },
        { "@type": "ListItem", "position": 2, "name": "Menu", "item": "https://www.bigiawasaana.com/menu" },
        { "@type": "ListItem", "position": 3, "name": "${item.name.replace(/"/g, '\\"')}", "item": "${canonicalUrl}" }
      ]
    }
  ]
  </script>
  `;

  const itemContent = `
    <section class="section" style="padding-top: clamp(120px, 15vw, 160px); padding-bottom: 80px; background-color: var(--bg); min-height: 80vh;">
      <div class="container" style="max-width: 1000px; margin: 0 auto;">
        
        <!-- Back button -->
        <a href="/menu" style="display: inline-flex; align-items: center; gap: 8px; color: var(--gray); text-decoration: none; font-family: 'Barlow Condensed'; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 32px; font-weight: 600;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to Menu
        </a>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 48px; align-items: start;">
          <!-- Image -->
          <div style="width: 100%; aspect-ratio: 4/3; border-radius: 12px; overflow: hidden; background: var(--surface); border: 1px solid var(--border); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <img src="${item.img}" alt="${item.name.replace(/"/g, '&quot;')}" style="width: 100%; height: 100%; object-fit: cover; display: block;" width="600" height="450">
          </div>

          <!-- Content -->
          <div>
            <div style="font-family: 'Barlow Condensed'; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: var(--accent); margin-bottom: 8px; font-weight: 700;">
              ${item.categoryName} • 100% ZABIHA HALAL
            </div>
            <h1 class="font-lalezar" style="font-size: clamp(36px, 6vw, 52px); color: var(--white); margin-bottom: 8px; line-height: 1.1;">
              ${item.name} in Reseda
            </h1>
            <div style="font-size: 32px; color: var(--accent); font-family: 'Barlow Condensed'; font-weight: 700; margin-bottom: 20px;">
              $${item.price.toFixed(2)}
            </div>
            
            <!-- 80-150 word factual description -->
            <div style="font-size: 15px; line-height: 1.8; color: var(--gray-light); margin-bottom: 24px;">
              <p>${item.fullDesc}</p>
            </div>

            <!-- Preparation & Sides callout box -->
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); border-radius: 8px; padding: 18px; margin-bottom: 28px;">
              <div style="margin-bottom: 8px; font-size: 14px; color: var(--white);">
                <strong style="color: var(--accent); font-family: 'Barlow Condensed'; text-transform: uppercase; letter-spacing: 1px;">Spice Level:</strong> ${item.spiceLevel}
              </div>
              <div style="font-size: 14px; color: var(--gray-light);">
                <strong style="color: var(--accent); font-family: 'Barlow Condensed'; text-transform: uppercase; letter-spacing: 1px;">Served With:</strong> ${item.comesWith}
              </div>
            </div>

            <!-- CTA Buttons -->
            <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 32px;">
              <a href="/menu?addItem=${encodeURIComponent(item.id)}" class="btn-primary" style="text-align: center; width: 100%; padding: 16px; font-size: 16px; text-decoration: none; border-radius: 4px;">
                Order for Pickup — $${item.price.toFixed(2)}
              </a>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <a href="https://www.ubereats.com/store/bigi-awasaana-%E2%80%93-halal-burgers-%26-kabobs/F2Nn6alaR6eTb6AAwVxq4g?diningMode=DELIVERY&sc=SEARCH_SUGGESTION" target="_blank" rel="noopener" class="btn-outline" style="text-align: center; padding: 12px; font-size: 14px; border-color: rgba(6, 193, 103, 0.4); text-decoration: none;">
                  Uber Eats
                </a>
                <a href="https://www.doordash.com/store/bigi-awasaana-(afghan-halal-cuisine)-reseda-45987589/111478560/?event_type=autocomplete&pickup=false" target="_blank" rel="noopener" class="btn-outline" style="text-align: center; padding: 12px; font-size: 14px; border-color: rgba(255, 48, 8, 0.4); text-decoration: none;">
                  DoorDash
                </a>
              </div>
              <a href="/catering" style="display: block; text-align: center; font-size: 13px; color: var(--gray); text-decoration: underline; padding-top: 4px;">
                Planning an event? Order ${item.name} for party catering &rarr;
              </a>
            </div>

          </div>
        </div>

        <!-- Matching Culinary Blog Story Link -->
        <div style="background: rgba(255, 106, 0, 0.08); border: 1px solid var(--accent); border-radius: 8px; padding: 24px; margin-top: 48px;">
          <div style="font-family: 'Barlow Condensed'; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; color: var(--accent); font-weight: 700; margin-bottom: 6px;">CULINARY STORY</div>
          <h2 style="font-family: 'Barlow Condensed'; font-size: 24px; text-transform: uppercase; margin: 0 0 10px 0; color: var(--white);">
            <a href="/blog/${item.blogSlug}" style="color: var(--white); text-decoration: none;">${item.blogTitle}</a>
          </h2>
          <p style="color: var(--gray-light); font-size: 14px; line-height: 1.6; margin: 0 0 14px 0;">Learn about the ancient Silk Road spices, charcoal grilling techniques, and 100% Zabiha Halal heritage behind our menu.</p>
          <a href="/blog/${item.blogSlug}" style="color: var(--accent); font-weight: 700; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Read Full Article &rarr;</a>
        </div>

        <!-- FAQs Section -->
        <div style="margin-top: 48px; padding-top: 36px; border-top: 1px solid var(--border);">
          <h2 style="font-family: 'Barlow Condensed'; font-size: 26px; text-transform: uppercase; color: var(--white); margin-bottom: 20px;">Frequently Asked Questions</h2>
          <div style="display: flex; flex-direction: column; gap: 14px;">
            ${item.faqs.map(f => `
              <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 18px 20px;">
                <h3 style="font-family: 'Barlow Condensed'; font-size: 18px; color: var(--accent); margin: 0 0 8px 0; text-transform: uppercase;">${f.q}</h3>
                <p style="color: var(--gray-light); font-size: 14px; line-height: 1.6; margin: 0;">${f.a}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Related Dishes -->
        ${relatedItems.length > 0 ? `
        <div style="margin-top: 48px; padding-top: 36px; border-top: 1px solid var(--border);">
          <h2 style="font-family: 'Barlow Condensed'; font-size: 26px; text-transform: uppercase; color: var(--white); margin-bottom: 20px;">Pairs Well With</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px;">
            ${relatedItems.map(r => `
              <a href="/item/${r.slug}" style="display: block; padding: 18px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; text-decoration: none; color: inherit; transition: border-color 0.2s;">
                <h3 style="font-family: 'Barlow Condensed'; font-size: 18px; text-transform: uppercase; color: var(--white); margin: 0 0 6px 0;">${r.name}</h3>
                <p style="font-size: 13px; color: var(--gray); margin: 0 0 10px 0; line-height: 1.4;">${r.shortDesc}</p>
                <div style="font-size: 16px; font-weight: 700; color: var(--accent); font-family: 'Barlow Condensed';">$${r.price.toFixed(2)} &rarr;</div>
              </a>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Delivery Areas Links -->
        <div style="margin-top: 48px; padding-top: 36px; border-top: 1px solid var(--border);">
          <h2 style="font-family: 'Barlow Condensed'; font-size: 20px; text-transform: uppercase; color: var(--gray); margin-bottom: 16px;">We Deliver ${item.name} Across the Valley</h2>
          <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            ${keptAreas.map(a => `<a href="/areas/${a.slug}" style="padding: 8px 14px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 4px; color: var(--gray-light); text-decoration: none; font-size: 13px;">${a.name}</a>`).join('')}
          </div>
        </div>

      </div>
    </section>
  `;

  let html = template
    .replace(/{{TITLE}}/g, title)
    .replace(/{{META_DESC}}/g, description)
    .replace(/{{META_KEYWORDS}}/g, '')
    .replace(/{{ITEM_SLUG}}/g, item.slug)
    .replace(/{{OG_IMAGE}}/g, itemImg)
    .replace(/{{ITEM_CONTENT}}/g, itemContent)
    .replace(/{{META_ROBOTS}}/g, '')
    .replace(/{{SCHEMA_DATA}}/g, schema);

  fs.writeFileSync(path.join(outDir, `${item.slug}.html`), html);
  count++;
}

console.log(`Successfully prerendered ${count} individual item pages into dist/item/`);
