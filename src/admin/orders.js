import { ordersList, escapeHtml, state } from './shared.js';
import { db, app } from '../firebase.js';
import { doc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';



// Web Audio API Floor Chime Engine
let audioCtx = null;
let lastKnownPendingCount = -1;

export function playFloorChime() {
  if (localStorage.getItem('floor_sound_enabled') === 'false') return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    // Tone 1
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Tone 2
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.15);
    gain2.gain.setValueAtTime(0.25, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.6);
  } catch (e) {
    console.log('Audio chime error:', e);
  }
}

export function initFloorSoundControls() {
  const soundBtn = document.getElementById('btn-toggle-order-sound');
  const soundIcon = document.getElementById('order-sound-icon');
  const soundLabel = document.getElementById('order-sound-label');
  if (!soundBtn) return;

  const updateSoundUI = () => {
    const isMuted = localStorage.getItem('floor_sound_enabled') === 'false';
    if (soundIcon) soundIcon.innerHTML = isMuted ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ui-icon ui-icon-no-margin"><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.89 17.89 0 0 1 18 8"/><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/><line x1="1" y1="1" x2="23" y2="23"/></svg>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ui-icon ui-icon-no-margin"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
    if (soundLabel) soundLabel.textContent = isMuted ? 'Floor Chime: Off' : 'Floor Chime: On';
    soundBtn.style.borderColor = isMuted ? 'var(--border-admin)' : 'var(--accent-admin)';
  };

  updateSoundUI();
  soundBtn.addEventListener('click', () => {
    const isMuted = localStorage.getItem('floor_sound_enabled') === 'false';
    localStorage.setItem('floor_sound_enabled', isMuted ? 'true' : 'false');
    updateSoundUI();
    if (isMuted) playFloorChime();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initFloorSoundControls, 300);
});

