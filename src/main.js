import './style.css';
import { db } from './firebase.js';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';

// Menu data loaded from Firestore
let menuItems = [];
let cart = [];

// Fetch menu from Firestore
async function loadMenuFromFirestore() {
  const grid = document.getElementById('menu-grid');
  if (grid) {
    grid.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px 0;">Loading menu...</p>';
  }

  try {
    const snapshot = await getDocs(collection(db, 'menu'));
    if (!snapshot.empty) {
      menuItems = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Untitled',
          desc: data.desc || data.description || '',
          price: typeof data.price === 'number' ? data.price : parseFloat(data.price) || 0,
          category: (data.category || 'platters').toLowerCase(),
          img: data.img || data.image || data.imageUrl || ''
        };
      });

      // Build category pills dynamically from Firestore data
      buildCategoryPills();
    }
  } catch (error) {
    console.error('Error loading menu from Firestore:', error);
  }

  if (menuItems.length === 0) {
    if (grid) {
      grid.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px 0;">Menu coming soon! Check back later.</p>';
    }
    return;
  }

  renderMenu('all');
}

// Build category pills from actual Firestore data
function buildCategoryPills() {
  const scrollContainer = document.querySelector('.cat-scroll');
  if (!scrollContainer) return;

  // Get unique categories
  const categories = [...new Set(menuItems.map(item => item.category))];

  scrollContainer.innerHTML = '';

  // Add "All" pill
  const allPill = document.createElement('div');
  allPill.className = 'category-pill active';
  allPill.dataset.cat = 'all';
  allPill.textContent = 'All';
  allPill.addEventListener('click', handlePillClick);
  scrollContainer.appendChild(allPill);

  // Add a pill for each category
  categories.forEach(cat => {
    const pill = document.createElement('div');
    pill.className = 'category-pill';
    pill.dataset.cat = cat;
    pill.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
    pill.addEventListener('click', handlePillClick);
    scrollContainer.appendChild(pill);
  });
}

function handlePillClick(e) {
  document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
  e.target.classList.add('active');
  renderMenu(e.target.dataset.cat);
}

