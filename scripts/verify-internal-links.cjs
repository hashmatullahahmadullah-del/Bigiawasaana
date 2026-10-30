const admin = require('firebase-admin');
const { getApps, initializeApp, applicationDefault } = admin;
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const credPath = 'C:\\Users\\User\\AppData\\Roaming\\firebase\\bigiawasaana_gmail_com_application_default_credentials.json';
if (fs.existsSync(credPath)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
}

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: 'bigi-awasaana-7b3ce'
  });
}

const db = getFirestore();

async function audit() {
  const snap = await db.collection('posts').get();
  const posts = [];
  snap.forEach(doc => {
    posts.push({ id: doc.id, ...doc.data() });
  });

  const active = posts.filter(p => p.status !== 'redirected' && p.isPublished === true);
  const redirected = posts.filter(p => p.status === 'redirected' || p.isPublished === false);

  console.log(`\n===============================================================`);
  console.log(`TECHNICAL SEO OVERHAUL AUDIT REPORT`);
  console.log(`Total Database Docs: ${posts.length}`);
  console.log(`Active Live Posts:   ${active.length}`);
  console.log(`Redirected Posts:    ${redirected.length}`);
  console.log(`===============================================================\n`);

  const matrix = [];

  active.forEach(p => {
    const content = p.content || '';
    const hasPillar = p.slug === 'complete-guide-to-afghan-food-los-angeles' 
      ? 'N/A (Is Pillar)' 
      : content.includes('/blog/complete-guide-to-afghan-food-los-angeles');
    
    // Check commercial links
    const hasMenu = content.includes('/menu');
    const hasCatering = content.includes('/catering');
    const hasLocations = content.includes('/locations');
    const commercialLinks = [hasMenu ? '/menu' : null, hasCatering ? '/catering' : null, hasLocations ? '/locations' : null].filter(Boolean);

    // Extract all /blog/ links
    const blogLinks = [...content.matchAll(/href=["']\/blog\/([a-z0-9-]+)["']/gi)].map(m => m[1]);
    const uniqueBlogLinks = [...new Set(blogLinks.filter(s => s !== p.slug))];

    // Check Related Guides block
    const hasRelatedBlock = content.includes('blog-related-guides-block');

    // Title length & Meta desc length
    const fullTitle = p.title || '';
    const excerpt = p.excerpt || '';

    matrix.push({
      slug: p.slug,
      title: fullTitle,
      titleLen: fullTitle.length,
      excerptLen: excerpt.length,
      linksToPillar: hasPillar,
      outboundBlogLinksCount: uniqueBlogLinks.length,
      commercialLinks: commercialLinks.join(', ') || 'None',
      hasRelatedBlock
    });
  });

  console.log('--- Internal Linking & Metadata Matrix ---');
  console.table(matrix.map(m => ({
    slug: m.slug,
    titleLen: m.titleLen,
    descLen: m.excerptLen,
    toPillar: m.linksToPillar,
    outboundBlogs: m.outboundBlogLinksCount,
    commercial: m.commercialLinks,
    relatedBlock: m.hasRelatedBlock
  })));

  console.log('\n--- Redirected Posts Audit ---');
  console.table(redirected.map(r => ({
    slug: r.slug,
    status: r.status,
    isPublished: r.isPublished,
    redirectUrl: r.redirectUrl
  })));
}

audit().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
