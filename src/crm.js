import './style.css';

// ==========================================
// 1. STATE & MOCK DATA GENERATION
// ==========================================

const MENU_ITEMS = [
  { name: 'Chapli Kabob Wrap', price: 14.99 },
  { name: 'Chicken Tikka Kabob', price: 15.99 },
  { name: 'Bolani (Potato & Leek)', price: 12.00 },
  { name: 'Kabuli Pulao', price: 19.99 },
  { name: 'Afghan Green Tea', price: 3.00 }
];

const CUSTOMER_NAMES = [
  "Ahmad R.", "Sara K.", "David M.", "Layla Q.", "Omar F.",
  "Zahra N.", "Michael T.", "Sofia B.", "Ali H.", "Yasmin W.",
  "John D.", "Mariam A.", "James L.", "Nadia G.", "Kevin C.",
  "Zoya P.", "William S.", "Leila E.", "Daniel R.", "Farah J."
];

let state = {
  customers: [],
  orders: [],
  reviews: [],
  tiers: { silver: 100, gold: 300 }
};

function generateMockData() {
  // Generate Customers
  state.customers = CUSTOMER_NAMES.map((name, i) => {
    return {
      id: `CUST-${1000 + i}`,
      name: name,
      phone: `(323) 555-${(1000 + i).toString().padStart(4, '0')}`,
      totalSpent: 0,
      totalOrders: 0,
      lastVisit: null,
      loyaltyPoints: Math.floor(Math.random() * 500),
      notes: ""
    };
  });

  // Generate Orders
  const now = new Date();
  for (let i = 0; i < 60; i++) {
    const cust = state.customers[Math.floor(Math.random() * state.customers.length)];
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let orderTotal = 0;
    
    for(let j=0; j<itemCount; j++){
      const menuItem = MENU_ITEMS[Math.floor(Math.random() * MENU_ITEMS.length)];
      const qty = Math.floor(Math.random() * 2) + 1;
      items.push({ name: menuItem.name, qty, price: menuItem.price });
      orderTotal += menuItem.price * qty;
    }

    const daysAgo = Math.floor(Math.random() * 30);
    const orderDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    const statuses = ['completed', 'completed', 'completed', 'pending', 'cancelled'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    const order = {
      id: `ORD-${2000 + i}`,
      customerId: cust.id,
      customerName: cust.name,
      items,
      total: orderTotal,
      date: orderDate,
      status
    };

    state.orders.push(order);

    if (status === 'completed') {
      cust.totalSpent += orderTotal;
      cust.totalOrders += 1;
      if (!cust.lastVisit || orderDate > cust.lastVisit) {
        cust.lastVisit = orderDate;
      }
    }
  }

  // Generate Reviews
  for (let i = 0; i < 15; i++) {
    const cust = state.customers[Math.floor(Math.random() * state.customers.length)];
    const stars = Math.random() > 0.3 ? 5 : (Math.random() > 0.5 ? 4 : Math.floor(Math.random() * 3) + 1);
    const daysAgo = Math.floor(Math.random() * 30);
    const reviewDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    
    let text = "";
    if (stars === 5) text = "Absolutely amazing! Best Bolani in Reseda.";
    else if (stars === 4) text = "Great food, but the wait was a bit long.";
    else text = "Food was okay, missed the green sauce.";

    state.reviews.push({
      id: `REV-${3000 + i}`,
      customerId: cust.id,
      customerName: cust.name,
      stars,
      platform: Math.random() > 0.5 ? 'Google' : 'Direct',
      text,
      date: reviewDate,
      responded: Math.random() > 0.7
    });
  }

  // Sort initially
  state.orders.sort((a, b) => b.date - a.date);
  state.reviews.sort((a, b) => b.date - a.date);
}

// Helper: Determine Loyalty Tier
function getTier(spent) {
  if (spent >= state.tiers.gold) return 'Gold';
  if (spent >= state.tiers.silver) return 'Silver';
  return 'Bronze';
}

function getTierColor(tier) {
  if (tier === 'Gold') return '#FFD700';
  if (tier === 'Silver') return '#C0C0C0';
  return '#CD7F32';
}

// ==========================================
// 2. DOM ELEMENTS & ROUTING
// ==========================================

const navItems = document.querySelectorAll('.crm-nav-item');
const views = document.querySelectorAll('.crm-view');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(n => n.classList.remove('active'));
    views.forEach(v => v.style.display = 'none');
    item.classList.add('active');
    document.getElementById(item.dataset.target).style.display = 'block';
    renderCurrentView(item.dataset.target);
  });
});

function renderCurrentView(viewId) {
  if (viewId === 'dashboard-view') renderDashboard();
  if (viewId === 'customers-view') renderCustomers();
  if (viewId === 'orders-view') renderOrders();
  if (viewId === 'reviews-view') renderReviews();
  if (viewId === 'loyalty-view') renderLoyalty();
}

// ==========================================
// 3. DASHBOARD VIEW
// ==========================================

