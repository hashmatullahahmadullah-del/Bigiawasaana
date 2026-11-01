/* global Sortable */
import { db } from '../firebase.js';
import { storage } from '../storage.js';
import { collection, query, doc, updateDoc, setDoc, onSnapshot, addDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { showToast } from './orders.js';
import { escapeHtml } from './shared.js';
import { iconPlus, iconX } from '../icons.js';

export const addMenuForm = document.getElementById("add-menu-form");
export const adminMenuList = document.getElementById("admin-menu-list");
export const editMenuModal = document.getElementById("edit-menu-modal");
export const editMenuForm = document.getElementById("edit-menu-form");

// Image upload label listeners
export const addMenuUploadInput = document.getElementById('menu-img-upload');
export const addMenuFilename = document.getElementById('menu-img-filename');
if (addMenuUploadInput && addMenuFilename) {
  addMenuUploadInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      addMenuFilename.textContent = e.target.files[0].name;
    } else {
      addMenuFilename.textContent = 'No file chosen';
    }
  });
}

export const editMenuUploadInput = document.getElementById('edit-menu-img-upload');
export const editMenuFilename = document.getElementById('edit-menu-img-filename');
if (editMenuUploadInput && editMenuFilename) {
  editMenuUploadInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      editMenuFilename.textContent = e.target.files[0].name;
    } else {
      editMenuFilename.textContent = 'No file chosen';
    }
  });
}

// Compress and resize image to exactly 16:9 with padding
export async function compressImage(file, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const targetWidth = maxWidth || 800;
    const targetHeight = Math.round(targetWidth * (9 / 16));
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        // Calculate scaling factor to fit within 1200x675
        const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
        
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        
        const offsetX = (targetWidth - scaledWidth) / 2;
        const offsetY = (targetHeight - scaledHeight) / 2;
        
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        
        // Fill background with dark theme color
        ctx.fillStyle = '#111111';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        
        // Draw the image centered
        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
        
        canvas.toBlob(blob => {
          if (!blob) {
            reject(new Error('Canvas to Blob failed'));
            return;
          }
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
            type: 'image/webp',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        }, 'image/webp', quality);
      };
      img.onerror = error => reject(error);
    };
    reader.onerror = error => reject(error);
  });
}

// Upload helper function
export async function uploadImageFile(file) {
  try {
    const optimizedFile = await compressImage(file);
    const safeName = optimizedFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '-');
    const filename = `${Date.now()}_${safeName}`;
    const storageRef = ref(storage, `menu-images/${filename}`);
    await uploadBytes(storageRef, optimizedFile);
    return `/m-img/${filename}`;
  } catch (err) {
    console.error("Image compression failed, falling back to original:", err);
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '-');
    const filename = `${Date.now()}_${safeName}`;
    const storageRef = ref(storage, `menu-images/${filename}`);
    await uploadBytes(storageRef, file);
    return `/m-img/${filename}`;
  }
}

// Options Builder Helpers
export function getBuilderOptions(prefix) {
  const options = [];
  const container = document.getElementById(`${prefix}-container`);
  if (!container) return options;
  const rows = container.querySelectorAll('.option-row');
  rows.forEach(row => {
    const name = row.querySelector('.opt-name').value.trim();
    const price = parseFloat(row.querySelector('.opt-price').value);
    if (name) {
      options.push({ name, price: isNaN(price) ? 0 : price });
    }
  });
  return options;
}

export function createOptionRow(prefix, type, name = '', price = '') {
  const container = document.getElementById(`${prefix}-container`);
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'option-row';
  div.innerHTML = `
    <input type="text" class="opt-name" placeholder="${type} Name" value="${name}" style="flex: 2; min-width: 0; padding: 9px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 6px; font-size: 14px;">
    <input type="number" step="0.01" class="opt-price" placeholder="Price ($)" value="${price}" style="flex: 1; min-width: 75px; max-width: 100px; padding: 9px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 6px; font-size: 14px;">
    <button type="button" class="btn-outline" onclick="this.parentElement.remove()" style="width: 36px; height: 36px; min-width: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center; color: #f87171; border-color: rgba(239,68,68,0.4); border-radius: 6px; font-size: 18px; cursor: pointer;">×</button>
  `;
  container.appendChild(div);
}

document.getElementById('add-variant-btn')?.addEventListener('click', () => createOptionRow('variants', 'Variant'));
document.getElementById('add-addon-btn')?.addEventListener('click', () => createOptionRow('addons', 'Add-On'));
document.getElementById('edit-variant-btn')?.addEventListener('click', () => createOptionRow('edit-variants', 'Variant'));
document.getElementById('edit-addon-btn')?.addEventListener('click', () => createOptionRow('edit-addons', 'Add-On'));

