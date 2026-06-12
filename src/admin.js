import { auth, db, storage } from './firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, getDocs, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const errorEl = document.getElementById('login-error');
const ordersList = document.getElementById('orders-list');

let state = {
  customers: [],
  orders: [],
  reviews: [],
  catering: [],
  tiers: { silver: 100, gold: 300 }
};

let ordersUnsub = null;
let reviewsUnsub = null;
let settingsUnsub = null;
let cateringUnsub = null;

// Auth State Observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    logoutBtn.style.display = 'block';
    
    initCRMData();
    loadMenuAdmin();
  } else {
    loginSection.style.display = 'block';
    dashboardSection.style.display = 'none';
    logoutBtn.style.display = 'none';
    
    if (ordersUnsub) ordersUnsub();
    if (reviewsUnsub) reviewsUnsub();
    if (settingsUnsub) settingsUnsub();
    if (cateringUnsub) cateringUnsub();
  }
});

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('admin-email').value;
  const password = document.getElementById('admin-password').value;
  
  try {
    errorEl.textContent = 'Logging in...';
    await signInWithEmailAndPassword(auth, email, password);
    errorEl.textContent = '';
  } catch (error) {
    errorEl.textContent = 'Invalid credentials. Please try again.';
  }
});

// Logout
logoutBtn.addEventListener('click', () => {
  signOut(auth);
});


// ==========================================
// DATA INITIALIZATION & LISTENERS
// ==========================================

function initCRMData() {
  // 1. Listen to Settings
  settingsUnsub = onSnapshot(doc(db, 'settings', 'loyalty'), (docSnap) => {
    if (docSnap.exists()) {
      state.tiers = docSnap.data();
      document.getElementById('tier-silver').value = state.tiers.silver || 100;
      document.getElementById('tier-gold').value = state.tiers.gold || 300;
    }
    renderLoyalty();
    renderCustomers();
  });

  // 2. Listen to Reviews
  const rq = query(collection(db, 'reviews'), orderBy('date', 'desc'));
  reviewsUnsub = onSnapshot(rq, (snapshot) => {
    state.reviews = [];
    snapshot.forEach(d => {
      state.reviews.push({ id: d.id, ...d.data(), date: d.data().date?.toDate() || new Date() });
    });
    renderReviews();
  });

  // 3. Listen to Orders (builds state.orders and state.customers)
  const oq = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  ordersUnsub = onSnapshot(oq, (snapshot) => {
    state.orders = [];
    const custMap = {};

    snapshot.forEach(d => {
      const o = d.data();
      const oDate = o.createdAt?.toDate() || new Date();
      
      let parsedTotal = typeof o.total === 'string' ? parseFloat(o.total.replace('$', '')) : o.total;
      
      const order = {
        id: d.id,
        ...o,
        total: parsedTotal,
        date: oDate
      };
      
      state.orders.push(order);

      const phone = o.customerPhone || 'Unknown';
      if (!custMap[phone]) {
        custMap[phone] = {
          id: phone,
          name: o.customerName || 'Unknown',
          phone: phone,
          totalSpent: 0,
          totalOrders: 0,
          lastVisit: null,
          loyaltyPoints: 0,
          notes: ""
        };
      }
      
      // We take the most recent name if there are multiple orders for the same phone
      if (!custMap[phone].lastVisit || oDate > custMap[phone].lastVisit) {
        custMap[phone].name = o.customerName || custMap[phone].name;
      }

      if (o.status === 'completed') {
        custMap[phone].totalSpent += parsedTotal;
        custMap[phone].totalOrders += 1;
        if (!custMap[phone].lastVisit || oDate > custMap[phone].lastVisit) {
          custMap[phone].lastVisit = oDate;
        }
      }
    });

    state.customers = Object.values(custMap).sort((a,b) => b.totalSpent - a.totalSpent);
    
    // Render everything dependent on Orders
    renderLiveOrders(snapshot);
    renderDashboard();
    renderCustomers();
    renderAllOrders();
    renderLoyalty();
  });

  // 4. Listen to Catering Inquiries
  const cq = query(collection(db, 'catering_inquiries'), orderBy('createdAt', 'desc'));
  cateringUnsub = onSnapshot(cq, (snapshot) => {
    state.catering = [];
    snapshot.forEach(d => {
      state.catering.push({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() || new Date() });
    });
    renderCatering();
  });

  // 5. Load Pop-up Settings & TV Promo Settings
  loadPopupSettings();
  loadTvPromoSettings();
}