// Render Menu
function renderMenu(category = 'all') {
  const grid = document.getElementById('menu-grid');
  if (!grid) return;
  grid.innerHTML = '';
  
  const itemsToRender = category === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === category);

  if (itemsToRender.length === 0) {
    grid.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px 0;">No items in this category.</p>';
    return;
  }
    
  itemsToRender.forEach(item => {
    const card = document.createElement('div');
    card.className = 'menu-card';
    
    const imgHtml = item.img 
      ? `<img src="${item.img}" alt="${item.name}" class="menu-card-img" loading="lazy">`
      : `<div class="menu-card-img" style="background: var(--surface); display: flex; align-items: center; justify-content: center; color: var(--gray); font-size: 13px;">No Image</div>`;
    
    card.innerHTML = `
      ${imgHtml}
      <div class="menu-card-content">
        <h3 class="menu-card-title">${item.name}</h3>
        <p class="menu-card-desc">${item.desc}</p>
        <div class="menu-card-footer">
          <span class="menu-card-price">$${item.price.toFixed(2)}</span>
          <!-- Ordering is disabled until June 10 -->
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Cart Logic
window.addToCart = (id) => {
  const item = menuItems.find(i => i.id === id);
  if (!item) return;
  
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  
  updateCartUI();
  showToast(`${item.name} added to cart`);
};

window.updateQty = (id, delta) => {
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty += delta;
    if (existing.qty <= 0) {
      cart = cart.filter(i => i.id !== id);
    }
  }
  updateCartUI();
};

function updateCartUI() {
  const itemsContainer = document.getElementById('cart-items');
  const countBadge = document.getElementById('cart-count-badge');
  const totalEl = document.getElementById('cart-total');
  
  if (!itemsContainer || !countBadge || !totalEl) return;
  
  itemsContainer.innerHTML = '';
  let total = 0;
  let count = 0;
  
  if (cart.length === 0) {
    itemsContainer.innerHTML = '<p style="color: var(--gray); text-align: center; margin-top: 40px;">Your cart is empty.</p>';
  } else {
    cart.forEach(item => {
      total += item.price * item.qty;
      count += item.qty;
      const el = document.createElement('div');
      el.className = 'cart-item';

      const imgHtml = item.img 
        ? `<img src="${item.img}" alt="${item.name}" class="cart-item-img">`
        : `<div class="cart-item-img" style="background: var(--surface); display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--gray);">🍽</div>`;

      el.innerHTML = `
        ${imgHtml}
        <div class="cart-item-details">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</div>
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="updateQty('${item.id}', -1)">-</button>
          <span style="font-size: 14px; font-weight: 600;">${item.qty}</span>
          <button class="qty-btn" onclick="updateQty('${item.id}', 1)">+</button>
        </div>
      `;
      itemsContainer.appendChild(el);
    });
  }
  
  countBadge.textContent = count;
  totalEl.textContent = `$${total.toFixed(2)}`;
}

window.toggleCart = (show) => {
  const drawer = document.getElementById('cart-drawer');
  if (drawer) {
    drawer.style.right = show ? '0' : '-100%';
  }
};

window.placeOrder = async (method) => {
  if (cart.length === 0) {
    showToast('Your cart is empty.');
    return;
  }
  
  const nameInput = document.getElementById('customer-name');
  const phoneInput = document.getElementById('customer-phone');
  const customerName = nameInput.value.trim();
  const customerPhone = phoneInput.value.trim();
  
  if (!customerName || !customerPhone) {
    showToast('Please enter your name and phone number for the order.');
    if (!customerName) nameInput.focus();
    else phoneInput.focus();
    return;
  }
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const orderData = {
    customerName,
    customerPhone,
    items: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
    total: `$${total.toFixed(2)}`,
    status: 'pending',
    createdAt: serverTimestamp(),
    method,
    prepTime: 15
  };

  try {
    await addDoc(collection(db, 'orders'), orderData);
    
    cart = [];
    nameInput.value = '';
    phoneInput.value = '';
    updateCartUI();
    window.toggleCart(false);
    showToast('Order placed successfully! We will prepare it right away.');
    
    if (method === 'whatsapp') {
      const text = `Hi Bigi Awasaana! I'm ${customerName}. I'd like to order:\n` + 
                   orderData.items.map(i => `${i.qty}x ${i.name}`).join('\n') +
                   `\nTotal: $${total.toFixed(2)}`;
      window.open(`https://wa.me/13234211646?text=${encodeURIComponent(text)}`, '_blank');
    }
  } catch (error) {
    console.error("Error placing order: ", error);
    showToast('Error placing order. Please try again.');
  }
};

// Toast Notification
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Catering Form Logic
const cateringForm = document.getElementById('catering-form');
if (cateringForm) {
  cateringForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('cat-name').value;
    const email = document.getElementById('cat-email').value;
    const phone = document.getElementById('cat-phone').value;
    const date = document.getElementById('cat-date').value;
    const guests = document.getElementById('cat-guests').value;
    const details = document.getElementById('cat-details').value;

    try {
      await addDoc(collection(db, 'catering_inquiries'), {
        name, email, phone, date, guests, details,
        status: 'new',
        createdAt: serverTimestamp()
      });
      cateringForm.reset();
      document.getElementById('cat-status').style.display = 'block';
      setTimeout(() => {
        document.getElementById('cat-status').style.display = 'none';
      }, 5000);
    } catch (err) {
      console.error("Error submitting catering inquiry: ", err);
      showToast('Error sending inquiry. Please try again or call us.');
    }
  });
}

// Countdown Timer Logic
function initCountdown() {
  const openingDate = new Date('June 10, 2026 00:00:00').getTime();
  
  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minsEl = document.getElementById('cd-mins');
  const secsEl = document.getElementById('cd-secs');
  
  if (!daysEl) return;
  
  const timer = setInterval(() => {
    const now = new Date().getTime();
    const distance = openingDate - now;
    
    if (distance < 0) {
      clearInterval(timer);
      document.getElementById('countdown').innerHTML = '<div style="font-size: 24px; color: var(--accent); font-weight: 700; font-family: \'Barlow Condensed\';">WE ARE OPEN!</div>';
      return;
    }
    
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    
    daysEl.textContent = days.toString().padStart(2, '0');
    hoursEl.textContent = hours.toString().padStart(2, '0');
    minsEl.textContent = minutes.toString().padStart(2, '0');
    secsEl.textContent = seconds.toString().padStart(2, '0');
  }, 1000);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  loadMenuFromFirestore();
  updateCartUI();
  initCountdown();
});
