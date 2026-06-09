import { db } from './firebase.js';
import { collection, doc, onSnapshot, getDoc } from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────
// CLOCK
// ─────────────────────────────────────────────────────────────────
function updateClock() {
  const el = document.getElementById('tv-clock');
  if (!el) return;
  const now = new Date();
  let h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  el.textContent = `${h}:${m} ${ampm}`;
}
setInterval(updateClock, 1000);
updateClock();

// ─────────────────────────────────────────────────────────────────
// AUTO-FULLSCREEN
// ─────────────────────────────────────────────────────────────────
document.body.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}, { once: true });

// ─────────────────────────────────────────────────────────────────
// LOAD MENU (real-time)
// ─────────────────────────────────────────────────────────────────
function initMenuBoard() {
  const menuRef = collection(db, 'menu');

  onSnapshot(menuRef, (snapshot) => {
    const items = [];
    snapshot.forEach(d => {
      const data = d.data();
      items.push({
        id: d.id,
        name: data.name || 'Untitled',
        desc: data.desc || data.description || '',
        price: typeof data.price === 'number' ? data.price : parseFloat(data.price) || 0,
        category: (data.category || 'platters').toLowerCase(),
        featured: !!data.featured
      });
    });

    renderMenuBoard(items);
  });

  // Listen for promo/popup settings
  onSnapshot(doc(db, 'settings', 'popup'), (snap) => {
    const banner = document.getElementById('tv-promo-banner');
    const text = document.getElementById('tv-promo-text');
    if (!snap.exists()) { banner.style.display = 'none'; return; }

    const data = snap.data();
    if (data.active && data.title) {
      text.textContent = data.title + (data.message ? ' — ' + data.message.replace(/\n/g, ' ') : '');
      banner.style.display = 'flex';
    } else {
      banner.style.display = 'none';
    }
  });
}

// ─────────────────────────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────────────────────────
function renderMenuBoard(items) {
  const loading = document.getElementById('tv-loading');
  if (loading) loading.style.display = 'none';

  // ── Featured / Today's Specials ──
  const specialsSection = document.getElementById('tv-specials-section');
  const specialsGrid = document.getElementById('tv-specials-grid');
  const featured = items.filter(i => i.featured);

  if (featured.length > 0) {
    specialsSection.style.display = 'block';
    specialsGrid.innerHTML = featured.map((item, i) => `
      <div class="tv-special-card" style="animation-delay: ${i * 0.1}s">
        <div>
          <div class="tv-special-name">${item.name}</div>
          ${item.desc ? `<div class="tv-special-desc">${item.desc}</div>` : ''}
        </div>
        <div class="tv-special-price">$${item.price.toFixed(2)}</div>
      </div>
    `).join('');
  } else {
    specialsSection.style.display = 'none';
  }

  // ── Group by category ──
  const categories = {};
  items.forEach(item => {
    const cat = item.category;
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(item);
  });

  // Sort categories alphabetically, but put "platters" first
  const catNames = Object.keys(categories).sort((a, b) => {
    if (a === 'platters') return -1;
    if (b === 'platters') return 1;
    return a.localeCompare(b);
  });

  const columnsContainer = document.getElementById('tv-menu-columns');
  columnsContainer.innerHTML = catNames.map(cat => {
    const catItems = categories[cat];
    return `
      <div class="tv-menu-col">
        <div class="tv-menu-col-header">${cat}</div>
        <div class="tv-menu-col-body">
          ${catItems.map((item, i) => `
            <div class="tv-menu-item" style="animation-delay: ${i * 0.05}s">
              <span class="tv-item-name">${item.name}</span>
              <span class="tv-item-dots"></span>
              <span class="tv-item-price">$${item.price.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  // Auto-scroll columns that overflow
  requestAnimationFrame(() => {
    document.querySelectorAll('.tv-menu-col-body').forEach(col => {
      if (col.scrollHeight > col.clientHeight) {
        const distance = col.scrollHeight - col.clientHeight;
        col.style.setProperty('--scroll-distance', `-${distance}px`);
        col.classList.add('auto-scrolling');
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initMenuBoard();
});
