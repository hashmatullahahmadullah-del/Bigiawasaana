
import { db, auth } from './src/firebase.js';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, getDoc, getDocs } from "firebase/firestore";

// ─── AUTH GUARD ───
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = '/login.html';
  }
});

window.logout = async () => {
  await signOut(auth);
};

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

function safeTimestamp(ts) {
  if (!ts || !ts.seconds) return 'Just now';
  try {
    return new Date(ts.seconds * 1000).toLocaleTimeString();
  } catch {
    return 'Just now';
  }
}

// UI Elements
const menuTableBody = document.getElementById('menu-table-body');
const menuForm = document.getElementById('menu-form');
const menuModal = document.getElementById('menu-modal');
const toastContainer = document.getElementById('toast-container');
const dailySalesEl = document.getElementById('daily-sales');
const orderCountEl = document.getElementById('order-count');
const topSellerEl = document.getElementById('top-seller');
const stockAlertsEl = document.getElementById('stock-alerts');

let currentEditingId = null; // FIX #5: Properly declared

// ─── UTILS ───
window.showToast = (msg) => {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg; // textContent, not innerHTML
  toastContainer.appendChild(t);
  setTimeout(() => t.remove(), 3000);
};

// ─── NAVIGATION ───
window.showSection = (id) => {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  
  const targetSection = document.getElementById(id);
  if (targetSection) targetSection.classList.add('active');
  
  const navBtn = [...document.querySelectorAll('.nav-btn')].find(b => b.getAttribute('onclick')?.includes(id));
  if (navBtn) navBtn.classList.add('active');
};

// ─── MENU CRUD ───
function loadMenu() {
  const q = query(collection(db, "menu"), orderBy("category"));
  
  menuTableBody.innerHTML = '<tr><td colspan="6" style="padding:40px; text-align:center;"><div class="skeleton" style="width:100%; height:20px;"></div></td></tr>'.repeat(5);

  onSnapshot(q, (snapshot) => {
    menuTableBody.innerHTML = '';
    let outOfStockCount = 0;

    snapshot.forEach((docSnap) => {
      const item = docSnap.data();
      const id = docSnap.id;
      if (!item.available) outOfStockCount++;

      const tr = document.createElement('tr');

      // Build cells safely — no innerHTML with user data
      const tdItem = document.createElement('td');
      const itemWrapper = document.createElement('div');
      itemWrapper.style.cssText = 'display:flex; align-items:center; gap:10px;';
      const img = document.createElement('img');
      img.src = item.imageUrl || '';
      img.style.cssText = 'width:40px; height:40px; border-radius:4px; object-fit:cover; background:#1a1a1a;';
      img.onerror = () => { img.style.display = 'none'; };
      const nameSpan = document.createElement('span');
      nameSpan.textContent = item.name;
      itemWrapper.appendChild(img);
      itemWrapper.appendChild(nameSpan);
      tdItem.appendChild(itemWrapper);

      const tdCat = document.createElement('td');
      tdCat.textContent = item.category;
      tdCat.style.textTransform = 'capitalize';

      const tdPrice = document.createElement('td');
      tdPrice.textContent = `$${Number(item.price).toFixed(2)}`;

      const tdStock = document.createElement('td');
      const stockBtn = document.createElement('button');
      stockBtn.textContent = item.available ? 'In Stock' : 'Sold Out';
      stockBtn.style.cssText = `padding:6px 12px; border-radius:2px; border:1px solid ${item.available ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}; cursor:pointer; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; background:${item.available ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)'}; color:${item.available ? 'var(--green)' : 'var(--red)'};`;
      stockBtn.onclick = () => window.toggleField(id, 'available', !item.available);
      tdStock.appendChild(stockBtn);

      const tdSpecial = document.createElement('td');
      const specialBtn = document.createElement('button');
      specialBtn.textContent = item.isSpecial ? 'Special' : 'Normal';
      specialBtn.style.cssText = `padding:6px 12px; border-radius:2px; border:1px solid ${item.isSpecial ? 'var(--accent-border)' : 'var(--border)'}; cursor:pointer; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; background:${item.isSpecial ? 'var(--accent-soft)' : 'transparent'}; color:${item.isSpecial ? 'var(--accent)' : 'var(--gray)'};`;
      specialBtn.onclick = () => window.toggleField(id, 'isSpecial', !item.isSpecial);
      tdSpecial.appendChild(specialBtn);

      const tdActions = document.createElement('td');
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.style.cssText = 'background:none; border:none; color:var(--accent); font-family:"Barlow Condensed"; font-weight:600; font-size:12px; letter-spacing:1px; text-transform:uppercase; cursor:pointer; margin-right:16px;';
      editBtn.onclick = () => window.editItem(id);
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.style.cssText = 'background:none; border:none; color:var(--red); font-family:"Barlow Condensed"; font-weight:600; font-size:12px; letter-spacing:1px; text-transform:uppercase; cursor:pointer;';
      delBtn.onclick = () => window.deleteItem(id);
      tdActions.appendChild(editBtn);
      tdActions.appendChild(delBtn);

      tr.appendChild(tdItem);
      tr.appendChild(tdCat);
      tr.appendChild(tdPrice);
      tr.appendChild(tdStock);
      tr.appendChild(tdSpecial);
      tr.appendChild(tdActions);
      menuTableBody.appendChild(tr);
    });

    // Update stock alerts card
    if (stockAlertsEl) {
      stockAlertsEl.textContent = outOfStockCount > 0 ? `${outOfStockCount} Out` : 'All Clear';
      stockAlertsEl.style.color = outOfStockCount > 0 ? 'var(--red)' : 'var(--green)';
    }
  }, (err) => {
    console.error("Menu load error:", err);
    showToast("FIRESTORE CONNECTION FAILED");
  });
}

