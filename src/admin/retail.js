import { db } from '../firebase.js';
import { storage } from '../storage.js';
import { collection, addDoc, doc, deleteDoc, updateDoc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { compressImage } from './menu.js';
import { escapeHtml } from './shared.js';

let retailItems = [];
let editingRetailId = null;

const addForm = document.getElementById('add-retail-form');
const imgUpload = document.getElementById('retail-img-upload');
const fileNameDisplay = document.getElementById('retail-img-filename');
const imgUrlInput = document.getElementById('retail-img');
const toggleAddRetailBtn = document.getElementById('toggle-add-retail-btn');
const addRetailChevron = document.getElementById('add-retail-chevron');
if (toggleAddRetailBtn && addForm) {
  toggleAddRetailBtn.addEventListener('click', () => {
    const isHidden = addForm.style.display === 'none' || getComputedStyle(addForm).display === 'none';
    addForm.style.display = isHidden ? 'flex' : 'none';
    if (addRetailChevron) addRetailChevron.textContent = isHidden ? '▲' : '▼';
  });
}


if (addForm) {
  if (imgUpload && fileNameDisplay) {
    imgUpload.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        fileNameDisplay.textContent = e.target.files[0].name;
        imgUrlInput.value = ''; 
        imgUrlInput.disabled = true;
      } else {
        fileNameDisplay.textContent = 'No file chosen';
        imgUrlInput.disabled = false;
      }
    });
  }

  // Real-time listener for retail items
  const q = query(collection(db, 'retail_items'), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snapshot) => {
    retailItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderRetailItems();
  }, (err) => {
    console.warn('retail_items notice:', err);
  });

  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = addForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = editingRetailId ? 'Updating...' : 'Adding...';

    try {
      const name = document.getElementById('retail-name').value.trim();
      const price = parseFloat(document.getElementById('retail-price').value);
      const desc = document.getElementById('retail-desc').value.trim();
      const weight = parseFloat(document.getElementById('retail-weight').value) || 0;
      const sku = document.getElementById('retail-sku').value.trim();
      
      let imageUrl = imgUrlInput.value.trim();
      
      if (imgUpload && imgUpload.files.length > 0) {
        const file = imgUpload.files[0];
        const compressedFile = await compressImage(file, 800, 0.8);
        const storageRef = ref(storage, `img/retail/${Date.now()}_${compressedFile.name}`);
        const snapshot = await uploadBytes(storageRef, compressedFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      if (editingRetailId) {
        const updatePayload = {
          name,
          price,
          description: desc,
          weight,
          sku,
          updatedAt: serverTimestamp()
        };
        if (imageUrl) updatePayload.image = imageUrl;
        await updateDoc(doc(db, 'retail_items', editingRetailId), updatePayload);
        alert('Retail item updated successfully!');
        resetRetailForm();
      } else {
        await addDoc(collection(db, 'retail_items'), {
          name,
          price,
          description: desc,
          weight,
          sku,
          image: imageUrl,
          createdAt: serverTimestamp()
        });
        alert('Retail item added successfully!');
        resetRetailForm();
      }
    } catch (error) {
      console.error('Error saving retail item:', error);
      alert('Failed to save item. See console for details.');
    } finally {
      btn.disabled = false;
      btn.textContent = editingRetailId ? 'Update Retail Item' : 'Add Retail Item';
    }
  });
}

