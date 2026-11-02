const fs = require('fs');

// 1. Update blog.html
let blogHtml = fs.readFileSync('blog.html', 'utf8');

// Replace blog styles
const oldBlogStyles = `    .blog-hero {
      text-align: center;
      padding: clamp(120px, 15vw, 160px) 20px 60px;
      background: var(--bg);
      border-bottom: 1px solid var(--border);
    }
    .blog-feed {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 32px;
      padding: 60px 0;
    }
    .blog-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      transition: transform 0.3s ease, border-color 0.3s ease;
      display: flex;
      flex-direction: column;
      text-decoration: none;
    }
    .blog-card:hover {
      transform: translateY(-5px);
      border-color: var(--accent);
    }
    .blog-card-img-wrapper {
      width: 100%;
      height: 200px;
      background: var(--surface-light);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .blog-card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .blog-card-content {
      padding: 24px;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }
    .blog-card-date {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 14px;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .blog-card-title {
      font-family: 'Lalezar', cursive;
      font-size: 28px;
      color: var(--white);
      line-height: 1.2;
      margin-bottom: 12px;
    }
    .blog-card-excerpt {
      color: var(--gray);
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 24px;
      flex-grow: 1;
    }
    .blog-card-readmore {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 16px;
      color: var(--accent-light);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }`;

const newBlogStyles = `    .blog-hero {
      text-align: center;
      padding: clamp(100px, 12vw, 150px) 20px 40px;
      background: var(--bg);
      border-bottom: 1px solid var(--border);
    }
    .blog-filter-bar {
      max-width: 600px;
      margin: 24px auto 0;
      position: relative;
    }
    .blog-search-input {
      width: 100%;
      padding: 14px 20px 14px 46px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 99px;
      color: var(--white);
      font-size: 15px;
      font-family: 'Outfit', sans-serif;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      box-sizing: border-box;
    }
    .blog-search-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(255, 69, 0, 0.15);
    }
    .blog-search-icon {
      position: absolute;
      left: 18px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--gray);
      pointer-events: none;
    }
    .blog-feed {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
      gap: 32px;
      padding: 40px 0 60px;
    }
    .blog-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease, box-shadow 0.3s ease;
      display: flex;
      flex-direction: column;
      text-decoration: none;
    }
    .blog-card:hover {
      transform: translateY(-5px);
      border-color: var(--accent);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
    }
    .blog-card-img-wrapper {
      width: 100%;
      aspect-ratio: 16 / 9;
      height: auto;
      background: #111114;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }
    .blog-card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.4, 1);
    }
    .blog-card:hover .blog-card-img {
      transform: scale(1.04);
    }
    .blog-card-content {
      padding: 24px;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }
    .blog-card-date {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 13px;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .blog-card-title {
      font-family: 'Lalezar', cursive;
      font-size: 26px;
      color: var(--white);
      line-height: 1.25;
      margin-bottom: 12px;
    }
    .blog-card-excerpt {
      color: var(--gray-light, #a1a1aa);
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 20px;
      flex-grow: 1;
    }
    .blog-card-readmore {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 15px;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: gap 0.2s ease;
    }
    .blog-card:hover .blog-card-readmore {
      gap: 10px;
      color: var(--accent-light);
    }`;

blogHtml = blogHtml.replace(oldBlogStyles, newBlogStyles);

// Add search input inside hero
const oldHeroContent = `      <h1 class="font-lalezar" style="font-size: clamp(48px, 8vw, 80px); color: var(--accent); margin-bottom: 16px;">The Bigi Blog</h1>
      <p style="font-family: 'Barlow Condensed'; font-size: 24px; color: var(--white); text-transform: uppercase; letter-spacing: 2px;">News, Recipes, & Culture</p>
    </div>
  </section>`;

const newHeroContent = `      <h1 class="font-lalezar" style="font-size: clamp(48px, 8vw, 80px); color: var(--accent); margin-bottom: 16px;">The Bigi Blog</h1>
      <p style="font-family: 'Barlow Condensed'; font-size: 24px; color: var(--white); text-transform: uppercase; letter-spacing: 2px;">News, Recipes, &amp; Culture</p>
      <div class="blog-filter-bar">
        <svg class="blog-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="blog-search-input" class="blog-search-input" placeholder="Search Afghan recipes, Halal guides, or kabobs..." aria-label="Search blog articles">
      </div>
    </div>
  </section>`;

blogHtml = blogHtml.replace(oldHeroContent, newHeroContent);

// Add client-side search script before </body>
if (!blogHtml.includes('id="blog-search-input"')) {
  console.warn('Search input not added to blog.html');
}

const searchScript = `
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const input = document.getElementById('blog-search-input');
      if (input) {
        input.addEventListener('input', (e) => {
          const q = e.target.value.toLowerCase().trim();
          const cards = document.querySelectorAll('.blog-card');
          cards.forEach(card => {
            const title = card.querySelector('.blog-card-title')?.textContent.toLowerCase() || '';
            const excerpt = card.querySelector('.blog-card-excerpt')?.textContent.toLowerCase() || '';
            if (!q || title.includes(q) || excerpt.includes(q)) {
              card.style.display = 'flex';
            } else {
              card.style.display = 'none';
            }
          });
        });
      }
    });
  </script>
</body>`;

blogHtml = blogHtml.replace('</body>', searchScript);
fs.writeFileSync('blog.html', blogHtml, 'utf8');
console.log('Successfully updated blog.html');