if (addMenuForm) {
  addMenuForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = addMenuForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Adding...';
    submitBtn.disabled = true;

    const name = document.getElementById("menu-name").value;
    const name_fa = document.getElementById("menu-name_fa").value;
    const price = parseFloat(document.getElementById("menu-price").value);
    const desc = document.getElementById("menu-desc").value;
    const desc_fa = document.getElementById("menu-desc_fa").value;
    const category = document.getElementById("menu-category").value;
    const mealLinkId = document.getElementById("menu-meal-link").value;
    let img = document.getElementById("menu-img").value;
    const featured = document.getElementById("menu-featured").checked;
    const hidden = document.getElementById("menu-hidden").checked;
    
    try {
      const fileInput = document.getElementById('menu-img-upload');
      if (fileInput.files.length > 0) {
        submitBtn.textContent = 'Uploading Image...';
        img = await uploadImageFile(fileInput.files[0]);
      }

      const variants = getBuilderOptions('variants');
      const addOns = getBuilderOptions('addons');

      await addDoc(collection(db, "menu"), { name, name_fa, price, desc, desc_fa, category, mealLinkId, img, featured: !!featured, hidden: !!hidden, variants, addOns, updatedAt: new Date().toISOString() });
      document.getElementById("menu-status").style.display = "block";
      addMenuForm.reset();
      document.getElementById('variants-container').innerHTML = '';
      document.getElementById('addons-container').innerHTML = '';
      if (addMenuFilename) addMenuFilename.textContent = 'No file chosen';

      // Collapse add panel on mobile/desktop
      const addPanel = document.getElementById('add-menu-panel');
      if (addPanel) addPanel.style.display = 'none';
      const toggleIcon = document.getElementById('toggle-add-dish-icon');
      const toggleText = document.getElementById('toggle-add-dish-text');
      if (toggleIcon) toggleIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ui-icon ui-icon-no-margin"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
      if (toggleText) toggleText.textContent = 'Add New Dish';

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

export async function populateMealLinks() {
  const addSelect = document.getElementById('menu-meal-link');
  const editSelect = document.getElementById('edit-menu-meal-link');
  if (!addSelect && !editSelect) return;
  
  try {
    const q = query(collection(db, "menu"));
    const snapshot = await getDocs(q);
    const meals = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      meals.push({ id: doc.id, name: data.name, cat: data.category });
    });
    
    meals.sort((a, b) => a.name.localeCompare(b.name));
    
    const optionsHtml = '<option value="">No Meal Upgrade (or auto-match)</option>' + 
      meals.map(m => `<option value="${m.id}">${m.name} (${m.cat})</option>`).join('');
      
    if (addSelect) addSelect.innerHTML = optionsHtml;
    if (editSelect) editSelect.innerHTML = optionsHtml;
  } catch (err) {
    console.warn("populateMealLinks notice:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  populateMealLinks();
  
  // Temporary auto-link script for Afghan Burger
  setTimeout(async () => {
    try {
      const snap = await getDocs(collection(db, "menu"));
      let baseItem = null;
      let mealItem = null;
      snap.forEach(d => {
        const item = d.data();
        if ((item.name||'').toLowerCase().includes("afghan burger")) baseItem = { id: d.id, ...item };
        if ((item.name||'').toLowerCase().includes("silk road meal") && item.category === 'bigi street meals') mealItem = { id: d.id, ...item };
      });
      
      if (baseItem && !mealItem) {
        const res = await addDoc(collection(db, "menu"), {
          name: "Silk Road Meal",
          price: (baseItem.price || 0) + 5,
          category: "bigi street meals",
          hidden: true,
          desc: "Make it a meal with fries and a refreshing drink.",
          variants: [],
          addOns: [],
          updatedAt: new Date().toISOString()
        });
        mealItem = { id: res.id };
      }
      
      if (baseItem && mealItem && baseItem.mealLinkId !== mealItem.id) {
        await updateDoc(doc(db, "menu", baseItem.id), { mealLinkId: mealItem.id });
        console.log("Successfully linked Silk Road Wrap to Silk Road Meal!");
        loadMenuAdmin();
      }
    } catch(e) {
      console.error("Auto-link failed", e);
    }
  }, 2000);
});

export async function loadMenuAdmin() {
  if (!adminMenuList) return;
  adminMenuList.innerHTML = `
    <tr>
      <td colspan="5">
        <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
          <div style="height: 48px; width: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--bg) 8%, var(--border) 18%, var(--bg) 33%); background-size: 1000px 100%; animation: skeleton-shimmer 2s infinite linear;"></div>
          <div style="height: 48px; width: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--bg) 8%, var(--border) 18%, var(--bg) 33%); background-size: 1000px 100%; animation: skeleton-shimmer 2s infinite linear;"></div>
          <div style="height: 48px; width: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--bg) 8%, var(--border) 18%, var(--bg) 33%); background-size: 1000px 100%; animation: skeleton-shimmer 2s infinite linear;"></div>
        </div>
      </td>
    </tr>
  `;
  try {
    const snapshot = await getDocs(collection(db, "menu"));
    if (snapshot.empty) {
      adminMenuList.innerHTML = "<p style=\"color: var(--gray);\">No menu items found.</p>";
      return;
    }
    let html = "";
    window.adminMenuData = {};
    const uniqueCats = new Set();
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const itemId = docSnap.id;
      window.adminMenuData[itemId] = data;
      const cat = (data.category || '').toLowerCase().trim();
      if (cat) uniqueCats.add(cat);
      const descText = data.desc || data.description || '';
      const imgHtml = data.img 
        ? `<img src="${data.img}" alt="${escapeHtml(data.name || '')}" class="admin-menu-item-thumb">` 
        : `<div class="admin-menu-item-thumb admin-menu-item-noimg">No Pic</div>`;
      const updatedAtHtml = data.updatedAt ? `<div class="admin-menu-item-updated">Updated: ${new Date(data.updatedAt).toLocaleDateString()}</div>` : '';
      const tvBadge = data.tvScreen ? `<span class="crm-badge badge-tv" style="background: rgba(56,189,248,0.15); color: #38bdf8; border-color: rgba(56,189,248,0.3); font-size: 10px; padding: 2px 6px;">${data.tvScreen === 'TV1' ? 'TV 1' : 'TV 2'}</span>` : '';
      const variantsCount = (data.variants && data.variants.length) ? `<span class="crm-badge" style="background: rgba(255,255,255,0.08); color: var(--text-muted); font-size: 10px; padding: 2px 6px;">${data.variants.length} Var</span>` : '';
      
      html += `
        <div class="admin-menu-item-card" data-id="${itemId}" data-category="${escapeHtml(cat)}">
          <div class="admin-menu-item-top">
            <div class="admin-menu-item-media">
              ${imgHtml}
            </div>
            <div class="admin-menu-item-info">
              <div class="admin-menu-item-header">
                <strong class="admin-menu-item-title">${escapeHtml(data.name || '')}</strong>
                <div class="admin-menu-item-badges">
                  ${data.featured ? '<span class="crm-badge" style="background: rgba(255,215,0,0.15); color: #FFD700; border-color: rgba(255,215,0,0.3); font-size: 10px; padding: 2px 6px;">Featured</span>' : ''}
                  ${tvBadge}
                  ${variantsCount}
                  ${data.hidden ? '<span class="crm-badge" style="background: rgba(128,128,128,0.15); color: #ccc; border-color: rgba(128,128,128,0.3); font-size: 10px; padding: 2px 6px;">Hidden</span>' : ''}
                </div>
              </div>
              <div class="admin-menu-item-meta">
                <span class="admin-menu-item-price">$${typeof data.price === "number" ? data.price.toFixed(2) : data.price}</span>
                <span style="color: var(--text-muted); margin: 0 4px;">•</span>
                <span class="admin-menu-item-category">${escapeHtml(data.category || '')}</span>
              </div>
              <div class="admin-menu-item-desc">
                ${escapeHtml(descText)}
              </div>
              ${updatedAtHtml}
            </div>
          </div>
          <div class="admin-menu-item-actions">
            <button type="button" class="btn-primary btn-small btn-edit-dish" onclick="openEditMenuModal('${itemId}')" style="display: inline-flex; align-items: center; gap: 6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ui-icon ui-icon-no-margin"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> <span>Edit Dish</span>
            </button>
            <button type="button" class="btn-outline btn-small btn-delete-dish" onclick="deleteMenuItem('${itemId}')" title="Delete Dish" style="border-color: rgba(255,69,0,0.4); color: var(--accent-admin); display: inline-flex; align-items: center; justify-content: center;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ui-icon ui-icon-no-margin"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `;
    });
    adminMenuList.innerHTML = html;
    const totalCountEl = document.getElementById('admin-menu-total-count');
    if (totalCountEl) totalCountEl.textContent = `${snapshot.size} items`;
    renderMenuCategoryPills(Array.from(uniqueCats), snapshot.size);
    initMenuManagerUi();
    if (typeof window.populateDealSelects === 'function') window.populateDealSelects();
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
    renderTvLayout();
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
  document.getElementById("edit-menu-name_fa").value = data.name_fa || "";
  document.getElementById("edit-menu-price").value = data.price || "";
  document.getElementById("edit-menu-category").value = data.category || "platters";
  if (document.getElementById("edit-menu-meal-link")) {
    document.getElementById("edit-menu-meal-link").value = data.mealLinkId || "";
  }
  document.getElementById("edit-menu-img").value = data.img || data.image || data.imageUrl || "";
  document.getElementById("edit-menu-desc").value = data.desc || data.description || "";
  document.getElementById("edit-menu-desc_fa").value = data.desc_fa || "";
  document.getElementById("edit-menu-featured").checked = !!data.featured;
  document.getElementById("edit-menu-hidden").checked = !!data.hidden;
  
  const vContainer = document.getElementById('edit-variants-container');
  if (vContainer) {
    vContainer.innerHTML = '';
    (data.variants || []).forEach(v => createOptionRow('edit-variants', 'Variant', v.name, v.price));
  }
  
  const aContainer = document.getElementById('edit-addons-container');
  if (aContainer) {
    aContainer.innerHTML = '';
    (data.addOns || []).forEach(a => createOptionRow('edit-addons', 'Add-On', a.name, a.price));
  }
  
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
    const name_fa = document.getElementById("edit-menu-name_fa").value;
    const price = parseFloat(document.getElementById("edit-menu-price").value);
    const category = document.getElementById("edit-menu-category").value;
    const mealLinkId = document.getElementById("edit-menu-meal-link").value;
    let img = document.getElementById("edit-menu-img").value;
    const desc = document.getElementById("edit-menu-desc").value;
    const desc_fa = document.getElementById("edit-menu-desc_fa").value;
    const featured = document.getElementById("edit-menu-featured").checked;
    const hidden = document.getElementById("edit-menu-hidden").checked;
    
    try {
      const fileInput = document.getElementById('edit-menu-img-upload');
      if (fileInput.files.length > 0) {
        submitBtn.textContent = 'Uploading Image...';
        img = await uploadImageFile(fileInput.files[0]);
      }

      const variants = getBuilderOptions('edit-variants');
      const addOns = getBuilderOptions('edit-addons');

      await updateDoc(doc(db, "menu", id), {
        name,
        name_fa,
        price,
        category,
        mealLinkId,
        img,
        desc,
        desc_fa,
        featured: !!featured,
        hidden: !!hidden,
        variants,
        addOns,
        updatedAt: new Date().toISOString()
      });
      window.closeEditMenuModal();
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
// TV Layout Manager
// ==========================================
export function createTvDragItem(item, index = 0, total = 1) {
  const div = document.createElement('div');
  div.className = 'tv-drag-item';
  div.dataset.id = item.id;
  div.dataset.name = (item.name || '').toLowerCase();
  div.dataset.category = (item.category || '').toLowerCase();
  
  const isTv1 = item.tvScreen === 'TV1';
  const isTv2 = item.tvScreen === 'TV2';
  const isTvScreen = isTv1 || isTv2;
  const rank = index + 1;
  const isFirst = index === 0;
  const isLast = index >= total - 1;

  const imgHtml = item.img 
    ? `<img src="${item.img}" alt="${escapeHtml(item.name || '')}" class="tv-card-img" loading="lazy">` 
    : `<div class="tv-card-noimg"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M15 2v10a4 4 0 0 1-8 0V2"/><path d="M11 2v4"/><path d="M15 14v8"/><path d="M7 14v8"/></svg></div>`;

  div.innerHTML = `
    <div class="tv-card-main-row">
      <!-- Left: Rank + Thumbnail + Info -->
      <div class="tv-card-left">
        ${isTvScreen ? `<div class="tv-card-rank" title="Order #${rank}">#${rank}</div>` : ''}
        <div class="tv-card-thumb-wrap">
          ${imgHtml}
        </div>
        <div class="tv-card-info">
          <div class="tv-card-title" title="${escapeHtml(item.name || '')}">${escapeHtml(item.name || '')}</div>
          <div class="tv-card-meta">
            <span class="tv-card-price">$${typeof item.price === 'number' ? item.price.toFixed(2) : (item.price || '0.00')}</span>
            <span class="tv-card-dot">•</span>
            <span class="tv-card-cat">${escapeHtml(item.category || 'general')}</span>
          </div>
        </div>
      </div>

      <!-- Right: Touch Controls & Target Screen Actions -->
      <div class="tv-card-actions">
        ${isTvScreen ? `
        <div class="tv-order-group">
          <button type="button" class="tv-btn-order ${isFirst ? 'disabled' : ''}" onclick="event.stopPropagation(); window.moveItemOrder('${item.id}', -1)" title="Move up" ${isFirst ? 'disabled' : ''} aria-label="Move item up">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          <button type="button" class="tv-btn-order ${isLast ? 'disabled' : ''}" onclick="event.stopPropagation(); window.moveItemOrder('${item.id}', 1)" title="Move down" ${isLast ? 'disabled' : ''} aria-label="Move item down">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
        ` : ''}

        <div class="tv-move-group">
          ${!isTv1 ? `
          <button type="button" class="tv-pill-action tv-action-to-tv1" onclick="event.stopPropagation(); window.moveItemToScreen('${item.id}', 'TV1')" title="Assign to TV Screen 1">
            <span>${isTv2 ? 'TV 1' : '+ TV 1'}</span>
          </button>` : ''}

          ${!isTv2 ? `
          <button type="button" class="tv-pill-action tv-action-to-tv2" onclick="event.stopPropagation(); window.moveItemToScreen('${item.id}', 'TV2')" title="Assign to TV Screen 2">
            <span>${isTv1 ? 'TV 2' : '+ TV 2'}</span>
          </button>` : ''}

          ${isTvScreen ? `
          <button type="button" class="tv-pill-action tv-action-hide" onclick="event.stopPropagation(); window.moveItemToScreen('${item.id}', null)" title="Remove from TV screen" aria-label="Hide dish">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            <span class="tv-hide-label">Hide</span>
          </button>` : ''}
        </div>
      </div>
    </div>
  `;
  return div;
}

export function refreshTvRanks(listEl) {
  if (!listEl) return;
  const items = Array.from(listEl.children).filter(c => c.classList.contains('tv-drag-item'));
  items.forEach((itemEl, idx) => {
    const rankEl = itemEl.querySelector('.tv-card-rank');
    if (rankEl) rankEl.textContent = '#' + (idx + 1);
    
    const upBtn = itemEl.querySelector('.tv-btn-order:first-child');
    const downBtn = itemEl.querySelector('.tv-btn-order:last-child');
    if (upBtn) {
      if (idx === 0) {
        upBtn.classList.add('disabled');
        upBtn.disabled = true;
      } else {
        upBtn.classList.remove('disabled');
        upBtn.disabled = false;
      }
    }
    if (downBtn) {
      if (idx === items.length - 1) {
        downBtn.classList.add('disabled');
        downBtn.disabled = true;
      } else {
        downBtn.classList.remove('disabled');
        downBtn.disabled = false;
      }
    }
  });
}

window.moveItemOrder = (id, direction) => {
  const el = document.querySelector(`.tv-drag-item[data-id="${id}"]`);
  if (!el || !el.parentElement) return;
  const parent = el.parentElement;
  if (direction === -1) {
    const prev = el.previousElementSibling;
    if (prev && prev.classList.contains('tv-drag-item')) {
      parent.insertBefore(el, prev);
      refreshTvRanks(parent);
      saveTvLayout({ auto: true });
      updateTvCounts();
    }
  } else if (direction === 1) {
    const next = el.nextElementSibling;
    if (next && next.classList.contains('tv-drag-item')) {
      parent.insertBefore(next, el);
      refreshTvRanks(parent);
      saveTvLayout({ auto: true });
      updateTvCounts();
    }
  }
};

window.moveItemToScreen = async (id, targetScreen) => {
  const item = window.adminMenuData && window.adminMenuData[id];
  if (!item) return;
  
  const sourceEl = document.querySelector(`.tv-drag-item[data-id="${id}"]`);
  const sourceParent = sourceEl ? sourceEl.parentElement : null;
  if (sourceEl) sourceEl.remove();
  if (sourceParent) refreshTvRanks(sourceParent);

  item.tvScreen = targetScreen;
  
  const targetList = targetScreen === 'TV1' 
    ? document.getElementById('tv-screen-1')
    : (targetScreen === 'TV2' ? document.getElementById('tv-screen-2') : document.getElementById('tv-unassigned'));

  if (targetList) {
    const emptyState = targetList.querySelector('.tv-empty-state');
    if (emptyState) emptyState.remove();

    const existingCount = Array.from(targetList.children).filter(c => c.classList.contains('tv-drag-item')).length;
    const newEl = createTvDragItem(item, existingCount, existingCount + 1);
    targetList.appendChild(newEl);
    refreshTvRanks(targetList);
  }
  
  updateTvCounts();
  checkTvEmptyStates();
  saveTvLayout({ auto: true });
  showToast(`Moved "${item.name}" to ${targetScreen ? targetScreen : 'Off-Screen'}`);
};

export function checkTvEmptyStates(query = '') {
  ['tv-screen-1', 'tv-screen-2', 'tv-unassigned'].forEach(listId => {
    const list = document.getElementById(listId);
    if (!list) return;
    
    const existingEmpty = list.querySelector('.tv-empty-state');
    if (existingEmpty) existingEmpty.remove();

    const visibleItems = Array.from(list.children).filter(c => c.classList.contains('tv-drag-item') && c.style.display !== 'none');
    
    if (visibleItems.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'tv-empty-state';
      if (query) {
        emptyDiv.innerHTML = `
          <div class="tv-empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ui-icon ui-icon-no-margin"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
          <div class="tv-empty-title">No matching dishes</div>
          <div class="tv-empty-desc">No dishes match "${escapeHtml(query)}" in this list.</div>
        `;
      } else if (listId === 'tv-screen-1') {
        emptyDiv.innerHTML = `
          <div class="tv-empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ui-icon ui-icon-no-margin"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg></div>
          <div class="tv-empty-title">TV Screen 1 is empty</div>
          <div class="tv-empty-desc">Tap <strong>+ TV 1</strong> on any dish in Off-Screen to display it here.</div>
        `;
      } else if (listId === 'tv-screen-2') {
        emptyDiv.innerHTML = `
          <div class="tv-empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ui-icon ui-icon-no-margin"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg></div>
          <div class="tv-empty-title">TV Screen 2 is empty</div>
          <div class="tv-empty-desc">Tap <strong>+ TV 2</strong> on any dish in Off-Screen to display it here.</div>
        `;
      } else {
        emptyDiv.innerHTML = `
          <div class="tv-empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ui-icon ui-icon-no-margin"><circle cx="12" cy="12" r="10"/><polyline points="16 10 11 15 8 12"/></svg></div>
          <div class="tv-empty-title">All dishes assigned</div>
          <div class="tv-empty-desc">Every active menu item is currently assigned to a TV screen.</div>
        `;
      }
      list.appendChild(emptyDiv);
    }
  });
}

export function filterTvItems() {
  const searchInput = document.getElementById('tv-search-input');
  const clearBtn = document.getElementById('tv-search-clear-btn');
  const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
  
  if (clearBtn) {
    clearBtn.style.display = query ? 'flex' : 'none';
  }

  const allCards = document.querySelectorAll('.tv-drag-item');
  allCards.forEach(card => {
    if (!query) {
      card.style.display = '';
      return;
    }
    const name = card.dataset.name || '';
    const cat = card.dataset.category || '';
    if (name.includes(query) || cat.includes(query)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });

  checkTvEmptyStates(query);
}

export function initTvMobileTabs() {
  const tabs = document.querySelectorAll('.tv-mobile-tab');
  const container = document.querySelector('.tv-columns-container');
  const hintText = document.getElementById('tv-active-hint-text');
  if (!tabs.length || !container) return;
  
  const activateCol = (targetColId) => {
    tabs.forEach(t => {
      if (t.dataset.tab === targetColId) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });
    container.setAttribute('data-active-col', targetColId);
    
    if (hintText) {
      if (targetColId === 'tv-col-screen1') {
        hintText.textContent = 'Showing TV Screen 1 (Counter Left)';
      } else if (targetColId === 'tv-col-screen2') {
        hintText.textContent = 'Showing TV Screen 2 (Counter Right)';
      } else {
        hintText.textContent = 'Showing Off-Screen Dishes (Hidden Pool)';
      }
    }
    
    filterTvItems();
  };

  tabs.forEach(tab => {
    if (tab._hasTabListener) return;
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      activateCol(tab.dataset.tab);
    });
    tab._hasTabListener = true;
  });

  if (!container.getAttribute('data-active-col')) {
    container.setAttribute('data-active-col', 'tv-col-screen1');
  }
}

export function renderTvLayout() {
  const unassigned = document.getElementById('tv-unassigned');
  const tv1 = document.getElementById('tv-screen-1');
  const tv2 = document.getElementById('tv-screen-2');
  
  if (!unassigned || !tv1 || !tv2) return;
  
  unassigned.innerHTML = '';
  tv1.innerHTML = '';
  tv2.innerHTML = '';
  
  const items = Object.entries(window.adminMenuData || {}).map(([id, data]) => ({ id, ...data }));
  items.sort((a, b) => (a.tvOrder || 0) - (b.tvOrder || 0));
  
  const tv1Items = [];
  const tv2Items = [];
  const unassignedItems = [];

  items.forEach(item => {
    if (item.hidden && !item.tvScreen) return;
    if (item.tvScreen === 'TV1') {
      tv1Items.push(item);
    } else if (item.tvScreen === 'TV2') {
      tv2Items.push(item);
    } else {
      unassignedItems.push(item);
    }
  });

  tv1Items.forEach((item, index) => {
    tv1.appendChild(createTvDragItem(item, index, tv1Items.length));
  });

  tv2Items.forEach((item, index) => {
    tv2.appendChild(createTvDragItem(item, index, tv2Items.length));
  });

  unassignedItems.forEach((item, index) => {
    unassigned.appendChild(createTvDragItem(item, index, unassignedItems.length));
  });

  checkTvEmptyStates();
  updateTvCounts();
  initTvMobileTabs();
  setupTvLayoutListeners();
  filterTvItems();
}

export function updateTvCounts() {
  const unassignedEl = document.getElementById('tv-unassigned');
  const tv1El = document.getElementById('tv-screen-1');
  const tv2El = document.getElementById('tv-screen-2');

  const uCount = unassignedEl ? Array.from(unassignedEl.children).filter(c => c.classList.contains('tv-drag-item')).length : 0;
  const t1Count = tv1El ? Array.from(tv1El.children).filter(c => c.classList.contains('tv-drag-item')).length : 0;
  const t2Count = tv2El ? Array.from(tv2El.children).filter(c => c.classList.contains('tv-drag-item')).length : 0;
  
  const unassignedCount = document.getElementById('tv-unassigned-count');
  const tv1Count = document.getElementById('tv-screen-1-count');
  const tv2Count = document.getElementById('tv-screen-2-count');
  
  if (unassignedCount) unassignedCount.textContent = uCount;
  if (tv1Count) tv1Count.textContent = t1Count;
  if (tv2Count) tv2Count.textContent = t2Count;

  const bU = document.getElementById('tv-tab-badge-u');
  const b1 = document.getElementById('tv-tab-badge-1');
  const b2 = document.getElementById('tv-tab-badge-2');
  if (bU) bU.textContent = uCount;
  if (b1) b1.textContent = t1Count;
  if (b2) b2.textContent = t2Count;
}

let sortableSaveTimer = null;

export async function saveTvLayout(options = { auto: false }) {
  const saveBtn = document.getElementById('btn-save-tv-layout');
  const colSaveBtn = document.getElementById('btn-save-tv-layout-col');
  const statusPill = document.getElementById('tv-layout-status-pill');

  const setButtonsState = (text, disabled = false) => {
    if (saveBtn) { saveBtn.textContent = text; saveBtn.disabled = disabled; }
    if (colSaveBtn) { 
      const label = colSaveBtn.querySelector('span:last-child');
      if (label) label.textContent = text;
      else colSaveBtn.textContent = text;
      colSaveBtn.disabled = disabled; 
    }
  };

  const setStatus = (state, text) => {
    if (!statusPill) return;
    const textEl = statusPill.querySelector('.tv-status-indicator-text') || statusPill;
    const dotEl = statusPill.querySelector('.tv-status-indicator-dot');
    textEl.textContent = text;
    if (state === 'saving') {
      statusPill.style.borderColor = 'rgba(255, 183, 3, 0.4)';
      statusPill.style.background = 'rgba(255, 183, 3, 0.1)';
      if (dotEl) { dotEl.style.background = '#ffb703'; dotEl.style.boxShadow = '0 0 8px #ffb703'; }
      textEl.style.color = '#ffb703';
    } else if (state === 'saved') {
      statusPill.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      statusPill.style.background = 'rgba(16, 185, 129, 0.1)';
      if (dotEl) { dotEl.style.background = '#10b981'; dotEl.style.boxShadow = '0 0 8px #10b981'; }
      textEl.style.color = '#34d399';
    } else if (state === 'error') {
      statusPill.style.borderColor = 'rgba(239, 68, 68, 0.3)';
      statusPill.style.background = 'rgba(239, 68, 68, 0.1)';
      if (dotEl) { dotEl.style.background = '#ef4444'; dotEl.style.boxShadow = '0 0 8px #ef4444'; }
      textEl.style.color = '#f87171';
    }
  };

  setButtonsState('Saving...', true);
  setStatus('saving', 'Saving...');

  const t1List = document.getElementById('tv-screen-1');
  const t2List = document.getElementById('tv-screen-2');
  const uList = document.getElementById('tv-unassigned');

  const updates = [];

  if (t1List) {
    Array.from(t1List.children).forEach((el, index) => {
      if (el && el.dataset && el.dataset.id) {
        updates.push({ id: el.dataset.id, tvScreen: 'TV1', tvOrder: index });
      }
    });
  }

  if (t2List) {
    Array.from(t2List.children).forEach((el, index) => {
      if (el && el.dataset && el.dataset.id) {
        updates.push({ id: el.dataset.id, tvScreen: 'TV2', tvOrder: index });
      }
    });
  }

  if (uList) {
    Array.from(uList.children).forEach((el, index) => {
      if (el && el.dataset && el.dataset.id) {
        updates.push({ id: el.dataset.id, tvScreen: null, tvOrder: index });
      }
    });
  }

  if (updates.length === 0) {
    setButtonsState('Save TV Layout', false);
    setStatus('saved', 'Auto-saved');
    return;
  }

  try {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      const chunk = updates.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(u => {
        const itemRef = doc(db, 'menu', u.id);
        batch.update(itemRef, {
          tvScreen: u.tvScreen,
          tvOrder: u.tvOrder,
          updatedAt: new Date().toISOString()
        });
        if (window.adminMenuData && window.adminMenuData[u.id]) {
          window.adminMenuData[u.id].tvScreen = u.tvScreen;
          window.adminMenuData[u.id].tvOrder = u.tvOrder;
        }
      });
      await batch.commit();
    }

    setButtonsState('Saved!', false);
    setStatus('saved', 'Saved to TVs');
    showToast(options.auto ? 'TV Layout Auto-Saved!' : 'TV Layout Saved!');

    setTimeout(() => {
      setButtonsState('Save TV Layout', false);
      setStatus('saved', 'Auto-saved');
    }, 2000);
  } catch (e) {
    console.error('Error saving TV layout:', e);
    setButtonsState('Error', false);
    setStatus('error', 'Save error');
    showToast('Failed to save TV layout: ' + (e.message || 'Error'), true);
    setTimeout(() => {
      setButtonsState('Save TV Layout', false);
    }, 3000);
  }
}

export function initSortable() {
  const uList = document.getElementById('tv-unassigned');
  const t1List = document.getElementById('tv-screen-1');
  const t2List = document.getElementById('tv-screen-2');
  
  const SortableClass = typeof Sortable !== 'undefined' ? Sortable : window.Sortable;
  if (!SortableClass) {
    setTimeout(initSortable, 200);
    return;
  }

  if (uList && t1List && t2List) {
    if (!uList._sortableAttached) {
      const onSortEnd = () => {
        updateTvCounts();
        if (sortableSaveTimer) clearTimeout(sortableSaveTimer);
        sortableSaveTimer = setTimeout(() => {
          saveTvLayout({ auto: true });
        }, 300);
      };

      const opts = {
        group: 'shared',
        animation: 150,
        ghostClass: 'tv-drag-ghost',
        onEnd: onSortEnd
      };
      new SortableClass(uList, opts);
      new SortableClass(t1List, opts);
      new SortableClass(t2List, opts);
      uList._sortableAttached = true;
    }
  }
}

export function setupTvLayoutListeners() {
  initSortable();
  initTvMobileTabs();
  initTvDisplayControls();
  initTvSettingsAccordion();

  const searchInput = document.getElementById('tv-search-input');
  if (searchInput && !searchInput._hasSearchListener) {
    searchInput.addEventListener('input', () => filterTvItems());
    searchInput._hasSearchListener = true;
  }

  const clearBtn = document.getElementById('tv-search-clear-btn');
  if (clearBtn && !clearBtn._hasClearListener) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      filterTvItems();
    });
    clearBtn._hasClearListener = true;
  }

  const saveBtn = document.getElementById('btn-save-tv-layout');
  if (saveBtn && !saveBtn._hasSaveListener) {
    saveBtn.addEventListener('click', () => saveTvLayout({ auto: false }));
    saveBtn._hasSaveListener = true;
  }

  const colSaveBtn = document.getElementById('btn-save-tv-layout-col');
  if (colSaveBtn && !colSaveBtn._hasSaveListener) {
    colSaveBtn.addEventListener('click', () => saveTvLayout({ auto: false }));
    colSaveBtn._hasSaveListener = true;
  }
}

// Ensure listeners are hooked regardless of whether DOMContentLoaded already fired
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(setupTvLayoutListeners, 200);
  });
} else {
  setTimeout(setupTvLayoutListeners, 100);
}

// ==========================================
// TV Display & Scheduled Specials Settings
// ==========================================

function highlightActiveTheme(theme) {
  document.querySelectorAll('.tv-theme-option').forEach(el => {
    const isSelected = el.dataset.theme === theme;
    if (isSelected) {
      el.classList.add('active');
      el.style.borderColor = 'var(--accent, #ff4500)';
      el.style.background = 'rgba(255, 69, 0, 0.08)';
    } else {
      el.classList.remove('active');
      el.style.borderColor = 'var(--border-admin)';
      el.style.background = 'var(--surface-admin)';
    }
  });
}

export function updateTvSpecialLiveBadge(sp) {
  const badge = document.getElementById('tv-special-live-status');
  if (!badge) return;

  if (!sp || !sp.enabled) {
    badge.textContent = 'Disabled';
    badge.style.background = 'var(--border-admin)';
    badge.style.color = 'var(--text-muted)';
    return;
  }

  if (!sp.autoSchedule) {
    badge.textContent = 'Always Live';
    badge.style.background = 'rgba(16,185,129,0.15)';
    badge.style.color = '#10b981';
    return;
  }

  const now = new Date();
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const curDay = dayNames[now.getDay()];
  const curHour = now.getHours();

  const isDayMatch = !sp.days || sp.days.length === 0 || sp.days.includes(curDay);
  const isHourMatch = curHour >= (sp.startHour || 0) && curHour < (sp.endHour || 24);

  if (isDayMatch && isHourMatch) {
    badge.textContent = 'Live on TVs Now';
    badge.style.background = 'rgba(16,185,129,0.15)';
    badge.style.color = '#10b981';
  } else {
    const daysStr = (sp.days || []).map(d => d.toUpperCase()).join(',') || 'All';
    badge.textContent = `Inactive (${daysStr} ${sp.startHour}:00-${sp.endHour}:00)`;
    badge.style.background = 'rgba(245,158,11,0.15)';
    badge.style.color = '#f59e0b';
  }
}

export function loadTvDisplaySettings() {
  onSnapshot(doc(db, 'settings', 'tv_display'), (docSnap) => {
    if (!docSnap.exists()) return;
    const data = docSnap.data();

    // Theme
    if (data.theme) {
      const radio = document.querySelector(`input[name="tv-theme"][value="${data.theme}"]`);
      if (radio) {
        radio.checked = true;
        highlightActiveTheme(data.theme);
      }
    }

    // Animation
    if (data.animation) {
      const animEl = document.getElementById('tv-animation-style');
      if (animEl) animEl.value = data.animation;
    }

    // Cycle Speed
    if (data.cycleSpeed) {
      const speedEl = document.getElementById('tv-cycle-speed');
      const speedVal = document.getElementById('tv-speed-val');
      if (speedEl) speedEl.value = data.cycleSpeed;
      if (speedVal) speedVal.textContent = `${data.cycleSpeed}s`;
    }

    // Scheduled Specials
    if (data.scheduledSpecial) {
      const sp = data.scheduledSpecial;
      const enEl = document.getElementById('tv-special-enabled');
      const titleEl = document.getElementById('tv-special-title');
      const textEl = document.getElementById('tv-special-text');
      const autoEl = document.getElementById('tv-special-autoschedule');
      const startEl = document.getElementById('tv-special-start-hour');
      const endEl = document.getElementById('tv-special-end-hour');

      if (enEl) enEl.checked = !!sp.enabled;
      if (titleEl && sp.title !== undefined) titleEl.value = sp.title;
      if (textEl && sp.text !== undefined) textEl.value = sp.text;
      if (autoEl) autoEl.checked = sp.autoSchedule !== false;
      if (startEl && sp.startHour !== undefined) startEl.value = sp.startHour;
      if (endEl && sp.endHour !== undefined) endEl.value = sp.endHour;

      if (sp.days && Array.isArray(sp.days)) {
        document.querySelectorAll('#tv-schedule-days input[type="checkbox"]').forEach(cb => {
          cb.checked = sp.days.includes(cb.value);
        });
      }

      updateTvSpecialLiveBadge(sp);
    }
  }, (err) => {
    console.warn('tv_display listener notice:', err);
  });
}

export async function saveTvDisplaySettings() {
  const saveBtn = document.getElementById('btn-save-tv-display');
  if (saveBtn) {
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;
  }

  try {
    const selectedTheme = document.querySelector('input[name="tv-theme"]:checked')?.value || 'flame';
    const animation = document.getElementById('tv-animation-style')?.value || 'slide';
    const cycleSpeed = parseInt(document.getElementById('tv-cycle-speed')?.value, 10) || 12;

    const enabled = document.getElementById('tv-special-enabled')?.checked || false;
    const title = document.getElementById('tv-special-title')?.value || "TODAY'S SPECIAL";
    const text = document.getElementById('tv-special-text')?.value || '';
    const autoSchedule = document.getElementById('tv-special-autoschedule')?.checked ?? true;
    const startHour = parseInt(document.getElementById('tv-special-start-hour')?.value, 10) || 11;
    const endHour = parseInt(document.getElementById('tv-special-end-hour')?.value, 10) || 15;

    const days = [];
    document.querySelectorAll('#tv-schedule-days input[type="checkbox"]:checked').forEach(cb => {
      days.push(cb.value);
    });

    const payload = {
      theme: selectedTheme,
      animation,
      cycleSpeed,
      scheduledSpecial: {
        enabled,
        title,
        text,
        autoSchedule,
        days,
        startHour,
        endHour
      },
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'settings', 'tv_display'), payload, { merge: true });
    try {
      await saveTvLayout({ auto: true });
    } catch (layoutErr) {
      console.warn('Could not auto-save layout alongside display settings:', layoutErr);
    }
    showToast('TV Display & Layout saved!');
    updateTvSpecialLiveBadge(payload.scheduledSpecial);
  } catch (err) {
    console.error('Error saving TV display settings:', err);
    showToast('Error saving TV display settings', true);
  } finally {
    if (saveBtn) {
      saveBtn.textContent = 'Save TV Display Settings';
      saveBtn.disabled = false;
    }
  }
}

function initTvDisplayControls() {
  const saveDisplayBtn = document.getElementById('btn-save-tv-display');
  if (saveDisplayBtn) {
    saveDisplayBtn.addEventListener('click', saveTvDisplaySettings);
  }

  // Theme option clicks
  document.querySelectorAll('.tv-theme-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const radio = opt.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        highlightActiveTheme(radio.value);
      }
    });
  });

  // Cycle speed change
  const speedSelect = document.getElementById('tv-cycle-speed');
  const speedVal = document.getElementById('tv-speed-val');
  if (speedSelect && speedVal) {
    speedSelect.addEventListener('change', () => {
      speedVal.textContent = `${speedSelect.value}s`;
    });
  }

  // Auto-schedule toggle toggles time fields
  const autoCheckbox = document.getElementById('tv-special-autoschedule');
  const timeFields = document.getElementById('tv-schedule-time-fields');
  if (autoCheckbox && timeFields) {
    autoCheckbox.addEventListener('change', () => {
      timeFields.style.opacity = autoCheckbox.checked ? '1' : '0.4';
      timeFields.style.pointerEvents = autoCheckbox.checked ? 'auto' : 'none';
    });
  }

  // Live status update on changes
  const updateCurrentLiveBadge = () => {
    const enabled = document.getElementById('tv-special-enabled')?.checked || false;
    const autoSchedule = document.getElementById('tv-special-autoschedule')?.checked ?? true;
    const startHour = parseInt(document.getElementById('tv-special-start-hour')?.value, 10) || 11;
    const endHour = parseInt(document.getElementById('tv-special-end-hour')?.value, 10) || 15;
    const days = [];
    document.querySelectorAll('#tv-schedule-days input[type="checkbox"]:checked').forEach(cb => {
      days.push(cb.value);
    });
    updateTvSpecialLiveBadge({ enabled, autoSchedule, startHour, endHour, days });
  };

  document.getElementById('tv-special-enabled')?.addEventListener('change', updateCurrentLiveBadge);
  document.getElementById('tv-special-autoschedule')?.addEventListener('change', updateCurrentLiveBadge);
  document.getElementById('tv-special-start-hour')?.addEventListener('change', updateCurrentLiveBadge);
  document.getElementById('tv-special-end-hour')?.addEventListener('change', updateCurrentLiveBadge);
  document.querySelectorAll('#tv-schedule-days input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', updateCurrentLiveBadge);
  });
}



let currentCategoryFilter = 'all';

export function renderMenuCategoryPills(categories, totalCount) {
  const container = document.getElementById('admin-menu-category-pills');
  if (!container) return;

  const counts = { all: totalCount };
  Object.values(window.adminMenuData || {}).forEach(item => {
    const cat = (item.category || '').toLowerCase().trim();
    if (cat) counts[cat] = (counts[cat] || 0) + 1;
  });

  const sortedCats = ['all', ...categories.sort()];
  
  container.innerHTML = sortedCats.map(cat => {
    const count = counts[cat] || 0;
    const label = cat === 'all' ? `All (${totalCount})` : `${cat.charAt(0).toUpperCase() + cat.slice(1)} (${count})`;
    const isActive = (currentCategoryFilter === cat) ? ' active' : '';
    return `<button type="button" class="admin-cat-pill${isActive}" data-category="${escapeHtml(cat)}">${label}</button>`;
  }).join('');

  container.querySelectorAll('.admin-cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.admin-cat-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategoryFilter = btn.dataset.category || 'all';
      filterAdminMenuItems();
    });
  });
}

export function filterAdminMenuItems() {
  const q = (document.getElementById('admin-menu-search')?.value || '').toLowerCase().trim();
  const cards = document.querySelectorAll('.admin-menu-item-card');
  let visibleCount = 0;

  cards.forEach(card => {
    const title = card.querySelector('.admin-menu-item-title')?.textContent?.toLowerCase() || '';
    const cat = (card.dataset.category || '').toLowerCase();
    const desc = card.querySelector('.admin-menu-item-desc')?.textContent?.toLowerCase() || '';

    const matchesSearch = !q || title.includes(q) || cat.includes(q) || desc.includes(q);
    const matchesCategory = currentCategoryFilter === 'all' || cat === currentCategoryFilter;

    const visible = matchesSearch && matchesCategory;
    card.style.display = visible ? '' : 'none';
    if (visible) visibleCount++;
  });

  const badge = document.getElementById('admin-menu-total-count');
  if (badge) badge.textContent = `${visibleCount} items`;
}

export function initMenuManagerUi() {
  const toggleBtn = document.getElementById('btn-toggle-add-dish');
  const closeBtn = document.getElementById('btn-close-add-dish');
  const panel = document.getElementById('add-menu-panel');
  const icon = document.getElementById('toggle-add-dish-icon');
  const text = document.getElementById('toggle-add-dish-text');

  if (toggleBtn && panel && !toggleBtn._hasToggle) {
    toggleBtn.addEventListener('click', () => {
      const isVisible = panel.style.display !== 'none';
      panel.style.display = isVisible ? 'none' : 'block';
      if (icon) icon.innerHTML = isVisible ? iconPlus(16, 'ui-icon ui-icon-no-margin') : iconX(16, 'ui-icon ui-icon-no-margin');
      if (text) text.textContent = isVisible ? 'Add New Dish' : 'Close Form';
      if (!isVisible) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.getElementById('menu-name')?.focus();
      }
    });
    toggleBtn._hasToggle = true;
  }

  if (closeBtn && panel && !closeBtn._hasClose) {
    closeBtn.addEventListener('click', () => {
      panel.style.display = 'none';
      if (icon) icon.innerHTML = iconPlus(16, 'ui-icon ui-icon-no-margin');
      if (text) text.textContent = 'Add New Dish';
    });
    closeBtn._hasClose = true;
  }

  // Live filter search
  const searchInput = document.getElementById('admin-menu-search');
  if (searchInput && !searchInput._hasSearch) {
    searchInput.addEventListener('input', () => {
      filterAdminMenuItems();
    });
    searchInput._hasSearch = true;
  }
}

export function initTvSettingsAccordion() {
  const header = document.getElementById('tv-settings-toggle-header');
  const btn = document.getElementById('btn-toggle-tv-settings');
  const body = document.getElementById('tv-settings-body');
  const icon = document.getElementById('tv-settings-toggle-icon');

  if (!header || !body) return;

  // On mobile (screen width <= 768px), collapse by default; on desktop keep open
  if (!body._hasInitializedDisplay) {
    const isMobile = window.innerWidth <= 768;
    body.style.display = isMobile ? 'none' : 'flex';
    if (icon) icon.textContent = isMobile ? 'Options' : 'Close';
    body._hasInitializedDisplay = true;
  }

  const toggle = (e) => {
    if (e) e.preventDefault();
    const isVisible = body.style.display !== 'none';
    body.style.display = isVisible ? 'none' : 'flex';
    if (icon) icon.textContent = isVisible ? 'Options' : 'Close';
  };

  if (!header._hasAccordion) {
    header.addEventListener('click', toggle);
    header._hasAccordion = true;
  }
  if (btn && !btn._hasAccordion) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle(e);
    });
    btn._hasAccordion = true;
  }
}

// Auto-run UI setup on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initMenuManagerUi();
    initTvSettingsAccordion();
  });
} else {
  initMenuManagerUi();
  initTvSettingsAccordion();
}
