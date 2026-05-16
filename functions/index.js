const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

admin.initializeApp();

exports.regenerateMenuPage = functions.firestore
  .document('menu/{itemId}')
  .onWrite(async (change, context) => {

    try {
      // Fetch all current menu items from Firestore
      const snapshot = await admin.firestore()
        .collection('menu')
        .where('available', '==', true)
        .get();

      const items = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() });
      });

      // Group items by category
      const categories = {};
      items.forEach(item => {
        const cat = item.category || 'Other';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(item);
      });

      // Category display order
      const categoryOrder = ['Wraps', 'Platters', 'Sides', 'Drinks'];
      const sortedCategories = [
        ...categoryOrder.filter(c => categories[c]),
        ...Object.keys(categories).filter(c => !categoryOrder.includes(c))
      ];

      // Build menu items HTML
      let menuSectionsHTML = '';
      sortedCategories.forEach(catName => {
        const catItems = categories[catName];
        let itemsHTML = '';
        catItems.forEach(item => {
          const specialBadge = item.special
            ? '<span class="special-badge">Chef\'s Special</span>'
            : '';
          itemsHTML += `
          <div class="menu-item">
            <div class="menu-item-info">
              <h3>${item.name} ${specialBadge}</h3>
              <p>${item.description || ''}</p>
            </div>
            <div class="menu-item-price">$${parseFloat(item.price).toFixed(2)}</div>
          </div>`;
        });

        menuSectionsHTML += `
        <section class="menu-category" aria-label="${catName}">
          <div class="menu-category-title">${catName}</div>
          ${itemsHTML}
        </section>`;
      });

      // Build schema JSON for structured data
      const schemaMenuSections = sortedCategories.map(catName => ({
        "@type": "MenuSection",
        "name": catName,
        "hasMenuItem": categories[catName].map(item => ({
          "@type": "MenuItem",
          "name": item.name,
          "description": item.description || '',
          "offers": {
            "@type": "Offer",
            "price": parseFloat(item.price).toFixed(2),
            "priceCurrency": "USD"
          }
        }))
      }));

      const schemaJSON = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Menu",
        "name": "Bigi Awasaana Menu",
        "url": "https://bigiawasaana.com/menu",
        "hasMenuSection": schemaMenuSections
      }, null, 2);

      // Generate full menu.html
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Menu — Bigi Awasaana Afghan Street Food Reseda LA</title>
  <meta name="description" content="Full menu of Bigi Awasaana — authentic Afghan street food in Reseda, Los Angeles. Coal-fired kabobs, bolani, saffron rice platters and more. 100% Zabiha Halal.">
  <meta name="keywords" content="Afghan food menu Reseda, halal menu LA, kabob menu Los Angeles, bolani, Afghan platter, Zabiha Halal menu Reseda, Afghan street food menu">
  <link rel="stylesheet" href="/style.css">
  <script type="application/ld+json">
  ${schemaJSON}
  </script>
  <style>
    .menu-page { max-width: 800px; margin: 0 auto; padding: 120px var(--space-s) 80px; }
    .menu-page-header { text-align: center; margin-bottom: 64px; }
    .menu-page-header h1 { font-size: clamp(36px, 6vw, 64px); margin-bottom: 12px; }
    .menu-page-header p { color: var(--gray); font-size: 14px; letter-spacing: 1px; }
    .menu-category { margin-bottom: 56px; }
    .menu-category-title {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      color: var(--accent);
      border-bottom: 1px solid var(--border);
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .menu-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 20px 0;
      border-bottom: 1px solid var(--border);
      gap: 24px;
    }
    .menu-item:last-child { border-bottom: none; }
    .menu-item-info h3 {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .menu-item-info p { font-size: 13px; color: var(--gray); line-height: 1.5; }
    .menu-item-price {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: var(--accent);
      white-space: nowrap;
    }
    .special-badge {
      display: inline-block;
      background: var(--accent-soft);
      color: var(--accent);
      border: 1px solid var(--accent-border);
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 2px;
      margin-left: 8px;
      vertical-align: middle;
    }
    .order-cta {
      text-align: center;
      padding: 64px 0 0;
      border-top: 1px solid var(--border);
      margin-top: 64px;
    }
    .order-cta h2 { font-size: clamp(28px, 4vw, 40px); margin-bottom: 12px; }
    .order-cta p { color: var(--gray); font-size: 14px; margin-bottom: 32px; }
    @media (max-width: 640px) {
      .menu-page { padding: 100px 16px 60px; }
    }
  </style>
</head>
<body>

  <nav style="position: fixed; top: 0; left: 0; right: 0; z-index: 1000; background: rgba(6,6,6,0.9); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border);">
    <div class="container" style="display: flex; justify-content: space-between; align-items: center; height: 72px;">
      <a href="/" style="display: flex; align-items: center; text-decoration: none;">
        <img src="/logo.png" alt="Bigi Awasaana Logo" style="height: 64px; width: auto; object-fit: contain;">
      </a>
      <div style="display: flex; gap: var(--space-s); font-family: 'Barlow Condensed'; font-weight: 600; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase;">
        <a href="/" style="color: var(--gray); text-decoration: none;">Home</a>
        <a href="/menu" style="color: var(--accent); text-decoration: none; font-weight: 700;">Menu</a>
        <a href="tel:+13237986120" style="color: var(--accent); text-decoration: none; font-weight: 700;">(323) 798-6120</a>
      </div>
    </div>
  </nav>

  <main class="menu-page">
    <div class="menu-page-header">
      <h1>Our Menu</h1>
      <p>Handcrafted &middot; Coal-fired &middot; 100% Zabiha Halal &middot; Reseda, Los Angeles</p>
    </div>

    ${menuSectionsHTML}

    <div class="order-cta">
      <h2>Ready to Order?</h2>
      <p>Visit us every night in Reseda, Los Angeles — or order online for pickup.</p>
      <a href="/" class="btn-primary" style="text-decoration: none; display: inline-flex;">Order Online</a>
    </div>
  </main>

  <footer style="padding: 40px 0; border-top: 1px solid var(--border); margin-top: 80px;">
    <div class="container" style="text-align: center;">
      <p style="font-size: 13px; color: var(--gray);">Bigi Awasaana &mdash; Afghan Street Food &mdash; Reseda, Los Angeles, CA &mdash; Open Every Night 6PM–2AM</p>
    </div>
  </footer>

</body>
</html>`;

      // Write menu.html to the public hosting directory
      const menuPath = path.join(__dirname, '..', 'menu.html');
      fs.writeFileSync(menuPath, html, 'utf8');

      console.log(`menu.html regenerated with ${items.length} items across ${sortedCategories.length} categories.`);
      return null;

    } catch (error) {
      console.error('Error regenerating menu.html:', error);
      throw error;
    }
  });
