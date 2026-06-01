import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';

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
          Total: $${order.total.toFixed(2)}
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