async function loadTvPromoSettings() {
  onSnapshot(doc(db, 'settings', 'tv_promo'), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById('tv-promo-active').checked = data.active || false;
      document.getElementById('tv-promo-text').value = data.text || '';
      toggleTvPromoEditor(data.active);
    }
  });
}

function toggleTvPromoEditor(isActive) {
  const editor = document.getElementById('tv-promo-editor');
  if (isActive) {
    editor.style.opacity = '1';
    editor.style.pointerEvents = 'auto';
  } else {
    editor.style.opacity = '0.5';
    editor.style.pointerEvents = 'none';
  }
}

const tvPromoCheckbox = document.getElementById('tv-promo-active');
const btnSaveTvPromo = document.getElementById('btn-save-tv-promo');

if (tvPromoCheckbox) {
  tvPromoCheckbox.addEventListener('change', (e) => {
    toggleTvPromoEditor(e.target.checked);
  });
}

if (btnSaveTvPromo) {
  btnSaveTvPromo.addEventListener('click', async () => {
    btnSaveTvPromo.textContent = 'Saving...';
    try {
      await setDoc(doc(db, 'settings', 'tv_promo'), {
        active: tvPromoCheckbox.checked,
        text: document.getElementById('tv-promo-text').value,
        updatedAt: serverTimestamp()
      }, { merge: true });
      showToast('TV Promo saved successfully');
    } catch (e) {
      console.error('Error saving TV promo:', e);
      showToast('Error saving TV promo', true);
    }
    btnSaveTvPromo.textContent = 'Save TV Promo';
  });
}

async function loadPopupSettings() {
  onSnapshot(doc(db, 'settings', 'popup'), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById('popup-active').checked = data.active || false;
      document.getElementById('popup-title').value = data.title || '';
      document.getElementById('popup-message').value = data.message || '';
      document.getElementById('popup-btn-text').value = data.buttonText || '';
      document.getElementById('popup-btn-url').value = data.buttonUrl || '';
      togglePopupEditor(data.active);
    }
  });
}

const popupActiveCheckbox = document.getElementById('popup-active');
const popupEditor = document.getElementById('popup-editor');
const btnSavePopup = document.getElementById('btn-save-popup');

function togglePopupEditor(isActive) {
  if (isActive) {
    popupEditor.style.opacity = '1';
    popupEditor.style.pointerEvents = 'auto';
  } else {
    popupEditor.style.opacity = '0.5';
    popupEditor.style.pointerEvents = 'none';
  }
}

if (popupActiveCheckbox) {
  popupActiveCheckbox.addEventListener('change', (e) => {
    togglePopupEditor(e.target.checked);
  });
}

if (btnSavePopup) {
  btnSavePopup.addEventListener('click', async () => {
    btnSavePopup.textContent = 'Saving...';
    try {
      await setDoc(doc(db, 'settings', 'popup'), {
        active: popupActiveCheckbox.checked,
        title: document.getElementById('popup-title').value,
        message: document.getElementById('popup-message').value,
        buttonText: document.getElementById('popup-btn-text').value,
        buttonUrl: document.getElementById('popup-btn-url').value,
        updatedAt: serverTimestamp()
      }, { merge: true });
      showToast('Pop-Up settings saved successfully');
    } catch (e) {
      console.error('Error saving popup settings:', e);
      showToast('Error saving settings', true);
    }
    btnSavePopup.textContent = 'Save Pop-Up Settings';
  });
}

// ==========================================
// FIREBASE LIVE ORDERS TAB
// ==========================================

