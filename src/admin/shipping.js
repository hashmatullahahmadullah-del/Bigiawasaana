import { db, app } from '../firebase.js';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { escapeHtml } from './shared.js';

let retailOrders = [];
export let shippingUnsub = null;
let initialized = false;

export function fetchRetailOrders() {
  if (initialized) return;
  initialized = true;

  const q = query(collection(db, 'retail_orders'), orderBy('createdAt', 'desc'));
  
  shippingUnsub = onSnapshot(q, (snapshot) => {
    retailOrders = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    renderShippingOrders();
  }, (err) => {
    console.error("Error fetching retail orders:", err);
  });
}

export function renderShippingOrders() {
  const tbody = document.getElementById('shipping-orders-tbody');
  if (!tbody) return;

  if (retailOrders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="padding: 16px; text-align: center; color: var(--gray);">No retail orders yet.</td></tr>';
    return;
  }

  tbody.innerHTML = retailOrders.map(order => {
    const dateStr = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : 'N/A';
    
    // Format items
    const itemsHtml = (order.items || []).map(i => `${(i.qty || i.quantity || 1)}x ${escapeHtml(i.name)}`).join('<br>');
    
    // Format address
    const a = order.shippingAddress || {};
    const addressHtml = a.address ? `${escapeHtml(a.address)}<br>${escapeHtml(a.city || '')}, ${escapeHtml(a.state || '')} ${escapeHtml(a.zip || '')}` : '<span style="color:var(--gray);">No address</span>';
    
    // Total
    const totalDisplay = order.totalCents ? `$${(order.totalCents / 100).toFixed(2)}` : '$0.00';
    
    // Status Badge
    let statusColor = 'var(--gray)';
    if (order.status === 'paid') statusColor = '#4CAF50';
    if (order.status === 'shipped') statusColor = '#2196F3';
    
    const statusHtml = `<span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase;">${escapeHtml(order.status || 'unknown')}</span>`;
    
    // Action Button
    let actionHtml = '';
    if (order.status === 'paid') {
      actionHtml = `<button class="btn-primary" style="font-size: 12px; padding: 6px 12px;" onclick="purchaseShippingLabel('${order.id}')">Buy Label</button>`;
    } else if (order.status === 'shipped') {
      actionHtml = `
        <a href="${order.labelUrl || '#'}" target="_blank" class="btn-outline" style="font-size: 12px; padding: 6px 12px; display: inline-block; margin-bottom: 4px;">Print Label</a><br>
        <div style="font-size: 11px; color: var(--gray); font-family: monospace;">${escapeHtml(order.trackingNumber || '')}</div>
      `;
    }

    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 12px; font-size: 13px;">${dateStr}</td>
        <td style="padding: 12px; font-size: 12px; font-family: monospace;">${order.id.substring(0,8).toUpperCase()}</td>
        <td style="padding: 12px;">
          <div style="font-weight: bold;">${escapeHtml(order.customerName || 'Unknown')}</div>
          <div style="font-size: 12px; color: var(--gray);">${escapeHtml(order.customerEmail || '')}</div>
          <div style="font-size: 11px; color: var(--gray); margin-top: 4px; line-height: 1.3;">${addressHtml}</div>
        </td>
        <td style="padding: 12px; font-size: 13px;">${itemsHtml}</td>
        <td style="padding: 12px; font-size: 14px; font-weight: bold;">${totalDisplay}</td>
        <td style="padding: 12px;">${statusHtml}</td>
        <td style="padding: 12px;">${actionHtml}</td>
      </tr>
    `;
  }).join('');
}

export async function purchaseShippingLabel(orderId) {
  if (!confirm('Purchase shipping label for this order?')) return;
  
  try {
    const functions = getFunctions(app);
    const buyLabel = httpsCallable(functions, 'purchaseShippingLabel');
    
    await buyLabel({ orderId });
    alert('Label purchased successfully! Order is marked as shipped.');
  } catch (err) {
    console.error(err);
    alert('Failed to purchase label: ' + err.message);
  }
}

// Automatically fetch orders when the tab is shown
document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.crm-nav-item');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const target = e.currentTarget.getAttribute('data-target');
      if (target === 'shipping-manage-view') {
        fetchRetailOrders();
      }
    });
  });
});