// Also update functions/blog.html
if (fs.existsSync('functions/blog.html')) {
  fs.writeFileSync('functions/blog.html', blogHtml, 'utf8');
  console.log('Successfully updated functions/blog.html');
}

// 2. Update blog-template.html
let tplHtml = fs.readFileSync('blog-template.html', 'utf8');

const tableAndShareStyles = `
    /* Responsive Content Tables */
    .blog-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 32px 0;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      font-size: 15px;
    }
    .blog-content th {
      background: #18181b;
      color: var(--accent);
      font-family: 'Barlow Condensed', sans-serif;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 700;
      padding: 14px 18px;
      text-align: left;
      border-bottom: 2px solid var(--border);
      font-size: 16px;
    }
    .blog-content td {
      padding: 14px 18px;
      border-bottom: 1px solid var(--border);
      color: #e4e4e7;
      line-height: 1.6;
    }
    .blog-content tr:last-child td {
      border-bottom: none;
    }
    .blog-content tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }
    .table-wrapper {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      margin: 28px 0;
    }

    .share-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      border-radius: 99px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--white);
    }
    .share-btn:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
      color: var(--accent-light);
    }
    .share-btn:first-child {
      background: var(--surface) !important;
      color: var(--white) !important;
    }
    .share-btn:last-child {
      background: var(--surface) !important;
      color: var(--white) !important;
    }
`;

tplHtml = tplHtml.replace('.blog-share {', tableAndShareStyles + '\n    .blog-share {');
fs.writeFileSync('blog-template.html', tplHtml, 'utf8');
console.log('Successfully updated blog-template.html');

if (fs.existsSync('functions/blog-template.html')) {
  fs.writeFileSync('functions/blog-template.html', tplHtml, 'utf8');
  console.log('Successfully updated functions/blog-template.html');
}

// 3. Update functions/ssr.js with modern share buttons & CTA box
let ssrJs = fs.readFileSync('functions/ssr.js', 'utf8');

const oldShareBlock = `            <div class="blog-share">
              <span class="share-text">Share this article</span>
              <div class="share-buttons">
                <a href="https://twitter.com/intent/tweet?url=https://www.bigiawasaana.com/blog/\${postSlug}&text=\${encodeURIComponent(post.title)}" target="_blank" class="share-btn">Twitter</a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=https://www.bigiawasaana.com/blog/\${postSlug}" target="_blank" class="share-btn">Facebook</a>
              </div>
            </div>`;

const newShareAndCtaBlock = `            <!-- Catering & Menu CTA Banner -->
            <div class="blog-cta-box" style="margin-top: 48px; background: linear-gradient(135deg, #18181b 0%, #0d0d0f 100%); border: 1px solid var(--border); border-radius: 12px; padding: 32px 24px; text-align: center; position: relative; overflow: hidden;">
              <div style="position: absolute; top: 0; left: 0; width: 100%; height: 3px; background: linear-gradient(90deg, #FF4500, #FF6A00);"></div>
              <div style="font-family: 'Barlow Condensed'; font-size: 13px; font-weight: 700; color: var(--accent); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">Authentic Afghan Street Food &amp; Charcoal Grill</div>
              <h3 style="font-family: 'Lalezar'; font-size: clamp(26px, 4vw, 36px); color: var(--white); margin: 0 0 12px; line-height: 1.2;">Taste the Fire of Reseda</h3>
              <p style="color: var(--gray-light, #a1a1aa); font-size: 15px; line-height: 1.7; max-width: 620px; margin: 0 auto 24px;">Every skewer is 100% hand-slaughtered Zabiha Halal, marinated in fresh spices, and grilled over red-hot coals. Stop by our trailer on Victory Blvd or build a custom catering package for your next gathering.</p>
              <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
                <a href="/menu" class="btn-primary" style="text-decoration: none; padding: 12px 24px; font-size: 14px; border-radius: 6px; font-weight: 700;">Explore Menu &amp; Order</a>
                <a href="/catering" class="btn-outline" style="text-decoration: none; padding: 12px 24px; font-size: 14px; border-radius: 6px; font-weight: 600;">Build Catering Package &rarr;</a>
              </div>
            </div>

            <div class="blog-share" style="margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
              <span class="share-text" style="font-family: 'Barlow Condensed'; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--white);">Share This Guide</span>
              <div class="share-buttons" style="display: flex; gap: 10px; flex-wrap: wrap;">
                <a href="https://twitter.com/intent/tweet?url=https://www.bigiawasaana.com/blog/\${postSlug}&text=\${encodeURIComponent(post.title)}" target="_blank" rel="noopener" class="share-btn" aria-label="Share on X">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  <span>Share</span>
                </a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=https://www.bigiawasaana.com/blog/\${postSlug}" target="_blank" rel="noopener" class="share-btn" aria-label="Share on Facebook">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.312h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/></svg>
                  <span>Facebook</span>
                </a>
              </div>
            </div>`;

if (ssrJs.includes(oldShareBlock)) {
  ssrJs = ssrJs.replace(oldShareBlock, newShareAndCtaBlock);
  fs.writeFileSync('functions/ssr.js', ssrJs, 'utf8');
  console.log('Successfully updated functions/ssr.js with modern share and CTA');
} else {
  console.warn('oldShareBlock not found in functions/ssr.js');
}