function renderDashboard() {
  const completedOrders = state.orders.filter(o => o.status === 'completed');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const aov = completedOrders.length > 0 ? (totalRevenue / completedOrders.length) : 0;
  const repeatCustomers = state.customers.filter(c => c.totalOrders > 1).length;
  const repeatRate = state.customers.length > 0 ? (repeatCustomers / state.customers.length) * 100 : 0;

  document.getElementById('dash-total-customers').textContent = state.customers.length;
  document.getElementById('dash-total-orders').textContent = state.orders.length;
  document.getElementById('dash-aov').textContent = `$${aov.toFixed(2)}`;
  document.getElementById('dash-repeat-rate').textContent = `${Math.round(repeatRate)}%`;

  // Feed
  const feedEl = document.getElementById('dash-activity-feed');
  feedEl.innerHTML = '';
  const recentOrders = state.orders.slice(0, 5);
  recentOrders.forEach(o => {
    const d = document.createElement('div');
    d.className = 'crm-feed-item';
    d.innerHTML = `<strong>${o.customerName}</strong> placed an order for $${o.total.toFixed(2)}`;
    feedEl.appendChild(d);
  });

  // Top Spenders
  const spendersEl = document.getElementById('dash-top-spenders');
  spendersEl.innerHTML = '';
  const topSpenders = [...state.customers].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);
  topSpenders.forEach(c => {
    const d = document.createElement('div');
    d.className = 'crm-list-item';
    d.innerHTML = `
      <span>${c.name}</span>
      <span style="color: var(--accent); font-weight: 600;">$${c.totalSpent.toFixed(2)}</span>
    `;
    spendersEl.appendChild(d);
  });
}

// ==========================================
// 4. CUSTOMERS VIEW
// ==========================================

function renderCustomers() {
  const tbody = document.getElementById('customers-table-body');
  const term = document.getElementById('customer-search').value.toLowerCase();
  
  tbody.innerHTML = '';
  state.customers
    .filter(c => c.name.toLowerCase().includes(term) || c.phone.includes(term))
    .forEach(c => {
      const tier = getTier(c.totalSpent);
      const color = getTierColor(tier);
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.innerHTML = `
        <td><strong>${c.name}</strong></td>
        <td>${c.phone}</td>
        <td>$${c.totalSpent.toFixed(2)}</td>
        <td>${c.totalOrders}</td>
        <td><span class="crm-badge" style="background: ${color}33; color: ${color}; border-color: ${color};">${tier}</span></td>
      `;
      tr.addEventListener('click', () => openCustomerDetail(c));
      tbody.appendChild(tr);
    });
}

document.getElementById('customer-search').addEventListener('input', renderCustomers);

window.openCustomerDetail = (cust) => {
  document.getElementById('slide-cust-name').textContent = cust.name;
  const content = document.getElementById('slide-cust-content');
  const tier = getTier(cust.totalSpent);
  
  content.innerHTML = `
    <div style="margin-bottom: 24px; display: flex; gap: 10px;">
      <a href="tel:${cust.phone.replace(/\D/g,'')}" class="btn-primary btn-small" style="text-decoration: none;">Send Message / Call</a>
    </div>
    
    <div class="crm-panel mb-m">
      <h3 style="margin-bottom: 12px;">Details</h3>
      <p><strong>Phone:</strong> ${cust.phone}</p>
      <p><strong>Total Spent:</strong> $${cust.totalSpent.toFixed(2)}</p>
      <p><strong>Loyalty Points:</strong> ${cust.loyaltyPoints} (${tier} Tier)</p>
      <p><strong>Last Visit:</strong> ${cust.lastVisit ? cust.lastVisit.toLocaleDateString() : 'N/A'}</p>
    </div>
    
    <div class="crm-panel">
      <h3 style="margin-bottom: 12px;">Notes</h3>
      <textarea id="cust-notes-${cust.id}" class="crm-input" rows="3" style="width: 100%; resize: vertical;">${cust.notes}</textarea>
      <button class="btn-outline btn-small mt-s" onclick="saveCustNote('${cust.id}')">Save Note</button>
    </div>
  `;
  document.getElementById('customer-slide-over').classList.add('open');
};

window.closeCustomerSlideOver = () => {
  document.getElementById('customer-slide-over').classList.remove('open');
};

window.saveCustNote = (id) => {
  const cust = state.customers.find(c => c.id === id);
  if(cust){
    cust.notes = document.getElementById(`cust-notes-${id}`).value;
    showToast('Note saved!');
  }
};

// ==========================================
// 5. ORDERS VIEW
// ==========================================

