import { getRewardItemIcon, iconUtensils } from '../icons.js';
import { showToast } from './orders.js';
import { state } from './shared.js';
import { db } from '../firebase.js';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  limit
} from 'firebase/firestore';

// In-memory rewards state
let adminRewards = [];
let adminRedemptions = [];
let rewardsUnsub = null;
let redemptionsUnsub = null;

/**
 * Initialize real-time listeners for Rewards and Redemptions
 */
export function initRewardsListener() {
  if (rewardsUnsub) rewardsUnsub();
  if (redemptionsUnsub) redemptionsUnsub();

  // 1. Listen to Rewards Collection
  const rewardsQuery = query(collection(db, 'rewards'), orderBy('sortOrder', 'asc'));
  rewardsUnsub = onSnapshot(rewardsQuery, (snapshot) => {
    adminRewards = [];
    snapshot.forEach((d) => {
      adminRewards.push({ id: d.id, ...d.data() });
    });

    // Fallback sort if sortOrder is missing on some docs
    adminRewards.sort((a, b) => {
      const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : 999;
      const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.pointsCost || 0) - (b.pointsCost || 0);
    });

    renderRewardsCatalog();
    updateRewardsStats();
  }, (err) => {
    console.error('Error listening to rewards:', err);
  });

  // 2. Listen to Redemptions Collection
  try {
    const redemptionsQuery = query(collection(db, 'redemptions'), orderBy('redeemedAt', 'desc'), limit(50));
    redemptionsUnsub = onSnapshot(redemptionsQuery, (snapshot) => {
      adminRedemptions = [];
      snapshot.forEach((d) => {
        adminRedemptions.push({ id: d.id, ...d.data() });
      });
      renderRedemptionsList();
      updateRewardsStats();
    }, (err) => {
      console.warn('Redemptions collection listener error (or empty):', err);
    });
  } catch (e) {
    console.warn('Could not initialize redemptions listener:', e);
  }

  // Bind form submission & type switch handlers
  bindRewardFormEvents();
}

/**
 * Update top stats cards
 */
function updateRewardsStats() {
  const activeCountEl = document.getElementById('rewards-active-count');
  const totalCountEl = document.getElementById('rewards-total-count');
  const minPointsEl = document.getElementById('rewards-min-points');
  const redemptionsCountEl = document.getElementById('rewards-redemptions-count');
  const countBadgeEl = document.getElementById('loyalty-rewards-count-badge');

  const activeRewards = adminRewards.filter((r) => r.active !== false);
  const totalCount = adminRewards.length;
  const lowestPts = activeRewards.length > 0
    ? Math.min(...activeRewards.map((r) => parseInt(r.pointsCost, 10) || 50))
    : 50;

  if (activeCountEl) activeCountEl.textContent = activeRewards.length;
  if (totalCountEl) totalCountEl.textContent = totalCount;
  if (minPointsEl) minPointsEl.textContent = `${lowestPts} pts`;
  if (redemptionsCountEl) redemptionsCountEl.textContent = adminRedemptions.length;
  if (countBadgeEl) countBadgeEl.textContent = activeRewards.length;
}

/**
 * Render the Admin Rewards Grid
 */
