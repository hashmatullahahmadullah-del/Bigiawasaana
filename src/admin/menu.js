import { db, storage } from '../firebase.js';
import { collection, query, doc, updateDoc, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';



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

// Compress and resize image to exactly 800x450 (16:9) with padding
export async function compressImage(file, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const targetWidth = 800;
    const targetHeight = 450;
    
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
  div.style.display = 'flex';
  div.style.gap = '8px';
  div.innerHTML = `
    <input type="text" class="opt-name" placeholder="${type} Name" value="${name}" style="flex: 2; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
    <input type="number" step="0.01" class="opt-price" placeholder="Price ($)" value="${price}" style="flex: 1; padding: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--white); border-radius: 4px;">
    <button type="button" class="btn-outline" onclick="this.parentElement.remove()" style="padding: 0 12px; color: #ff5252; border-color: #ff5252;">×</button>
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
  
  const q = query(collection(db, "menu"));
  const snapshot = await getDocs(q);
  const meals = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.category === 'bigi street meals') {
      meals.push({ id: doc.id, name: data.name });
    }
  });
  
  meals.sort((a, b) => a.name.localeCompare(b.name));
  
  const optionsHtml = '<option value="">No Meal Upgrade (or auto-match)</option>' + 
    meals.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    
  if (addSelect) addSelect.innerHTML = optionsHtml;
  if (editSelect) editSelect.innerHTML = optionsHtml;
}

document.addEventListener("DOMContentLoaded", () => {
  populateMealLinks();
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
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const itemId = docSnap.id;
      window.adminMenuData[itemId] = data;
      const descText = data.desc || data.description || '';
      const imgHtml = data.img ? `<img src="${data.img}" alt="${data.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px; flex-shrink: 0; border: 1px solid var(--border);">` : `<div style="width: 80px; height: 80px; background: var(--bg); border: 1px dashed var(--border); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--gray); font-size: 10px; text-align: center; flex-shrink: 0;">No Image</div>`;
      const updatedAtHtml = data.updatedAt ? `<div style="color: var(--gray); font-size: 11px; margin-top: 8px;">Updated: ${new Date(data.updatedAt).toLocaleString()}</div>` : '';
      
      html += `
        <div style="background: var(--bg); border: 1px solid var(--border); padding: 16px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; gap: 16px;">
          ${imgHtml}
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <strong style="font-size: 16px; color: var(--white);">${data.name}</strong>
              ${data.featured ? '<span style="background: rgba(255,215,0,0.15); color: #FFD700; font-size: 10px; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255,215,0,0.3); font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">⭐ Featured</span>' : ''}
              ${data.hidden ? '<span style="background: rgba(128,128,128,0.15); color: #ccc; font-size: 10px; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(128,128,128,0.3); font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">🙈 Hidden</span>' : ''}
            </div>
            <div style="color: var(--gray); font-size: 12px; margin-bottom: 6px;">
              $${typeof data.price === "number" ? data.price.toFixed(2) : data.price} • <span style="text-transform: capitalize;">${data.category}</span>
            </div>
            <div style="color: #888; font-size: 13px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${descText}
            </div>
            ${updatedAtHtml}
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-outline btn-small" onclick="openEditMenuModal('${itemId}')" style="padding: 6px 12px; font-size: 12px;">Edit</button>
            <button class="btn-outline btn-small" onclick="deleteMenuItem('${itemId}')" style="padding: 6px 12px; font-size: 12px; border-color: rgba(255,69,0,0.4); color: var(--accent);">Delete</button>
          </div>
        </div>
      `;
    });
    adminMenuList.innerHTML = html;
    if (typeof window.populateDealSelects === 'function') window.populateDealSelects();
    if (typeof window.renderEconomics === 'function') window.renderEconomics();
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

