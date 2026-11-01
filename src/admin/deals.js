import { showToast } from './orders.js';
import { state } from './shared.js';
import { db } from '../firebase.js';
import { collection, onSnapshot, doc, updateDoc, addDoc, setDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';



window.populateDealSelects = () => {
  const condItemsDiv = document.getElementById('deal-cond-items');
  const condCatsDiv = document.getElementById('deal-cond-categories');
  const rewardItemsDiv = document.getElementById('deal-reward-items');
  
  if (!condItemsDiv || !condCatsDiv || !rewardItemsDiv) return;
  if (!window.adminMenuData) return;

  const items = Object.entries(window.adminMenuData).map(([id, data]) => ({
    id,
    name: data.name,
    category: data.category,
    price: data.price || 0,
    img: data.img || ''
  }));
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];

  // Condition Items Checklist (Cards with thumbnail and tag)
  condItemsDiv.innerHTML = items.map(item => `
    <label class="deal-dish-chip" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 12px; cursor: pointer; padding: 6px 10px; border-radius: 4px; background: var(--surface-admin); border: 1px solid var(--border-admin); color: var(--text-main); user-select: none; transition: border-color 0.15s;">
      <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
        <span style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</span>
        <span style="font-size: 10px; color: var(--text-muted); background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 3px;">${Number(item.price).toFixed(2)}</span>
      </div>
      <input type="checkbox" name="cond-item-checkbox" value="${item.id}" style="accent-color: var(--accent); width: 16px; height: 16px; cursor: pointer; flex-shrink: 0;">
    </label>
  `).join('');

  // Reward Items Checklist
  rewardItemsDiv.innerHTML = items.map(item => `
    <label style="display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 12px; cursor: pointer; padding: 6px 10px; border-radius: 4px; background: var(--surface-admin); border: 1px solid var(--border-admin); color: var(--text-main); user-select: none;">
      <span style="font-weight: 600;">${item.name}</span>
      <input type="checkbox" name="reward-item-checkbox" value="${item.id}" style="accent-color: var(--accent); width: 16px; height: 16px; cursor: pointer;">
    </label>
  `).join('');

  // Condition Categories Checklist
  condCatsDiv.innerHTML = categories.map(cat => `
    <label style="display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; cursor: pointer; padding: 6px 10px; border-radius: 4px; background: var(--surface-admin); border: 1px solid var(--border-admin); color: var(--text-main); user-select: none;">
      <span>${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
      <input type="checkbox" name="cond-cat-checkbox" value="${cat}" style="accent-color: var(--accent); width: 16px; height: 16px; cursor: pointer;">
    </label>
  `).join('');
};

