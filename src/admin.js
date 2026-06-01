import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, getDocs } from 'firebase/firestore';

const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const errorEl = document.getElementById('login-error');
const ordersList = document.getElementById('orders-list');

// Auth State Observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    logoutBtn.style.display = 'block';
    loadOrders();
  } else {
    loginSection.style.display = 'block';
    dashboardSection.style.display = 'none';
    logoutBtn.style.display = 'none';
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

// Load Orders
function loadOrders() {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  
  onSnapshot(q, (snapshot) => {
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
      
      const statusClass = order.status === 'completed' ? 'status-completed' : 'status-pending';
      
      const itemsHtml = order.items.map(item => `
        <div style="display: flex; justify-content: space-between;">
          <span>${item.qty}x ${item.name}</span>
          <span>$${(item.price * item.qty).toFixed(2)}</span>
        </div>
      `).join('');
      
      card.innerHTML = `
        <div class="order-header">
          <div>
            <div class="order-title">${order.customerName}</div>
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
          ${order.status === 'pending' ? `<button class="btn-outline btn-small" onclick="markCompleted('${orderId}')">Mark Completed</button>` : ''}
        </div>
      `;
      ordersList.appendChild(card);
    });
  });
}

// Mark Order Completed
window.markCompleted = async (id) => {
  try {
    await updateDoc(doc(db, 'orders', id), {
      status: 'completed'
    });
  } catch (error) {
    console.error("Error updating order:", error);
    alert('Failed to update order status.');
  }
};

// Tabs Logic
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view-panel').forEach(p => p.style.display = 'none');
    
    e.target.classList.add('active');
    document.getElementById(e.target.dataset.target).style.display = 'block';
  });
});

// ==========================================
// MENU MANAGEMENT
// ==========================================

const addMenuForm = document.getElementById("add-menu-form");
const adminMenuList = document.getElementById("admin-menu-list");

if (addMenuForm) {
  addMenuForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const name = document.getElementById("menu-name").value;
    const price = parseFloat(document.getElementById("menu-price").value);
    const desc = document.getElementById("menu-desc").value;
    const category = document.getElementById("menu-category").value;
    const img = document.getElementById("menu-img").value;
    
    try {
      await addDoc(collection(db, "menu"), {
        name,
        price,
        desc,
        category,
        img
      });
      
      document.getElementById("menu-status").style.display = "block";
      addMenuForm.reset();
      
      setTimeout(() => {
        document.getElementById("menu-status").style.display = "none";
      }, 3000);
      
      loadMenuAdmin();
    } catch (err) {
      console.error("Error adding menu item: ", err);
      alert("Failed to add menu item.");
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
    snapshot.forEach(doc => {
      const data = doc.data();
      html += `
        <div style="background: var(--bg); border: 1px solid var(--border); padding: 12px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="font-size: 16px;">${data.name}</strong>
            <div style="color: var(--gray); font-size: 12px;">$${typeof data.price === "number" ? data.price.toFixed(2) : data.price} � ${data.category}</div>
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

// Call loadMenuAdmin when tab switches to menu
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.dataset.target === "menu-view") {
      loadMenuAdmin();
    }
  });
});

