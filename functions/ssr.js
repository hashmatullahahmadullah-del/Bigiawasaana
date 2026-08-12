const { functions, db } = require('./shared');
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────
// renderBlogPage (SSR for /blog/**)
// ─────────────────────────────────────────────────────────────────
exports.renderBlogPage = functions.https.onRequest(async (req, res) => {
  try {
    const urlParts = req.path.split('/').filter(Boolean);
    const postSlug = urlParts[urlParts.length - 1];

    if (!postSlug) {
      return res.status(404).send('Not Found');
    }

    const snapshot = await db.collection('posts').where('slug', '==', postSlug).limit(1).get();
    
    const templatePath = path.join(__dirname, 'blog-template.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    if (snapshot.empty) {
      html = html.replace(/{{TITLE}}/g, 'Blog Post Not Found | Bigi Awasaana');
      html = html.replace(/{{META_DESC}}/g, "We couldn't find the article you're looking for.");
      html = html.replace(/{{META_ROBOTS}}/g, '<meta name="robots" content="noindex">');
      html = html.replace(/{{OG_IMAGE}}/g, 'https://bigiawasaana.com/logo.webp');
      html = html.replace(/{{POST_SLUG}}/g, postSlug);
      html = html.replace(/{{SCHEMA_DATA}}/g, '');
      html = html.replace(/{{META_KEYWORDS}}/g, '');
      html = html.replace(/{{BREADCRUMB_SCHEMA}}/g, '');
      
      const notFoundContent = `
        <section class="blog-article" style="text-align: center; padding-top: clamp(150px, 15vw, 200px); min-height: 60vh;">
          <h1 class="blog-title">404</h1>
          <h2 style="font-family: 'Barlow Condensed'; font-size: 24px; color: var(--white); margin-bottom: 24px;">Post Not Found</h2>
          <p style="color: var(--gray); margin-bottom: 32px;">This post may have been removed or the URL is incorrect.</p>
          <a href="/blog.html" class="btn-primary">View All Posts</a>
        </section>
      `;
      html = html.replace(/{{POST_CONTENT}}/g, notFoundContent);
      return res.status(404).send(html);
    }

    const postDoc = snapshot.docs[0];
    const post = postDoc.data();

    // Check if published
    if (!post.isPublished) {
      html = html.replace(/{{TITLE}}/g, 'Draft | Bigi Awasaana');
      html = html.replace(/{{META_DESC}}/g, "Draft post.");
      html = html.replace(/{{META_ROBOTS}}/g, '<meta name="robots" content="noindex">');
      html = html.replace(/{{OG_IMAGE}}/g, 'https://bigiawasaana.com/logo.webp');
      html = html.replace(/{{POST_SLUG}}/g, postSlug);
      html = html.replace(/{{SCHEMA_DATA}}/g, '');
      html = html.replace(/{{META_KEYWORDS}}/g, '');
      html = html.replace(/{{BREADCRUMB_SCHEMA}}/g, '');
      html = html.replace(/{{POST_CONTENT}}/g, '<section class="blog-article"><h2>This post is not published yet.</h2></section>');
      return res.status(404).send(html);
    }

    const title = post.title + ' | Bigi Awasaana Blog';
    const desc = post.excerpt || `Read ${post.title} on the Bigi Awasaana Blog.`;
    let image = post.coverImage || 'https://bigiawasaana.com/logo.webp';
    if (image.startsWith('/')) {
      image = `https://bigiawasaana.com${image}`;
    }
    const pubDate = post.publishedAt ? new Date(post.publishedAt.toMillis()).toISOString() : new Date().toISOString();
    const modDate = post.updatedAt ? new Date(post.updatedAt.toMillis()).toISOString() : pubDate;
    const formattedDate = new Date(pubDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    html = html.replace(/{{TITLE}}/g, title);
    html = html.replace(/{{META_DESC}}/g, desc);
    html = html.replace(/{{META_ROBOTS}}/g, '');
    html = html.replace(/{{OG_IMAGE}}/g, image);
    html = html.replace(/{{POST_SLUG}}/g, postSlug);
    
    // Keywords
    if (post.keywords) {
      html = html.replace(/{{META_KEYWORDS}}/g, `<meta name="keywords" content="${post.keywords}">`);
    } else {
      html = html.replace(/{{META_KEYWORDS}}/g, '');
    }

    const schema = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `https://bigiawasaana.com/blog/${postSlug}`
      },
      "headline": post.title,
      "description": desc,
      "image": image,  
      "author": {
        "@type": "Organization",
        "name": "Bigi Awasaana"
      },  
      "publisher": {
        "@type": "Organization",
        "name": "Bigi Awasaana",
        "logo": {
          "@type": "ImageObject",
          "url": "https://bigiawasaana.com/logo.webp"
        }
      },
      "datePublished": pubDate,
      "dateModified": modDate
    };
    if (post.keywords) {
      schema.keywords = post.keywords;
    }

    html = html.replace(/{{SCHEMA_DATA}}/g, JSON.stringify(schema, null, 2));

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://bigiawasaana.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Blog",
          "item": "https://bigiawasaana.com/blog.html"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": post.title,
          "item": `https://bigiawasaana.com/blog/${postSlug}`
        }
      ]
    };
    html = html.replace(/{{BREADCRUMB_SCHEMA}}/g, JSON.stringify(breadcrumbSchema, null, 2));

    let cleanContent = post.content || '';
    if (post.coverImage) {
      const escapedUrl = post.coverImage.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      // Remove the image if it's wrapped in a <p>
      cleanContent = cleanContent.replace(new RegExp(`<p>\\s*<img[^>]*src=["']${escapedUrl}["'][^>]*>\\s*</p>`, 'gi'), '');
      // Remove just the <img> tag if it wasn't caught above
      cleanContent = cleanContent.replace(new RegExp(`<img[^>]*src=["']${escapedUrl}["'][^>]*>`, 'gi'), '');
    }

    const contentHtml = `
      <article class="blog-article">
        <div class="container">
          <header class="blog-header">
            <a href="/blog.html" class="back-to-blog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back to Blog</a>
            <div class="blog-meta">
              <span class="blog-date">${formattedDate}</span>
              ${post.keywords ? `<span class="blog-category">${post.keywords.split(',')[0].trim()}</span>` : ''}
            </div>
            <h1 class="blog-title">${post.title}</h1>
          </header>
        </div>

        ${post.coverImage ? `
        <div class="blog-hero-image-wrapper">
          <div class="container">
            <img src="${post.coverImage}" alt="${post.title}" class="blog-cover">
          </div>
        </div>
        ` : ''}

        <div class="container">
          <div class="blog-content-wrapper">
            <div class="blog-content">
              ${cleanContent}
            </div>
            
            <div class="blog-share">
              <span class="share-text">Share this article</span>
              <div class="share-buttons">
                <a href="https://twitter.com/intent/tweet?url=https://bigiawasaana.com/blog/${postSlug}&text=${encodeURIComponent(post.title)}" target="_blank" class="share-btn">Twitter</a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=https://bigiawasaana.com/blog/${postSlug}" target="_blank" class="share-btn">Facebook</a>
              </div>
            </div>
          </div>
        </div>
      </article>
    `;

    html = html.replace(/{{POST_CONTENT}}/g, contentHtml);

    res.set('Cache-Control', 'public, max-age=60, s-maxage=86400');
    res.status(200).send(html);
  } catch (error) {
    console.error('Error rendering blog page:', error);
    res.status(500).send('Internal Server Error');
  }
});