// 1-Click Deal Presets
window.applyDealPreset = (presetKey) => {
  const form = document.getElementById('deal-form');
  if (form) {
    form.classList.add('open');
    form.style.display = 'flex';
  }
  const chevron = document.getElementById('deal-form-chevron');
  if (chevron) chevron.textContent = '▲';

  // Clear previous
  document.querySelectorAll('input[name="cond-item-checkbox"]').forEach(cb => cb.checked = false);
  document.querySelectorAll('input[name="cond-cat-checkbox"]').forEach(cb => cb.checked = false);
  document.querySelectorAll('input[name="reward-item-checkbox"]').forEach(cb => cb.checked = false);

  const titleEl = document.getElementById('deal-title');
  const badgeEl = document.getElementById('deal-badge');
  const descEl = document.getElementById('deal-desc');
  const typeEl = document.getElementById('deal-type');
  const activeEl = document.getElementById('deal-active');
  const showEl = document.getElementById('deal-showonsite');
  const condOrderEl = document.getElementById('deal-cond-order');
  const condQtyEl = document.getElementById('deal-cond-qty');
  const rewardTypeEl = document.getElementById('deal-reward-type');
  const rewardValEl = document.getElementById('deal-reward-val');
  const rewardQtyEl = document.getElementById('deal-reward-qty');
  const promoEl = document.getElementById('deal-promo-code');

  if (activeEl) activeEl.checked = true;
  if (showEl) showEl.checked = true;
  if (condOrderEl) condOrderEl.checked = false;
  if (promoEl) promoEl.value = '';

  if (presetKey === 'gyro_deal') {
    if (titleEl) titleEl.value = 'Gyro Lovers Deal';
    if (badgeEl) badgeEl.value = 'Website Only, Limited';
    if (descEl) descEl.value = 'Buy Any 2 Chicken Gyro or Beef Gyro Plates and Get a Free Drink!';
    if (typeEl) typeEl.value = 'bogo';
    if (condQtyEl) condQtyEl.value = '2';
    if (rewardTypeEl) rewardTypeEl.value = 'freeItem';
    if (rewardValEl) rewardValEl.value = '2.45';
    if (rewardQtyEl) rewardQtyEl.value = '1';

    // Auto-select gyro bowls
    window.selectDealDishFilter('gyro');
    window.selectRewardItemByName('Soft Drinks');
    showToast('Applied "Gyro Lovers Deal" preset');
  } else if (presetKey === 'free_drink') {
    if (titleEl) titleEl.value = 'Platters & Drink Combo Deal';
    if (badgeEl) badgeEl.value = 'SPECIAL COMBO';
    if (descEl) descEl.value = 'Buy Any 2 Plates or Platters and Get a Free Chilled Soft Drink!';
    if (typeEl) typeEl.value = 'bogo';
    if (condQtyEl) condQtyEl.value = '2';
    if (rewardTypeEl) rewardTypeEl.value = 'freeItem';
    if (rewardValEl) rewardValEl.value = '2.45';
    if (rewardQtyEl) rewardQtyEl.value = '1';

    window.selectDealDishFilter('platters');
    window.selectRewardItemByName('Soft Drinks');
    showToast('Applied "Buy 2 Get Free Drink" preset');
  } else if (presetKey === 'percent_order') {
    if (titleEl) titleEl.value = '15% Off Your Entire Order';
    if (badgeEl) badgeEl.value = '15% OFF SPECIAL';
    if (descEl) descEl.value = 'Save 15% on your entire authentic Afghan meal when you spend $30 or more!';
    if (typeEl) typeEl.value = 'percent_off';
    if (condOrderEl) condOrderEl.checked = true;
    if (condQtyEl) condQtyEl.value = '30';
    if (rewardTypeEl) rewardTypeEl.value = 'percent';
    if (rewardValEl) rewardValEl.value = '15';
    if (rewardQtyEl) rewardQtyEl.value = '1';
    showToast('Applied "15% Off Order" preset');
  } else if (presetKey === 'fixed_spend') {
    if (titleEl) titleEl.value = '$5 Off Orders Over $35';
    if (badgeEl) badgeEl.value = '$5 OFF DEAL';
    if (descEl) descEl.value = 'Enjoy $5 off when your order total reaches $35 or more!';
    if (typeEl) typeEl.value = 'fixed_off';
    if (condOrderEl) condOrderEl.checked = true;
    if (condQtyEl) condQtyEl.value = '35';
    if (rewardTypeEl) rewardTypeEl.value = 'fixed';
    if (rewardValEl) rewardValEl.value = '5';
    if (rewardQtyEl) rewardQtyEl.value = '1';
    showToast('Applied "$5 Off Over $35" preset');
  } else if (presetKey === 'bogo_half') {
    if (titleEl) titleEl.value = 'Buy 1 Plate, Get 2nd 50% Off';
    if (badgeEl) badgeEl.value = 'BOGO 50% OFF';
    if (descEl) descEl.value = 'Order any 2 plates and receive 50% discount on the second plate!';
    if (typeEl) typeEl.value = 'bogo';
    if (condQtyEl) condQtyEl.value = '2';
    if (rewardTypeEl) rewardTypeEl.value = 'percent';
    if (rewardValEl) rewardValEl.value = '50';
    if (rewardQtyEl) rewardQtyEl.value = '1';
    window.selectDealDishFilter('platters');
    showToast('Applied "BOGO 50% Off" preset');
  }

  (document.getElementById('deal-form') || document.getElementById('marketing-view'))?.scrollIntoView({ behavior: 'smooth' });
};