window.openMenuModal = (editingId = null) => {
  currentEditingId = editingId;
  document.getElementById('modal-title').textContent = editingId ? 'Edit Item' : 'Add New Item';
  menuModal.style.display = 'flex';
};

window.closeMenuModal = () => {
  menuModal.style.display = 'none';
  menuForm.reset();
  currentEditingId = null;
};

menuForm.onsubmit = async (e) => {
  e.preventDefault();
  
  const price = parseFloat(document.getElementById('item-price').value);
  if (isNaN(price) || price < 0) {
    showToast("INVALID PRICE");
    return;
  }

  const data = {
    name: document.getElementById('item-name').value.trim(),
    category: document.getElementById('item-category').value,
    price: price,
    description: document.getElementById('item-desc').value.trim(),
    imageUrl: document.getElementById('item-image').value.trim(),
    available: document.getElementById('item-available').checked,
    isSpecial: document.getElementById('item-special').checked,
    updatedAt: new Date()
  };

  if (!data.name) {
    showToast("ITEM NAME REQUIRED");
    return;
  }

  try {
    if (currentEditingId) {
      await updateDoc(doc(db, "menu", currentEditingId), data);
      showToast("ITEM UPDATED");
    } else {
      data.createdAt = new Date();
      await addDoc(collection(db, "menu"), data);
      showToast("ITEM ADDED TO CLOUD");
    }
    closeMenuModal();
  } catch (err) {
    console.error("Save error:", err);
    showToast("SAVE FAILED: " + err.message);
  }
};

// FIX #8: Whitelist allowed fields
const ALLOWED_TOGGLE_FIELDS = ['available', 'isSpecial'];

window.toggleField = async (id, field, newValue) => {
  if (!ALLOWED_TOGGLE_FIELDS.includes(field)) {
    showToast("INVALID FIELD");
    return;
  }
  try {
    await updateDoc(doc(db, "menu", id), { [field]: newValue });
    showToast(`${field === 'available' ? 'STOCK' : 'SPECIAL'} UPDATED`);
  } catch (err) {
    showToast("UPDATE FAILED");
  }
};

window.deleteItem = async (id) => {
  if (confirm("Delete this item permanently?")) {
    try {
      await deleteDoc(doc(db, "menu", id));
      showToast("ITEM DELETED");
    } catch (err) {
      showToast("DELETE FAILED");
    }
  }
};

window.editItem = async (id) => {
  try {
    const docRef = doc(db, "menu", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById('item-name').value = data.name || '';
      document.getElementById('item-category').value = data.category || 'wraps';
      document.getElementById('item-price').value = data.price || 0;
      document.getElementById('item-desc').value = data.description || '';
      document.getElementById('item-image').value = data.imageUrl || '';
      document.getElementById('item-available').checked = !!data.available;
      document.getElementById('item-special').checked = !!data.isSpecial;
      openMenuModal(id);
    }
  } catch (err) {
    showToast("FETCH FAILED");
  }
};