// ─────────────────────────────────────────────────────────────────
// renderItemPage (SSR for /item/**)
// ─────────────────────────────────────────────────────────────────
exports.renderItemPage = functions.https.onRequest(async (req, res) => {
  try {
    const urlParts = req.path.split('/').filter(Boolean);
    const itemSlug = urlParts[urlParts.length - 1]; 

    if (!itemSlug) {
      return res.status(404).send('Not Found');
    }

    const snapshot = await db.collection('menu').get();
    let selectedItem = null;
    const allItems = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const name = data.name || '';
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      allItems.push({ name, slug, data });
      if (slug === itemSlug) {
        selectedItem = data;
      }
    });

    if (!selectedItem) {
      // Fallback matching for old SEO links
      let strippedSlug = itemSlug.replace(/^bigi-s-/, '');
      const oldToNew = {
        'shami-kabob': 'shami-kabab-plate',
        'qabuli-palou': 'qabuli-palaw',
        'doogh-yogurt-drink': 'doogh',
        'shawarma': 'chicken-shawarma-wrap',
        'samosa': 'chicken-samosa',
        'smash-burger-with-fries': 'smash-burger-meal',
        'tikka-kabob': 'tikka-kabab-plate'
      };
      if (oldToNew[strippedSlug]) {
        strippedSlug = oldToNew[strippedSlug];
      }
      
      selectedItem = allItems.find(i => i.slug === strippedSlug)?.data;

      if (!selectedItem) {
        const partialMatch = allItems.find(i => i.slug.includes(strippedSlug) || strippedSlug.includes(i.slug));
        if (partialMatch) {
          selectedItem = partialMatch.data;
        }
      }
    }

    const templatePath = path.join(__dirname, 'item-template.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    if (!selectedItem) {
      html = html.replace(/{{TITLE}}/g, 'Item Not Found | Bigi Awasaana');
      html = html.replace(/{{META_DESC}}/g, "We couldn't find the menu item you're looking for.");
      html = html.replace(/{{META_ROBOTS}}/g, '<meta name="robots" content="noindex">');
      html = html.replace(/{{OG_IMAGE}}/g, '/assets/logo.webp');
      html = html.replace(/{{ITEM_SLUG}}/g, itemSlug);
      html = html.replace(/{{SCHEMA_DATA}}/g, '');
      html = html.replace(/{{META_KEYWORDS}}/g, '');
      html = html.replace(/{{BREADCRUMB_SCHEMA}}/g, '');

      const notFoundContent = `
        <section class="section" style="padding-top: clamp(120px, 15vw, 160px); background-color: var(--bg); min-height: 60vh; display: flex; align-items: center; justify-content: center; text-align: center;">
          <div class="container" style="max-width: 600px;">
            <h1 class="font-lalezar" style="font-size: clamp(48px, 8vw, 80px); color: var(--accent); margin-bottom: var(--space-s);">404</h1>
            <h2 style="font-family: 'Barlow Condensed'; font-size: 24px; letter-spacing: 2px; text-transform: uppercase; color: var(--white); margin-bottom: var(--space-m);">Item Not Found</h2>
            <p style="color: var(--gray-light); font-size: 1.1rem; line-height: 1.6; margin-bottom: var(--space-l);">
              We couldn't find the menu item you're looking for. It might have been removed or renamed.
            </p>
            <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
              <a href="/menu.html" class="btn-primary" style="min-width: 160px;">View Menu</a>
            </div>
          </div>
        </section>
      `;
      html = html.replace(/{{ITEM_CONTENT}}/g, notFoundContent);
      return res.status(404).send(html);
    }

    const areasSnapshot = await db.collection('serviceAreas').where('isPublished', '==', true).get();
    const areas = [];
    areasSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.name) areas.push(data.name);
    });

    const priceFormatted = typeof selectedItem.price === 'number' ? selectedItem.price.toFixed(2) : parseFloat(selectedItem.price || 0).toFixed(2);
    const itemName = selectedItem.name;
    const itemDesc = selectedItem.desc || selectedItem.description || `Delicious ${itemName} prepared fresh.`;
    let itemImg = selectedItem.img || selectedItem.image || selectedItem.imageUrl || '/assets/logo.webp';
    if (itemImg.startsWith('/')) {
      itemImg = `https://bigiawasaana.com${itemImg}`;
    }
    
    // Create SEO title and desc
    const title = `${itemName} Near Me in Reseda, CA | Bigi Awasaana`;
    const description = `Order the best ${itemName} near you. ${itemDesc}`;
    const keywords = `best ${itemName} Reseda, ${itemName} near me, Afghan food Reseda, halal food Reseda, halal food truck Los Angeles, Afghan food truck near me, Zabiha Halal, delivery area Reseda, pickup area Reseda`;
    
    html = html.replace(/{{TITLE}}/g, title);
    html = html.replace(/{{META_DESC}}/g, description);

    html = html.replace(/{{META_KEYWORDS}}/g, keywords);
    html = html.replace(/{{META_ROBOTS}}/g, '');
    html = html.replace(/{{OG_IMAGE}}/g, itemImg);
    html = html.replace(/{{ITEM_SLUG}}/g, itemSlug);
    const schemaData = `
    <script type="application/ld+json">
    [{
      "@context": "https://schema.org",
      "@type": "MenuItem",
      "name": "${itemName.replace(/"/g, '\\"')}",
      "description": "${itemDesc.replace(/"/g, '\\"')}",
      "image": "${itemImg}",
      "suitableForDiet": "https://schema.org/HalalDiet",
      "offers": {
        "@type": "Offer",
        "price": "${priceFormatted}",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [{
        "@type": "Question",
        "name": "Is the ${itemName} halal?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, our ${itemName} is 100% Zabiha Halal, cooked to perfection at Bigi Awasaana."
        }
      }, {
        "@type": "Question",
        "name": "Do you deliver ${itemName} in Los Angeles?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, we deliver ${itemName} across Los Angeles via Uber Eats and DoorDash, and offer pickup in Reseda."
        }
      }]
    }]
    </script>
    `;
    html = html.replace(/{{SCHEMA_DATA}}/g, schemaData);

    const areasText = areas.length > 0 
      ? `We proudly serve our famous ${itemName} to customers in Reseda and surrounding areas including ${areas.slice(0, -1).join(', ')}${areas.length > 1 ? ' and ' : ''}${areas[areas.length - 1]}. Stop by for pickup or order delivery today!` 
      : `Stop by for pickup or order delivery today in Reseda, CA!`;

    const itemContent = `
      <section class="section" style="padding-top: clamp(120px, 15vw, 160px); background-color: var(--bg); min-height: 80vh;">
        <div class="container" style="max-width: 1000px; margin: 0 auto;">
          
          <!-- Back button -->
          <a href="/menu.html" style="display: inline-flex; align-items: center; gap: 8px; color: var(--gray); text-decoration: none; font-family: 'Barlow Condensed'; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 32px; font-weight: 600;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to Menu
          </a>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 48px; align-items: start;">
            <!-- Image -->
            <div style="width: 100%; aspect-ratio: 1; border-radius: 8px; overflow: hidden; background: var(--surface); border: 1px solid var(--border);">
              <img src="${itemImg}" alt="${itemName.replace(/"/g, '&quot;')}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>

            <!-- Content -->
            <div>
              <h1 class="font-lalezar" style="font-size: clamp(36px, 6vw, 56px); color: var(--accent); margin-bottom: 8px; line-height: 1.1;">Halal ${itemName} in Los Angeles</h1>
              <div style="font-size: 28px; color: var(--white); font-family: 'Barlow Condensed'; font-weight: 600; margin-bottom: 24px;">$${priceFormatted}</div>
              
              <div style="font-size: 1.1rem; line-height: 1.8; color: var(--gray-light); margin-bottom: 32px;">
                <p>${itemDesc}</p>
              </div>

              <!-- SEO Local Text -->
              <div style="background: rgba(255, 69, 0, 0.05); border: 1px solid rgba(255, 69, 0, 0.2); border-radius: 8px; padding: 20px; margin-bottom: 32px;">
                <h3 style="color: var(--white); font-family: 'Barlow Condensed'; font-size: 16px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px;">Order ${itemName} Near Me</h3>
                <p style="color: var(--gray); font-size: 14px; line-height: 1.6;">${areasText}</p>
              </div>

              <!-- CTA Buttons -->
              <div style="display: flex; flex-direction: column; gap: 16px;">
                <a href="/menu.html" class="btn-primary" style="text-align: center; width: 100%;">Order for Pickup</a>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                  <a href="https://www.ubereats.com/store/bigi-awasaana-%E2%80%93-halal-burgers-%26-kabobs/F2Nn6alaR6eTb6AAwVxq4g?diningMode=DELIVERY&sc=SEARCH_SUGGESTION" target="_blank" rel="noopener" class="btn-outline" style="text-align: center; padding: 12px; border-color: rgba(6, 193, 103, 0.5); background: rgba(6, 193, 103, 0.1);">Uber Eats</a>
                  <a href="https://www.doordash.com/store/bigi-awasaana-(afghan-halal-cuisine)-reseda-45987589/111478560/?event_type=autocomplete&pickup=false" target="_blank" rel="noopener" class="btn-outline" style="text-align: center; padding: 12px; border-color: rgba(255, 48, 8, 0.5); background: rgba(255, 48, 8, 0.1);">DoorDash</a>
                </div>
              </div>
            </div>
            </div>
          </div>
          
          <div style="margin-top: 60px; padding-top: 40px; border-top: 1px solid var(--border);">
            <h3 style="font-family: 'Barlow Condensed'; font-size: 20px; color: var(--accent); margin-bottom: 16px;">Explore More Halal Afghan Food</h3>
            <p style="font-size: 14px; line-height: 1.8; color: var(--gray);">
              ${allItems.filter(i => i.slug !== itemSlug).map(i => `<a href="/item/${i.slug}" style="color: var(--gray); text-decoration: none;">Order Halal ${i.name}</a>`).join(' | ')}
            </p>
            <h3 style="font-family: 'Barlow Condensed'; font-size: 20px; color: var(--accent); margin-top: 32px; margin-bottom: 16px;">Delivery Service Areas</h3>
            <p style="font-size: 14px; line-height: 1.8; color: var(--gray);">
              ${areas.map(a => { const s = a.toLowerCase().replace(/\s+/g, '-'); return `<a href="/areas/${s}" style="color: var(--gray); text-decoration: none;">Halal Afghan Food Delivery in ${a}</a>`; }).join(' | ')}
            </p>
          </div>

        </div>
      </section>
    `;

    html = html.replace(/{{ITEM_CONTENT}}/g, itemContent);

    res.set('Cache-Control', 'public, max-age=60, s-maxage=3600');
    res.status(200).send(html);

  } catch (error) {
    console.error('Error rendering item page:', error);
    res.status(500).send('Internal Server Error');
  }
});

