import { showToast } from './orders.js';
import { state } from './shared.js';
import { db } from '../firebase.js';
import { collection, onSnapshot, doc, updateDoc, addDoc, setDoc, deleteDoc, serverTimestamp, Timestamp, limit } from 'firebase/firestore';



window.populateDealSelects = () => {
  const condItemsDiv = document.getElementById('deal-cond-items');
  const condCatsDiv = document.getElementById('deal-cond-categories');
  const rewardItemsDiv = document.getElementById('deal-reward-items');
  
  if (!condItemsDiv || !condCatsDiv || !rewardItemsDiv) return;
  if (!window.adminMenuData) return;

  const items = Object.entries(window.adminMenuData).map(([id, data]) => ({ id, name: data.name, category: data.category }));
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];

  // Condition Items Checklist
  condItemsDiv.innerHTML = items.map(item => `
    <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; color: var(--gray); user-select: none;">
      <input type="checkbox" name="cond-item-checkbox" value="${item.id}" style="accent-color: var(--accent);">
      <span>${item.name}</span>
    </label>
  `).join('');

  // Reward Items Checklist
  rewardItemsDiv.innerHTML = items.map(item => `
    <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; color: var(--gray); user-select: none;">
      <input type="checkbox" name="reward-item-checkbox" value="${item.id}" style="accent-color: var(--accent);">
      <span>${item.name}</span>
    </label>
  `).join('');

  // Condition Categories Checklist
  condCatsDiv.innerHTML = categories.map(cat => `
    <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; color: var(--gray); user-select: none;">
      <input type="checkbox" name="cond-cat-checkbox" value="${cat}" style="accent-color: var(--accent);">
      <span>${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
    </label>
  `).join('');
};

