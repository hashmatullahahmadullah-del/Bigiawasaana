
import { db } from './src/firebase.js';
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

// ─── DOM REFS ───
const menuScroll = document.getElementById('menu-scroll');
const clockElement = document.getElementById('clock');
const specialsContainer = document.getElementById('specials-container');
const menuContainer = document.getElementById('menu-container');
const specialName = document.getElementById('special-name');
const specialDesc = document.getElementById('special-desc');
const specialPrice = document.getElementById('special-price');

// Get Mode from URL
const urlParams = new URLSearchParams(window.location.search);
const displayMode = urlParams.get('mode') || 'all'; // all | specials | menu

// ─── CLOCK ───
function updateClock() {
  if (!clockElement) return;
  const now = new Date();
  clockElement.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
updateClock();
setInterval(updateClock, 1000);

// ─── OFFLINE DETECTION ───
window.addEventListener('offline', () => {
  const banner = document.createElement('div');
  banner.id = 'offline-banner';
  banner.textContent = '⚠ CONNECTION LOST — MENU MAY BE OUTDATED';
  banner.style.cssText = 'position:fixed; top:0; left:0; right:0; z-index:9999; background:#ff4444; color:white; text-align:center; padding:10px; font-family:"Barlow Condensed"; font-weight:900; font-size:16px; letter-spacing:2px;';
  document.body.appendChild(banner);
});

window.addEventListener('online', () => {
  const banner = document.getElementById('offline-banner');
  if (banner) banner.remove();
});

// ─── MENU SYNC ───
function loadMenu() {
  const q = query(collection(db, "menu"), orderBy("category"));
  
  onSnapshot(q, (snapshot) => {
    if (!menuScroll) return;
    menuScroll.innerHTML = '';
    const categories = {};
    let specialItem = null;

    snapshot.forEach((docSnap) => {
      const item = docSnap.data();
      if (item.available === false) return;
      if (item.isSpecial && !specialItem) specialItem = item;
      if (!categories[item.category]) categories[item.category] = [];
      categories[item.category].push(item);
    });

    // MODE: SPECIALS ONLY
    if (displayMode === 'specials') {
      if (specialsContainer) specialsContainer.style.display = 'flex';
      if (menuContainer) menuContainer.style.display = 'none';
      if (specialItem) updateSpecial(specialItem);
    } 
    // MODE: MENU ONLY
    else if (displayMode === 'menu') {
      if (specialsContainer) specialsContainer.style.display = 'none';
      if (menuContainer) {
        menuContainer.style.display = 'flex';
        menuContainer.style.flex = '1';
      }
      renderMenu(categories);
    }
    // MODE: ALL (Default)
    else {
      if (specialsContainer) specialsContainer.style.display = 'flex';
      if (menuContainer) {
        menuContainer.style.display = 'flex';
        menuContainer.style.flex = '1';
      }
      if (specialItem) updateSpecial(specialItem);
      renderMenu(categories);
    }
  }, (err) => {
    console.error("Display menu error:", err);
    if (menuScroll) {
      menuScroll.innerHTML = '<div style="padding:40px; color:#ff4444; text-align:center;">Connection error. Retrying...</div>';
    }
  });
}

function updateSpecial(item) {
  if (specialName) specialName.textContent = (item.name || '').toUpperCase();
  if (specialDesc) specialDesc.textContent = item.description || '';
  if (specialPrice) specialPrice.textContent = `$${Number(item.price || 0).toFixed(2)}`;
}

function renderMenu(categories) {
  if (!menuScroll) return;
  menuScroll.innerHTML = '';

  for (const [cat, items] of Object.entries(categories)) {
    const catTitle = document.createElement('div');
    catTitle.className = 'cat-label';
    catTitle.textContent = cat.toUpperCase();
    menuScroll.appendChild(catTitle);

    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'display-item animate-fade';
      
      const nameEl = document.createElement('div');
      nameEl.className = 'display-name';
      nameEl.textContent = item.name || '';
      if (item.isSpecial) {
        const star = document.createElement('span');
        star.style.cssText = 'font-size:14px; color:var(--accent); margin-left:8px;';
        star.textContent = '✦';
        nameEl.appendChild(star);
      }

      const priceEl = document.createElement('div');
      priceEl.className = 'display-price';
      priceEl.textContent = `$${Number(item.price || 0).toFixed(2)}`;
      
      div.appendChild(nameEl);
      div.appendChild(priceEl);
      menuScroll.appendChild(div);
    });
  }
}

// ─── AUTO SCROLL ───
let scrollPos = 0;
setInterval(() => {
  if (!menuScroll) return;
  if (menuScroll.scrollHeight > menuScroll.clientHeight) {
    scrollPos += 1;
    if (scrollPos > menuScroll.scrollHeight - menuScroll.clientHeight) {
      scrollPos = -50;
    }
    menuScroll.scrollTop = Math.max(0, scrollPos);
  }
}, 50);

loadMenu();