// FIX #10: Seed with duplicate check
window.seedMenu = async () => {
  try {
    const existing = await getDocs(collection(db, "menu"));
    if (!existing.empty) {
      if (!confirm(`Menu already has ${existing.size} items. Clear and re-seed?`)) return;
      for (const d of existing.docs) {
        await deleteDoc(doc(db, "menu", d.id));
      }
    }

    const starterItems = [
      { name: "Chicken Kabob Wrap", category: "wraps", price: 12.99, description: "Grilled chicken, garlic sauce, fresh veggies", available: true, isSpecial: false, imageUrl: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600&q=80", createdAt: new Date() },
      { name: "Lamb Platter", category: "platters", price: 18.99, description: "Lamb chops, saffron rice, hummus, salad", available: true, isSpecial: true, imageUrl: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80", createdAt: new Date() },
      { name: "Bolani", category: "sides", price: 5.99, description: "Stuffed Afghan flatbread with leeks/potatoes", available: true, isSpecial: false, imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80", createdAt: new Date() },
      { name: "Mango Lassi", category: "drinks", price: 4.99, description: "Sweet yogurt drink with fresh mango", available: true, isSpecial: false, imageUrl: "https://images.unsplash.com/photo-1571006682881-79b293880654?w=600&q=80", createdAt: new Date() }
    ];

    const colRef = collection(db, "menu");
    for (const item of starterItems) {
      await addDoc(colRef, item);
    }
    showToast("DATABASE SEEDED FRESH");
  } catch (err) {
    console.error("Seed error:", err);
    showToast("SEEDING FAILED: " + err.message);
  }
};

// ─── ORDER MANAGEMENT ───
const ordersGrid = document.getElementById('orders-grid');
const orderBell = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

let lastOrderCount = -1;

function loadOrders() {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  
  onSnapshot(q, (snapshot) => {
    if (!ordersGrid) return;
    ordersGrid.innerHTML = '';
    let activeCount = 0;
    let dailyTotal = 0;
    const itemCounts = {};
    
    if (lastOrderCount !== -1 && snapshot.docs.length > lastOrderCount) {
      orderBell.play().catch(() => {});
      showToast("🔔 NEW ORDER RECEIVED!");
    }
    lastOrderCount = snapshot.docs.length;

    if (snapshot.empty) {
      ordersGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--gray-text);">No active orders.</div>';
      if (orderCountEl) orderCountEl.textContent = '0';
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    snapshot.forEach((docSnap) => {
      const order = docSnap.data();
      
      // FIX #11: Compute live stats
      if (order.createdAt?.seconds) {
        const orderDate = new Date(order.createdAt.seconds * 1000);
        if (orderDate >= today) {
          dailyTotal += parseFloat(order.total) || 0;
        }
      }
      
      // Count items for top seller
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const name = item.name || 'Unknown';
          itemCounts[name] = (itemCounts[name] || 0) + 1;
        });
      }

      if (order.status !== 'completed') {
        activeCount++;
        renderOrderCard(docSnap.id, order);
      }
    });

    // Update live dashboard stats
    if (orderCountEl) orderCountEl.textContent = activeCount;
    if (dailySalesEl) dailySalesEl.textContent = `$${dailyTotal.toFixed(2)}`;
    if (topSellerEl) {
      const topItem = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];
      topSellerEl.textContent = topItem ? topItem[0] : 'None yet';
    }

    if (activeCount === 0 && ordersGrid.children.length === 0) {
      ordersGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--gray-text);">All orders completed. 🎉</div>';
    }
  }, (err) => {
    console.error("Orders load error:", err);
  });
}

