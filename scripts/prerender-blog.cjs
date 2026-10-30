const fs = require('fs');
const path = require('path');

async function getPublishedPosts() {
  const posts = [];
  const credPath = 'C:\\Users\\User\\AppData\\Roaming\\firebase\\bigiawasaana_gmail_com_application_default_credentials.json';

  // 1. Try Firestore if credentials or env are present
  try {
    if (fs.existsSync(credPath)) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const admin = require('firebase-admin');
      const { getApps, initializeApp, applicationDefault } = admin;
      const { getFirestore } = require('firebase-admin/firestore');

      if (!getApps().length) {
        initializeApp({
          credential: applicationDefault(),
          projectId: 'bigi-awasaana-7b3ce'
        });
      }

      const db = getFirestore();
      console.log('Fetching active published posts from Firestore for build-time blog prerendering...');
      const snapshot = await db.collection('posts')
        .where('isPublished', '==', true)
        .get();

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status !== 'redirected') {
          posts.push({ id: doc.id, ...data });
        }
      });

      if (posts.length > 0) {
        // Update local cache
        try {
          const cacheData = posts.map(p => ({
            id: p.id,
            slug: p.slug,
            title: p.title,
            excerpt: p.excerpt || '',
            coverImage: p.coverImage || '',
            status: p.status || 'published',
            publishedAt: p.publishedAt ? (p.publishedAt.toMillis ? p.publishedAt.toMillis() : p.publishedAt) : null,
            updatedAt: p.updatedAt ? (p.updatedAt.toMillis ? p.updatedAt.toMillis() : p.updatedAt) : null
          }));
          fs.writeFileSync(path.join(__dirname, 'posts-cache.json'), JSON.stringify(cacheData, null, 2), 'utf8');
        } catch (e) {}
        return posts;
      }
    }
  } catch (err) {
    console.warn('Firestore fetch skipped or failed (likely building in CI/Vercel without service credentials):', err.message);
  }

  // 2. Fallback to cached posts (e.g. for Vercel, Netlify, or offline builds)
  const cacheFile = path.join(__dirname, 'posts-cache.json');
  if (fs.existsSync(cacheFile)) {
    try {
      console.log('Loading published posts from local build cache (posts-cache.json)...');
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      cached.forEach(p => {
        if (p.status !== 'redirected') posts.push(p);
      });
      return posts;
    } catch (e) {
      console.warn('Failed to parse posts-cache.json:', e.message);
    }
  }

  return posts;
}

async function prerenderBlog() {
  const posts = await getPublishedPosts();

  posts.sort((a, b) => {
    const timeA = a.updatedAt ? (a.updatedAt.toMillis ? a.updatedAt.toMillis() : a.updatedAt) : (a.publishedAt ? (a.publishedAt.toMillis ? a.publishedAt.toMillis() : a.publishedAt) : 0);
    const timeB = b.updatedAt ? (b.updatedAt.toMillis ? b.updatedAt.toMillis() : b.updatedAt) : (b.publishedAt ? (b.publishedAt.toMillis ? b.publishedAt.toMillis() : b.publishedAt) : 0);
    return timeB - timeA;
  });

  console.log(`Found ${posts.length} active published posts to prerender.`);
  if (posts.length === 0) {
    console.log('No posts to prerender, preserving existing static blog HTML.');
    return;
  }

  let postsHtml = '';
  posts.forEach(post => {
    const rawTime = post.updatedAt || post.publishedAt;
    const timeVal = rawTime ? (rawTime.toMillis ? rawTime.toMillis() : rawTime) : null;
    const dateStr = timeVal 
      ? new Date(timeVal).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'Recently';

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

  const targets = [
    path.resolve(__dirname, '..', 'blog.html'),
    path.resolve(__dirname, '..', 'dist', 'blog.html'),
    path.resolve(__dirname, '..', 'functions', 'blog.html')
  ];

  targets.forEach(targetPath => {
    if (fs.existsSync(targetPath)) {
      let content = fs.readFileSync(targetPath, 'utf8');
      content = content.replace(
        /<div id="blog-feed-container" class="blog-feed">[\s\S]*?<\/div>/,
        `<div id="blog-feed-container" class="blog-feed">${postsHtml}</div>`
      );
      content = content.replace(/https:\/\/bigiawasaana\.com\/blog/g, 'https://www.bigiawasaana.com/blog');
      fs.writeFileSync(targetPath, content, 'utf8');
      console.log(`Successfully prerendered ${path.basename(targetPath)} with real crawlable HTML!`);
    }
  });
}

prerenderBlog().then(() => process.exit(0)).catch(err => {
  console.warn('Prerender blog encountered an issue but exiting safely to ensure build succeeds:', err.message);
  process.exit(0);
});
