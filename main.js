
import { db } from './src/firebase.js';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from "firebase/firestore";

// ─── XSS PROTECTION ───
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// UI Elements
const menuGrid = document.getElementById('menu-grid');
const cartDrawer = document.getElementById('cart-drawer');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalElement = document.getElementById('cart-total');
const cartCountBadge = document.getElementById('cart-count-badge');
const toastContainer = document.getElementById('toast-container');

// FIX #13: Persist cart to localStorage
let cart = JSON.parse(localStorage.getItem('bigi_cart') || '[]');

function saveCart() {
  localStorage.setItem('bigi_cart', JSON.stringify(cart));
}

// ─── UTILS ───
window.showToast = (msg) => {
  if (!toastContainer) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  toastContainer.appendChild(t);
  setTimeout(() => t.remove(), 3000);
};

// ─── DATA LOADING ───
function loadMenu() {
  const q = query(collection(db, "menu"), orderBy("category"));
  
  menuGrid.innerHTML = '<div class="skeleton" style="height:350px; width:100%; border-radius:12px;"></div>'.repeat(6);

  onSnapshot(q, (snapshot) => {
    menuGrid.innerHTML = '';
    if (snapshot.empty) {
      menuGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--gray-text);">No items available right now.</div>';
      return;
    }

    snapshot.forEach((docSnap) => {
      const item = docSnap.data();
      const card = createMenuCard(item);
      menuGrid.appendChild(card);
    });
    
    initAnimations();
  }, (err) => {
    console.error("Menu load error:", err);
    menuGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ff4444;">Failed to load menu. Please refresh.</div>';
  });
}

