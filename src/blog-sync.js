// Fallback dynamic blog fetcher (only runs if grid is empty)

export async function fetchLatestBlogs() {
  const grid = document.getElementById('latest-blog-grid');
  // If the grid is already populated with static prerendered HTML cards, do not overwrite them or issue network queries
  if (!grid || grid.children.length > 0) return;

  try {
    const { db } = await import('./firebase.js');
    const { collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');

    const q = query(
      collection(db, 'posts'),
      where('isPublished', '==', true),
      orderBy('publishedAt', 'desc'),
      limit(3)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    let html = '';
    snapshot.forEach(doc => {
      const post = doc.data();
      const slug = post.slug;
      const title = post.title;
      let excerpt = post.excerpt || '';
      if (excerpt.length > 120) excerpt = excerpt.substring(0, 120) + '...';
      let image = post.coverImage || '/images/blog/complete-guide-to-afghan-food-los-angeles.webp';
      
      html += `
        <div style="background: var(--surface); border-radius: 12px; overflow: hidden; border: 1px solid var(--border); transition: transform 0.3s ease;">
          <a href="/blog/${slug}" aria-label="Read: ${title}" style="display:block; height:200px; overflow:hidden;">
            <img src="${image}" alt="${title}" width="600" height="375" loading="lazy" decoding="async" style="width:100%; height:100%; object-fit:cover; display:block;">
          </a>
          <div style="padding: 24px;">
            <a href="/blog/${slug}" style="text-decoration: none;"><h3 style="color: var(--white); font-family: 'Barlow Condensed'; font-size: 24px; text-transform: uppercase; margin-bottom: 12px;">${title}</h3></a>
            <p style="color: var(--gray); font-size: 15px; margin-bottom: 20px; line-height: 1.6;">${excerpt}</p>
            <a href="/blog/${slug}" style="color: var(--accent); font-weight: 600; text-decoration: none; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Read Article &rarr;</a>
          </div>
        </div>
      `;
    });

    grid.innerHTML = html;
  } catch (error) {
    // Fail silently so homepage rendering is never disrupted
  }
}

// Run automatically
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fetchLatestBlogs);
} else {
  fetchLatestBlogs();
}
