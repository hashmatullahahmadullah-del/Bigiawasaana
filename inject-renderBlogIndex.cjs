const fs = require('fs');
let js = fs.readFileSync('functions/ssr.js', 'utf8');

const renderBlogIndexCode = `
// ============================================================================
// renderBlogIndex (SSR for /blog)
// ============================================================================
exports.renderBlogIndex = functions.https.onRequest(async (req, res) => {
  try {
    const templatePath = path.join(__dirname, 'blog.html');
    if (!fs.existsSync(templatePath)) {
      // Fallback if running locally or not deployed properly
      return res.status(404).send('blog.html template not found');
    }
    let html = fs.readFileSync(templatePath, 'utf8');

    // Fetch published posts
    const snapshot = await db.collection('posts')
      .where('isPublished', '==', true)
      .orderBy('updatedAt', 'desc')
      .limit(20)
      .get();

    let postsHtml = '';

    if (snapshot.empty) {
      postsHtml = '<div style="grid-column: 1 / -1; text-align: center; color: var(--gray); padding: 40px 0;">No posts available yet. Check back soon!</div>';
    } else {
      snapshot.forEach(doc => {
        const post = doc.data();
        const dateStr = post.updatedAt ? new Date(post.updatedAt.toMillis()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
        const imgHtml = post.coverImage ? \`<img src="\${post.coverImage}" alt="\${post.title}" loading="lazy">\` : '';
        const excerpt = post.excerpt || '';
        
        postsHtml += \`
          <a href="/blog/\${post.slug}" class="blog-card" style="text-decoration: none; color: inherit; display: block; border-radius: 8px; overflow: hidden; background: var(--surface); box-shadow: 0 4px 6px rgba(0,0,0,0.3); transition: transform 0.2s;">
            \${imgHtml}
            <div style="padding: 24px;">
              \${dateStr ? \`<span style="color: var(--accent); font-size: 14px; font-weight: 600; text-transform: uppercase;">\${dateStr}</span>\` : ''}
              <h2 style="margin: 8px 0; font-size: 24px;">\${post.title}</h2>
              <p style="color: var(--gray); line-height: 1.5;">\${excerpt}</p>
            </div>
          </a>
        \`;
      });
    }

    // Replace the loader with actual posts
    html = html.replace(/<div id="blog-feed-container" class="blog-feed">([\\s\\S]*?)<\\/div>\\s*<\\/div>\\s*<\\/section>/, \`<div id="blog-feed-container" class="blog-feed">\${postsHtml}</div></div></section>\`);

    res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.status(200).send(html);
  } catch (error) {
    console.error('Error in renderBlogIndex:', error);
    res.status(500).send('Internal Server Error');
  }
});
`;

if (!js.includes('exports.renderBlogIndex')) {
  js += '\n' + renderBlogIndexCode;
  fs.writeFileSync('functions/ssr.js', js, 'utf8');
}