export function formatDateForDatetimeLocal(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const pad = (num) => String(num).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

window.initDealsListener = () => {
  const container = document.getElementById('admin-deals-list');
  const filterSelect = document.getElementById('deal-filter');
  
  const unsub = onSnapshot(collection(db, 'deals'), (snapshot) => {
    state.deals = [];
    snapshot.forEach(d => {
      state.deals.push({ id: d.id, ...d.data() });
    });
    
    // Sort by priority desc, then title asc
    state.deals.sort((a, b) => {
      const pDiff = (b.priority || 0) - (a.priority || 0);
      if (pDiff !== 0) return pDiff;
      return (a.title || '').localeCompare(b.title || '');
    });
    
    renderDealsList();
  });

  if (filterSelect) {
    filterSelect.addEventListener('change', () => {
      renderDealsList();
    });
  }

  return unsub;
};

export function renderDealsList() {
  const container = document.getElementById('admin-deals-list');
  const filter = document.getElementById('deal-filter')?.value || 'all';
  if (!container) return;

  // Calculate deals performance stats from orders
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  let activeDealsCount = 0;
  state.deals.forEach(deal => {
    const start = deal.startDate ? deal.startDate.toDate() : null;
    const end = deal.endDate ? deal.endDate.toDate() : null;
    if (deal.active && !(start && now < start) && !(end && now > end)) activeDealsCount++;
  });
  
  let discountedOrders = 0;
  let totalDiscountsGiven = 0;
  let discountedRevenue = 0;
  
  if (state.orders) {
    state.orders.forEach(o => {
      if (o.status !== 'completed') return;
      if (!o.date || o.date < thirtyDaysAgo) return;
      if (o.discount && o.discount > 0) {
        discountedOrders++;
        totalDiscountsGiven += o.discount;
        discountedRevenue += o.total;
      }
    });
  }
  
  const el1 = document.getElementById('deals-active-count');
  const el2 = document.getElementById('deals-discounted-orders');
  const el3 = document.getElementById('deals-total-discounts');
  const el4 = document.getElementById('deals-discounted-revenue');
  if (el1) el1.textContent = activeDealsCount;
  if (el2) el2.textContent = discountedOrders;
  if (el3) el3.textContent = '$' + totalDiscountsGiven.toFixed(2);
  if (el4) el4.textContent = '$' + discountedRevenue.toFixed(2);

  const filteredDeals = state.deals.filter(deal => {
    if (filter === 'all') return true;
    
    // Check timing/active status
    const now = new Date();
    const start = deal.startDate ? deal.startDate.toDate() : null;
    const end = deal.endDate ? deal.endDate.toDate() : null;
    const isScheduled = start && now < start;
    const isExpired = end && now > end;
    const isCurrentlyActive = deal.active && !isScheduled && !isExpired;

    if (filter === 'active') return isCurrentlyActive;
    if (filter === 'inactive') return !isCurrentlyActive;
    return true;
  });

  if (filteredDeals.length === 0) {
    container.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 40px 0;">No promotions found.</p>';
    return;
  }

  container.innerHTML = filteredDeals.map(deal => {
    const now = new Date();
    const start = deal.startDate ? deal.startDate.toDate() : null;
    const end = deal.endDate ? deal.endDate.toDate() : null;
    const isScheduled = start && now < start;
    const isExpired = end && now > end;
    
    let statusBadge = '';
    if (!deal.active) {
      statusBadge = '<span class="status-badge" style="background: rgba(244,67,54,0.15); color: #f44336; border: 1px solid rgba(244,67,54,0.3);">Inactive</span>';
    } else if (isScheduled) {
      statusBadge = '<span class="status-badge" style="background: rgba(255,193,7,0.15); color: #ffc107; border: 1px solid rgba(255,193,7,0.3);">Scheduled</span>';
    } else if (isExpired) {
      statusBadge = '<span class="status-badge" style="background: rgba(158,158,158,0.15); color: #9e9e9e; border: 1px solid rgba(158,158,158,0.3);">Expired</span>';
    } else {
      statusBadge = '<span class="status-badge" style="background: rgba(76,175,80,0.15); color: #4caf50; border: 1px solid rgba(76,175,80,0.3);">Active</span>';
    }

    const typeLabels = {
      percent_off: 'Percent Off',
      fixed_off: 'Fixed Off',
      bogo: 'BOGO (Buy X Get Y)',
      free_item: 'Free Item',
      bundle_price: 'Bundle Price',
      combo: 'Combo Deal'
    };

    // Format conditions
    let condHtml = '';
    if (deal.conditions?.appliesToWholeOrder) {
      condHtml += '<li>Applies to entire order</li>';
      if (deal.conditions?.minQty > 0) {
        condHtml += `<li>Min order amount: $${deal.conditions.minQty.toFixed(2)}</li>`;
      }
    } else {
      if (deal.conditions?.minQty > 0) {
        condHtml += `<li>Min items required: ${deal.conditions.minQty}</li>`;
      }
      if (deal.conditions?.itemIds?.length > 0) {
        const names = deal.conditions.itemIds.map(id => window.adminMenuData?.[id]?.name || id);
        condHtml += `<li>Req. items: ${names.join(', ')}</li>`;
      }
      if (deal.conditions?.categoryIds?.length > 0) {
        condHtml += `<li>Req. categories: ${deal.conditions.categoryIds.join(', ')}</li>`;
      }
    }

    // Format rewards
    let rewardHtml = '';
    if (deal.reward?.discountType === 'percent') {
      rewardHtml = `${deal.reward.value}% off`;
    } else if (deal.reward?.discountType === 'fixed') {
      rewardHtml = `$${deal.reward.value.toFixed(2)} off`;
    } else if (deal.reward?.discountType === 'freeItem') {
      const names = deal.reward.rewardItemIds?.map(id => window.adminMenuData?.[id]?.name || id) || [];
      rewardHtml = `Free ${deal.reward.rewardQty}x ${names.join(', ') || 'item'}`;
    } else if (deal.reward?.discountType === 'fixedBundlePrice') {
      rewardHtml = `Bundle package price: $${deal.reward.value.toFixed(2)}`;
    }

    return `
      <div style="background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 16px; display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: start; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <strong style="font-size: 16px; color: var(--white);">${deal.title}</strong>
              ${statusBadge}
            </div>
            <span style="font-size: 12px; color: var(--gray); text-transform: uppercase; font-family: 'Barlow Condensed'; font-weight: 600; letter-spacing: 0.5px;">
              ${typeLabels[deal.type] || deal.type}
              ${deal.badge ? ` • Badge: "${deal.badge}"` : ''}
            </span>
          </div>
          <span style="font-size: 12px; background: var(--surface); color: var(--gray); border: 1px solid var(--border); padding: 2px 6px; border-radius: 4px; font-weight: 600;">
            Priority: ${deal.priority || 0}
          </span>
        </div>

        <p style="color: var(--white); font-size: 13px; line-height: 1.4; margin: 0;">${deal.description}</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: var(--surface); border: 1px solid var(--border); padding: 10px; border-radius: 4px; font-size: 12px;">
          <div>
            <span style="color: var(--accent); font-weight: bold; display: block; margin-bottom: 4px; text-transform: uppercase; font-family: 'Barlow Condensed';">Conditions</span>
            <ul style="margin: 0; padding-left: 16px; color: var(--gray); display: flex; flex-direction: column; gap: 2px;">
              ${condHtml || '<li>No specific conditions</li>'}
            </ul>
          </div>
          <div>
            <span style="color: var(--accent); font-weight: bold; display: block; margin-bottom: 4px; text-transform: uppercase; font-family: 'Barlow Condensed';">Reward</span>
            <span style="color: var(--white); font-weight: 600; font-size: 13px;">${rewardHtml}</span>
            <div style="color: var(--gray); font-size: 11px; margin-top: 4px;">
              Stackable: ${deal.stackable ? 'Yes' : 'No'}
              ${deal.usageLimitPerOrder ? ` • Limit: ${deal.usageLimitPerOrder} per order` : ''}
            </div>
          </div>
        </div>

        <div style="font-size: 11px; color: var(--gray);">
          ${start || end ? `⏰ Scheduled: ${start ? start.toLocaleString() : 'Anytime'} to ${end ? end.toLocaleString() : 'Forever'}` : '⏰ Always active'}
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border); padding-top: 10px; margin-top: 4px;">
          <button class="btn-outline btn-small" onclick="toggleDealActive('${deal.id}', ${deal.active})" style="padding: 6px 12px; font-size: 11px;">
            ${deal.active ? 'Disable' : 'Enable'}
          </button>
          <button class="btn-outline btn-small" onclick="editDeal('${deal.id}')" style="padding: 6px 12px; font-size: 11px;">Edit</button>
          <button class="btn-outline btn-small" onclick="deleteDeal('${deal.id}')" style="padding: 6px 12px; font-size: 11px; border-color: rgba(255,69,0,0.4); color: var(--accent);">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

window.toggleDealActive = async (id, currentActive) => {
  try {
    await updateDoc(doc(db, 'deals', id), { active: !currentActive });
    showToast('Promotion status updated.');
  } catch (error) {
    console.error("Error toggling deal status", error);
    showToast('Failed to update promotion status.', true);
  }
};

window.deleteDeal = async (id) => {
  if (!confirm('Are you sure you want to delete this promotion? This action cannot be undone.')) return;
  try {
    await deleteDoc(doc(db, 'deals', id));
    showToast('Promotion deleted successfully.');
  } catch (error) {
    console.error("Error deleting deal", error);
    showToast('Failed to delete promotion.', true);
  }
};

window.editDeal = (id) => {
  const deal = state.deals.find(d => d.id === id);
  if (!deal) return;
  
  // Set basic form values
  document.getElementById('deal-id').value = deal.id;
  document.getElementById('deal-title').value = deal.title || '';
    document.getElementById('deal-promo-code').value = deal.promoCode || '';
  document.getElementById('deal-badge').value = deal.badge || '';
  document.getElementById('deal-desc').value = deal.description || '';
  document.getElementById('deal-type').value = deal.type || 'percent_off';
  document.getElementById('deal-priority').value = deal.priority || 0;
  document.getElementById('deal-limit').value = deal.usageLimitPerOrder || '';
  
  document.getElementById('deal-active').checked = !!deal.active;
  document.getElementById('deal-showonsite').checked = !!deal.showOnSite;
  document.getElementById('deal-stackable').checked = !!deal.stackable;

  document.getElementById('deal-start').value = formatDateForDatetimeLocal(deal.startDate);
  document.getElementById('deal-end').value = formatDateForDatetimeLocal(deal.endDate);

  // Set Conditions
  document.getElementById('deal-cond-order').checked = !!deal.conditions?.appliesToWholeOrder;
  document.getElementById('deal-cond-qty').value = deal.conditions?.minQty || 0;

  // Set checkbox lists
  const condItemCheckboxes = document.querySelectorAll('input[name="cond-item-checkbox"]');
  const condCatCheckboxes = document.querySelectorAll('input[name="cond-cat-checkbox"]');
  const rewardItemCheckboxes = document.querySelectorAll('input[name="reward-item-checkbox"]');

  const condItemIds = deal.conditions?.itemIds || [];
  condItemCheckboxes.forEach(cb => {
    cb.checked = condItemIds.includes(cb.value);
  });

  const condCategoryIds = deal.conditions?.categoryIds || [];
  condCatCheckboxes.forEach(cb => {
    cb.checked = condCategoryIds.includes(cb.value);
  });

  // Set Rewards
  document.getElementById('deal-reward-type').value = deal.reward?.discountType || 'percent';
  document.getElementById('deal-reward-val').value = deal.reward?.value || 0;
  document.getElementById('deal-reward-qty').value = deal.reward?.rewardQty || 1;

  const rewardItemIds = deal.reward?.rewardItemIds || [];
  rewardItemCheckboxes.forEach(cb => {
    cb.checked = rewardItemIds.includes(cb.value);
  });

  // Toggle buttons
  document.getElementById('deal-form-title').textContent = `Edit Deal: ${deal.title}`;
  document.getElementById('deal-save-btn').textContent = 'Update Promotion';
  document.getElementById('deal-cancel-btn').style.display = 'block';

  // Scroll to form
  document.getElementById('deals-view').scrollIntoView({ behavior: 'smooth' });
};

// Form Reset / Cancel Edit
export const dealForm = document.getElementById('deal-form');
export const dealCancelBtn = document.getElementById('deal-cancel-btn');

export const resetDealForm = () => {
  if (dealForm) dealForm.reset();
  document.getElementById('deal-id').value = '';
  document.getElementById('deal-form-title').textContent = 'Create New Deal';
  document.getElementById('deal-save-btn').textContent = 'Save Promotion';
  if (dealCancelBtn) dealCancelBtn.style.display = 'none';

  // Clear checkboxes
  document.querySelectorAll('input[name="cond-item-checkbox"]').forEach(cb => cb.checked = false);
  document.querySelectorAll('input[name="cond-cat-checkbox"]').forEach(cb => cb.checked = false);
  document.querySelectorAll('input[name="reward-item-checkbox"]').forEach(cb => cb.checked = false);
};

if (dealCancelBtn) {
  dealCancelBtn.addEventListener('click', resetDealForm);
}

// Deal Form Submit
if (dealForm) {
  dealForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dealId = document.getElementById('deal-id').value;
    const saveBtn = document.getElementById('deal-save-btn');
    
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    // Parse input fields
    const title = document.getElementById('deal-title').value;
    const badge = document.getElementById('deal-badge').value;
    const description = document.getElementById('deal-desc').value;
    const type = document.getElementById('deal-type').value;
    const priority = parseInt(document.getElementById('deal-priority').value) || 0;
    const limitVal = document.getElementById('deal-limit').value;
    const usageLimitPerOrder = limitVal ? parseInt(limitVal) : null;
    
    const active = document.getElementById('deal-active').checked;
    const showOnSite = document.getElementById('deal-showonsite').checked;
    const stackable = document.getElementById('deal-stackable').checked;

    const startVal = document.getElementById('deal-start').value;
    const startDate = startVal ? Timestamp.fromDate(new Date(startVal)) : null;
    
    const endVal = document.getElementById('deal-end').value;
    const endDate = endVal ? Timestamp.fromDate(new Date(endVal)) : null;

    // Parse conditions
    const appliesToWholeOrder = document.getElementById('deal-cond-order').checked;
    const minQty = parseFloat(document.getElementById('deal-cond-qty').value) || 0;
    
    const condItemIds = [];
    document.querySelectorAll('input[name="cond-item-checkbox"]:checked').forEach(cb => {
      condItemIds.push(cb.value);
    });

    const condCategoryIds = [];
    document.querySelectorAll('input[name="cond-cat-checkbox"]:checked').forEach(cb => {
      condCategoryIds.push(cb.value);
    });

    // Parse rewards
    const discountType = document.getElementById('deal-reward-type').value;
    const value = parseFloat(document.getElementById('deal-reward-val').value) || 0;
    const rewardQty = parseInt(document.getElementById('deal-reward-qty').value) || 1;

    const rewardItemIds = [];
    document.querySelectorAll('input[name="reward-item-checkbox"]:checked').forEach(cb => {
      rewardItemIds.push(cb.value);
    });

    const dealDoc = {
      title: title.trim(),
      badge: badge.trim(),
      description: description.trim(),
      type,
      active,
      showOnSite,
      startDate,
      endDate,
      priority,
      stackable,
      usageLimitPerOrder,
      conditions: {
        appliesToWholeOrder,
        minQty,
        itemIds: condItemIds,
        categoryIds: condCategoryIds
      },
      reward: {
        discountType,
        value,
        rewardQty,
        rewardItemIds
      },
      updatedAt: serverTimestamp()
    };

    try {
      if (dealId) {
        await setDoc(doc(db, 'deals', dealId), dealDoc, { merge: true });
        showToast('Promotion updated successfully!');
      } else {
        await addDoc(collection(db, 'deals'), dealDoc);
        showToast('Promotion created successfully!');
      }
      resetDealForm();
    } catch (err) {
      console.error('Error saving deal:', err);
      showToast('Failed to save promotion.', true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = dealId ? 'Update Promotion' : 'Save Promotion';
    }
  });
}

