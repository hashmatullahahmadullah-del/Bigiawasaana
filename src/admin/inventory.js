import { showToast } from './orders.js';
import { state } from './shared.js';
import { db } from '../firebase.js';
import { collection, doc, updateDoc, addDoc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { t } from '../i18n/index.js';



window.switchEconomicsTab = (tabId) => {
  ['menu', 'profit', 'ingredients', 'labor', 'delivery'].forEach(id => {
    document.getElementById(`eco-tab-${id}`).style.display = 'none';
    document.getElementById(`btn-eco-${id}`).classList.remove('active');
  });
  document.getElementById(`eco-tab-${tabId}`).style.display = 'block';
  document.getElementById(`btn-eco-${tabId}`).classList.add('active');
  
  if (tabId === 'profit') {
    window.renderEconomicsProfit();
  }
};

window.renderEconomics = () => {
  if (!window.adminMenuData) return; // Wait for menu to load
  
  renderEconomicsDashboardAlert();
  renderEconomicsMenu();
  window.renderEconomicsProfit();
  renderEconomicsIngredients();
  renderEconomicsLaborEvents();
  renderEconomicsDelivery();
};

export function calculateItemEconomics(itemData) {
  let totalCost = 0;
  
  // 1. Ingredients Cost
  const eco = itemData.economics || {};
  const itemIngredients = eco.ingredients || [];
  
  itemIngredients.forEach(i => {
    const dbIng = state.ingredients.find(ing => ing.id === i.ingredientId);
    if (dbIng) {
      totalCost += (dbIng.costPerUnit || 0) * (i.quantity || 0);
    }
  });

  // 2. Fixed per-item Costs
  totalCost += parseFloat(eco.packagingCost || 0);
  totalCost += parseFloat(eco.miscCost || 0);

  // 3. Margin & %
  const priceStr = String(itemData.price || 0).replace('$', '');
  const price = parseFloat(priceStr) || 0;
  const contributionMargin = price - totalCost;
  const foodCostPercent = price > 0 ? (totalCost / price) * 100 : 0;

  return { totalCost, contributionMargin, foodCostPercent };
}

export function getFoodCostColor(percent) {
  const w = state.unitSettings.foodCostWarningThreshold || 30;
  const d = state.unitSettings.foodCostDangerThreshold || 35;
  if (percent <= w) return '#4caf50'; // Green
  if (percent <= d) return '#ffeb3b'; // Yellow
  return '#f44336'; // Red
}

export function renderEconomicsDashboardAlert() {
  const container = document.getElementById('food-cost-alert-container');
  if (!container) return;
  
  let flaggedItems = [];
  Object.entries(window.adminMenuData || {}).forEach(([id, item]) => {
    const eco = calculateItemEconomics(item);
    if (eco.foodCostPercent > (state.unitSettings.foodCostWarningThreshold || 30)) {
      flaggedItems.push({ name: item.name, percent: eco.foodCostPercent });
    }
  });

  if (flaggedItems.length > 0) {
    let alertHtml = `<div style="background: rgba(244, 67, 54, 0.1); border-left: 4px solid #f44336; padding: 16px; border-radius: 4px;">`;
    alertHtml += `<h3 style="color: #f44336; margin: 0 0 8px 0; font-family: 'Barlow Condensed'; font-size: 18px; letter-spacing: 1px;">⚠️ High Food Cost Alert</h3>`;
    alertHtml += `<ul style="margin: 0; padding-left: 20px; color: var(--gray); font-size: 14px;">`;
    flaggedItems.forEach(i => {
      alertHtml += `<li><strong>${i.name}</strong> is running at <span style="color: #f44336; font-weight: bold;">${i.percent.toFixed(1)}%</span> food cost.</li>`;
    });
    alertHtml += `</ul></div>`;
    container.innerHTML = alertHtml;
    container.style.display = 'block';
  } else {
    container.style.display = 'none';
  }
}

export function renderEconomicsMenu() {
  const container = document.getElementById('eco-tab-menu');
  if (!container) return;

  const items = Object.entries(window.adminMenuData || {}).map(([id, item]) => {
    return { id, item, ...calculateItemEconomics(item) };
  }).sort((a, b) => b.contributionMargin - a.contributionMargin);

  let html = `<div class="crm-table-container"><table class="crm-table" style="width: 100%; text-align: left; border-collapse: collapse;">
    <thead>
      <tr>
        <th style="padding: 12px; border-bottom: 1px solid var(--border);">${t('ue.table.menuItem')}</th>
        <th style="padding: 12px; border-bottom: 1px solid var(--border);">${t('ue.table.price')}</th>
        <th style="padding: 12px; border-bottom: 1px solid var(--border);">${t('ue.table.foodCost')}</th>
        <th style="padding: 12px; border-bottom: 1px solid var(--border);">${t('ue.table.marginPct')} ($)</th>
        <th style="padding: 12px; border-bottom: 1px solid var(--border);">${t('ue.table.foodCost')} %</th>
        <th style="padding: 12px; border-bottom: 1px solid var(--border);">${t('ue.table.actions')}</th>
      </tr>
    </thead>
    <tbody>`;

  items.forEach(i => {
    const color = getFoodCostColor(i.foodCostPercent);
    html += `
      <tr style="border-bottom: 1px solid var(--border);">
        <td data-label="Item" style="padding: 12px; font-weight: 600;">${i.item.name}</td>
        <td data-label="Price" style="padding: 12px;">$${(parseFloat(String(i.item.price || 0).replace('$', '')) || 0).toFixed(2)}</td>
        <td data-label="Total Cost" style="padding: 12px;">$${i.totalCost.toFixed(2)}</td>
        <td data-label="Margin ($)" style="padding: 12px; color: var(--accent); font-weight: bold;">$${i.contributionMargin.toFixed(2)}</td>
        <td data-label="Food Cost %" style="padding: 12px;">
          <span style="background: ${color}22; color: ${color}; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
            ${i.foodCostPercent.toFixed(1)}%
          </span>
        </td>
        <td data-label="${t('ue.table.actions')}" style="padding: 12px;">
          <button class="btn-outline btn-small" onclick="openEditRecipeModal('${i.id}')">${t('ue.btn.editRecipe')}</button>
        </td>
      </tr>
    `;
  });
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

window.openEditRecipeModal = (menuId) => {
  const item = window.adminMenuData[menuId];
  if (!item) return;

  const eco = item.economics || {};
  const ingredients = eco.ingredients || [];

  let html = `
    <form id="recipe-form" onsubmit="saveRecipe(event, '${menuId}')" style="display: flex; flex-direction: column; gap: 16px;">
      <h3 style="margin-top: 0; margin-bottom: 8px;">${item.name} Recipe</h3>
      
      <div id="recipe-ingredients-list" style="display: flex; flex-direction: column; gap: 8px;">
        <!-- Ings go here -->
      </div>
      
      <button type="button" class="btn-outline" onclick="addRecipeIngredientRow()" style="align-self: flex-start; font-size: 12px;">+ Add Ingredient</button>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px;">
        <div>
          <label style="font-size: 12px; color: var(--gray);">Packaging Cost ($)</label>
          <input type="number" id="recipe-pack-cost" step="0.01" value="${eco.packagingCost || 0}" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
        </div>
        <div>
          <label style="font-size: 12px; color: var(--gray);">Misc Cost ($)</label>
          <input type="number" id="recipe-misc-cost" step="0.01" value="${eco.miscCost || 0}" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
        </div>
      </div>

      <div style="display: flex; gap: 12px; margin-top: 24px;">
        <button type="submit" class="btn-primary" style="flex: 1;">Save Recipe</button>
      </div>
    </form>
  `;

  document.getElementById('recipe-editor-container').innerHTML = html;
  
  window._tempRecipeIngredients = [...ingredients];
  renderRecipeIngredientRows();

  document.getElementById('edit-recipe-modal').classList.add('open');
};

window.closeEditRecipeModal = () => {
  document.getElementById('edit-recipe-modal').classList.remove('open');
};

export function renderRecipeIngredientRows() {
  const container = document.getElementById('recipe-ingredients-list');
  if (!container) return;

  if (window._tempRecipeIngredients.length === 0) {
    container.innerHTML = `<p style="color: var(--gray); font-size: 13px;">No ingredients added.</p>`;
    return;
  }

  let html = '';
  window._tempRecipeIngredients.forEach((ing, idx) => {
    html += `
      <div style="display: flex; gap: 8px; align-items: center;">
        <select onchange="updateTempRecipeIng(${idx}, 'id', this.value)" style="flex: 2; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
          <option value="">Select Ingredient...</option>
          ${state.ingredients.map(dbIng => `
            <option value="${dbIng.id}" ${dbIng.id === ing.ingredientId ? 'selected' : ''}>${dbIng.name} ($${dbIng.costPerUnit}/${dbIng.unit})</option>
          `).join('')}
        </select>
        <input type="number" step="0.01" value="${ing.quantity || 0}" onchange="updateTempRecipeIng(${idx}, 'qty', this.value)" placeholder="Qty" style="flex: 1; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
        <button type="button" class="btn-outline" onclick="removeRecipeIngredientRow(${idx})" style="padding: 8px; border-color: rgba(255,69,0,0.4); color: var(--accent);">×</button>
      </div>
    `;
  });
  container.innerHTML = html;
}

window.addRecipeIngredientRow = () => {
  if (window._tempRecipeIngredients.some(i => !i.ingredientId || i.quantity <= 0)) {
    showToast('Please fill out existing ingredient rows first', true);
    return;
  }
  window._tempRecipeIngredients.push({ ingredientId: '', quantity: 0 });
  renderRecipeIngredientRows();
};

window.removeRecipeIngredientRow = (idx) => {
  window._tempRecipeIngredients.splice(idx, 1);
  renderRecipeIngredientRows();
};

window.updateTempRecipeIng = (idx, field, val) => {
  if (field === 'id') window._tempRecipeIngredients[idx].ingredientId = val;
  if (field === 'qty') window._tempRecipeIngredients[idx].quantity = parseFloat(val) || 0;
};

window.saveRecipe = async (e, menuId) => {
  e.preventDefault();
  const packCost = parseFloat(document.getElementById('recipe-pack-cost').value) || 0;
  const miscCost = parseFloat(document.getElementById('recipe-misc-cost').value) || 0;

  const validIngs = window._tempRecipeIngredients.filter(i => i.ingredientId && i.quantity > 0);

  try {
    const ecoUpdate = {
      ingredients: validIngs,
      packagingCost: packCost,
      miscCost: miscCost
    };
    await updateDoc(doc(db, 'menu', menuId), { economics: ecoUpdate });
    
    // Update local cache to reflect changes immediately
    window.adminMenuData[menuId].economics = ecoUpdate;

    showToast('Recipe saved successfully');
    window.closeEditRecipeModal();
    window.renderEconomics();
  } catch (err) {
    console.error(err);
    showToast('Error saving recipe', true);
  }
};

// ----------------------------------------------------
// INGREDIENTS TAB
// ----------------------------------------------------
export function renderEconomicsIngredients() {
  const container = document.getElementById('eco-tab-ingredients');
  if (!container) return;

  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2 style="font-family: 'Barlow Condensed';">${t('ue.tab.ingredients')}</h2>
      <button class="btn-primary btn-small" onclick="addIngredient()">+ ${t('ue.btn.addIngredient')}</button>
    </div>
    <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px;">
      <form id="add-ing-form" onsubmit="saveNewIngredient(event)" style="display: none; gap: 8px; margin-bottom: 16px; align-items: center;">
        <input type="text" id="new-ing-name" placeholder="Name (e.g. Lamb)" required style="flex: 2; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
        <input type="number" id="new-ing-cost" placeholder="Cost ($)" step="0.001" required style="flex: 1; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
        <span style="color: var(--gray);">per</span>
        <input type="text" id="new-ing-unit" placeholder="Unit (e.g. oz, piece)" required style="flex: 1; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
        <button type="submit" class="btn-primary btn-small">${t('btn.save')}</button>
        <button type="button" class="btn-outline btn-small" onclick="document.getElementById('add-ing-form').style.display='none'">${t('btn.cancel')}</button>
      </form>

      <div class="crm-table-container"><table class="crm-table" style="width: 100%; text-align: left; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="padding: 12px; border-bottom: 1px solid var(--border);">${t('ue.table.ingredientName')}</th>
            <th style="padding: 12px; border-bottom: 1px solid var(--border);">${t('ue.table.costPerUnit')}</th>
            <th style="padding: 12px; border-bottom: 1px solid var(--border);">${t('ue.table.actions')}</th>
          </tr>
        </thead>
        <tbody>
  `;

  if (state.ingredients.length === 0) {
    html += `<tr><td colspan="3" style="padding: 12px; color: var(--gray);">No ingredients added yet.</td></tr>`;
  } else {
    state.ingredients.forEach(ing => {
      html += `
        <tr style="border-bottom: 1px solid var(--border);">
          <td data-label="Name" style="padding: 12px; font-weight: 600;">${ing.name}</td>
          <td data-label="Cost Per Unit" style="padding: 12px;">$${ing.costPerUnit.toFixed(3)} / ${ing.unit}</td>
          <td data-label="Actions" style="padding: 12px;">
            <button class="btn-outline btn-small" onclick="deleteIngredient('${ing.id}')" style="padding: 4px 8px; border-color: rgba(255,69,0,0.4); color: var(--accent);">Delete</button>
          </td>
        </tr>
      `;
    });
  }

  html += `</tbody></table></div></div>`;
  container.innerHTML = html;
}

window.addIngredient = () => {
  document.getElementById('add-ing-form').style.display = 'flex';
};

window.saveNewIngredient = async (e) => {
  e.preventDefault();
  const name = document.getElementById('new-ing-name').value.trim();
  const costPerUnit = parseFloat(document.getElementById('new-ing-cost').value);
  const unit = document.getElementById('new-ing-unit').value.trim();

  try {
    await addDoc(collection(db, 'unitEconomics_ingredients'), {
      name, costPerUnit, unit
    });
    showToast('Ingredient added');
  } catch (err) {
    console.error(err);
    showToast('Failed to add ingredient', true);
  }
};

window.deleteIngredient = async (id) => {
  if (!confirm('Delete this ingredient? This will affect any menu items using it.')) return;
  try {
    await deleteDoc(doc(db, 'unitEconomics_ingredients', id));
    showToast('Ingredient deleted');
  } catch (err) {
    console.error(err);
    showToast('Failed to delete', true);
  }
};

// ----------------------------------------------------
// LABOR & EVENTS TAB
// ----------------------------------------------------
export function getWeightedAverageMargin() {
  // Use last 90 days from state.orders
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const recentOrders = state.orders.filter(o => o.date >= ninetyDaysAgo && o.status === 'completed');
  if (recentOrders.length === 0) return 0;

  const itemCounts = {};
  let totalItemsSold = 0;

  recentOrders.forEach(o => {
    (o.items || []).forEach(item => {
      itemCounts[item.id] = (itemCounts[item.id] || 0) + item.qty;
      totalItemsSold += item.qty;
    });
  });

  if (totalItemsSold === 0) return 0;

  let totalWeightedMargin = 0;
  Object.entries(itemCounts).forEach(([itemId, qty]) => {
    const mItem = window.adminMenuData[itemId];
    if (mItem) {
      const eco = calculateItemEconomics(mItem);
      totalWeightedMargin += (eco.contributionMargin * qty);
    }
  });

  return totalWeightedMargin / totalItemsSold;
}

export function renderEconomicsLaborEvents() {
  const container = document.getElementById('eco-tab-labor');
  if (!container) return;

  const avgMargin = getWeightedAverageMargin();

  let html = `
    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 24px;">
      
      <!-- Labor Cost Tracker -->
      <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px;">
        <h3 style="margin-top: 0; font-family: 'Barlow Condensed';">Labor Cost Tracker</h3>
        <p style="font-size: 12px; color: var(--gray); margin-bottom: 16px;">Calculate Prime Cost % based on selected date range revenue.</p>
        
        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
          <div>
            <label style="font-size: 12px; color: var(--gray);">Date Range for Revenue</label>
            <div style="display: flex; gap: 8px;">
              <input type="date" id="labor-date-start" style="flex: 1; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
              <input type="date" id="labor-date-end" style="flex: 1; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
            </div>
          </div>
          <button class="btn-outline btn-small" onclick="pullLaborRevenue()">Pull Revenue</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div>
            <label style="font-size: 12px; color: var(--gray);">Pulled Revenue ($)</label>
            <input type="number" id="labor-revenue" readonly value="0" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px; opacity: 0.7;">
          </div>
          <div>
            <label style="font-size: 12px; color: var(--gray);">Total Labor Hours</label>
            <input type="number" id="labor-hours" value="0" oninput="calculateLaborCost()" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
          </div>
          <div>
            <label style="font-size: 12px; color: var(--gray);">Avg Hourly Rate ($)</label>
            <input type="number" id="labor-rate" value="20" oninput="calculateLaborCost()" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
          </div>
        </div>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border);">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--gray); font-size: 14px;">Labor Cost %</span>
            <strong id="calc-labor-percent" style="font-size: 16px;">0.0%</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--gray); font-size: 14px;">Prime Cost % <span style="font-size: 10px;">(Labor + Avg Food Cost)</span></span>
            <strong id="calc-prime-percent" style="font-size: 16px;">0.0%</strong>
          </div>
        </div>
      </div>

      <!-- Event Analyzer -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin: 0; font-family: 'Barlow Condensed';">Event Break-Even Analyzer</h3>
          <button class="btn-primary btn-small" onclick="openEditEventModal()">+ New Event</button>
        </div>
        
        <div style="background: rgba(255,69,0,0.1); border: 1px solid var(--accent); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
          <strong style="color: var(--accent); font-size: 14px;">Weighted Average Contribution Margin: $${avgMargin.toFixed(2)}</strong>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--gray);">Based on order mix from the last 90 days. Break-even calculates how many average orders you need to cover fixed event costs.</p>
        </div>

        <div class="crm-table-container"><table class="crm-table" style="width: 100%; text-align: left; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="padding: 12px; border-bottom: 1px solid var(--border);">${t('ue.table.eventName')}</th>
              <th style="padding: 12px; border-bottom: 1px solid var(--border);">${t('ue.table.date')}</th>
              <th style="padding: 12px; border-bottom: 1px solid var(--border);">Fixed Costs</th>
              <th style="padding: 12px; border-bottom: 1px solid var(--border);">Break-Even Orders</th>
              <th style="padding: 12px; border-bottom: 1px solid var(--border);">Actual Orders</th>
              <th style="padding: 12px; border-bottom: 1px solid var(--border);">Status</th>
            </tr>
          </thead>
          <tbody>
  `;

  if (state.events.length === 0) {
    html += `<tr><td colspan="6" style="padding: 12px; color: var(--gray);">No events saved.</td></tr>`;
  } else {
    state.events.forEach(ev => {
      const fc = ev.fixedCosts || {};
      const totalFixed = (fc.boothFee||0) + (fc.travel||0) + (fc.staff||0) + (fc.permits||0) + (fc.other||0);
      const breakEven = avgMargin > 0 ? Math.ceil(totalFixed / avgMargin) : 0;
      
      let statusHtml = '-';
      if (ev.actualOrders) {
        if (ev.actualOrders >= breakEven) {
          statusHtml = `<span style="color: #4caf50; font-weight: bold;">Profitable</span>`;
        } else {
          statusHtml = `<span style="color: #f44336; font-weight: bold;">Loss</span>`;
        }
      }

      html += `
        <tr style="border-bottom: 1px solid var(--border); cursor: pointer;" onclick="openEditEventModal('${ev.id}')">
          <td data-label="Event Name" style="padding: 12px; font-weight: 600; color: var(--white);">${ev.name}</td>
          <td data-label="Date" style="padding: 12px;">${ev.date.toLocaleDateString()}</td>
          <td data-label="Fixed Costs" style="padding: 12px;">$${totalFixed.toFixed(2)}</td>
          <td data-label="Break-Even Orders" style="padding: 12px; color: var(--accent); font-weight: bold;">${breakEven}</td>
          <td data-label="Actual Orders" style="padding: 12px;">${ev.actualOrders || '-'}</td>
          <td data-label="Status" style="padding: 12px;">${statusHtml}</td>
        </tr>
      `;
    });
  }

  html += `</tbody></table></div></div></div>`;
  container.innerHTML = html;

  // Set default dates for labor to today
  const todayStr = new Date().toISOString().split('T')[0];
  if(document.getElementById('labor-date-start')) document.getElementById('labor-date-start').value = todayStr;
  if(document.getElementById('labor-date-end')) document.getElementById('labor-date-end').value = todayStr;
}

window.pullLaborRevenue = () => {
  const startVal = document.getElementById('labor-date-start').value;
  const endVal = document.getElementById('labor-date-end').value;
  
  if (!startVal || !endVal) {
    showToast('Please select a valid date range.');
    return;
  }

  const start = new Date(startVal);
  start.setHours(0,0,0,0);
  const end = new Date(endVal);
  end.setHours(23,59,59,999);

  let rev = 0;
  state.orders.forEach(o => {
    if (o.status === 'completed' && o.date >= start && o.date <= end) {
      rev += parseFloat(o.total || 0);
    }
  });

  document.getElementById('labor-revenue').value = rev.toFixed(2);
  window.calculateLaborCost();
  showToast(`Pulled $${rev.toFixed(2)} in revenue.`);
};

window.calculateLaborCost = () => {
  const rev = parseFloat(document.getElementById('labor-revenue').value) || 0;
  const hours = parseFloat(document.getElementById('labor-hours').value) || 0;
  const rate = parseFloat(document.getElementById('labor-rate').value) || 0;

  const laborCost = hours * rate;
  let laborPercent = 0;
  if (rev > 0) laborPercent = (laborCost / rev) * 100;

  document.getElementById('calc-labor-percent').textContent = laborPercent.toFixed(1) + '%';

  // Approx global food cost % (simple avg of items for prime calculation)
  let sumFc = 0; let count = 0;
  Object.values(window.adminMenuData || {}).forEach(item => {
    const eco = calculateItemEconomics(item);
    sumFc += eco.foodCostPercent;
    count++;
  });
  const avgFc = count > 0 ? (sumFc / count) : 0;
  const primeCost = laborPercent + avgFc;

  const primeEl = document.getElementById('calc-prime-percent');
  primeEl.textContent = primeCost.toFixed(1) + '%';
  
  if (primeCost > (state.unitSettings.primeCostThreshold || 65)) {
    primeEl.style.color = '#f44336';
  } else {
    primeEl.style.color = '#4caf50';
  }
};

window.openEditEventModal = (eventId = null) => {
  let ev = {
    name: '',
    date: new Date().toISOString().split('T')[0],
    fixedCosts: { boothFee: 0, travel: 0, staff: 0, permits: 0, other: 0 },
    actualOrders: ''
  };

  if (eventId) {
    const found = state.events.find(e => e.id === eventId);
    if (found) {
      ev = { ...found, date: found.date.toISOString().split('T')[0] };
    }
  }

  const fc = ev.fixedCosts || {};
  
  let html = `
    <form onsubmit="saveEvent(event, '${eventId || ''}')" style="display: flex; flex-direction: column; gap: 16px;">
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px;">
        <div>
          <label style="font-size: 12px; color: var(--gray);">Event Name</label>
          <input type="text" id="ev-name" value="${ev.name}" required style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
        </div>
        <div>
          <label style="font-size: 12px; color: var(--gray);">Date</label>
          <input type="date" id="ev-date" value="${ev.date}" required style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
        </div>
      </div>

      <h4 style="margin: 8px 0 0 0; color: var(--accent); font-family: 'Barlow Condensed'; letter-spacing: 1px;">FIXED COSTS</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div><label style="font-size: 12px; color: var(--gray);">Booth Fee ($)</label><input type="number" id="ev-booth" value="${fc.boothFee||0}" step="0.01" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;"></div>
        <div><label style="font-size: 12px; color: var(--gray);">Travel/Fuel ($)</label><input type="number" id="ev-travel" value="${fc.travel||0}" step="0.01" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;"></div>
        <div><label style="font-size: 12px; color: var(--gray);">Extra Staff ($)</label><input type="number" id="ev-staff" value="${fc.staff||0}" step="0.01" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;"></div>
        <div><label style="font-size: 12px; color: var(--gray);">Permits ($)</label><input type="number" id="ev-permits" value="${fc.permits||0}" step="0.01" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;"></div>
        <div><label style="font-size: 12px; color: var(--gray);">Other ($)</label><input type="number" id="ev-other" value="${fc.other||0}" step="0.01" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;"></div>
      </div>

      <div style="margin-top: 8px; padding-top: 16px; border-top: 1px solid var(--border);">
        <label style="font-size: 12px; color: var(--gray);">Actual Orders (Post-Event)</label>
        <input type="number" id="ev-actual" value="${ev.actualOrders||''}" style="width: 100%; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
      </div>

      <div style="display: flex; gap: 12px; margin-top: 16px;">
        <button type="submit" class="btn-primary" style="flex: 1;">Save Event</button>
        ${eventId ? `<button type="button" class="btn-outline" style="border-color: rgba(255,69,0,0.4); color: var(--accent);" onclick="deleteEvent('${eventId}')">Delete</button>` : ''}
      </div>
    </form>
  `;

  document.getElementById('event-editor-container').innerHTML = html;
  document.getElementById('edit-event-modal').style.display = 'flex';
};

window.closeEditEventModal = () => {
  document.getElementById('edit-event-modal').style.display = 'none';
};

window.saveEvent = async (e, eventId) => {
  e.preventDefault();
  
  const name = document.getElementById('ev-name').value.trim();
  const dateStr = document.getElementById('ev-date').value;
  
  const boothFee = parseFloat(document.getElementById('ev-booth').value) || 0;
  const travel = parseFloat(document.getElementById('ev-travel').value) || 0;
  const staff = parseFloat(document.getElementById('ev-staff').value) || 0;
  const permits = parseFloat(document.getElementById('ev-permits').value) || 0;
  const other = parseFloat(document.getElementById('ev-other').value) || 0;
  
  const actualStr = document.getElementById('ev-actual').value;
  const actualOrders = actualStr ? parseInt(actualStr) : null;

  const payload = {
    name,
    date: Timestamp.fromDate(new Date(dateStr)),
    fixedCosts: { boothFee, travel, staff, permits, other },
    actualOrders
  };

  try {
    if (eventId) {
      await updateDoc(doc(db, 'unitEconomics_events', eventId), payload);
    } else {
      await addDoc(collection(db, 'unitEconomics_events'), payload);
    }
    showToast('Event saved');
    window.closeEditEventModal();
  } catch (err) {
    console.error(err);
    showToast('Error saving event', true);
  }
};

window.deleteEvent = async (eventId) => {
  if (!confirm('Delete this event?')) return;
  try {
    await deleteDoc(doc(db, 'unitEconomics_events', eventId));
    showToast('Event deleted');
    window.closeEditEventModal();
  } catch (err) {
    showToast('Error deleting', true);
  }
};

// ----------------------------------------------------
// DELIVERY IMPACT TAB
// ----------------------------------------------------
export function renderEconomicsDelivery() {
  const container = document.getElementById('eco-tab-delivery');
  if (!container) return;

  const platforms = state.unitPlatforms || { doordash: 30, ubereats: 30, grubhub: 30 };

  const items = Object.entries(window.adminMenuData || {}).map(([id, item]) => {
    return { id, item, ...calculateItemEconomics(item) };
  }).sort((a, b) => b.contributionMargin - a.contributionMargin);

  let html = `
    <div style="background: var(--surface); padding: 16px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 24px;">
      <h3 style="margin-top: 0; font-family: 'Barlow Condensed';">Platform Commission Rates (%)</h3>
      <div style="display: flex; gap: 16px; align-items: flex-end;">
        <div>
          <label style="font-size: 12px; color: var(--gray);">DoorDash</label>
          <input type="number" id="plat-dd" value="${platforms.doordash||30}" style="width: 80px; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
        </div>
        <div>
          <label style="font-size: 12px; color: var(--gray);">Uber Eats</label>
          <input type="number" id="plat-ue" value="${platforms.ubereats||30}" style="width: 80px; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
        </div>
        <div>
          <label style="font-size: 12px; color: var(--gray);">Grubhub</label>
          <input type="number" id="plat-gh" value="${platforms.grubhub||30}" style="width: 80px; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
        </div>
        <button class="btn-outline btn-small" onclick="savePlatformRates()">Update Rates</button>
      </div>
    </div>

    <div class="crm-table-container"><table class="crm-table" style="width: 100%; text-align: left; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="padding: 12px; border-bottom: 1px solid var(--border);">Item</th>
          <th style="padding: 12px; border-bottom: 1px solid var(--border);">Price</th>
          <th style="padding: 12px; border-bottom: 1px solid var(--border);">In-Store Margin</th>
          <th style="padding: 12px; border-bottom: 1px solid var(--border); color: #ff3333;">DoorDash Margin</th>
          <th style="padding: 12px; border-bottom: 1px solid var(--border); color: #06c167;">Uber Eats Margin</th>
          <th style="padding: 12px; border-bottom: 1px solid var(--border); color: #ff8000;">Grubhub Margin</th>
        </tr>
      </thead>
      <tbody>
  `;

  items.forEach(i => {
    const priceStr = String(i.item.price || 0).replace('$', '');
    const price = parseFloat(priceStr) || 0;
    
    // Calculates margin after taking away the commission % from the revenue
    const ddMargin = price - (price * ((platforms.doordash||0)/100)) - i.totalCost;
    const ueMargin = price - (price * ((platforms.ubereats||0)/100)) - i.totalCost;
    const ghMargin = price - (price * ((platforms.grubhub||0)/100)) - i.totalCost;

    const fmtMargin = (m) => {
      if (m < 0) return `<span style="color: #f44336; font-weight: bold;">-$${Math.abs(m).toFixed(2)}</span>`;
      if (m < 2) return `<span style="color: #ffeb3b;">$${m.toFixed(2)}</span>`;
      return `<span style="color: var(--white);">$${m.toFixed(2)}</span>`;
    };

    html += `
      <tr style="border-bottom: 1px solid var(--border);">
        <td data-label="Item" style="padding: 12px; font-weight: 600;">${i.item.name}</td>
        <td data-label="Price" style="padding: 12px;">$${price.toFixed(2)}</td>
        <td data-label="In-Store Margin" style="padding: 12px; color: var(--accent); font-weight: bold;">$${i.contributionMargin.toFixed(2)}</td>
        <td data-label="DoorDash Margin" style="padding: 12px; background: rgba(255,51,51,0.05);">${fmtMargin(ddMargin)}</td>
        <td data-label="Uber Eats Margin" style="padding: 12px; background: rgba(6,193,103,0.05);">${fmtMargin(ueMargin)}</td>
        <td data-label="Grubhub Margin" style="padding: 12px; background: rgba(255,128,0,0.05);">${fmtMargin(ghMargin)}</td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

window.savePlatformRates = async () => {
  const doordash = parseFloat(document.getElementById('plat-dd').value) || 0;
  const ubereats = parseFloat(document.getElementById('plat-ue').value) || 0;
  const grubhub = parseFloat(document.getElementById('plat-gh').value) || 0;

  try {
    const newRates = { doordash, ubereats, grubhub };
    await setDoc(doc(db, 'unitEconomics_platforms', 'rates'), newRates, { merge: true });
    
    // Update local cache
    state.unitPlatforms = { ...state.unitPlatforms, ...newRates };
    
    showToast('Platform rates updated');
    window.renderEconomics();
  } catch(err) {
    console.error(err);
    showToast('Error saving rates', true);
  }
};