window.selectDealDishFilter = (filterType) => {
  if (!window.adminMenuData) return;
  const checkboxes = document.querySelectorAll('input[name="cond-item-checkbox"]');
  checkboxes.forEach(cb => {
    const item = window.adminMenuData[cb.value];
    if (!item) return;
    const name = (item.name || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();

    if (filterType === 'gyro') {
      cb.checked = name.includes('gyro');
    } else if (filterType === 'platters') {
      cb.checked = cat.includes('platter') || cat.includes('plate') || name.includes('plate') || name.includes('kabob');
    } else if (filterType === 'clear') {
      cb.checked = false;
    } else if (filterType === 'all') {
      cb.checked = true;
    }
  });
};

window.selectRewardItemByName = (searchName) => {
  if (!window.adminMenuData) return;
  const rewardCheckboxes = document.querySelectorAll('input[name="reward-item-checkbox"]');
  rewardCheckboxes.forEach(cb => {
    const item = window.adminMenuData[cb.value];
    if (item && item.name.toLowerCase().includes(searchName.toLowerCase())) {
      cb.checked = true;
    } else {
      cb.checked = false;
    }
  });
};

window.filterDishList = (query) => {
  const q = (query || '').toLowerCase().trim();
  const chips = document.querySelectorAll('.deal-dish-chip');
  chips.forEach(chip => {
    const text = chip.textContent.toLowerCase();
    chip.style.display = (!q || text.includes(q)) ? 'flex' : 'none';
  });
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
  }, (err) => {
    console.warn('deals listener notice:', err);
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
      statusBadge = '<span class="deal-status-badge inactive">Inactive</span>';
    } else if (isScheduled) {
      statusBadge = '<span class="deal-status-badge scheduled">Scheduled</span>';
    } else if (isExpired) {
      statusBadge = '<span class="deal-status-badge expired">Expired</span>';
    } else {
      statusBadge = '<span class="deal-status-badge active">Active</span>';
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
      <div class="deal-admin-card">
        <div class="deal-card-header">
          <div class="deal-card-title-row">
            <h3 class="deal-card-title">${deal.title}</h3>
            <span class="deal-priority-pill">Priority: ${deal.priority || 0}</span>
          </div>
          <div class="deal-card-meta-row">
            ${statusBadge}
            <span class="deal-type-badge">
              ${typeLabels[deal.type] || deal.type}
              ${deal.badge ? ` • Badge: "${deal.badge}"` : ''}
            </span>
          </div>
        </div>

        <p class="deal-card-desc">${deal.description}</p>
        
        <div class="deal-card-specs-grid">
          <div class="deal-spec-block">
            <span class="deal-spec-heading">Conditions</span>
            <ul class="deal-spec-list">
              ${condHtml || '<li>No specific conditions</li>'}
            </ul>
          </div>
          <div class="deal-spec-block">
            <span class="deal-spec-heading">Reward</span>
            <span class="deal-reward-val">${rewardHtml}</span>
            <div class="deal-reward-extra">
              Stackable: ${deal.stackable ? 'Yes' : 'No'}
              ${deal.usageLimitPerOrder ? ` • Limit: ${deal.usageLimitPerOrder} per order` : ''}
            </div>
          </div>
        </div>

        <div class="deal-card-time">
          ${start || end ? `Scheduled: ${start ? start.toLocaleString() : 'Anytime'} to ${end ? end.toLocaleString() : 'Forever'}` : 'Always active'}
        </div>

        <div class="deal-card-actions">
          <button type="button" class="btn-outline btn-small deal-btn-action" onclick="toggleDealActive('${deal.id}', ${deal.active})">
            ${deal.active ? 'Disable' : 'Enable'}
          </button>
          <button type="button" class="btn-outline btn-small deal-btn-action" onclick="editDeal('${deal.id}')">Edit</button>
          <button type="button" class="btn-outline btn-small deal-btn-action deal-btn-delete" onclick="deleteDeal('${deal.id}')">Delete</button>
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
  const promoEl = document.getElementById('deal-promo-code');
  if (promoEl) promoEl.value = deal.promoCode || '';
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
  const formTitle = document.getElementById('deal-form-title-text');
  if (formTitle) formTitle.textContent = `Edit Deal: ${deal.title}`;
  const chevron = document.getElementById('deal-form-chevron');
  if (chevron) chevron.textContent = '▲';
  if (dealForm) {
    dealForm.classList.add('open');
    dealForm.style.display = 'flex';
  }
  document.getElementById('deal-save-btn').textContent = 'Update Promotion';
  document.getElementById('deal-cancel-btn').style.display = 'block';

  // Scroll to form
  (document.getElementById('deal-form') || document.getElementById('marketing-view'))?.scrollIntoView({ behavior: 'smooth' });
};

// Form Reset / Cancel Edit
export const dealForm = document.getElementById('deal-form');
export const dealCancelBtn = document.getElementById('deal-cancel-btn');

export const resetDealForm = () => {
  if (dealForm) dealForm.reset();
  document.getElementById('deal-id').value = '';
  const promoEl = document.getElementById('deal-promo-code');
  if (promoEl) promoEl.value = '';
  const formTitle = document.getElementById('deal-form-title-text');
  if (formTitle) formTitle.textContent = 'Create New Deal';
  document.getElementById('deal-save-btn').textContent = 'Save Promotion';
  if (dealCancelBtn) dealCancelBtn.style.display = 'none';

  // Clear checkboxes
  document.querySelectorAll('input[name="cond-item-checkbox"]').forEach(cb => cb.checked = false);
  document.querySelectorAll('input[name="cond-cat-checkbox"]').forEach(cb => cb.checked = false);
  document.querySelectorAll('input[name="reward-item-checkbox"]').forEach(cb => cb.checked = false);
};


const toggleDealBtn = document.getElementById('toggle-deal-form-btn');
const dealFormChevron = document.getElementById('deal-form-chevron');

if (toggleDealBtn && dealForm) {
  toggleDealBtn.addEventListener('click', () => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      dealForm.classList.toggle('open');
      if (dealFormChevron) dealFormChevron.textContent = dealForm.classList.contains('open') ? '▲' : '▼';
    } else {
      const isHidden = dealForm.style.display === 'none';
      dealForm.style.display = isHidden ? 'flex' : 'none';
      if (dealFormChevron) dealFormChevron.textContent = isHidden ? '▲' : '▼';
    }
  });
}

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
    const promoCode = document.getElementById('deal-promo-code')?.value.trim().toUpperCase() || null;
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

    // If specific item IDs are chosen, category IDs must be empty to avoid unintentional overrides!
    const condCategoryIds = [];
    if (condItemIds.length === 0) {
      document.querySelectorAll('input[name="cond-cat-checkbox"]:checked').forEach(cb => {
        condCategoryIds.push(cb.value);
      });
    }

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
      promoCode: promoCode || null,
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