function renderLiveOrders(snapshot) {
  ordersList.innerHTML = '';
  if (snapshot.empty) {
    ordersList.innerHTML = '<p style="color: var(--gray);">No orders found.</p>';
    return;
  }
  
  snapshot.forEach((docSnap) => {
    const order = docSnap.data();
    const orderId = docSnap.id;
    const date = order.createdAt ? order.createdAt.toDate().toLocaleString() : 'Just now';
    
    const card = document.createElement('div');
    card.className = 'order-card';
    
    const statusClass = order.status === 'completed' ? 'status-completed' : (order.status === 'cancelled' ? 'status-cancelled' : 'status-pending');
    
    const itemsHtml = (order.items || []).map(item => `
      <div style="display: flex; justify-content: space-between;">
        <span>${item.qty}x ${item.name}</span>
        <span>$${(item.price * item.qty).toFixed(2)}</span>
      </div>
    `).join('');
    
    card.innerHTML = `
      <div class="order-header">
        <div>
          <div class="order-title">${order.customerName} <span style="font-size: 12px; color: var(--gray); font-weight: normal; margin-left: 8px;">${order.customerPhone || ''}</span></div>
          <div class="order-meta">${date} &middot; via ${order.method || 'Web'}</div>
        </div>
        <div class="status-badge ${statusClass}">${order.status}</div>
      </div>
      <div class="order-items">
        ${itemsHtml}
      </div>
      <div class="order-total">
        Total: ${typeof order.total === 'number' ? '$' + order.total.toFixed(2) : order.total}
      </div>
      <div class="order-actions">
        ${order.status === 'pending' ? `<button class="btn-outline btn-small" onclick="updateOrderStatus('${orderId}', 'completed')">Mark Completed</button>
                                        <button class="btn-outline btn-small" onclick="updateOrderStatus('${orderId}', 'cancelled')" style="border-color: var(--accent); color: var(--accent);">Cancel</button>` : ''}
      </div>
    `;
    ordersList.appendChild(card);
  });
}

window.updateOrderStatus = async (id, newStatus) => {
  try {
    await updateDoc(doc(db, 'orders', id), {
      status: newStatus
    });
    showToast(`Order marked as ${newStatus}`);
  } catch (error) {
    console.error("Error updating order:", error);
    alert('Failed to update order status.');
  }
};


// ==========================================
// FIREBASE MENU MANAGEMENT
// ==========================================

const addMenuForm = document.getElementById("add-menu-form");
const adminMenuList = document.getElementById("admin-menu-list");
const editMenuModal = document.getElementById("edit-menu-modal");
const editMenuForm = document.getElementById("edit-menu-form");

// Image upload label listeners
const addMenuUploadInput = document.getElementById('menu-img-upload');
const addMenuFilename = document.getElementById('menu-img-filename');
if (addMenuUploadInput && addMenuFilename) {
  addMenuUploadInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      addMenuFilename.textContent = e.target.files[0].name;
    } else {
      addMenuFilename.textContent = 'No file chosen';
    }
  });
}

const editMenuUploadInput = document.getElementById('edit-menu-img-upload');
const editMenuFilename = document.getElementById('edit-menu-img-filename');
if (editMenuUploadInput && editMenuFilename) {
  editMenuUploadInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      editMenuFilename.textContent = e.target.files[0].name;
    } else {
      editMenuFilename.textContent = 'No file chosen';
    }
  });
}

