import { db } from './firebase.js';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

document.addEventListener('DOMContentLoaded', async () => {
  const feedContainer = document.getElementById('blog-feed-container');
  if (!feedContainer) return;

  try {
    const q = query(
      collection(db, 'posts'),
      where('isPublished', '==', true),
      orderBy('publishedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      feedContainer.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--gray); padding: 40px 0;">No blog posts available yet. Check back soon!</div>';
      return;
    }

    feedContainer.innerHTML = '';

    snapshot.forEach(doc => {
      const post = doc.data();
      
      const dateStr = post.publishedAt 
        ? new Date(post.publishedAt.toMillis()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Recently';

      const card = document.createElement('a');
      card.href = `/blog/${post.slug}`;
      card.className = 'blog-card';
      
      let imgHtml = '';
      if (post.coverImage) {
        imgHtml = `
          <div class="blog-card-img-wrapper">
            <img src="${post.coverImage}" alt="${post.title}" class="blog-card-img" loading="lazy">
          </div>
        `;
      } else {
        imgHtml = `
          <div class="blog-card-img-wrapper" style="background: var(--surface);">
            <img src="/logo.webp" alt="Bigi Awasaana" class="blog-card-img" style="object-fit: contain; padding: 40px; opacity: 0.5;">
          </div>
        `;
      }

      card.innerHTML = `
        ${imgHtml}
        <div class="blog-card-content">
          <div class="blog-card-date">${dateStr}</div>
          <h2 class="blog-card-title">${post.title}</h2>
          <p class="blog-card-excerpt">${post.excerpt || 'Read more about this topic on our blog.'}</p>
          <div class="blog-card-readmore">Read More →</div>
        </div>
      `;

      feedContainer.appendChild(card);
    });

  } catch (error) {
    console.error('Error fetching blog posts:', error);
    feedContainer.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--accent); padding: 40px 0;">Error loading posts. Please try again later.</div>';
  }
});