function createMenuCard(item) {
  const isSoldOut = item.available === false;
  const div = document.createElement('div');
  div.className = `menu-card reveal ${isSoldOut ? 'sold-out' : ''}`;
  div.dataset.cat = item.category || '';

  // Build card safely — no innerHTML with user data
  const imgWrapper = document.createElement('div');
  imgWrapper.style.cssText = 'position:relative; overflow:hidden; border-radius:8px;';
  
  const img = document.createElement('img');
  img.className = 'menu-img';
  img.src = item.imageUrl || 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80';
  img.alt = escapeHtml(item.name);
  img.style.cssText = `${isSoldOut ? 'filter:grayscale(1) opacity(0.5);' : ''} height:250px; width:100%; object-fit:cover; transition:0.5s;`;
  img.onerror = () => { img.src = 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80'; };
  imgWrapper.appendChild(img);

  if (item.isSpecial) {
    const badge = document.createElement('div');
    badge.style.cssText = 'position:absolute; top:15px; left:15px; background:var(--accent); color:white; padding:4px 12px; font-size:10px; font-weight:900; border-radius:4px;';
    badge.textContent = 'DAILY SPECIAL';
    imgWrapper.appendChild(badge);
  }

  const info = document.createElement('div');
  info.className = 'menu-info';
  info.style.padding = '20px 0';

  const topRow = document.createElement('div');
  topRow.style.cssText = 'display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;';
  const nameEl = document.createElement('h3');
  nameEl.className = 'font-barlow';
  nameEl.style.cssText = 'font-size:22px; font-weight:900; letter-spacing:0.5px;';
  nameEl.textContent = (item.name || '').toUpperCase();
  const priceEl = document.createElement('span');
  priceEl.style.cssText = "color:var(--accent); font-weight:900; font-family:'Barlow Condensed'; font-size:20px;";
  priceEl.textContent = `$${Number(item.price || 0).toFixed(2)}`;
  topRow.appendChild(nameEl);
  topRow.appendChild(priceEl);

  const desc = document.createElement('p');
  desc.style.cssText = 'font-size:14px; color:var(--gray-text); line-height:1.5; margin-bottom:20px; min-height:42px;';
  desc.textContent = item.description || '';

  info.appendChild(topRow);
  info.appendChild(desc);

  if (isSoldOut) {
    const soldOut = document.createElement('div');
    soldOut.style.cssText = 'background:rgba(255,255,255,0.05); color:var(--gray-text); text-align:center; padding:12px; font-weight:900; border:1px solid var(--glass-border); border-radius:4px;';
    soldOut.textContent = 'SOLD OUT';
    info.appendChild(soldOut);
  } else {
    const addBtn = document.createElement('button');
    addBtn.className = 'ember-btn';
    addBtn.style.width = '100%';
    addBtn.textContent = 'ADD TO ORDER';
    addBtn.onclick = () => window.addToCart(item.name, Number(item.price));
    info.appendChild(addBtn);
  }

  div.appendChild(imgWrapper);
  div.appendChild(info);
  return div;
}

// ─── CART LOGIC ───
window.addToCart = (name, price) => {
  if (!name || typeof price !== 'number' || price <= 0) return;
  cart.push({ name: String(name), price: Number(price) });
  saveCart();
  updateCartUI();
  showToast(`${String(name).toUpperCase()} ADDED`);
  window.toggleCart(true);
};

window.toggleCart = (show) => {
  if (cartDrawer) cartDrawer.style.right = show ? '0' : '-100%';
};

function updateCartUI() {
  if (!cartItemsContainer) return;
  cartItemsContainer.innerHTML = '';
  let total = 0;
  
  cart.forEach((item, index) => {
    total += Number(item.price) || 0;
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; justify-content:space-between; margin-bottom:20px; padding-bottom:15px; border-bottom:1px solid var(--glass-border);';
    
    const left = document.createElement('div');
    const nameEl = document.createElement('div');
    nameEl.style.cssText = "font-weight:800; font-family:'Barlow Condensed'; letter-spacing:1px;";
    nameEl.textContent = String(item.name || '').toUpperCase();
    const priceEl = document.createElement('div');
    priceEl.style.cssText = 'font-size:14px; color:var(--accent); font-weight:700;';
    priceEl.textContent = `$${Number(item.price).toFixed(2)}`;
    left.appendChild(nameEl);
    left.appendChild(priceEl);

    const removeBtn = document.createElement('button');
    removeBtn.style.cssText = 'background:none; border:none; color:#ff4444; cursor:pointer; font-size:12px; font-weight:800;';
    removeBtn.textContent = 'REMOVE';
    removeBtn.onclick = () => window.removeFromCart(index);

    div.appendChild(left);
    div.appendChild(removeBtn);
    cartItemsContainer.appendChild(div);
  });
  
  if (cartTotalElement) cartTotalElement.textContent = `$${total.toFixed(2)}`;
  if (cartCountBadge) cartCountBadge.textContent = cart.length;
}

window.removeFromCart = (index) => {
  if (index < 0 || index >= cart.length) return;
  const name = cart[index].name;
  cart.splice(index, 1);
  saveCart();
  updateCartUI();
  showToast(`${String(name).toUpperCase()} REMOVED`);
};

window.placeOrder = async (method = 'cloud') => {
  if (cart.length === 0) return showToast('YOUR CART IS EMPTY!');
  
  const nameInput = document.getElementById('customer-name');
  const customerName = nameInput ? nameInput.value.trim() : '';

  if (!customerName) {
    if (nameInput) nameInput.focus();
    return showToast('PLEASE ENTER A NAME FOR THE ORDER');
  }

  const validItems = cart.filter(i => i.name && typeof i.price === 'number' && i.price > 0);
  if (validItems.length === 0) return showToast('INVALID CART ITEMS');

  const total = validItems.reduce((sum, i) => sum + i.price, 0).toFixed(2);
  const PHONE_NUMBER = '13237986120';
  
  const itemsText = validItems.map(i => `🔥 ${i.name} ($${i.price.toFixed(2)})`).join('%0A');
  const message = `Salam! New order from ${customerName} (Bigi Awasaana):%0A%0A${itemsText}%0A%0ATOTAL: $${total}`;

  const orderPayload = {
    customerName: String(customerName),
    items: validItems.map(i => ({ name: String(i.name), price: Number(i.price) })),
    total: total,
    status: 'pending',
    prepTime: 20,
    createdAt: serverTimestamp()
  };

  // ─── CLOUD ORDER ───
  if (method === 'cloud') {
    try {
      const docRef = await addDoc(collection(db, "orders"), orderPayload);
      clearCart();
      // Redirect to live tracking page
      window.location.href = `/order.html?id=${docRef.id}`;
    } catch (err) {
      console.error("Order error:", err);
      showToast("ORDER FAILED. TRY WHATSAPP INSTEAD.");
    }
  }

  // ─── WHATSAPP ORDER ───
  else if (method === 'whatsapp') {
    try {
      orderPayload.source = 'whatsapp';
      const docRef = await addDoc(collection(db, "orders"), orderPayload);
      window.open(`https://wa.me/${PHONE_NUMBER}?text=${message}`, '_blank');
      clearCart();
      // Small delay then redirect to tracking
      setTimeout(() => {
        window.location.href = `/order.html?id=${docRef.id}`;
      }, 1500);
    } catch (err) {
      // Fallback: still open WhatsApp even if Firestore fails
      window.open(`https://wa.me/${PHONE_NUMBER}?text=${message}`, '_blank');
      clearCart();
      showToast("ORDER SENT VIA WHATSAPP");
    }
  }

  // ─── PHONE ORDER ───
  else if (method === 'phone') {
    window.location.href = `tel:+${PHONE_NUMBER}`;
    showToast("CALLING... TELL THEM YOUR ORDER!");
  }
};

function clearCart() {
  cart = [];
  saveCart();
  updateCartUI();
  window.toggleCart(false);
}



// ─── REVEAL ANIMATIONS ───
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active');
    }
  });
}, { threshold: 0.1 });

function initAnimations() {
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ─── CATEGORY FILTERING ───
document.querySelectorAll('.category-pill').forEach(pill => {
  pill.onclick = () => {
    const cat = pill.dataset.cat;
    document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    
    document.querySelectorAll('.menu-card').forEach(card => {
      card.style.display = (cat === 'all' || card.dataset.cat === cat) ? 'block' : 'none';
    });
  };
});

// Init
loadMenu();
updateCartUI(); // Restore persisted cart on load
initAnimations();
setTimeout(initAnimations, 100);