function renderOrders() {
  const tbody = document.getElementById('orders-table-body');
  const term = document.getElementById('order-search').value.toLowerCase();
  const statusFilter = document.getElementById('order-status-filter').value;

  tbody.innerHTML = '';
  state.orders
    .filter(o => o.id.toLowerCase().includes(term) || o.customerName.toLowerCase().includes(term))
    .filter(o => statusFilter === 'all' || o.status === statusFilter)
    .forEach(o => {
      let statusClass = 'status-pending';
      if(o.status === 'completed') statusClass = 'status-completed';
      if(o.status === 'cancelled') statusClass = 'status-cancelled';

      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.innerHTML = `
        <td>${o.id}</td>
        <td><strong>${o.customerName}</strong></td>
        <td>${o.date.toLocaleDateString()}</td>
        <td>$${o.total.toFixed(2)}</td>
        <td><span class="status-badge ${statusClass}">${o.status}</span></td>
      `;
      tr.addEventListener('click', () => openOrderDetail(o));
      tbody.appendChild(tr);
    });
}

document.getElementById('order-search').addEventListener('input', renderOrders);
document.getElementById('order-status-filter').addEventListener('change', renderOrders);

window.openOrderDetail = (order) => {
  document.getElementById('modal-order-title').textContent = `Order ${order.id}`;
  const content = document.getElementById('modal-order-content');
  
  const itemsHtml = order.items.map(i => `
    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding: 8px 0;">
      <span>${i.qty}x ${i.name}</span>
      <span>$${(i.price * i.qty).toFixed(2)}</span>
    </div>
  `).join('');

  content.innerHTML = `
    <p style="color: var(--gray); margin-bottom: 16px;">Placed by <strong>${order.customerName}</strong> on ${order.date.toLocaleString()}</p>
    <div style="margin-bottom: 16px;">
      ${itemsHtml}
    </div>
    <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px;">
      <span>Total</span>
      <span style="color: var(--accent);">$${order.total.toFixed(2)}</span>
    </div>
  `;
  document.getElementById('order-modal').classList.add('open');
};

window.closeOrderModal = () => {
  document.getElementById('order-modal').classList.remove('open');
};

// ==========================================
// 6. REVIEWS VIEW
// ==========================================

function renderReviews() {
  const container = document.getElementById('reviews-container');
  const statusFilter = document.getElementById('review-status-filter').value;
  
  container.innerHTML = '';
  
  let sortedReviews = [...state.reviews];
  if(statusFilter === 'unresponded') {
    sortedReviews.sort((a,b) => (a.responded === b.responded ? 0 : a.responded ? 1 : -1));
  }
  
  sortedReviews.forEach(r => {
    if (statusFilter === 'unresponded' && r.responded && sortedReviews.some(x => !x.responded)) {
      // Just visually prioritizing unresponded, but let's show all, just sorted.
    }
    
    const card = document.createElement('div');
    card.className = 'crm-panel';
    card.style.opacity = r.responded ? '0.6' : '1';
    
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <div>
          <strong style="font-size: 16px;">${r.customerName}</strong>
          <span style="color: var(--gray); font-size: 12px; margin-left: 8px;">via ${r.platform}</span>
        </div>
        <div style="color: #FFD700; letter-spacing: 2px;">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</div>
      </div>
      <p style="margin-bottom: 16px; font-style: italic;">"${r.text}"</p>
      <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
        <input type="checkbox" ${r.responded ? 'checked' : ''} onchange="toggleReviewResponse('${r.id}', this.checked)">
        Mark as Responded
      </label>
    `;
    container.appendChild(card);
  });
}

document.getElementById('review-status-filter').addEventListener('change', renderReviews);

window.toggleReviewResponse = (id, isResponded) => {
  const rev = state.reviews.find(r => r.id === id);
  if(rev) {
    rev.responded = isResponded;
    renderReviews();
  }
};

// ==========================================
// 7. LOYALTY VIEW
// ==========================================

function renderLoyalty() {
  const grid = document.getElementById('loyalty-tiers-grid');
  
  let bronze = 0, silver = 0, gold = 0;
  state.customers.forEach(c => {
    const tier = getTier(c.totalSpent);
    if(tier === 'Gold') gold++;
    else if(tier === 'Silver') silver++;
    else bronze++;
  });

  grid.innerHTML = `
    <div class="crm-stat-card" style="border-top: 3px solid #CD7F32;">
      <div class="stat-title">Bronze Customers</div>
      <div class="stat-value">${bronze}</div>
    </div>
    <div class="crm-stat-card" style="border-top: 3px solid #C0C0C0;">
      <div class="stat-title">Silver Customers</div>
      <div class="stat-value">${silver}</div>
    </div>
    <div class="crm-stat-card" style="border-top: 3px solid #FFD700;">
      <div class="stat-title">Gold Customers</div>
      <div class="stat-value">${gold}</div>
    </div>
  `;
}

document.getElementById('btn-save-tiers').addEventListener('click', () => {
  const s = parseInt(document.getElementById('tier-silver').value) || 100;
  const g = parseInt(document.getElementById('tier-gold').value) || 300;
  state.tiers.silver = s;
  state.tiers.gold = g;
  showToast('Loyalty thresholds updated!');
  renderLoyalty();
});

// Toast
function showToast(message) {
  const container = document.getElementById('crm-toast-container');
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

// ==========================================
// BOOTSTRAP
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  generateMockData();
  renderDashboard();
});