// Upload helper function
async function uploadImageFile(file) {
  const storageRef = ref(storage, `menu-images/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}

if (addMenuForm) {
  addMenuForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = addMenuForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Adding...';
    submitBtn.disabled = true;

    const name = document.getElementById("menu-name").value;
    const price = parseFloat(document.getElementById("menu-price").value);
    const desc = document.getElementById("menu-desc").value;
    const category = document.getElementById("menu-category").value;
    let img = document.getElementById("menu-img").value;
    const featured = document.getElementById("menu-featured").checked;
    
    try {
      const fileInput = document.getElementById('menu-img-upload');
      if (fileInput.files.length > 0) {
        submitBtn.textContent = 'Uploading Image...';
        img = await uploadImageFile(fileInput.files[0]);
      }

      await addDoc(collection(db, "menu"), { name, price, desc, category, img, featured: !!featured });
      document.getElementById("menu-status").style.display = "block";
      addMenuForm.reset();
      if (addMenuFilename) addMenuFilename.textContent = 'No file chosen';
      setTimeout(() => { document.getElementById("menu-status").style.display = "none"; }, 3000);
      loadMenuAdmin();
    } catch (err) {
      console.error("Error adding menu item: ", err);
      alert("Failed to add menu item.");
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

async function loadMenuAdmin() {
  if (!adminMenuList) return;
  adminMenuList.innerHTML = "<p style=\"color: var(--gray);\">Loading...</p>";
  try {
    const snapshot = await getDocs(collection(db, "menu"));
    if (snapshot.empty) {
      adminMenuList.innerHTML = "<p style=\"color: var(--gray);\">No menu items found.</p>";
      return;
    }
    let html = "";
    window.adminMenuData = {};
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const itemId = docSnap.id;
      window.adminMenuData[itemId] = data;
      const descText = data.desc || data.description || '';
      
      html += `
        <div style="background: var(--bg); border: 1px solid var(--border); padding: 16px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; gap: 16px;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <strong style="font-size: 16px; color: var(--white);">${data.name}</strong>
              ${data.featured ? '<span style="background: rgba(255,215,0,0.15); color: #FFD700; font-size: 10px; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255,215,0,0.3); font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">⭐ Featured</span>' : ''}
            </div>
            <div style="color: var(--gray); font-size: 12px; margin-bottom: 6px;">
              $${typeof data.price === "number" ? data.price.toFixed(2) : data.price} • <span style="text-transform: capitalize;">${data.category}</span>
            </div>
            <div style="color: #888; font-size: 13px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${descText}
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-outline btn-small" onclick="openEditMenuModal('${itemId}')" style="padding: 6px 12px; font-size: 12px;">Edit</button>
            <button class="btn-outline btn-small" onclick="deleteMenuItem('${itemId}')" style="padding: 6px 12px; font-size: 12px; border-color: rgba(255,69,0,0.4); color: var(--accent);">Delete</button>
          </div>
        </div>
      `;
    });
    adminMenuList.innerHTML = html;
  } catch (err) {
    console.error("Error loading menu: ", err);
    adminMenuList.innerHTML = "<p style=\"color: var(--accent);\">Failed to load menu.</p>";
  }
}

// Global Edit/Delete Functions for Menu
window.openEditMenuModal = (id) => {
  const data = window.adminMenuData[id];
  if (!editMenuModal || !data) return;
  document.getElementById("edit-menu-id").value = id;
  document.getElementById("edit-menu-name").value = data.name || "";
  document.getElementById("edit-menu-price").value = data.price || "";
  document.getElementById("edit-menu-category").value = data.category || "platters";
  document.getElementById("edit-menu-img").value = data.img || data.image || data.imageUrl || "";
  document.getElementById("edit-menu-desc").value = data.desc || data.description || "";
  document.getElementById("edit-menu-featured").checked = !!data.featured;
  
  editMenuModal.classList.add("open");
};

window.closeEditMenuModal = () => {
  if (editMenuModal) {
    editMenuModal.classList.remove("open");
  }
};

window.deleteMenuItem = async (id) => {
  const data = window.adminMenuData[id];
  if (!data) return;
  if (confirm(`Are you sure you want to delete "${data.name}" from the menu?`)) {
    try {
      await deleteDoc(doc(db, "menu", id));
      loadMenuAdmin();
    } catch (err) {
      console.error("Error deleting menu item: ", err);
      alert("Failed to delete menu item.");
    }
  }
};

if (editMenuForm) {
  editMenuForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = editMenuForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;

    const id = document.getElementById("edit-menu-id").value;
    const name = document.getElementById("edit-menu-name").value;
    const price = parseFloat(document.getElementById("edit-menu-price").value);
    const category = document.getElementById("edit-menu-category").value;
    let img = document.getElementById("edit-menu-img").value;
    const desc = document.getElementById("edit-menu-desc").value;
    const featured = document.getElementById("edit-menu-featured").checked;
    
    try {
      const fileInput = document.getElementById('edit-menu-img-upload');
      if (fileInput.files.length > 0) {
        submitBtn.textContent = 'Uploading Image...';
        img = await uploadImageFile(fileInput.files[0]);
      }

      await updateDoc(doc(db, "menu", id), {
        name,
        price,
        category,
        img,
        desc,
        featured: !!featured
      });
      closeEditMenuModal();
      loadMenuAdmin();
    } catch (err) {
      console.error("Error updating menu item: ", err);
      alert("Failed to update menu item.");
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

// ==========================================
// CRM UI RENDERS & HELPERS
// ==========================================

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

  const feedEl = document.getElementById('dash-activity-feed');
  feedEl.innerHTML = '';
  const recentOrders = state.orders.slice(0, 5);
  recentOrders.forEach(o => {
    const d = document.createElement('div');
    d.className = 'crm-feed-item';
    d.innerHTML = `<strong>${o.customerName || 'Unknown'}</strong> placed an order for $${o.total.toFixed(2)}`;
    feedEl.appendChild(d);
  });

  const spendersEl = document.getElementById('dash-top-spenders');
  spendersEl.innerHTML = '';
  const topSpenders = state.customers.slice(0, 5);
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

function renderCustomers() {
  const tbody = document.getElementById('customers-table-body');
  if(!tbody) return;
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
      <p><strong>Tier:</strong> ${tier}</p>
      <p><strong>Last Visit:</strong> ${cust.lastVisit ? cust.lastVisit.toLocaleDateString() : 'N/A'}</p>
    </div>
  `;
  document.getElementById('customer-slide-over').classList.add('open');
};

window.closeCustomerSlideOver = () => {
  document.getElementById('customer-slide-over').classList.remove('open');
};

function renderAllOrders() {
  const tbody = document.getElementById('orders-table-body');
  if(!tbody) return;
  const term = document.getElementById('order-search').value.toLowerCase();
  const statusFilter = document.getElementById('order-status-filter').value;

  tbody.innerHTML = '';
  state.orders
    .filter(o => o.id.toLowerCase().includes(term) || (o.customerName && o.customerName.toLowerCase().includes(term)))
    .filter(o => statusFilter === 'all' || o.status === statusFilter)
    .forEach(o => {
      let statusClass = 'status-pending';
      if(o.status === 'completed') statusClass = 'status-completed';
      if(o.status === 'cancelled') statusClass = 'status-cancelled';

      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.innerHTML = `
        <td>${o.id.substring(0,8)}</td>
        <td><strong>${o.customerName}</strong></td>
        <td>${o.date.toLocaleDateString()}</td>
        <td>$${o.total.toFixed(2)}</td>
        <td><span class="status-badge ${statusClass}">${o.status}</span></td>
      `;
      tr.addEventListener('click', () => openMockOrderDetail(o));
      tbody.appendChild(tr);
    });
}

window.openMockOrderDetail = (order) => {
  document.getElementById('modal-order-title').textContent = `Order ${order.id}`;
  const content = document.getElementById('modal-order-content');
  
  const itemsHtml = (order.items || []).map(i => `
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

function renderReviews() {
  const container = document.getElementById('reviews-container');
  if(!container) return;
  const statusFilter = document.getElementById('review-status-filter').value;
  
  container.innerHTML = '';
  
  let sortedReviews = [...state.reviews];
  if(statusFilter === 'unresponded') {
    sortedReviews.sort((a,b) => (a.responded === b.responded ? 0 : a.responded ? 1 : -1));
  }
  
  if (sortedReviews.length === 0) {
    container.innerHTML = '<p style="color: var(--gray);">No reviews added yet.</p>';
    return;
  }
  
  sortedReviews.forEach(r => {
    const card = document.createElement('div');
    card.className = 'crm-panel';
    card.style.opacity = r.responded ? '0.6' : '1';
    
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <div>
          <strong style="font-size: 16px;">${r.customerName}</strong>
          <span style="color: var(--gray); font-size: 12px; margin-left: 8px;">via ${r.platform}</span>
        </div>
        <div style="color: #FFD700; letter-spacing: 2px;">${'★'.repeat(parseInt(r.stars))}${'☆'.repeat(5-parseInt(r.stars))}</div>
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

// Add Review Manual Submit
const addReviewForm = document.getElementById('add-review-form');
if (addReviewForm) {
  addReviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const customerName = document.getElementById('review-customer').value;
    const stars = parseInt(document.getElementById('review-stars').value);
    const platform = document.getElementById('review-platform').value;
    const text = document.getElementById('review-text').value;

    try {
      await addDoc(collection(db, 'reviews'), {
        customerName,
        stars,
        platform,
        text,
        responded: false,
        date: serverTimestamp()
      });
      addReviewForm.reset();
      showToast('Review added successfully!');
    } catch (error) {
      console.error("Error adding review:", error);
      alert('Failed to add review');
    }
  });
}

window.toggleReviewResponse = async (id, isResponded) => {
  try {
    await updateDoc(doc(db, 'reviews', id), {
      responded: isResponded
    });
  } catch (error) {
    console.error("Error updating review:", error);
  }
};

function renderLoyalty() {
  const grid = document.getElementById('loyalty-tiers-grid');
  if(!grid) return;
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

const saveTiersBtn = document.getElementById('btn-save-tiers');
if (saveTiersBtn) {
  saveTiersBtn.addEventListener('click', async () => {
    const s = parseInt(document.getElementById('tier-silver').value) || 100;
    const g = parseInt(document.getElementById('tier-gold').value) || 300;
    
    try {
      await setDoc(doc(db, 'settings', 'loyalty'), {
        silver: s,
        gold: g
      });
      showToast('Loyalty thresholds updated!');
    } catch (error) {
      console.error("Error saving settings:", error);
      alert('Failed to save settings');
    }
  });
}

// Event Listeners for Filters
const customerSearch = document.getElementById('customer-search');
if (customerSearch) customerSearch.addEventListener('input', renderCustomers);

const orderSearch = document.getElementById('order-search');
if (orderSearch) orderSearch.addEventListener('input', renderAllOrders);

const orderStatusFilter = document.getElementById('order-status-filter');
if (orderStatusFilter) orderStatusFilter.addEventListener('change', renderAllOrders);

const reviewStatusFilter = document.getElementById('review-status-filter');
if (reviewStatusFilter) reviewStatusFilter.addEventListener('change', renderReviews);

// ==========================================
// CATERING
// ==========================================
function renderCatering() {
  const tbody = document.getElementById('catering-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  if (state.catering.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--gray);">No catering inquiries yet.</td></tr>';
    return;
  }
  
  state.catering.forEach(inquiry => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.onclick = () => showCateringDetails(inquiry);
    
    tr.innerHTML = `
      <td>${inquiry.createdAt.toLocaleDateString()}</td>
      <td><strong>${inquiry.name}</strong><br><small style="color: var(--gray);">${inquiry.phone}</small></td>
      <td>${inquiry.date}</td>
      <td>${inquiry.guests}</td>
      <td><span class="status-badge ${inquiry.status === 'new' ? 'status-pending' : 'status-completed'}">${inquiry.status.toUpperCase()}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

window.showCateringDetails = (inquiry) => {
  const modal = document.getElementById('catering-modal');
  const title = document.getElementById('modal-catering-title');
  const content = document.getElementById('modal-catering-content');
  
  if (!modal || !title || !content) return;
  
  title.textContent = `Inquiry: ${inquiry.name}`;
  content.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
      <div>
        <div style="font-size: 11px; color: var(--gray); text-transform: uppercase;">Event Date</div>
        <div>${inquiry.date}</div>
      </div>
      <div>
        <div style="font-size: 11px; color: var(--gray); text-transform: uppercase;">Guests</div>
        <div>${inquiry.guests}</div>
      </div>
      <div>
        <div style="font-size: 11px; color: var(--gray); text-transform: uppercase;">Email</div>
        <div><a href="mailto:${inquiry.email}" style="color: var(--accent);">${inquiry.email}</a></div>
      </div>
      <div>
        <div style="font-size: 11px; color: var(--gray); text-transform: uppercase;">Phone</div>
        <div><a href="tel:${inquiry.phone}" style="color: var(--accent);">${inquiry.phone}</a></div>
      </div>
    </div>
    <div style="margin-bottom: 24px;">
      <div style="font-size: 11px; color: var(--gray); text-transform: uppercase; margin-bottom: 4px;">Details</div>
      <div style="background: var(--surface); padding: 12px; border-radius: 4px;">${inquiry.details}</div>
    </div>
    <div style="display: flex; gap: 12px; margin-top: 24px; border-top: 1px solid var(--border); padding-top: 16px;">
      <button class="btn-primary" onclick="updateCateringStatus('${inquiry.id}', 'contacted')">Mark as Contacted</button>
      <button class="btn-outline" onclick="updateCateringStatus('${inquiry.id}', 'resolved')">Mark as Resolved</button>
    </div>
  `;
  modal.style.display = 'flex';
};

window.closeCateringModal = () => {
  const modal = document.getElementById('catering-modal');
  if (modal) modal.style.display = 'none';
};

window.updateCateringStatus = async (id, status) => {
  try {
    await updateDoc(doc(db, 'catering_inquiries', id), { status });
    showToast('Inquiry status updated.');
    closeCateringModal();
  } catch (error) {
    console.error("Error updating catering status", error);
    showToast('Failed to update status.');
  }
};

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
// UNIFIED NAVIGATION
// ==========================================

document.querySelectorAll('.crm-nav-item').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.crm-nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.crm-view').forEach(p => p.style.display = 'none');
    
    const targetId = btn.dataset.target;
    btn.classList.add('active');
    document.getElementById(targetId).style.display = 'block';
  });
});