export function renderLiveOrders(snapshot) {
  let pendingCount = 0;
  snapshot.forEach(d => { if (d.data().status === 'pending') pendingCount++; });

  // Update pending badge on desktop sidebar and mobile floor bottom nav
  const badge = document.getElementById('pending-orders-badge');
  const floorBadge = document.getElementById('mobile-header-pending-badge');
  [badge, floorBadge].forEach(b => {
    if (b) {
      if (pendingCount > 0) {
        b.textContent = pendingCount;
        b.style.display = 'inline-block';
      } else {
        b.style.display = 'none';
      }
    }
  });

  // Play audio chime if new pending orders arrived
  if (lastKnownPendingCount >= 0 && pendingCount > lastKnownPendingCount) {
    playFloorChime();
  }
  lastKnownPendingCount = pendingCount;
  
  ordersList.innerHTML = '';
  if (snapshot.empty || pendingCount === 0) {
    ordersList.innerHTML = `
      <div style="text-align: center; padding: 48px 24px; background: var(--surface-admin); border: 1px dashed var(--border-admin); border-radius: 4px;">
        <div style="display: flex; justify-content: center; margin-bottom: 12px; color: var(--accent-admin);"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
        <h3 style="margin: 0 0 6px 0; font-size: 18px; color: var(--text-main);">All Caught Up!</h3>
        <p style="color: var(--text-muted); font-size: 14px; margin: 0;">No active pending orders right now. Orders placed online will appear here automatically.</p>
      </div>
    `;
    return;
  }
  
  snapshot.forEach((docSnap) => {
    const order = docSnap.data();
    if (order.status !== 'pending') return;
    const orderId = docSnap.id;
    const date = (order.createdAt && typeof order.createdAt.toDate === 'function') 
                 ? order.createdAt.toDate().toLocaleString() 
                 : (order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Just now');
    
    const mins = Math.floor((Date.now() - (order.createdAt && typeof order.createdAt.toDate === 'function' ? order.createdAt.toDate().getTime() : (order.createdAt ? new Date(order.createdAt).getTime() : Date.now()))) / 60000);
    
    const card = document.createElement('div');
    card.className = `order-card ${mins > 15 ? 'order-card-urgent' : mins > 7 ? 'order-card-warning' : ''}`;
    
    const statusClass = order.status === 'completed' ? 'status-completed' : (order.status === 'cancelled' ? 'status-cancelled' : 'status-pending');
    
    const itemsHtml = (order.items || []).map(item => {
      let optionsHtml = '';
      if (item.selectedOptions && Object.keys(item.selectedOptions).length > 0) {
        const optLines = Object.entries(item.selectedOptions).map(([, val]) => 
          `<span style="display: inline-block; background: rgba(255,255,255,0.08); padding: 1px 6px; border-radius: 3px; font-size: 11px; margin-right: 4px;">${val}</span>`
        ).join('');
        optionsHtml = `<div style="margin-top: 2px;">${optLines}</div>`;
      }
      if (item.addOns && item.addOns.length > 0) {
        const addOnLines = item.addOns.map(a => `+ ${a.name || a}`).join(', ');
        optionsHtml += `<div style="font-size: 11px; color: #90caf9; margin-top: 2px;">${addOnLines}</div>`;
      }
      return `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px dashed rgba(255,255,255,0.06);">
          <div>
            <span style="font-weight: 600; font-size: 15px;"><strong style="color: var(--accent-admin);">${item.qty || item.quantity || 1}x</strong> ${item.name}</span>
            ${optionsHtml}
          </div>
          <span style="font-weight: 600; font-size: 14px;">$${((item.price || 0) * (item.qty || item.quantity || 1)).toFixed(2)}</span>
        </div>
      `;
    }).join('');

    // Special instructions
    const specialInstr = order.specialInstructions || order.notes || '';
    const instrHtml = specialInstr ? `<div class="order-special-notes"><strong>Notes:</strong> ${escapeHtml(specialInstr)}</div>` : '';

    // Pickup info
    let pickupHtml = '';
    if (order.pickup) {
      const pType = order.pickup.type === 'scheduled' ? 'Scheduled' : 'ASAP';
      const readyTime = order.pickup.estimatedReadyTime?.toDate ? order.pickup.estimatedReadyTime.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
                        order.estimatedReadyAt?.toDate ? order.estimatedReadyAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
      pickupHtml = `<div style="font-size: 12px; color: var(--accent-admin); font-weight: 600; margin-top: 4px;">${pType}${readyTime ? ' · Ready by ' + readyTime : ''}</div>`;
    }

    // Phone Link for floor dialing
    const rawPhone = order.customerPhone || '';
    const cleanPhone = rawPhone.replace(/[^\d+]/g, '');
    const phoneHtml = cleanPhone ? `<a href="tel:${cleanPhone}" class="order-phone-link" onclick="event.stopPropagation();" style="display: inline-flex; align-items: center; gap: 4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ui-icon ui-icon-no-margin"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${rawPhone}</a>` : '';

    // Discount/tax/tip breakdown
    let breakdownHtml = '';
    if (order.discount > 0 || order.tax > 0 || order.tip > 0) {
      breakdownHtml = '<div style="font-size: 12px; color: var(--text-muted); margin-top: 6px; display: flex; gap: 12px; flex-wrap: wrap;">';
      if (order.discount > 0) breakdownHtml += `<span>Discount: -$${order.discount.toFixed(2)}</span>`;
      if (order.tax > 0) breakdownHtml += `<span>Tax: $${order.tax.toFixed(2)}</span>`;
      if (order.tip > 0) breakdownHtml += `<span style="color: #10b981; font-weight: 600;">Tip: $${order.tip.toFixed(2)}</span>`;
      breakdownHtml += '</div>';
    }

    const timerColor = mins > 15 ? '#ef4444' : mins > 7 ? '#f59e0b' : '#10b981';
    
    card.innerHTML = `
      <div class="order-header">
        <div style="flex: 1; min-width: 0;">
          <div class="order-title">
            <span>${order.customerName || 'Walk-in / Guest'}</span>
            ${phoneHtml}
          </div>
          <div class="order-meta">
            <span>${date} &middot; via ${order.method || 'Web'}</span>
            <span class="order-timer-badge" style="background: ${timerColor}22; color: ${timerColor}; border: 1px solid ${timerColor}55;">
              ⏱️ ${mins} min ago
            </span>
          </div>
          ${pickupHtml}
        </div>
        <div class="status-badge ${statusClass}">${order.status}</div>
      </div>
      <div class="order-items">
        ${itemsHtml}
        ${instrHtml}
      </div>
      <div class="order-total">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span style="font-size: 14px; text-transform: uppercase; color: var(--text-muted);">Total</span>
          <span style="font-size: 22px; font-weight: bold; color: var(--accent-admin);">${typeof order.total === 'number' ? '$' + order.total.toFixed(2) : order.total}</span>
        </div>
        ${breakdownHtml}
      </div>
      <div class="order-actions">
        <button class="btn-primary btn-floor-action" onclick="updateOrderStatus('${orderId}', 'completed')">Complete Order</button>
        <button class="btn-outline btn-floor-action btn-danger" onclick="confirmCancelOrder('${orderId}')">Cancel</button>
      </div>
    `;
    ordersList.appendChild(card);
  });
}

window.confirmCancelOrder = async (id) => {
  const reason = prompt('Are you sure you want to cancel this order?\n\nEnter reason for cancellation (visible to customer on web portal and synced with Square):', 'Kitchen closed / Item out of stock');
  if (reason === null) return; // user cancelled prompt
  
  await window.updateOrderStatus(id, 'cancelled', reason.trim() || 'Order cancelled by restaurant');
};

window.updateOrderStatus = async (id, newStatus, reason) => {
  try {
    showToast(`Updating order...`);
    const isCancel = newStatus === 'cancelled' || newStatus === 'canceled';

    // Call updateSquareOrderStatus to keep Square orders API and refunds in two-way sync
    try {
      const updateCallable = httpsCallable(getFunctions(app), 'updateSquareOrderStatus');
      await updateCallable({
        orderId: id,
        status: isCancel ? 'canceled' : newStatus,
        reason: reason || (isCancel ? 'Order cancelled by restaurant' : ''),
        refundPayment: isCancel
      });
      showToast(isCancel ? 'Order cancelled and refunded via Square' : `Order marked as ${newStatus}`);
      return;
    } catch (callErr) {
      console.warn('updateSquareOrderStatus callable error, falling back to direct doc update:', callErr);
    }

    const updateData = { status: isCancel ? 'cancelled' : newStatus };
    if (isCancel && reason) {
      updateData.cancellationReason = reason;
      updateData.refundReason = reason;
    }
    await updateDoc(doc(db, 'orders', id), updateData);
    showToast(`Order marked as ${newStatus}`);
  } catch (error) {
    console.error("Error updating order:", error);
    alert('Failed to update order status: ' + (error.message || 'Unknown error'));
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
      <td data-label="Status"><span class="status-badge" style="${inquiry.status === 'new' ? 'background: rgba(255,152,0,0.15); color: #ff9800; border: 1px solid rgba(255,152,0,0.3);' : inquiry.status === 'contacted' ? 'background: rgba(33,150,243,0.15); color: #2196f3; border: 1px solid rgba(33,150,243,0.3);' : 'background: rgba(76,175,80,0.15); color: #4caf50; border: 1px solid rgba(76,175,80,0.3);'} padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase;">${inquiry.status}</span></td>
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
        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Event Date</div>
        <div style="font-weight: 500;">${escapeHtml(inquiry.date || 'N/A')}</div>
      </div>
      <div>
        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Guests</div>
        <div style="font-weight: 500;">${escapeHtml(String(inquiry.guests || 'N/A'))}</div>
      </div>
      <div>
        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Email</div>
        <div><a href="mailto:${escapeHtml(inquiry.email || '')}" style="color: var(--accent-admin); word-break: break-all;">${escapeHtml(inquiry.email || 'N/A')}</a></div>
      </div>
      <div>
        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Phone</div>
        <div><a href="tel:${escapeHtml(inquiry.phone || '')}" style="color: var(--accent-admin);">${escapeHtml(inquiry.phone || 'N/A')}</a></div>
      </div>
    </div>
    <div style="margin-bottom: 24px;">
      <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Details</div>
      <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-admin); padding: 12px; border-radius: 4px; white-space: pre-wrap; font-size: 14px;">${escapeHtml(inquiry.details || "No additional details provided.")}</div>
    </div>
    <div style="display: flex; gap: 12px; margin-top: 24px; border-top: 1px solid var(--border-admin); padding-top: 16px; flex-wrap: wrap;">
      <button class="btn-primary" onclick="updateCateringStatus('${inquiry.id}', 'contacted')" style="flex: 1; min-width: 130px;">Mark Contacted</button>
      <button class="btn-outline" onclick="updateCateringStatus('${inquiry.id}', 'resolved')" style="flex: 1; min-width: 130px;">Mark Resolved</button>
    </div>
    <button type="button" class="btn-outline" onclick="closeCateringModal()" style="width: 100%; margin-top: 16px; padding: 12px; font-weight: 600; font-size: 14px; border-radius: 4px; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;">
      Close Inquiry
    </button>
  `;
  modal.classList.add('open');
};

window.closeCateringModal = () => {
  const modal = document.getElementById('catering-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = '';
  }
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

export function showToast(message, isError = false) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'toast-error' : ''}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
window.showToast = showToast;

