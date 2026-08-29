import { ordersList, escapeHtml, state } from './shared.js';
import { db } from '../firebase.js';
import { doc, updateDoc } from 'firebase/firestore';



export function renderLiveOrders(snapshot) {
  // Update pending badge
  const badge = document.getElementById('pending-orders-badge');
  if (badge) {
    let pendingCount = 0;
    snapshot.forEach(d => { if (d.data().status === 'pending') pendingCount++; });
    if (pendingCount > 0) {
      badge.textContent = pendingCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
  
  ordersList.innerHTML = '';
  if (snapshot.empty) {
    ordersList.innerHTML = '<p style="color: var(--gray);">No orders found.</p>';
    return;
  }
  
  snapshot.forEach((docSnap) => {
    const order = docSnap.data();
    if (order.status !== 'pending') return;
    const orderId = docSnap.id;
    const date = (order.createdAt && typeof order.createdAt.toDate === 'function') 
                 ? order.createdAt.toDate().toLocaleString() 
                 : (order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Just now');
    
    const card = document.createElement('div');
    card.className = 'order-card';
    
    const statusClass = order.status === 'completed' ? 'status-completed' : (order.status === 'cancelled' ? 'status-cancelled' : 'status-pending');
    
    const itemsHtml = (order.items || []).map(item => {
      let optionsHtml = '';
      if (item.selectedOptions && Object.keys(item.selectedOptions).length > 0) {
        const optLines = Object.entries(item.selectedOptions).map(([key, val]) => 
          `<span style="display: inline-block; background: rgba(255,255,255,0.08); padding: 1px 6px; border-radius: 3px; font-size: 11px; margin-right: 4px;">${val}</span>`
        ).join('');
        optionsHtml = `<div style="margin-top: 2px;">${optLines}</div>`;
      }
      if (item.addOns && item.addOns.length > 0) {
        const addOnLines = item.addOns.map(a => `+ ${a.name || a}`).join(', ');
        optionsHtml += `<div style="font-size: 11px; color: #90caf9; margin-top: 2px;">${addOnLines}</div>`;
      }
      return `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
          <div>
            <span>${item.qty || item.quantity || 1}x ${item.name}</span>
            ${optionsHtml}
          </div>
          <span>$${((item.price || 0) * (item.qty || item.quantity || 1)).toFixed(2)}</span>
        </div>
      `;
    }).join('');

    // Special instructions
    const specialInstr = order.specialInstructions || order.notes || '';
    const instrHtml = specialInstr ? `<div style="font-size: 12px; color: #ff9800; font-style: italic; padding: 6px 8px; background: rgba(255,152,0,0.1); border-radius: 4px; margin-top: 4px;">📝 ${escapeHtml(specialInstr)}</div>` : '';

    // Pickup info
    let pickupHtml = '';
    if (order.pickup) {
      const pType = order.pickup.type === 'scheduled' ? '📅 Scheduled' : '⚡ ASAP';
      const readyTime = order.pickup.estimatedReadyTime?.toDate ? order.pickup.estimatedReadyTime.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
                        order.estimatedReadyAt?.toDate ? order.estimatedReadyAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
      pickupHtml = `<div style="font-size: 11px; color: var(--gray); margin-top: 4px;">${pType}${readyTime ? ' · Ready by ' + readyTime : ''}</div>`;
    }

    // Discount/tax/tip breakdown
    let breakdownHtml = '';
    if (order.discount > 0 || order.tax > 0 || order.tip > 0) {
      breakdownHtml = '<div style="font-size: 11px; color: var(--gray); margin-top: 4px; display: flex; gap: 12px;">';
      if (order.discount > 0) breakdownHtml += `<span>Discount: -$${order.discount.toFixed(2)}</span>`;
      if (order.tax > 0) breakdownHtml += `<span>Tax: $${order.tax.toFixed(2)}</span>`;
      if (order.tip > 0) breakdownHtml += `<span style="color: #4caf50;">Tip: $${order.tip.toFixed(2)}</span>`;
      breakdownHtml += '</div>';
    }
    
    card.innerHTML = `
      <div class="order-header">
        <div>
          <div class="order-title">${order.customerName} <span style="font-size: 12px; color: var(--gray); font-weight: normal; margin-left: 8px;">${order.customerPhone || ''}</span></div>
          <div class="order-meta">${date} &middot; via ${order.method || 'Web'} ${order.status === 'pending' ? (() => {
  const mins = Math.floor((Date.now() - (order.createdAt && typeof order.createdAt.toDate === 'function' ? order.createdAt.toDate().getTime() : (order.createdAt ? new Date(order.createdAt).getTime() : Date.now()))) / 60000);
  const color = mins > 15 ? '#f44336' : mins > 7 ? '#ff9800' : '#4caf50';
  return `<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; background: ${color}22; color: ${color};">${mins} min ago</span>`;
})() : ''}</div>
          ${pickupHtml}
        </div>
        <div class="status-badge ${statusClass}">${order.status}</div>
      </div>
      <div class="order-items">
        ${itemsHtml}
        ${instrHtml}
      </div>
      <div class="order-total">
        Total: ${typeof order.total === 'number' ? '$' + order.total.toFixed(2) : order.total}
        ${breakdownHtml}
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





export function renderCatering() {
  const tbody = document.getElementById('catering-table-body');
  if (!tbody) return;

// Catering stats
const totalEl = document.getElementById('catering-total');
if (totalEl) {
  totalEl.textContent = state.catering.length;
  document.getElementById('catering-new').textContent = state.catering.filter(c => c.status === 'new').length;
  document.getElementById('catering-contacted').textContent = state.catering.filter(c => c.status === 'contacted').length;
  document.getElementById('catering-resolved').textContent = state.catering.filter(c => c.status === 'resolved').length;
}

  tbody.innerHTML = '';
  
  if (state.catering.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--gray);">No catering inquiries yet.</td></tr>';
    return;
  }
  
  state.catering.forEach(inquiry => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.onclick = () => window.showCateringDetails(inquiry);
    
    tr.innerHTML = `
      <td data-label="Added">${inquiry.createdAt.toLocaleDateString()}</td>
      <td data-label="Customer"><strong>${inquiry.name}</strong><br><small style="color: var(--gray);">${inquiry.phone}</small></td>
      <td data-label="Event Date">${inquiry.date}</td>
      <td data-label="Guests">${inquiry.guests}</td>
      <td data-label="Status"><span class="status-badge" style="${inquiry.status === 'new' ? 'background: rgba(255,152,0,0.15); color: #ff9800; border: 1px solid rgba(255,152,0,0.3);' : inquiry.status === 'contacted' ? 'background: rgba(33,150,243,0.15); color: #2196f3; border: 1px solid rgba(33,150,243,0.3);' : 'background: rgba(76,175,80,0.15); color: #4caf50; border: 1px solid rgba(76,175,80,0.3);'} padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 700; text-transform: uppercase;">${inquiry.status}</span></td>
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
    window.closeCateringModal();
  } catch (error) {
    console.error("Error updating catering status", error);
    showToast('Failed to update status.');
  }
};

export function showToast(message) {
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