export function renderRewardsCatalog() {
  const container = document.getElementById('admin-rewards-list');
  if (!container) return;

  if (adminRewards.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 32px 16px; text-align: center; color: var(--gray); background: rgba(255,255,255,0.02); border: 1px dashed var(--border); border-radius: 4px;">
        <p style="font-size: 15px; margin-bottom: 12px;">No reward items created yet.</p>
        <button type="button" class="btn-primary btn-small" onclick="window.openRewardModal()">+ Add Your First Reward Item</button>
      </div>
    `;
    return;
  }

  container.innerHTML = adminRewards.map((r) => {
    const isActive = r.active !== false;
    const pointsCost = parseInt(r.pointsCost, 10) || 50;
    const title = escapeHtml(r.title || 'Untitled Reward');
    const desc = escapeHtml(r.description || 'No description provided.');
    const rewardType = r.rewardType || 'free_menu_item';

    let typeBadge = '<span style="font-size: 11px; padding: 2px 8px; border-radius: 4px; background: rgba(76, 175, 80, 0.15); color: #4caf50; font-weight: 700;">FREE MENU ITEM</span>';
    if (rewardType === 'discount_fixed') {
      typeBadge = `<span style="font-size: 11px; padding: 2px 8px; border-radius: 4px; background: rgba(255, 152, 0, 0.15); color: #ff9800; font-weight: 700;">$${Number(r.discountAmount || 0).toFixed(2)} OFF</span>`;
    } else if (rewardType === 'discount_percent') {
      typeBadge = `<span style="font-size: 11px; padding: 2px 8px; border-radius: 4px; background: rgba(156, 39, 176, 0.15); color: #ba68c8; font-weight: 700;">${r.discountAmount || 0}% OFF</span>`;
    }

    const cardOpacity = isActive ? '1' : '0.55';
    const activeStatusColor = isActive ? '#4caf50' : '#888';
    const activeStatusText = isActive ? 'ACTIVE' : 'INACTIVE';

    return `
      <div class="crm-panel" style="display: flex; flex-direction: column; justify-content: space-between; position: relative; opacity: ${cardOpacity}; border: 1px solid ${isActive ? 'var(--border)' : 'rgba(255,255,255,0.06)'}; transition: transform 0.15s, border-color 0.15s;">
        <!-- Card Header -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 36px; height: 36px; border-radius: 4px; background: rgba(255,106,0,0.12); border: 1px solid rgba(255,106,0,0.3); color: var(--accent); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">${getRewardItemIcon(r, 20)}</div>
              <div>
                <h3 style="font-size: 16px; margin: 0; color: var(--white); font-weight: 700; line-height: 1.3;">${title}</h3>
                <div style="margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                  ${typeBadge}
                  <span style="font-size: 11px; color: var(--gray);">#${r.sortOrder || 1}</span>
                </div>
              </div>
            </div>
            <div style="text-align: right; flex-shrink: 0;">
              <div style="font-size: 18px; font-weight: 900; color: var(--accent); font-family: 'Barlow Condensed';">${pointsCost} PTS</div>
            </div>
          </div>

          <p style="font-size: 13px; color: var(--gray); line-height: 1.4; margin: 0 0 14px 0;">${desc}</p>
          
          ${r.menuItemName ? `
            <div style="font-size: 12px; color: #aaa; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 6px 10px; margin-bottom: 14px;">
              <span style="display: inline-flex; align-items: center; gap: 5px;">${iconUtensils(13)} Linked Item:</span> <strong style="color: #fff;">${escapeHtml(r.menuItemName)}</strong>
            </div>
          ` : ''}
        </div>

        <!-- Card Footer Actions -->
        <div style="border-top: 1px solid var(--border); padding-top: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <!-- Active Toggle Switch -->
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; font-size: 12px; font-weight: 700; color: ${activeStatusColor};">
            <input type="checkbox" ${isActive ? 'checked' : ''} onchange="window.toggleRewardActive('${r.id}', this.checked)" style="width: 16px; height: 16px; accent-color: #4caf50; cursor: pointer;">
            <span>${activeStatusText}</span>
          </label>

          <!-- Edit & Delete Buttons -->
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn-outline btn-small" onclick="window.editReward('${r.id}')" style="padding: 4px 10px; font-size: 12px;">Edit</button>
            <button type="button" class="btn-outline btn-small" onclick="window.deleteReward('${r.id}')" style="padding: 4px 10px; font-size: 12px; color: #ef4444; border-color: rgba(239, 68, 68, 0.4);">Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render Customer Redemptions Audit Log Table
 */
export function renderRedemptionsList() {
  const tbody = document.getElementById('loyalty-redemptions-table-body');
  if (!tbody) return;

  if (adminRedemptions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--gray); padding: 20px;">No redemptions logged yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = adminRedemptions.map((red) => {
    const voucher = escapeHtml(red.voucherCode || 'N/A');
    const customer = escapeHtml(red.customerPhone || red.customerId || 'Customer');
    const title = escapeHtml(red.rewardTitle || 'Reward');
    const points = red.pointsSpent || 0;
    const date = red.redeemedAt?.toDate ? red.redeemedAt.toDate().toLocaleString() : 'Recent';
    const status = red.status || 'active';

    const statusBadge = status === 'active'
      ? '<span style="font-size: 11px; padding: 2px 8px; border-radius: 4px; background: rgba(76, 175, 80, 0.15); color: #4caf50; font-weight: 700;">ACTIVE</span>'
      : '<span style="font-size: 11px; padding: 2px 8px; border-radius: 4px; background: rgba(255, 255, 255, 0.1); color: #888; font-weight: 700;">USED</span>';

    return `
      <tr>
        <td style="font-family: monospace; font-weight: 700; color: var(--accent);">${voucher}</td>
        <td><strong>${customer}</strong></td>
        <td>${title}</td>
        <td style="font-weight: 700; color: #ff9800;">${points} pts</td>
        <td style="color: var(--gray); font-size: 13px;">${date}</td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Toggle Reward Active State (Direct Firestore update)
 */
window.toggleRewardActive = async (id, isChecked) => {
  try {
    await updateDoc(doc(db, 'rewards', id), {
      active: isChecked,
      updatedAt: serverTimestamp()
    });
    showToast(`Reward ${isChecked ? 'activated' : 'deactivated'}.`);
  } catch (err) {
    console.error('Error toggling reward active state:', err);
    alert('Failed to update reward status: ' + err.message);
  }
};

/**
 * Open Create / Edit Reward Modal
 */
window.openRewardModal = (rewardId = null) => {
  const modal = document.getElementById('reward-modal');
  const form = document.getElementById('reward-form');
  const modalTitle = document.getElementById('reward-modal-title');
  if (!modal || !form) return;

  form.reset();
  document.getElementById('reward-id').value = '';
  document.getElementById('reward-active').checked = true;
  document.getElementById('reward-sort').value = (adminRewards.length + 1).toString();

  // Populate menu items dropdown
  populateRewardMenuSelect();

  if (rewardId) {
    const reward = adminRewards.find((r) => r.id === rewardId);
    if (reward) {
      modalTitle.textContent = 'Edit Reward Item';
      document.getElementById('reward-id').value = reward.id;
      document.getElementById('reward-title').value = reward.title || '';
      document.getElementById('reward-points').value = reward.pointsCost || 50;
      document.getElementById('reward-icon').value = reward.icon || 'gift';
      document.getElementById('reward-type').value = reward.rewardType || 'free_menu_item';
      document.getElementById('reward-menu-item').value = reward.menuItemId || '';
      document.getElementById('reward-discount-amount').value = reward.discountAmount || '';
      document.getElementById('reward-desc').value = reward.description || '';
      document.getElementById('reward-sort').value = reward.sortOrder || 1;
      document.getElementById('reward-active').checked = reward.active !== false;

      handleRewardTypeChange(reward.rewardType || 'free_menu_item');
    }
  } else {
    modalTitle.textContent = 'Create New Reward Item';
    handleRewardTypeChange('free_menu_item');
  }

  modal.classList.add('open');
  modal.style.display = 'flex';
};

/**
 * Edit reward helper
 */
window.editReward = (id) => {
  window.openRewardModal(id);
};

/**
 * Close modal
 */
window.closeRewardModal = () => {
  const modal = document.getElementById('reward-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
};

/**
 * Delete reward
 */
window.deleteReward = async (id) => {
  const reward = adminRewards.find((r) => r.id === id);
  const title = reward ? reward.title : 'this reward item';
  if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;

  try {
    await deleteDoc(doc(db, 'rewards', id));
    showToast('Reward item deleted.');
  } catch (err) {
    console.error('Error deleting reward:', err);
    alert('Failed to delete reward: ' + err.message);
  }
};

/**
 * Switch Loyalty Subnav Tabs
 */
window.switchLoyaltyTab = (tab) => {
  const tabRewards = document.getElementById('loyalty-tab-rewards');
  const tabTiers = document.getElementById('loyalty-tab-tiers');
  const tabRedemptions = document.getElementById('loyalty-tab-redemptions');

  const btnRewards = document.getElementById('btn-loyalty-rewards-tab');
  const btnTiers = document.getElementById('btn-loyalty-tiers-tab');
  const btnRedemptions = document.getElementById('btn-loyalty-redemptions-tab');

  if (tabRewards) tabRewards.style.display = tab === 'rewards' ? 'block' : 'none';
  if (tabTiers) tabTiers.style.display = tab === 'tiers' ? 'block' : 'none';
  if (tabRedemptions) tabRedemptions.style.display = tab === 'redemptions' ? 'block' : 'none';

  if (btnRewards) btnRewards.className = tab === 'rewards' ? 'btn-outline active' : 'btn-outline';
  if (btnTiers) btnTiers.className = tab === 'tiers' ? 'btn-outline active' : 'btn-outline';
  if (btnRedemptions) btnRedemptions.className = tab === 'redemptions' ? 'btn-outline active' : 'btn-outline';
};

/**
 * Populate Target Menu Items Select Box
 */
function populateRewardMenuSelect() {
  const select = document.getElementById('reward-menu-item');
  if (!select) return;

  let menuItems = [];
  if (window.adminMenuData) {
    menuItems = Object.entries(window.adminMenuData).map(([id, item]) => ({
      id,
      name: item.name || 'Unnamed Dish',
      price: item.price || 0
    }));
  } else if (state.menu && state.menu.length > 0) {
    menuItems = state.menu.map((m) => ({
      id: m.id,
      name: m.name,
      price: m.price
    }));
  }

  // Deduplicate and sort alphabetically
  menuItems.sort((a, b) => a.name.localeCompare(b.name));

  const optionsHtml = ['<option value="">-- Select Dish From Menu --</option>'];
  menuItems.forEach((item) => {
    optionsHtml.push(`<option value="${item.id}">${escapeHtml(item.name)} ($${Number(item.price).toFixed(2)})</option>`);
  });

  select.innerHTML = optionsHtml.join('');
}

/**
 * Handle Reward Type visibility toggle
 */
function handleRewardTypeChange(type) {
  const itemGroup = document.getElementById('reward-item-selector-group');
  const discountGroup = document.getElementById('reward-discount-group');
  const discountLabel = document.getElementById('reward-discount-label');

  if (type === 'free_menu_item') {
    if (itemGroup) itemGroup.style.display = 'block';
    if (discountGroup) discountGroup.style.display = 'none';
  } else if (type === 'discount_fixed') {
    if (itemGroup) itemGroup.style.display = 'none';
    if (discountGroup) discountGroup.style.display = 'block';
    if (discountLabel) discountLabel.textContent = 'Discount Amount ($)';
  } else if (type === 'discount_percent') {
    if (itemGroup) itemGroup.style.display = 'none';
    if (discountGroup) discountGroup.style.display = 'block';
    if (discountLabel) discountLabel.textContent = 'Discount Percentage (%)';
  }
}

/**
 * Bind form submit and type change events
 */
function bindRewardFormEvents() {
  const typeSelect = document.getElementById('reward-type');
  if (typeSelect && !typeSelect.dataset.bound) {
    typeSelect.dataset.bound = 'true';
    typeSelect.addEventListener('change', (e) => {
      handleRewardTypeChange(e.target.value);
    });
  }

  const form = document.getElementById('reward-form');
  if (form && !form.dataset.bound) {
    form.dataset.bound = 'true';
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const rewardId = document.getElementById('reward-id').value;
      const title = document.getElementById('reward-title').value.trim();
      const pointsCost = Math.max(1, parseInt(document.getElementById('reward-points').value, 10) || 50);
      const icon = document.getElementById('reward-icon').value.trim() || 'gift';
      const rewardType = document.getElementById('reward-type').value;
      const menuItemId = document.getElementById('reward-menu-item').value || null;
      const discountAmount = parseFloat(document.getElementById('reward-discount-amount').value) || 0;
      const description = document.getElementById('reward-desc').value.trim();
      const sortOrder = parseInt(document.getElementById('reward-sort').value, 10) || 1;
      const active = document.getElementById('reward-active').checked;

      // Extract menu item name if selected
      let menuItemName = null;
      if (menuItemId) {
        const select = document.getElementById('reward-menu-item');
        const selectedOption = select.options[select.selectedIndex];
        if (selectedOption) {
          menuItemName = selectedOption.textContent.split(' ($')[0];
        }
      }

      const rewardData = {
        title,
        pointsCost,
        icon,
        rewardType,
        menuItemId,
        menuItemName,
        discountAmount,
        description,
        sortOrder,
        active,
        updatedAt: serverTimestamp()
      };

      try {
        if (rewardId) {
          await updateDoc(doc(db, 'rewards', rewardId), rewardData);
          showToast('Reward item updated successfully!');
        } else {
          rewardData.createdAt = serverTimestamp();
          await addDoc(collection(db, 'rewards'), rewardData);
          showToast('New reward item created successfully!');
        }
        window.closeRewardModal();
      } catch (err) {
        console.error('Error saving reward:', err);
        alert('Failed to save reward: ' + err.message);
      }
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