// ─────────────────────────────────────────────────────────────────
// renderAreaPage (SSR for /areas/**)
// ─────────────────────────────────────────────────────────────────
exports.renderAreaPage = functions.https.onRequest(async (req, res) => {
  try {
    const urlParts = req.path.split('/').filter(Boolean);
    const areaId = urlParts[urlParts.length - 1]; // e.g. "tarzana"

    if (!areaId) {
      return res.status(404).send('Not Found');
    }

    const areaDoc = await db.collection('serviceAreas').doc(areaId).get();
    
    if (!areaDoc.exists) {
      const templatePath = path.join(__dirname, 'area-template.html');
      let html = fs.readFileSync(templatePath, 'utf8');

      html = html.replace(/{{TITLE}}/g, 'Area Not Found | Bigi Awasaana');
      html = html.replace(/{{META_DESC}}/g, "We couldn't find the neighborhood page you're looking for.");
      html = html.replace(/{{META_ROBOTS}}/g, '<meta name="robots" content="noindex">');

      const notFoundContent = `
        <section class="section" style="padding-top: clamp(120px, 15vw, 160px); background-color: var(--bg); min-height: 60vh; display: flex; align-items: center; justify-content: center; text-align: center;">
          <div class="container" style="max-width: 600px;">
            <h1 class="font-lalezar" style="font-size: clamp(48px, 8vw, 80px); color: var(--accent); margin-bottom: var(--space-s);">404</h1>
            <h2 style="font-family: 'Barlow Condensed'; font-size: 24px; letter-spacing: 2px; text-transform: uppercase; color: var(--white); margin-bottom: var(--space-m);">Area Not Found</h2>
            <p style="color: var(--gray-light); font-size: 1.1rem; line-height: 1.6; margin-bottom: var(--space-l);">
              We couldn't find the neighborhood page you're looking for. It might have been moved or doesn't exist yet.
            </p>
            <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
              <a href="/menu.html" class="btn-primary" style="min-width: 160px;">View Menu</a>
              <a href="/" class="btn-outline" style="min-width: 160px;">Go Home</a>
            </div>
          </div>
        </section>
      `;

      html = html.replace(/{{AREA_CONTENT}}/g, notFoundContent);
      return res.status(404).send(html);
    }

    const areaData = areaDoc.data();
    
    // Read the bundled template
    const templatePath = path.join(__dirname, 'area-template.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    // Replace SEO placeholders
    const title = areaData.title || `Halal Afghan Food Delivery in ${areaData.name || areaId} | Bigi Awasaana`;
    const description = areaData.metaDescription || `Order the best Halal Afghan street food, kabobs, and bolani in ${areaData.name || areaId}.`;
    
    html = html.replace(/{{TITLE}}/g, title);
    html = html.replace(/{{META_DESC}}/g, description);

    // Generate area schema and inject
    const areaSchemaData = `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FoodEstablishment",
      "name": "Bigi Awasaana",
      "image": "https://bigiawasaana.com/logo.webp",
      "url": "https://bigiawasaana.com/areas/${areaId}",
      "telephone": "+13239211646",
      "servesCuisine": ["Afghan", "Middle Eastern", "Halal"],
      "areaServed": {
        "@type": "City",
        "name": "${areaData.name || areaId}"
      }
    }
    </script>
    `;
    html = html.replace(/{{SCHEMA_DATA}}/g, areaSchemaData);


    // Thin content safeguard
    if (areaData.isPublished === false) {
      html = html.replace(/{{META_ROBOTS}}/g, '<meta name="robots" content="noindex">');
    } else {
      html = html.replace(/{{META_ROBOTS}}/g, ''); // leave blank
    }
    html = html.replace(/{{AREA_ID}}/g, areaId);

    const areaContent = `
      <section class="section" style="margin-top: 100px; padding-top: 60px; background-color: var(--bg); min-height: 60vh; position: relative;">
        <div class="hero-watermark" style="position: absolute; top: -20px; left: 0; width: 100%; text-align: center; font-family: 'Lalezar', cursive; font-size: clamp(60px, 12vw, 150px); color: rgba(255,255,255,0.03); z-index: 0; pointer-events: none; white-space: nowrap; overflow: hidden;">Premium Halal Afghan</div>
        <div class="container text-center-mobile" style="max-width: 800px; margin: 0 auto; position: relative; z-index: 1;">
          <h1 class="font-lalezar" style="font-size: clamp(36px, 6vw, 64px); color: var(--accent); margin-bottom: var(--space-xs);">${areaData.headline || 'Takeout Near ' + (areaData.name || areaId)}</h1>
          ${areaData.driveTime ? `<p style="color: var(--gray); font-family: 'Barlow Condensed'; font-size: 1.2rem; letter-spacing: 1px; text-transform: uppercase; margin-bottom: var(--space-m);">Just a ${areaData.driveTime} drive to Reseda</p>` : ''}
          <div style="font-size: 1.1rem; line-height: 1.8; color: var(--gray-light); margin-bottom: var(--space-l);">
            ${areaData.introText ? `<p>${areaData.introText}</p>` : '<p>Experience the authentic taste of the Silk Road right here in the San Fernando Valley.</p>'}
          </div>
          <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-bottom: 40px;">
            <a href="/menu.html" class="btn-primary">Order for Pickup</a>
            <a href="/#delivery" class="btn-outline">Order Delivery</a>
          </div>
          
          <!-- Location and Contact -->
          <div style="background: var(--surface); padding: 24px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 40px;">
            <h3 style="font-family: 'Barlow Condensed'; font-size: 24px; color: var(--accent); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">Visit Us</h3>
            <p style="color: var(--gray-light); font-size: 1.1rem; margin-bottom: 8px;">18411 Victory Blvd, Reseda, CA 91335</p>
            <p style="margin-bottom: 24px;">
              <a href="tel:+13239211646" style="color: var(--white); font-weight: bold; font-size: 1.2rem; text-decoration: none;">📞 (323) 921-1646</a>
            </p>
            <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
              <a href="https://maps.app.goo.gl/HRWCNVDR8fsv5jzv8" target="_blank" rel="noopener" class="btn-outline" style="display: flex; align-items: center; gap: 8px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                Get Directions
              </a>
            </div>
          </div>

          <div class="map-container" style="border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
            <iframe width="100%" height="350" style="border:0;" loading="lazy" allowfullscreen src="https://maps.google.com/maps?q=18411+Victory+Blvd,+Reseda,+CA&t=&z=14&ie=UTF8&iwloc=&output=embed"></iframe>
          </div>

          <!-- Internal Menu Links for Area Pages -->
          <div style="margin-top: 60px; padding-top: 40px; border-top: 1px solid var(--border); text-align: left;">
            <h3 style="font-family: 'Barlow Condensed'; font-size: 20px; color: var(--accent); margin-bottom: 16px;">Popular Delivery Items in ${areaData.name || areaId}</h3>
            <p style="font-size: 14px; line-height: 1.8; color: var(--gray);">
              <a href="/item/bigi-s-tikka-kabob" style="color: var(--gray); text-decoration: none;">Order Halal Chicken Tikka Kabob in ${areaData.name || areaId}</a> | 
              <a href="/item/bigi-s-shami-kabob" style="color: var(--gray); text-decoration: none;">Order Halal Shami Kabob in ${areaData.name || areaId}</a> | 
              <a href="/item/bigi-s-qabuli-palou" style="color: var(--gray); text-decoration: none;">Order Halal Qabuli Palou in ${areaData.name || areaId}</a> | 
              <a href="/item/bigi-s-samosa" style="color: var(--gray); text-decoration: none;">Order Halal Samosa in ${areaData.name || areaId}</a> | 
              <a href="/item/bigi-s-bolani" style="color: var(--gray); text-decoration: none;">Order Halal Bolani in ${areaData.name || areaId}</a>
            </p>
          </div>

        </div>
      </section>
    `;

    html = html.replace(/{{AREA_CONTENT}}/g, areaContent);

    // Cache headers: 1 hour CDN cache
    res.set('Cache-Control', 'public, max-age=60, s-maxage=3600');
    res.status(200).send(html);

  } catch (error) {
    console.error('Error rendering area page:', error);
    res.status(500).send('Internal Server Error');
  }
});

// ─────────────────────────────────────────────────────────────────
// renderSitemap (SSR for /sitemap.xml)
// ─────────────────────────────────────────────────────────────────
exports.renderSitemap = functions.https.onRequest(async (req, res) => {
  try {
    const baseUrl = 'https://bigiawasaana.com';
    const now = new Date().toISOString().split('T')[0];
    
    // Core static URLs
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>\${baseUrl}/</loc>
    <lastmod>\${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>\${baseUrl}/menu.html</loc>
    <lastmod>\${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>\${baseUrl}/specials.html</loc>
    <lastmod>\${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>\${baseUrl}/locations.html</loc>
    <lastmod>\${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>\${baseUrl}/catering.html</loc>
    <lastmod>\${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>\${baseUrl}/faq.html</loc>
    <lastmod>\${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>\${baseUrl}/blog.html</loc>
    <lastmod>\${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;

    // Static area pages (always present as generated HTML files)
    const staticAreaSlugs = [
      'reseda', 'encino', 'sherman-oaks', 'woodland-hills', 'tarzana', 'calabasas',
      'canoga-park', 'chatsworth', 'granada-hills', 'lake-balboa', 'mission-hills',
      'north-hills', 'north-hollywood', 'northridge', 'porter-ranch', 'studio-city',
      'sun-valley', 'sylmar', 'van-nuys', 'west-hills', 'winnetka'
    ];

    // Merge with any Firestore-published areas (deduplication)
    const allAreaSlugs = new Set(staticAreaSlugs);
    try {
      const areasSnapshot = await db.collection('serviceAreas')
        .where('isPublished', '==', true)
        .get();
      areasSnapshot.forEach(doc => allAreaSlugs.add(doc.id));
    } catch (e) {
      // Firestore may be empty — that's fine, we have the static list
    }

    allAreaSlugs.forEach(slug => {
      xml += `
  <url>
    <loc>\${baseUrl}/areas/\${slug}</loc>
    <lastmod>\${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    });

    // Fetch menu items for individual item pages
    const menuSnapshot = await db.collection('menu').get();
    menuSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.name) {
        const itemSlug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        xml += `
  <url>
    <loc>\${baseUrl}/item/\${itemSlug}</loc>
    <lastmod>\${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    });

    // Fetch published blog posts
    const postsSnapshot = await db.collection('posts')
      .where('isPublished', '==', true)
      .get();
    postsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.slug) {
        xml += `
  <url>
    <loc>\${baseUrl}/blog/\${data.slug}</loc>
    <lastmod>\${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
      }
    });

    xml += `\n</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=60, s-maxage=3600');
    res.status(200).send(xml);

  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Internal Server Error');
  }
});
