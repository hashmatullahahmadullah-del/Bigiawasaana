const fs = require('fs');

// 1. blog.html
let blogHtml = fs.readFileSync('blog.html', 'utf8').replace(/\r\n/g, '\n');

const heroTarget = `<p style="font-family: 'Barlow Condensed'; font-size: 24px; color: var(--white); text-transform: uppercase; letter-spacing: 2px;">News, Recipes, & Culture</p>
    </div>
  </section>`;

const heroReplacement = `<p style="font-family: 'Barlow Condensed'; font-size: 24px; color: var(--white); text-transform: uppercase; letter-spacing: 2px;">News, Recipes, & Culture</p>
      <div class="blog-filter-bar">
        <svg class="blog-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="blog-search-input" class="blog-search-input" placeholder="Search Afghan recipes, Halal guides, or kabob cuts..." aria-label="Search blog articles">
      </div>
    </div>
  </section>`;

if (blogHtml.includes(heroTarget)) {
  blogHtml = blogHtml.replace(heroTarget, heroReplacement);
  fs.writeFileSync('blog.html', blogHtml, 'utf8');
  if (fs.existsSync('functions/blog.html')) {
    fs.writeFileSync('functions/blog.html', blogHtml, 'utf8');
  }
  console.log('Successfully inserted search bar into blog.html and functions/blog.html');
} else {
  console.warn('heroTarget not found in blog.html');
}

// 2. functions/ssr.js
let ssrJs = fs.readFileSync('functions/ssr.js', 'utf8').replace(/\r\n/g, '\n');

const ssrTarget = `            <div class="blog-share">
              <span class="share-text">Share this article</span>
              <div class="share-buttons">
                <a href="https://twitter.com/intent/tweet?url=https://www.bigiawasaana.com/blog/\${postSlug}&text=\${encodeURIComponent(post.title)}" target="_blank" class="share-btn">Twitter</a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=https://www.bigiawasaana.com/blog/\${postSlug}" target="_blank" class="share-btn">Facebook</a>
              </div>
            </div>`;

const ssrReplacement = `            <!-- Catering & Menu CTA Banner -->
            <div class="blog-cta-box" style="margin-top: 48px; background: linear-gradient(135deg, #18181b 0%, #0d0d0f 100%); border: 1px solid var(--border); border-radius: 12px; padding: 32px 24px; text-align: center; position: relative; overflow: hidden;">
              <div style="position: absolute; top: 0; left: 0; width: 100%; height: 3px; background: linear-gradient(90deg, #FF4500, #FF6A00);"></div>
              <div style="font-family: 'Barlow Condensed'; font-size: 13px; font-weight: 700; color: var(--accent); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">Authentic Afghan Street Food &amp; Charcoal Grill</div>
              <h3 style="font-family: 'Lalezar'; font-size: clamp(26px, 4vw, 36px); color: var(--white); margin: 0 0 12px; line-height: 1.2;">Taste the Fire of Reseda</h3>
              <p style="color: var(--gray-light, #a1a1aa); font-size: 15px; line-height: 1.7; max-width: 620px; margin: 0 auto 24px;">Every skewer is 100% hand-slaughtered Zabiha Halal, marinated in fresh spices, and grilled over red-hot coals. Stop by our trailer on Victory Blvd or build a custom catering package for your event.</p>
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

if (ssrJs.includes(ssrTarget)) {
  ssrJs = ssrJs.replace(ssrTarget, ssrReplacement);
  fs.writeFileSync('functions/ssr.js', ssrJs, 'utf8');
  console.log('Successfully updated functions/ssr.js');
} else {
  console.warn('ssrTarget not found in functions/ssr.js');
}