function renderOrderCard(id, order) {
  const div = document.createElement('div');
  div.className = 'glass';
  div.style.cssText = 'padding:25px; border-radius:12px;';
  div.style.borderTop = `4px solid ${getStatusColor(order.status)}`;
  
  // Build items list safely
  const itemsList = document.createElement('div');
  itemsList.style.marginBottom = '20px';
  if (order.items && Array.isArray(order.items)) {
    order.items.forEach(item => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; margin-bottom:5px; font-size:14px;';
      const nameEl = document.createElement('span');
      nameEl.textContent = item.name || 'Unknown';
      const priceEl = document.createElement('span');
      priceEl.style.cssText = 'color:var(--accent); font-weight:700;';
      priceEl.textContent = `$${item.price || 0}`;
      row.appendChild(nameEl);
      row.appendChild(priceEl);
      itemsList.appendChild(row);
    });
  }

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex; justify-content:space-between; margin-bottom:20px;';
  
  const leftHeader = document.createElement('div');
  const customerNameEl = document.createElement('div');
  customerNameEl.style.cssText = 'font-family:"Barlow Condensed"; font-size:18px; font-weight:700; color:var(--white); text-transform:uppercase; letter-spacing:1px; line-height:1.2;';
  customerNameEl.textContent = order.customerName || 'Anonymous';
  
  const timeEl = document.createElement('div');
  timeEl.style.cssText = 'font-size:11px; color:var(--gray); text-transform:uppercase; letter-spacing:1px;';
  timeEl.textContent = safeTimestamp(order.createdAt);
  
  leftHeader.appendChild(customerNameEl);
  leftHeader.appendChild(timeEl);

  const statusEl = document.createElement('div');
  statusEl.style.cssText = `text-transform:uppercase; font-size:11px; font-weight:700; color:${getStatusColor(order.status)}; letter-spacing:1.5px; align-self:flex-start;`;
  statusEl.textContent = order.status || 'unknown';
  
  header.appendChild(leftHeader);
  header.appendChild(statusEl);

  // Total
  const totalRow = document.createElement('div');
  totalRow.style.cssText = 'border-top:1px solid var(--glass-border); padding-top:15px; margin-bottom:20px; display:flex; justify-content:space-between; font-weight:900;';
  const totalLabel = document.createElement('span');
  totalLabel.textContent = 'TOTAL';
  const totalVal = document.createElement('span');
  totalVal.textContent = `$${order.total || '0.00'}`;
  totalRow.appendChild(totalLabel);
  totalRow.appendChild(totalVal);

  // Action buttons
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex; gap:8px;';

  if (order.status === 'pending') {
    const btn = document.createElement('button');
    btn.className = 'btn-primary';
    btn.style.cssText = 'flex:1; padding:10px; font-size:11px;';
    btn.textContent = 'Prepare';
    btn.onclick = () => window.updateOrderStatus(id, 'preparing');
    actions.appendChild(btn);
  }
  if (order.status === 'preparing') {
    const btn = document.createElement('button');
    btn.className = 'btn-primary';
    btn.style.cssText = 'flex:1; padding:10px; font-size:11px; background:var(--green);';
    btn.textContent = 'Mark Ready';
    btn.onclick = () => window.updateOrderStatus(id, 'ready');
    actions.appendChild(btn);
  }
  if (order.status === 'ready') {
    const btn = document.createElement('button');
    btn.className = 'btn-primary';
    btn.style.cssText = 'flex:1; padding:10px; font-size:11px; background:var(--surface-2); color:var(--white); border:1px solid var(--border);';
    btn.textContent = 'Complete';
    btn.onclick = () => window.updateOrderStatus(id, 'completed');
    actions.appendChild(btn);
  }

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-outline';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = 'padding:10px; font-size:11px; color:var(--red); border-color:rgba(248,113,113,0.3);';
  cancelBtn.onclick = () => window.deleteOrder(id);
  actions.appendChild(cancelBtn);

  div.appendChild(header);
  div.appendChild(itemsList);
  div.appendChild(totalRow);
  div.appendChild(actions);
  ordersGrid.appendChild(div);
}

function getStatusColor(status) {
  switch(status) {
    case 'pending': return 'var(--accent)';
    case 'preparing': return '#d97706'; /* Muted amber */
    case 'ready': return 'var(--green)';
    default: return 'var(--gray)';
  }
}

window.updateOrderStatus = async (id, status) => {
  const VALID_STATUSES = ['pending', 'preparing', 'ready', 'completed'];
  if (!VALID_STATUSES.includes(status)) return;
  try {
    await updateDoc(doc(db, "orders", id), { status });
    showToast(`ORDER → ${status.toUpperCase()}`);
  } catch (err) {
    showToast("STATUS UPDATE FAILED");
  }
};

window.deleteOrder = async (id) => {
  if (confirm("Delete this order?")) {
    try {
      await deleteDoc(doc(db, "orders", id));
      showToast("ORDER DELETED");
    } catch (err) {
      showToast("DELETE FAILED");
    }
  }
};

// ─── ANALYTICS ───
function initCharts() {
  const chartEl = document.getElementById('salesChart');
  if (!chartEl) return;
  const ctx = chartEl.getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Sales ($)',
        data: [0, 0, 0, 0, 0, 0, 0],
        borderColor: '#FF6B00',
        backgroundColor: 'rgba(255, 107, 0, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } },
        x: { grid: { display: false }, ticks: { color: '#888' } }
      }
    }
  });
}

// Init
loadMenu();
loadOrders();
initCharts();
