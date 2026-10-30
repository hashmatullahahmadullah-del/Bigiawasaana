const admin = require('firebase-admin');
const { getApps, initializeApp, applicationDefault } = admin;
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

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

async function prerenderBlog() {
  console.log('Fetching active published posts for build-time blog prerendering...');
  const snapshot = await db.collection('posts')
    .where('isPublished', '==', true)
    .get();

  const posts = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.status !== 'redirected') {
      posts.push({ id: doc.id, ...data });
    }
  });

  posts.sort((a, b) => {
    const timeA = a.updatedAt ? a.updatedAt.toMillis() : (a.publishedAt ? a.publishedAt.toMillis() : 0);
    const timeB = b.updatedAt ? b.updatedAt.toMillis() : (b.publishedAt ? b.publishedAt.toMillis() : 0);
    return timeB - timeA;
  });

  console.log(`Found ${posts.length} active published posts to prerender.`);

  let postsHtml = '';
  posts.forEach(post => {
    const dateStr = post.updatedAt 
      ? new Date(post.updatedAt.toMillis()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : (post.publishedAt ? new Date(post.publishedAt.toMillis()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Recently');

    let imgHtml = '';
    if (post.coverImage) {
      imgHtml = `
        <div class="blog-card-img-wrapper">
          <img src="${post.coverImage}" alt="${post.title}" class="blog-card-img" loading="lazy" width="600" height="338">
        </div>
      `;
    } else {
      imgHtml = `
        <div class="blog-card-img-wrapper" style="background: var(--surface);">
          <img src="/logo.webp" alt="Bigi Awasaana" class="blog-card-img" style="object-fit: contain; padding: 40px; opacity: 0.5;" loading="lazy" width="600" height="338">
        </div>
      `;
    }

    const excerpt = post.excerpt || 'Read more about this authentic Afghan specialty on our blog.';

    postsHtml += `
      <a href="/blog/${post.slug}" class="blog-card">
        ${imgHtml}
        <div class="blog-card-content">
          <div class="blog-card-date">${dateStr}</div>
          <h2 class="blog-card-title">${post.title}</h2>
          <p class="blog-card-excerpt">${excerpt}</p>
          <div class="blog-card-readmore">Read More &rarr;</div>
        </div>
      </a>
    `;
  });

  const rootBlog = path.resolve(__dirname, '..', 'blog.html');
  if (fs.existsSync(rootBlog)) {
    let content = fs.readFileSync(rootBlog, 'utf8');
    content = content.replace(
      /<div id="blog-feed-container" class="blog-feed">[\s\S]*?<\/div>/,
      `<div id="blog-feed-container" class="blog-feed">${postsHtml}</div>`
    );
    // Ensure canonical is www
    content = content.replace(/https:\/\/bigiawasaana\.com\/blog/g, 'https://www.bigiawasaana.com/blog');
    fs.writeFileSync(rootBlog, content, 'utf8');
    console.log('Successfully prerendered blog.html with real crawlable HTML!');
  }

  // Also update dist/blog.html if dist exists
  const distBlog = path.resolve(__dirname, '..', 'dist', 'blog.html');
  if (fs.existsSync(distBlog)) {
    let content = fs.readFileSync(distBlog, 'utf8');
    content = content.replace(
      /<div id="blog-feed-container" class="blog-feed">[\s\S]*?<\/div>/,
      `<div id="blog-feed-container" class="blog-feed">${postsHtml}</div>`
    );
    content = content.replace(/https:\/\/bigiawasaana\.com\/blog/g, 'https://www.bigiawasaana.com/blog');
    fs.writeFileSync(distBlog, content, 'utf8');
    console.log('Successfully prerendered dist/blog.html with real crawlable HTML!');
  }

  // Also update functions/blog.html
  const fnBlog = path.resolve(__dirname, '..', 'functions', 'blog.html');
  if (fs.existsSync(fnBlog)) {
    let content = fs.readFileSync(fnBlog, 'utf8');
    content = content.replace(
      /<div id="blog-feed-container" class="blog-feed">[\s\S]*?<\/div>/,
      `<div id="blog-feed-container" class="blog-feed">${postsHtml}</div>`
    );
    content = content.replace(/https:\/\/bigiawasaana\.com\/blog/g, 'https://www.bigiawasaana.com/blog');
    fs.writeFileSync(fnBlog, content, 'utf8');
    console.log('Successfully prerendered functions/blog.html with real crawlable HTML!');
  }
}

prerenderBlog().then(() => process.exit(0)).catch(err => {
  console.error('Prerender failed:', err);
  process.exit(1);
});
