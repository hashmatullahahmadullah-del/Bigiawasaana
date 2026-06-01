import './style.css';
import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Fallback Mock Data if Firestore is empty
const defaultMenu = [
  { id: '1', name: 'Chapli Kabob Wrap', desc: 'Spiced ground beef patties with herbs, wrapped in fresh naan.', price: 14.99, category: 'wraps', img: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&h=400&fit=crop' },
  { id: '2', name: 'Chicken Tikka Kabob', desc: 'Saffron-marinated chicken breast charred over coals.', price: 15.99, category: 'platters', img: 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?w=600&h=400&fit=crop' },
  { id: '3', name: 'Bolani (Potato & Leek)', desc: 'Crispy Afghan flatbread stuffed with potatoes, leeks, and cilantro. Served with yogurt.', price: 12.00, category: 'sides', img: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&h=400&fit=crop' },
  { id: '4', name: 'Kabuli Pulao', desc: 'Tender lamb shank hidden under steamed rice with sweet carrots and raisins.', price: 19.99, category: 'platters', img: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&h=400&fit=crop' },
  { id: '5', name: 'Afghan Green Tea', desc: 'Cardamom-infused green tea.', price: 3.00, category: 'drinks', img: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&h=400&fit=crop' },
];

let cart = [];

// Initialize Menu
function renderMenu(category = 'all') {
  const grid = document.getElementById('menu-grid');
  if (!grid) return;
  grid.innerHTML = '';
  
  const itemsToRender = category === 'all' 
    ? defaultMenu 
    : defaultMenu.filter(item => item.category === category);
    
  itemsToRender.forEach(item => {
    const card = document.createElement('div');
    card.className = 'menu-card';
    card.innerHTML = `
      <img src="${item.img}" alt="${item.name}" class="menu-card-img" loading="lazy">
      <div class="menu-card-content">
        <h3 class="menu-card-title">${item.name}</h3>
        <p class="menu-card-desc">${item.desc}</p>
        <div class="menu-card-footer">
          <span class="menu-card-price">$${item.price.toFixed(2)}</span>
          <button class="add-to-cart-btn" onclick="addToCart('${item.id}')">+</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Cart Logic
window.addToCart = (id) => {
  const item = defaultMenu.find(i => i.id === id);
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
      el.innerHTML = `
        <img src="${item.img}" alt="${item.name}" class="cart-item-img">
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
  const customerName = nameInput.value.trim();
  if (!customerName) {
    showToast('Please enter your name for the order.');
    nameInput.focus();
    return;
  }
  
  const orderData = {
    customerName,
    items: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
    total: cart.reduce((sum, item) => sum + (item.price * item.qty), 0),
    status: 'pending',
    createdAt: serverTimestamp(),
    method
  };

  try {
    // Save to Firestore
    await addDoc(collection(db, 'orders'), orderData);
    
    // Clear Cart
    cart = [];
    nameInput.value = '';
    updateCartUI();
    window.toggleCart(false);
    showToast('Order placed successfully! We will prepare it right away.');
    
    // If WhatsApp, redirect
    if (method === 'whatsapp') {
      const text = `Hi Bigi Awasaana! I'm ${customerName}. I'd like to order:\n` + 
                   orderData.items.map(i => `${i.qty}x ${i.name}`).join('\n') +
                   `\nTotal: $${orderData.total.toFixed(2)}`;
      window.open(`https://wa.me/13237986120?text=${encodeURIComponent(text)}`, '_blank');
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

// Category Filtering
document.querySelectorAll('.category-pill').forEach(pill => {
  pill.addEventListener('click', (e) => {
    document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
    e.target.classList.add('active');
    renderMenu(e.target.dataset.cat);
  });
});

// Init
document.addEventListener('DOMContentLoaded', () => {
  renderMenu();
  updateCartUI();
});
