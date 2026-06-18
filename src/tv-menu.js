import { db } from './firebase.js';
import { collection, doc, onSnapshot } from 'firebase/firestore';

let menuItems = [];
let categories = [];
let featuredItems = [];
let currentFeaturedIndex = 0;
let featuredRotationInterval = null;

// ─────────────────────────────────────────────────────────────────
// AUTO-FULLSCREEN, MANUAL TOGGLE, & WAKE LOCK
// ─────────────────────────────────────────────────────────────────
let wakeLock = null;

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        console.log('Screen Wake Lock released');
      });
      console.log('Screen Wake Lock acquired');
    }
  } catch (err) {
    console.error('Wake Lock error:', err.name, err.message);
  }
}

// Re-request wake lock if visibility changes
document.addEventListener('visibilitychange', async () => {
  if (wakeLock !== null && document.visibilityState === 'visible') {
    requestWakeLock();
  }
});

document.body.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
  requestWakeLock();
}, { once: true });

document.addEventListener('DOMContentLoaded', () => {
  const fullscreenBtn = document.getElementById('tv-fullscreen-btn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent body click
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    });
  }
  
  initMenuBoard();
});

// ─────────────────────────────────────────────────────────────────
// INITIALIZE
// ─────────────────────────────────────────────────────────────────
function initMenuBoard() {
  // Listen for Menu
  onSnapshot(collection(db, 'menu'), (snapshot) => {
    menuItems = [];
    snapshot.forEach(d => {
      const data = d.data();
      menuItems.push({
        id: d.id,
        name: data.name || 'Untitled',
        desc: data.desc || data.description || '',
        price: typeof data.price === 'number' ? data.price : parseFloat(data.price) || 0,
        category: (data.category || 'platters').toLowerCase(),
        img: data.img || data.image || data.imageUrl || '',
        featured: !!data.featured
      });
    });

    processData();
  });

  // Listen for Promo Strip
  onSnapshot(doc(db, 'settings', 'tv_promo'), (snap) => {
    const strip = document.getElementById('tv-promo-strip');
    const inner = document.getElementById('tv-promo-inner');
    
    if (snap.exists() && snap.data().active && snap.data().text) {
      inner.textContent = snap.data().text;
      strip.style.display = 'block';
    } else {
      strip.style.display = 'none';
    }
  });
}

function processData() {
  document.getElementById('tv-loading').style.display = 'none';

  // Process Categories
  const catSet = new Set(menuItems.map(i => i.category));
  let allCategories = Array.from(catSet).sort((a, b) => {
    if (a === 'platters') return -1;
    if (b === 'platters') return 1;
    return a.localeCompare(b);
  });

  // Split categories based on URL ?screen= parameter
  const urlParams = new URLSearchParams(window.location.search);
  const screen = urlParams.get('screen');

  if (screen === '1' || screen === '2') {
    let screen1Cats = [];
    let screen2Cats = [];
    let itemsInScreen1 = 0;
    const targetItemsPerScreen = menuItems.length / 2;

    for (const cat of allCategories) {
      const itemsInCat = menuItems.filter(i => i.category === cat).length;
      // If we haven't reached the halfway point, or if adding this category 
      // keeps us closer to the target than skipping it would:
      if (itemsInScreen1 < targetItemsPerScreen && screen1Cats.length === 0) {
        screen1Cats.push(cat);
        itemsInScreen1 += itemsInCat;
      } else if (itemsInScreen1 + (itemsInCat / 2) <= targetItemsPerScreen) {
        screen1Cats.push(cat);
        itemsInScreen1 += itemsInCat;
      } else {
        screen2Cats.push(cat);
      }
    }
    categories = screen === '1' ? screen1Cats : screen2Cats;
  } else {
    categories = allCategories; // Fallback to showing everything
  }

  renderAllCategories();

  // Process Specials (Featured)
  featuredItems = menuItems.filter(i => i.featured);
  const specialsBar = document.getElementById('tv-specials-bar');
  const specialsText = document.getElementById('tv-specials-text');

  if (featuredItems.length > 0) {
    specialsBar.style.display = 'flex';
    updateFeaturedDisplay();
    
    // Start Featured Rotation (every 8 seconds)
    if (featuredRotationInterval) clearInterval(featuredRotationInterval);
    featuredRotationInterval = setInterval(() => {
      currentFeaturedIndex = (currentFeaturedIndex + 1) % featuredItems.length;
      updateFeaturedDisplay();
    }, 8000);
  } else {
    specialsBar.style.display = 'none';
  }
}

function updateFeaturedDisplay() {
  const item = featuredItems[currentFeaturedIndex];
  const el = document.getElementById('tv-specials-text');
  if (el && item) {
    el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = `${item.name} — ${item.price.toFixed(2)}`;
      el.style.opacity = '1';
    }, 400); // fade transition
  }
}

// ─────────────────────────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────────────────────────
function renderAllCategories() {
  const grid = document.getElementById('tv-grid');
  
  grid.innerHTML = categories.map((catName) => {
    const items = menuItems.filter(i => i.category === catName);
    
    const itemsHtml = items.map((item, idx) => `
      <div class="tv-item-card" style="animation-delay: ${idx * 0.05}s">
        <div class="tv-item-img-wrapper">
          ${item.img 
            ? `<img src="${item.img}" class="tv-item-img" alt="">` 
            : `<div class="tv-item-img-placeholder">
                 <svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
               </div>`
          }
        </div>
        <div class="tv-item-info">
          <div class="tv-item-header">
            <div class="tv-item-name">${item.name}</div>
            <div class="tv-item-price">${item.price.toFixed(2)}</div>
          </div>
          ${item.desc ? `<div class="tv-item-desc">${item.desc}</div>` : ''}
        </div>
      </div>
    `).join('');

    return `
      <div class="tv-category-column">
        <h2 class="tv-category-header">${catName}</h2>
        <div class="tv-category-items">
          ${itemsHtml}
        </div>
      </div>
    `;
  }).join('');
}