function resetRetailForm() {
  editingRetailId = null;
  if (!addForm) return;
  addForm.reset();
  if (imgUpload) {
    imgUpload.value = '';
    fileNameDisplay.textContent = 'No file chosen';
    imgUrlInput.disabled = false;
  }
  const submitBtn = addForm.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.textContent = 'Add Retail Item';
  const cancelBtn = document.getElementById('cancel-retail-edit-btn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  const title = document.getElementById('add-retail-title-text');
  if (title) title.textContent = 'Add Retail Item';
}

function renderRetailItems() {
  const container = document.getElementById('retail-list');
  if (!container) return;
  
  if (retailItems.length === 0) {
    container.innerHTML = '<p style="color: var(--gray); text-align: center; padding: 24px;">No retail items found.</p>';
    return;
  }

  container.innerHTML = retailItems.map(item => `
    <div class="retail-item-card">
      <div class="retail-item-top">
        ${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.name)}" style="width: 70px; height: 70px; min-width: 70px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-admin);">` : '<div style="width: 70px; height: 70px; min-width: 70px; background: var(--surface-admin); border-radius: 8px; border: 1px solid var(--border-admin); display: flex; align-items: center; justify-content: center; color: var(--accent);"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div>'}
        <div style="flex: 1; min-width: 0;">
          <h4 style="margin: 0; font-family: 'Barlow Condensed'; font-size: 18px; word-break: break-word;">${escapeHtml(item.name)}</h4>
          <p style="color: var(--accent); font-weight: bold; margin: 4px 0; font-size: 15px;">${typeof item.price === 'number' ? item.price.toFixed(2) : item.price} &nbsp;&bull;&nbsp; <span style="color: var(--text-muted); font-weight: normal; font-size: 13px;">${item.weight || 0} oz</span></p>
          ${item.sku ? `<p style="color: var(--text-muted); font-size: 12px; margin: 0;">SKU: ${escapeHtml(item.sku)}</p>` : ''}
        </div>
      </div>
      <div class="retail-item-actions">
        <button onclick="editRetailItem('${item.id}')" class="btn-outline btn-small" style="padding: 8px 14px;">Edit</button>
        <button onclick="deleteRetailItem('${item.id}', '${item.image || ''}')" class="btn-outline btn-small" style="color: var(--danger); border-color: rgba(239, 68, 68, 0.4); padding: 8px 14px;">Delete</button>
      </div>
    </div>
  `).join('');
}

window.editRetailItem = (id) => {
  const item = retailItems.find(i => i.id === id);
  if (!item || !addForm) return;
  
  editingRetailId = item.id;
  document.getElementById('retail-name').value = item.name || '';
  document.getElementById('retail-price').value = item.price || '';
  document.getElementById('retail-weight').value = item.weight || '';
  document.getElementById('retail-sku').value = item.sku || '';
  document.getElementById('retail-desc').value = item.description || '';
  document.getElementById('retail-img').value = item.image || '';
  
  const submitBtn = addForm.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.textContent = 'Update Retail Item';
  
  if (addForm) addForm.style.display = 'flex';
  const chevron = document.getElementById('add-retail-chevron');
  if (chevron) chevron.textContent = '▲';
  const title = document.getElementById('add-retail-title-text');
  if (title) title.textContent = `Edit Retail Item: ${item.name}`;

  let cancelBtn = document.getElementById('cancel-retail-edit-btn');
  if (!cancelBtn) {
    cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.id = 'cancel-retail-edit-btn';
    cancelBtn.className = 'btn-outline';
    cancelBtn.textContent = 'Cancel Edit';
    cancelBtn.style.marginTop = '8px';
    cancelBtn.addEventListener('click', resetRetailForm);
    submitBtn.insertAdjacentElement('afterend', cancelBtn);
  }
  cancelBtn.style.display = 'inline-block';
  addForm.scrollIntoView({ behavior: 'smooth' });
};

window.deleteRetailItem = async (id, imageUrl) => {
  if (!confirm('Are you sure you want to delete this retail item?')) return;
  try {
    if (imageUrl && imageUrl.includes('firebasestorage')) {
      const pathStartIndex = imageUrl.indexOf('/o/') + 3;
      const pathEndIndex = imageUrl.indexOf('?');
      if (pathStartIndex > 2 && pathEndIndex > -1) {
        const imagePath = decodeURIComponent(imageUrl.substring(pathStartIndex, pathEndIndex));
        const storageRef = ref(storage, imagePath);
        await deleteObject(storageRef).catch(e => console.warn('Could not delete image:', e));
      }
    }
    await deleteDoc(doc(db, 'retail_items', id));
  } catch (error) {
    console.error('Error deleting retail item:', error);
    alert('Failed to delete item.');
  }
};
