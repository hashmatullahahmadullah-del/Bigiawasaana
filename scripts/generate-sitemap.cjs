const fs = require('fs');
const path = require('path');
const { ITEMS } = require('./menu-items-data.cjs');

async function generateSitemap() {
  console.log('Generating production sitemap.xml...');
  const baseUrl = 'https://www.bigiawasaana.com';
  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Core Static Pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/menu</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/shop</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/locations</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/catering</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/specials</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/faq</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;

  // 2. Service Areas (10 closest to kitchen)
  const staticAreaSlugs = [
    'reseda', 'tarzana', 'winnetka', 'lake-balboa', 'northridge',
    'canoga-park', 'west-hills', 'van-nuys', 'encino', 'woodland-hills'
  ];

  staticAreaSlugs.forEach(slug => {
    xml += `
  <url>
    <loc>${baseUrl}/areas/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
  });

  // 3. Fetch Published Blog Posts
  const posts = [];
  const credPath = 'C:\\Users\\User\\AppData\\Roaming\\firebase\\bigiawasaana_gmail_com_application_default_credentials.json';

  try {
    if (fs.existsSync(credPath)) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const admin = require('firebase-admin');
      const { applicationDefault, getApps } = admin;
      const { getFirestore } = require('firebase-admin/firestore');

      if (!getApps().length) {
        admin.initializeApp({
          credential: applicationDefault(),
          projectId: 'bigi-awasaana-7b3ce'
        });
      }

      const db = getFirestore();
      const postsSnap = await db.collection('posts')
        .where('isPublished', '==', true)
        .get();

      postsSnap.forEach(doc => {
        const post = doc.data();
        if (post.slug && post.status !== 'redirected') {
          posts.push(post);
        }
      });
    }
  } catch (err) {
    console.warn('Firestore skipped for sitemap in CI/Vercel:', err.message);
  }

  // Fallback to cache if posts empty
  if (posts.length === 0) {
    const cacheFile = path.join(__dirname, 'posts-cache.json');
    if (fs.existsSync(cacheFile)) {
      try {
        const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        cached.forEach(p => {
          if (p.slug && p.status !== 'redirected') posts.push(p);
        });
      } catch (e) {}
    }
  }

  let blogCount = 0;
  posts.forEach(post => {
    blogCount++;
    const isPillar = post.slug === 'complete-guide-to-afghan-food-los-angeles';
    const rawTime = post.updatedAt || post.publishedAt;
    const timeVal = rawTime ? (rawTime.toMillis ? rawTime.toMillis() : rawTime) : null;
    const lastmod = timeVal ? new Date(timeVal).toISOString().split('T')[0] : today;

    xml += `
  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${isPillar ? 'weekly' : 'monthly'}</changefreq>
    <priority>${isPillar ? '0.9' : '0.7'}</priority>
  </url>`;
  });

  // 4. Menu Items from ITEMS constant
  if (Array.isArray(ITEMS)) {
    ITEMS.forEach(item => {
      if (item.name) {
        const itemSlug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        xml += `
  <url>
    <loc>${baseUrl}/item/${itemSlug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    });
  }

  xml += `\n</urlset>\n`;

  // Write to public/sitemap.xml and dist/sitemap.xml
  ['public/sitemap.xml', 'dist/sitemap.xml'].forEach(rel => {
    const full = path.join(process.cwd(), rel);
    try {
      fs.writeFileSync(full, xml, 'utf8');
      console.log(`Generated ${rel} (${blogCount} live blog posts included)`);
    } catch (e) {}
  });
}

generateSitemap().then(() => process.exit(0)).catch(err => {
  console.warn('Error generating sitemap, exiting safely:', err.message);
  process.exit(0);
});
