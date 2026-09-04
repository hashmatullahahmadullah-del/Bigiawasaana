import { compressImage } from './menu.js';
import { showToast } from './orders.js';
import { escapeHtml } from './shared.js';
import { app, db, storage } from '../firebase.js';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc, setDoc, deleteDoc, serverTimestamp, limit } from 'firebase/firestore';
import { ref, uploadBytes, deleteObject } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Chart from 'chart.js/auto';


export function loadAnalytics() {
  const aq = query(collection(db, 'page_views'), orderBy('timestamp', 'desc'), limit(5000));
  
  if (window.analyticsUnsub) window.analyticsUnsub();
  
  window.analyticsUnsub = onSnapshot(aq, (snapshot) => {
    // Read date filter
    const filterEl = document.getElementById('analytics-date-filter');
    const filterVal = filterEl ? filterEl.value : 'all';
    
    let cutoffDate = null;
    if (filterVal !== 'all') {
      cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(filterVal));
      cutoffDate.setHours(0, 0, 0, 0);
    }
    
    let totalViews = 0;
    let blogViews = 0;
    let menuViews = 0;
    
    const pageCounts = {};
    const referrerCounts = {};
    
    snapshot.forEach(d => {
      const data = d.data();
      
      // Date filtering
      if (cutoffDate && data.timestamp) {
        const viewDate = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
        if (viewDate < cutoffDate) return;
      }
      
      totalViews++;
      
      const path = data.path || '/';
      const referrer = data.referrer || 'Direct';
      
      // Categorize
      if (path.startsWith('/blog/')) {
        blogViews++;
      }
      if (path.startsWith('/menu')) {
        menuViews++;
      }
      
      // Tally pages
      pageCounts[path] = (pageCounts[path] || 0) + 1;
      
      // Tally referrers (clean up referrers a bit)
      let cleanRef = referrer;
      try {
        if (referrer !== 'Direct' && referrer !== 'Internal') {
          const url = new URL(referrer);
          cleanRef = url.hostname; // e.g. www.google.com
        }
      } catch(e) { console.warn(e); }
      
      referrerCounts[cleanRef] = (referrerCounts[cleanRef] || 0) + 1;
    });
    
    // Update Stats
    document.getElementById('analytics-total-views').textContent = totalViews;
    document.getElementById('analytics-blog-views').textContent = blogViews;
    document.getElementById('analytics-menu-views').textContent = menuViews;
    
    // Render Top Pages
    const sortedPages = Object.keys(pageCounts).map(p => ({ path: p, count: pageCounts[p] })).sort((a, b) => b.count - a.count).slice(0, 10);
    const topPagesTbody = document.getElementById('analytics-top-pages');
    if (sortedPages.length === 0) {
      topPagesTbody.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 16px; color: var(--gray);">No data for this period</td></tr>`;
    } else {
      topPagesTbody.innerHTML = sortedPages.map(sp => `
        <tr style="border-bottom: 1px solid var(--border);">
          <td data-label="URL Path" style="padding: 12px 0;">${sp.path}</td>
          <td data-label="Views" style="padding: 12px 0; text-align: right; color: var(--accent); font-weight: 600;">${sp.count}</td>
        </tr>
      `).join('');
    }
    
    // Render Top Referrers
    const sortedRefs = Object.keys(referrerCounts).map(r => ({ ref: r, count: referrerCounts[r] })).sort((a, b) => b.count - a.count).slice(0, 10);
    const topRefsTbody = document.getElementById('analytics-top-sources');
    if (sortedRefs.length === 0) {
      topRefsTbody.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 16px; color: var(--gray);">No data for this period</td></tr>`;
    } else {
      topRefsTbody.innerHTML = sortedRefs.map(sr => `
        <tr style="border-bottom: 1px solid var(--border);">
          <td data-label="Source" style="padding: 12px 0; text-transform: capitalize;">${sr.ref.replace('www.', '')}</td>
          <td data-label="Visits" style="padding: 12px 0; text-align: right; color: var(--accent); font-weight: 600;">${sr.count}</td>
        </tr>
      `).join('');
    }
  });
}

window.loadAnalytics = loadAnalytics;

// Expense Capture Logic
{
  const cameraInput = document.getElementById("receipt-upload-input");
  const galleryInput = null;
  const statusEl = document.getElementById("expense-upload-text") || { textContent: "" };
  const reviewSection = document.getElementById("review-section");
  const reviewMeta = document.getElementById("review-meta");
  const reviewTbody = document.getElementById("review-tbody");
  const confirmBtn = document.getElementById("confirm-expense-btn");
  const receiptActions = document.getElementById("receipt-actions");
  const retakeBtn = document.getElementById("receipt-retake-btn");
  const deleteBtn = document.getElementById("receipt-delete-btn");

  // Compress image client-side before uploading (faster transfer + faster Gemini parsing)
  const localCompressImage = (file, maxWidth = 1600, quality = 0.7) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxWidth) {
            h = Math.round((h * maxWidth) / w);
            w = maxWidth;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/webp', quality);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  if (cameraInput || galleryInput) {
    let currentExpenseId = null;
    let currentItems = [];
    let currentStoragePath = null;

    let isProcessingBatch = false;

    let autoSaveInterval = null;
    let autoSaveCountdown = 10;
    
    window.openDraftReview = (id, autoSave = false) => {
      const draftData = window[`draft_data_${id}`];
      if (draftData) {
        currentExpenseId = draftData.id;
        currentItems = draftData.items || [];
        currentStoragePath = draftData.rawImageUrl || draftData._storagePath;
        renderReview(draftData);
        if (statusEl) statusEl.textContent = `Draft opened for review.`;
        if (receiptActions) receiptActions.style.display = "flex";
        reviewSection.style.display = 'flex';
          setTimeout(() => reviewSection.classList.add('open'), 10);
        
        if (autoSave) {
          // Start Auto-Save Countdown
          if (autoSaveInterval) clearInterval(autoSaveInterval);
          autoSaveCountdown = 10;
          confirmBtn.textContent = `Confirm & Save Expense (${autoSaveCountdown}s)`;
          
          autoSaveInterval = setInterval(() => {
            autoSaveCountdown--;
            if (autoSaveCountdown > 0) {
              confirmBtn.textContent = `Confirm & Save Expense (${autoSaveCountdown}s)`;
            } else {
              clearInterval(autoSaveInterval);
              confirmBtn.textContent = `Confirm & Save Expense`;
              confirmBtn.click(); // Auto-trigger save
            }
          }, 1000);
        } else {
          if (autoSaveInterval) clearInterval(autoSaveInterval);
          confirmBtn.textContent = `Confirm & Save Expense`;
        }
      }
    };


    const handleFilesSelected = async (files) => {
      if (!files || files.length === 0) return;
      
      if (isProcessingBatch) {
        alert("Already processing a batch. Please wait.");
        return;
      }
      isProcessingBatch = true;
      
      const uploadProgress = document.getElementById('expense-upload-progress');
      const uploadText = document.getElementById('expense-upload-text');
      if (uploadProgress) {
        uploadProgress.style.display = 'block';
        uploadProgress.classList.add('uploading-pulse');
      }
      
      if (receiptActions) receiptActions.style.display = "none";
      reviewSection.classList.remove('open');
      setTimeout(() => reviewSection.style.display = 'none', 300);
      let successCount = 0;
      let failCount = 0;
      let duplicateCount = 0;
        
      // Convert FileList to a static array immediately to prevent mutation if the input is cleared
      const filesArray = Array.from(files);
      const originalFileCount = filesArray.length;
        
      for (let i = 0; i < originalFileCount; i++) {
        const file = filesArray[i];
        if (!file) continue; // safety check
        if (uploadText) uploadText.innerHTML = `<div class="loading-spinner"></div>Processing receipt ${i + 1} of ${originalFileCount}... (Compressing)`;
        try {
          const compressed = await localCompressImage(file);
          if (uploadText) uploadText.innerHTML = `<div class="loading-spinner"></div>Processing receipt ${i + 1} of ${originalFileCount}... (Uploading)`;
          const timestamp = Date.now() + i;
          const path = `receipts/unsorted/${timestamp}_receipt.webp`;
          const storageReference = ref(storage, path);
          await uploadBytes(storageReference, compressed, { contentType: 'image/webp' });
          
          if (uploadText) uploadText.innerHTML = `<div class="loading-spinner"></div>Processing receipt ${i + 1} of ${files.length}... (AI Parsing - this takes 5-10 seconds)`;
          const functions = getFunctions(app);
          const parseReceipt = httpsCallable(functions, 'parseReceipt');
          const result = await parseReceipt({ storagePath: path });
          
          if (result.data && result.data.duplicate) {
               duplicateCount++;
               try { await deleteObject(storageReference); } catch(e) {}
               const dupModal = document.getElementById('duplicate-warning-modal');
               if (dupModal) {
                 document.getElementById('dup-modal-vendor').textContent = result.data.vendor || 'Unknown Vendor';
                 document.getElementById('dup-modal-total').textContent = result.data.total != null ? '$' + parseFloat(result.data.total).toFixed(2) : '---';
                 dupModal.style.display = 'flex';
                 setTimeout(() => dupModal.classList.add('open'), 10);
               } else {
                 showToast(`Duplicate receipt rejected for ${result.data.vendor}`);
               }
            } else if (result.data) {
              successCount++;
              // Using originalFileCount because files (FileList) is mutated to length 0 when input.value is cleared!
              if (originalFileCount === 1 && result.data.id) {
                 window[`draft_data_${result.data.id}`] = result.data;
                 window.openDraftReview(result.data.id, true);
              }
            }
        } catch (err) {
          console.error('Error processing file', i, err);
          failCount++;
        }
      }
      
      isProcessingBatch = false;
      if (uploadProgress) {
        uploadProgress.style.display = 'none';
        uploadProgress.classList.remove('uploading-pulse');
      }
      
      if (duplicateCount > 0) {
        showToast(`Rejected ${duplicateCount} duplicate receipt(s)`);
      }
      if (successCount > 0) {
        showToast(`Batch complete. ${successCount} processed. Check Pending Receipts.`);
      } else if (failCount > 0) {
        showToast(`Batch failed. Could not process any receipts.`);
      }
    };


      if (cameraInput) {
        cameraInput.addEventListener("change", (e) => {
          handleFilesSelected(e.target.files);
          cameraInput.value = "";
        });
      }
      if (galleryInput) {
        galleryInput.addEventListener("change", (e) => {
          handleFilesSelected(e.target.files);
          galleryInput.value = "";
        });
      }

    const renderReview = (data) => {
      reviewMeta.innerHTML = `
        <strong>Vendor:</strong> ${data.vendor || "Unknown"} &nbsp;
        <strong>Total:</strong> ${data.total != null ? parseFloat(data.total).toFixed(2) : "\u2014"} &nbsp;
        ${data.needsReview ? '<span style="color:#b00;">\u26a0 Needs review</span>' : ""}
      `;

      let ingredientOptions = `<option value="">-- No Link --</option>`;
      if (window.adminMenuData) {
        Object.keys(window.adminMenuData).forEach(key => {
           ingredientOptions += `<option value="${key}">${escapeHtml(window.adminMenuData[key].name || key)}</option>`;
        });
      }

      const categories = ['protein', 'produce', 'packaging', 'dry goods', 'other'];

      reviewTbody.innerHTML = "";
      currentItems.forEach((item, idx) => {
        let catOptions = '';
        categories.forEach(c => {
           catOptions += `<option value="${c}" ${item.category === c ? 'selected' : ''}>${c}</option>`;
        });

        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid var(--border)";
        tr.innerHTML = `
          <td style="padding:6px 4px;"><input class="item-name-input" data-idx="${idx}" data-field="name" value="${escapeHtml(item.name)}" style="width:100%; border:1px solid var(--border); border-radius:4px; padding:4px; background: var(--bg); color: var(--white);" /></td>
          <td style="padding:6px 4px; display: flex; flex-direction: column; gap: 4px;">
            <select class="item-cat-input" data-idx="${idx}" data-field="category" style="width:100%; border:1px solid var(--border); border-radius:4px; padding:4px; background: var(--bg); color: var(--white);">${catOptions}</select>
            <select class="item-link-input" data-idx="${idx}" data-field="matchedMenuIngredient" style="width:100%; border:1px solid var(--border); border-radius:4px; padding:4px; background: var(--bg); color: var(--white);">${ingredientOptions}</select>
          </td>
          <td style="padding:6px 4px;"><input data-idx="${idx}" data-field="quantity" value="${item.quantity}" type="number" style="width:50px; border:1px solid var(--border); border-radius:4px; padding:4px; background: var(--bg); color: var(--white);" /></td>
          <td style="padding:6px 4px;"><input data-idx="${idx}" data-field="unitPrice" value="${item.unitPrice}" type="number" step="0.01" style="width:60px; border:1px solid var(--border); border-radius:4px; padding:4px; background: var(--bg); color: var(--white);" /></td>
          <td style="padding:6px 4px;"><input data-idx="${idx}" data-field="lineTotal" value="${item.lineTotal}" type="number" step="0.01" style="width:60px; border:1px solid var(--border); border-radius:4px; padding:4px; background: var(--bg); color: var(--white);" /></td>
        `;
        
        if (item.matchedMenuIngredient) {
            const select = tr.querySelector('.item-link-input');
            if (select) select.value = item.matchedMenuIngredient;
        }
        
        reviewTbody.appendChild(tr);
      });

      reviewTbody.querySelectorAll("input, select").forEach((input) => {
        input.addEventListener("change", (e) => {
          if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
            confirmBtn.textContent = "Confirm & Save Expense";
          }
          const idx = parseInt(e.target.dataset.idx, 10);
          const field = e.target.dataset.field;
          let value = e.target.value;
          if (e.target.type === "number") value = parseFloat(value);
          if (value === "") value = null;
          currentItems[idx][field] = value;
        });
      });

      // removed block
    }

    const closeAndDiscardDraft = async () => {
      if (!currentExpenseId) {
        reviewSection.classList.remove('open');
        setTimeout(() => reviewSection.style.display = 'none', 300);
        return;
      }
      
      confirmBtn.disabled = true;
      if (retakeBtn) retakeBtn.disabled = true;
      if (deleteBtn) deleteBtn.disabled = true;
      
      try {
        await deleteDoc(doc(db, "expenses", currentExpenseId));
        if (currentStoragePath) {
          try { 
            const { deleteObject, ref } = await import('firebase/storage');
            await deleteObject(ref(storage, currentStoragePath)); 
          } catch (e) {}
        }
        showToast("Draft deleted.");
      } catch (err) {
        console.error("Error discarding draft:", err);
      }
      
      reviewSection.classList.remove('open');
      setTimeout(() => reviewSection.style.display = 'none', 300);
      currentExpenseId = null;
      currentItems = [];
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Confirm & Save Expense";
      if (retakeBtn) retakeBtn.disabled = false;
      if (deleteBtn) deleteBtn.disabled = false;
    };

    const cancelBtn = document.getElementById("receipt-cancel-btn");
    if (cancelBtn) cancelBtn.addEventListener("click", closeAndDiscardDraft);
    if (retakeBtn) retakeBtn.addEventListener("click", closeAndDiscardDraft);
    if (deleteBtn) deleteBtn.addEventListener("click", closeAndDiscardDraft);

    confirmBtn.addEventListener("click", async () => {
      if (!currentExpenseId) return;
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Saving & Learning...";

      try {
        // 1. Save mappings & Update Inventory
        for (const item of currentItems) {
           try {
             if (item.name) {
                const mapKey = item.name.toLowerCase().trim().replace(/\//g, '-');
                const mapData = {};
                if (item.category) mapData.category = item.category;
                if (item.matchedMenuIngredient) mapData.matchedMenuIngredient = item.matchedMenuIngredient;
                
                if (Object.keys(mapData).length > 0 && mapKey) {
                   await setDoc(doc(db, 'receipt_mappings', mapKey), mapData, { merge: true });
                }
             }
             
             // 2. Update Inventory
             if (item.name && item.quantity > 0) {
                const invKey = (item.matchedMenuIngredient || item.name.toLowerCase().trim()).replace(/\//g, '-');
                if (!invKey) continue;
                const invRef = doc(db, 'inventory', invKey);
                const invSnap = await getDoc(invRef);
                
                let newStock = item.quantity;
                let priceHistory = [{ date: new Date().toISOString(), price: item.unitPrice, vendor: reviewMeta.innerText.includes('Vendor:') ? reviewMeta.innerText.split('Vendor:')[1].split('\u00a0')[0].trim() : 'Unknown' }];
                
                if (invSnap.exists()) {
                   const invData = invSnap.data();
                   newStock += (invData.stockQuantity || 0);
                   priceHistory = [...(invData.priceHistory || []), ...priceHistory].slice(-10); // Keep last 10
                }
                
                await setDoc(invRef, {
                   name: item.matchedMenuIngredient ? (window.adminMenuData && window.adminMenuData[item.matchedMenuIngredient] ? window.adminMenuData[item.matchedMenuIngredient].name : item.name) : item.name,
                   category: item.category || 'other',
                   stockQuantity: newStock,
                   lastPrice: item.unitPrice,
                   priceHistory: priceHistory,
                   updatedAt: serverTimestamp()
                }, { merge: true });
             }
           } catch(e) {
             console.error("Error updating inventory/mapping for item", item, e);
           }
        }

        // 3. Save Expense as confirmed
        const newTotal = currentItems.reduce((sum, item) => sum + (parseFloat(item.lineTotal) || (parseFloat(item.quantity) * parseFloat(item.unitPrice)) || 0), 0);
        await updateDoc(doc(db, "expenses", currentExpenseId), {
          items: currentItems,
          total: newTotal > 0 ? newTotal : (parseFloat(document.querySelector('#review-meta').innerText.split('$')[1]) || 0), // Fallback to parsed total if items empty/0
          status: "confirmed",
          confirmedAt: serverTimestamp(),
        });

        showToast("Expense confirmed!");

        if (statusEl) statusEl.textContent = "✅ Expense confirmed, learned, and inventory updated.";
        reviewSection.classList.remove('open');
          setTimeout(() => reviewSection.style.display = 'none', 300);
        if (receiptActions) receiptActions.style.display = "none";
        currentExpenseId = null;
        currentItems = [];
        currentStoragePath = null;
      } catch (err) {
        console.error(err);
        if (statusEl) statusEl.textContent = "Error saving: " + err.message;
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Confirm & Save Expense";
      }
    });


  }
}


  // Setup Expense Analytics Chart
  let expenseChartInst = null;
  let expenseTopItemsChartInst = null;
  let expenseVendorChartInst = null;
  let priceTrendChartInst = null;

  const renderExpenseStats = (docsArray) => {
    let allTimeSpent = 0;
    let thirtyDaySpent = 0;
    let sevenDaySpent = 0;
    let allTimeCount = 0;
    let thirtyDayCount = 0;
    let sevenDayCount = 0;
    let mostExpensiveReceipt = { total: 0, vendor: '' };
    let vendorTotals30d = {};
    let itemTotals30d = {};
    let itemPriceSum30d = {};
    let itemPriceCount30d = {};
    let itemPriceSumOlder = {};
    let itemPriceCountOlder = {};
    let oldestDate = null;

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Helper: compute receipt total from items
    const computeReceiptTotal = (data) => {
      let total = parseFloat(String(data.total || 0).replace(/[^0-9.-]+/g, "")) || 0;
      // If stored total is 0 or missing, compute from items
      if (total === 0 && Array.isArray(data.items)) {
        data.items.forEach(item => {
          const uPrice = parseFloat(item.unitPrice) || 0;
          const qty = parseFloat(item.quantity) || 1;
          const lineTotal = parseFloat(String(item.lineTotal || 0).replace(/[^0-9.-]+/g, "")) || (uPrice * qty);
          total += lineTotal;
        });
      }
      return total;
    };

    // Helper: get date from receipt
    const getReceiptDate = (data) => {
      if (data.confirmedAt?.toDate) return data.confirmedAt.toDate();
      if (data.createdAt?.toDate) return data.createdAt.toDate();
      if (data.createdAt) return new Date(data.createdAt);
      if (data.purchaseDate?.toDate) return data.purchaseDate.toDate();
      return null;
    };

    docsArray.forEach(data => {
      const receiptTotal = computeReceiptTotal(data);
      const expenseDate = data._parsedDate || getReceiptDate(data);

      // All-time
      allTimeSpent += receiptTotal;
      allTimeCount++;

      // Track oldest date for weekly average
      if (expenseDate && (!oldestDate || expenseDate < oldestDate)) {
        oldestDate = expenseDate;
      }

      // Most expensive receipt (all-time)
      if (receiptTotal > mostExpensiveReceipt.total) {
        mostExpensiveReceipt = { total: receiptTotal, vendor: data.vendor || 'Unknown' };
      }

      // 30-day window vs Older window
      if (expenseDate && expenseDate >= thirtyDaysAgo) {
        thirtyDaySpent += receiptTotal;
        thirtyDayCount++;

        // Track vendors in 30d
        const vendor = data.vendor || 'Unknown';
        vendorTotals30d[vendor] = (vendorTotals30d[vendor] || 0) + receiptTotal;

        // Track items in 30d
        (Array.isArray(data.items) ? data.items : []).forEach(item => {
          if (item.name) {
            const cleanName = String(item.name).trim().toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
            const uPrice = parseFloat(item.unitPrice) || 0;
            const qty = parseFloat(item.quantity) || 1;
            const lineTotal = parseFloat(String(item.lineTotal || 0).replace(/[^0-9.-]+/g, "")) || (uPrice * qty);
            itemTotals30d[cleanName] = (itemTotals30d[cleanName] || 0) + lineTotal;
            if (uPrice > 0) {
              itemPriceSum30d[cleanName] = (itemPriceSum30d[cleanName] || 0) + uPrice;
              itemPriceCount30d[cleanName] = (itemPriceCount30d[cleanName] || 0) + 1;
            }
          }
        });
      } else if (expenseDate && expenseDate < thirtyDaysAgo) {
        // Track older prices for inflation alerts
        (Array.isArray(data.items) ? data.items : []).forEach(item => {
          if (item.name) {
            const cleanName = String(item.name).trim().toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
            const uPrice = parseFloat(item.unitPrice) || 0;
            if (uPrice > 0) {
              itemPriceSumOlder[cleanName] = (itemPriceSumOlder[cleanName] || 0) + uPrice;
              itemPriceCountOlder[cleanName] = (itemPriceCountOlder[cleanName] || 0) + 1;
            }
          }
        });
      }

      // 7-day window
      if (expenseDate && expenseDate >= sevenDaysAgo) {
        sevenDaySpent += receiptTotal;
        sevenDayCount++;
      }
    });

    // Weekly average: total spent / number of weeks since oldest receipt
    let weeklyAvg = 0;
    if (oldestDate && allTimeCount > 0) {
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const totalWeeks = Math.max(1, (now - oldestDate) / msPerWeek);
      weeklyAvg = allTimeSpent / totalWeeks;
    }

    const avgReceipt = allTimeCount > 0 ? (allTimeSpent / allTimeCount) : 0;

    // Top vendor (30d)
    let topVendor = { name: '-', total: 0 };
    Object.entries(vendorTotals30d).forEach(([name, total]) => {
      if (total > topVendor.total) topVendor = { name, total };
    });

    // Biggest item (30d)
    let biggestItem = { name: '-', total: 0 };
    Object.entries(itemTotals30d).forEach(([name, total]) => {
      if (total > biggestItem.total) biggestItem = { name, total };
    });

    // Update DOM
    const el = (id) => document.getElementById(id);
    
    const elAllTime = el('exp-all-time-total');
    const elAllTimeCount = el('exp-all-time-count');
    const el30d = el('exp-30d-total');
    const el30dCount = el('exp-30d-count');
    const el7d = el('exp-7d-total');
    const el7dCount = el('exp-7d-count');
    const elWeeklyAvg = el('exp-weekly-avg');
    const elAvg = el('exp-avg-receipt');
    const elMax = el('exp-most-expensive');
    const elTopVendor = el('exp-top-vendor');
    const elBiggestItem = el('exp-biggest-item');

    if (elAllTime) elAllTime.textContent = `$${allTimeSpent.toFixed(2)}`;
    if (elAllTimeCount) elAllTimeCount.textContent = `${allTimeCount} receipt${allTimeCount !== 1 ? 's' : ''}`;
    if (el30d) el30d.textContent = `$${thirtyDaySpent.toFixed(2)}`;
    if (el30dCount) el30dCount.textContent = `${thirtyDayCount} receipt${thirtyDayCount !== 1 ? 's' : ''}`;
    if (el7d) el7d.textContent = `$${sevenDaySpent.toFixed(2)}`;
    if (el7dCount) el7dCount.textContent = `${sevenDayCount} receipt${sevenDayCount !== 1 ? 's' : ''}`;
    if (elWeeklyAvg) elWeeklyAvg.textContent = `$${weeklyAvg.toFixed(2)}`;
    if (elAvg) elAvg.textContent = `$${avgReceipt.toFixed(2)}`;
    if (elMax) elMax.textContent = mostExpensiveReceipt.total > 0 ? `$${mostExpensiveReceipt.total.toFixed(2)} (${mostExpensiveReceipt.vendor})` : '-';
    if (elTopVendor) elTopVendor.textContent = topVendor.total > 0 ? `${topVendor.name} ($${topVendor.total.toFixed(2)})` : '-';
    if (elBiggestItem) elBiggestItem.textContent = biggestItem.total > 0 ? `${biggestItem.name} ($${biggestItem.total.toFixed(2)})` : '-';

    // Evaluate Price Hike Alerts
    const alertsContainer = document.getElementById('price-alerts-container');
    if (alertsContainer) {
      alertsContainer.innerHTML = '';
      let hasAlerts = false;
      
      Object.keys(itemPriceSum30d).forEach(itemName => {
        if (itemPriceSumOlder[itemName]) {
          const avg30d = itemPriceSum30d[itemName] / itemPriceCount30d[itemName];
          const avgOlder = itemPriceSumOlder[itemName] / itemPriceCountOlder[itemName];
          
          if (avgOlder > 0) {
            const percentIncrease = ((avg30d - avgOlder) / avgOlder) * 100;
            // Alert if price went up by more than 10%
            if (percentIncrease >= 10) {
              hasAlerts = true;
              const alertDiv = document.createElement('div');
              alertDiv.style.background = 'rgba(244, 67, 54, 0.1)';
              alertDiv.style.border = '1px solid rgba(244, 67, 54, 0.3)';
              alertDiv.style.padding = '12px 16px';
              alertDiv.style.borderRadius = '8px';
              alertDiv.style.color = '#f44336';
              alertDiv.style.display = 'flex';
              alertDiv.style.alignItems = 'center';
              alertDiv.style.gap = '12px';
              alertDiv.innerHTML = `
                <span style="font-size: 20px;">🚨</span>
                <div>
                  <strong>Price Hike Alert:</strong> 
                  ${itemName} is up <strong>${percentIncrease.toFixed(1)}%</strong> this month. 
                  (Average price increased from $${avgOlder.toFixed(2)} to $${avg30d.toFixed(2)})
                </div>
              `;
              alertsContainer.appendChild(alertDiv);
            }
          }
        }
      });
      
      if (hasAlerts) {
        alertsContainer.style.display = 'flex';
      } else {
        alertsContainer.style.display = 'none';
      }
    }
  };

  const initPriceTrends = (docsArray) => {
    const selectEl = document.getElementById('price-trend-item-select');
    const ctxTrend = document.getElementById('priceTrendChart');
    if (!selectEl || !ctxTrend) return;

    let itemsData = {};

    docsArray.forEach(data => {
      const expenseDate = data._parsedDate || (data.confirmedAt?.toDate ? data.confirmedAt.toDate() : new Date());

      (Array.isArray(data.items) ? data.items : []).forEach(item => {
        if (item.name && item.unitPrice) {
          const name = String(item.name || '').trim();
          if (!itemsData[name]) itemsData[name] = [];
          itemsData[name].push({ date: expenseDate, price: item.unitPrice });
        }
      });
    });

    const currentVal = selectEl.value;
    selectEl.innerHTML = '<option value="">Select an item to track...</option>';
    const itemNames = Object.keys(itemsData).sort();
    itemNames.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      selectEl.appendChild(opt);
    });
    if (itemsData[currentVal]) {
      selectEl.value = currentVal;
    }

    const renderChart = () => {
      const selectedItem = selectEl.value;
      if (priceTrendChartInst) priceTrendChartInst.destroy();
      
      if (!selectedItem || !itemsData[selectedItem]) {
        priceTrendChartInst = new Chart(ctxTrend, {
          type: 'line',
          data: { labels: [], datasets: [] },
          options: { responsive: true, maintainAspectRatio: false }
        });
        return;
      }

      const points = itemsData[selectedItem].sort((a, b) => a.date - b.date);
      
      if (priceTrendChartInst) {
         priceTrendChartInst.data.labels = points.map(p => p.date.toLocaleDateString());
         priceTrendChartInst.data.datasets[0].label = `Unit Price for ${selectedItem}`;
         priceTrendChartInst.data.datasets[0].data = points.map(p => p.price);
         priceTrendChartInst.update();
      } else {
         priceTrendChartInst = new Chart(ctxTrend, {
           type: 'line',
           data: {
             labels: points.map(p => p.date.toLocaleDateString()),
             datasets: [{
               label: `Unit Price for ${selectedItem}`,
               data: points.map(p => p.price),
               borderColor: '#ff6b35',
               backgroundColor: 'rgba(255,107,53,0.1)',
               borderWidth: 2,
               fill: true,
               tension: 0.1
             }]
           },
           options: {
             responsive: true,
             maintainAspectRatio: false,
             scales: {
               y: { beginAtZero: true, grid: { color: 'rgba(128,128,128,0.2)' }, ticks: { color: '#888' } },
               x: { grid: { display: false }, ticks: { color: '#888' } }
             }
           }
         });
      }
    };

    selectEl.onchange = renderChart;
    
    // Initial render
    renderChart();
  };

  const renderExpenseAnalytics = (docsArray) => {
    const ctxCategory = document.getElementById('expenseChart');
    const ctxTopItems = document.getElementById('expenseTopItemsChart');
    const ctxVendor = document.getElementById('expenseVendorChart');
    if (!ctxCategory) return;
    
    let catTotals = {};
    let itemTotals = {};
    let vendorTotals = {};
    
    docsArray.forEach(data => {
      const expenseDate = data._parsedDate || (data.confirmedAt?.toDate ? data.confirmedAt.toDate() : new Date());

      const vendor = data.vendor || 'Unknown';
      const receiptTotal = parseFloat(String(data.total || 0).replace(/[^0-9.-]+/g, "")) || 0;
      vendorTotals[vendor] = (vendorTotals[vendor] || 0) + receiptTotal;

      (Array.isArray(data.items) ? data.items : []).forEach(item => {
         const uPrice = parseFloat(item.unitPrice) || 0;
         const qty = parseFloat(item.quantity) || 1;
         const total = uPrice * qty;
         
         const cat = item.category ? String(item.category || '').trim().toLowerCase() : 'other';
         catTotals[cat] = (catTotals[cat] || 0) + total;
         
         if (item.name) {
           const cleanName = String(item.name || '').trim().toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
           if (!itemTotals[cleanName]) {
             itemTotals[cleanName] = { spent: 0, qty: 0, lastPrice: uPrice, lastDate: expenseDate, category: cat };
           }
           itemTotals[cleanName].spent += total;
           itemTotals[cleanName].qty += qty;
           if (expenseDate > itemTotals[cleanName].lastDate) {
             itemTotals[cleanName].lastPrice = uPrice;
             itemTotals[cleanName].lastDate = expenseDate;
             itemTotals[cleanName].category = cat;
           }
         }
      });
    });

    // 1. Render Category Doughnut Chart
    const catLabels = Object.keys(catTotals);
    const catData = Object.values(catTotals);
    
    if (expenseChartInst) {
       expenseChartInst.data.labels = catLabels;
       expenseChartInst.data.datasets[0].data = catData;
       expenseChartInst.update();
    } else {
       expenseChartInst = new Chart(ctxCategory, {
         type: 'doughnut',
         data: {
           labels: catLabels,
           datasets: [{
             data: catData,
             backgroundColor: ['#ff4d4d', '#4caf50', '#ffeb3b', '#2196f3', '#9c27b0', '#ff9800'],
             borderColor: 'rgba(128,128,128,0.2)',
             borderWidth: 1
           }]
         },
         options: {
           responsive: true,
           maintainAspectRatio: false,
           plugins: {
             legend: { position: 'right', labels: { color: '#888' } }
           }
         }
       });
    }
    
    // 2. Render Top Items Table
    const tbodyTopItems = document.getElementById('expenseTopItemsTbody');
    if (tbodyTopItems) {
      window.renderTopItems = (filter = "", catFilter = "") => {
        let sortedItems = Object.entries(itemTotals)
          .sort((a, b) => b[1].spent - a[1].spent); // Sort by spent descending
          
        if (filter) {
          const lowerFilter = filter.toLowerCase();
          sortedItems = sortedItems.filter(([itemName]) => itemName.toLowerCase().includes(lowerFilter));
        }
        if (catFilter) {
          const lowerCat = catFilter.toLowerCase();
          sortedItems = sortedItems.filter(([itemName, data]) => (data.category || "").toLowerCase().includes(lowerCat));
        }

        if (sortedItems.length === 0) {
          tbodyTopItems.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 24px; color: var(--text-muted);">No items recorded.</td></tr>';
        } else {
          tbodyTopItems.innerHTML = sortedItems.map(([itemName, data]) => {
            const dateISO = data.lastDate ? data.lastDate.toISOString().split('T')[0] : '';
            return `
              <tr>
                <td data-label="Item" style="font-weight: 600;">${escapeHtml(itemName)}</td>
                <td data-label="Qty" style="text-align: right; color: var(--text-muted);">${data.qty}</td>
                <td data-label="Spent" style="text-align: right; color: var(--accent-admin); font-weight: bold;">$${data.spent.toFixed(2)}</td>
                <td style="text-align: right;">
                  <button class="btn-outline btn-small" onclick="window.openAddInventoryModal('${escapeHtml(itemName)}', '${escapeHtml(data.category)}', ${data.lastPrice}, '${dateISO}')">Add to Inv</button>
                </td>
              </tr>
            `;
          }).join('');
        }
      };

      const triggerTopItemsRender = () => {
         const searchVal = document.getElementById('expense-item-search') ? document.getElementById('expense-item-search').value : "";
         const catVal = document.getElementById('expense-item-category-filter') ? document.getElementById('expense-item-category-filter').value : "";
         window.renderTopItems(searchVal, catVal);
      };

      const expenseItemSearch = document.getElementById('expense-item-search');
      if (expenseItemSearch) expenseItemSearch.addEventListener('input', triggerTopItemsRender);
      const expenseItemCat = document.getElementById('expense-item-category-filter');
      if (expenseItemCat) expenseItemCat.addEventListener('input', triggerTopItemsRender);
      
      triggerTopItemsRender();
    }

    // 3. Render Vendor Chart
    if (ctxVendor) {
      const sortedVendors = Object.entries(vendorTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
        
      if (expenseVendorChartInst) {
         expenseVendorChartInst.data.labels = sortedVendors.map(v => v[0]);
         expenseVendorChartInst.data.datasets[0].data = sortedVendors.map(v => v[1]);
         expenseVendorChartInst.update();
      } else {
         expenseVendorChartInst = new Chart(ctxVendor, {
           type: 'bar',
           data: {
             labels: sortedVendors.map(v => v[0]),
             datasets: [{
               label: 'Vendor Spent ($)',
               data: sortedVendors.map(v => v[1]),
               backgroundColor: ['#e9ab00', '#ff6b35', '#ff4d4d', '#4caf50', '#2196f3', '#9c27b0'],
               borderWidth: 1
             }]
           },
           options: {
             indexAxis: 'y',
             responsive: true,
             maintainAspectRatio: false,
             plugins: { legend: { display: false } },
             scales: {
               x: { beginAtZero: true, grid: { color: 'rgba(128,128,128,0.2)' }, ticks: { color: '#888' } },
               y: { grid: { display: false }, ticks: { color: '#888' } }
             }
           }
         });
      }
    }

    // Removed Recent Receipts Table per user request
  };

  window.window.expensesUnsub = null;
  window.window.inventoryUnsub = null;

  window.closeReceiptSlide = () => {
      const slide = document.getElementById('receipt-slide-over');
      const backdrop = document.getElementById('receipt-slide-backdrop');
      if (slide) slide.style.transform = 'translateX(100%)';
      if (backdrop) {
          backdrop.style.opacity = '0';
          backdrop.style.pointerEvents = 'none';
      }
  };
  
    window.deleteSavedReceipt = async (id) => {
        if (!confirm("Are you sure you want to permanently delete this receipt and all its items?")) return;
        try {
            await deleteDoc(doc(db, "expenses", id));
            if (window.closeReceiptSlide) window.closeReceiptSlide();
            showToast("Receipt permanently deleted.");
        } catch (e) {
            console.error("Error deleting receipt:", e);
            alert("Failed to delete receipt: " + e.message);
        }
    };

  window.renderReceiptSlideContent = (receipt, editMode = false) => {
      const vendorEl = document.getElementById('slide-vendor');
      const dateEl = document.getElementById('slide-date');
      const totalEl = document.getElementById('slide-total');
      const content = document.getElementById('slide-content');
      
      const parsedTotal = parseFloat(String(receipt.total || 0).replace(/[^0-9.-]+/g, "")) || 0;
      const dateObj = receipt.purchaseDate?.toDate ? receipt.purchaseDate.toDate() : (receipt.createdAt?.toDate ? receipt.createdAt.toDate() : new Date());
      const dateStr = dateObj.toLocaleDateString();
      const isoDate = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

      if (editMode) {
          vendorEl.innerHTML = `<input type="text" id="edit-vendor" class="crm-input" value="${escapeHtml(receipt.vendor || '')}" style="font-size: 16px; padding: 4px; max-width: 100%;">`;
          dateEl.innerHTML = `<input type="date" id="edit-date" class="crm-input" value="${isoDate}" style="font-size: 12px; padding: 4px; max-width: 150px; margin-top: 4px;">`;
          totalEl.innerHTML = `$<input type="number" id="edit-total" class="crm-input" value="${parsedTotal.toFixed(2)}" step="0.01" style="font-size: 20px; font-weight: bold; padding: 4px; max-width: 100px; display: inline-block;">`;
      } else {
          vendorEl.textContent = receipt.vendor || 'Unknown Vendor';
          dateEl.textContent = dateStr;
          totalEl.textContent = '$' + parsedTotal.toFixed(2);
      }
      
      let html = `<div style="margin-bottom: 24px; display:flex; gap: 8px;">`;
      
      if (editMode) {
          html += `<select id="edit-category" class="crm-select" style="font-size: 12px; padding: 4px;">
              <option value="protein" ${receipt.category === 'protein' ? 'selected' : ''}>Protein</option>
              <option value="produce" ${receipt.category === 'produce' ? 'selected' : ''}>Produce</option>
              <option value="packaging" ${receipt.category === 'packaging' ? 'selected' : ''}>Packaging</option>
              <option value="dry goods" ${receipt.category === 'dry goods' ? 'selected' : ''}>Dry Goods</option>
              <option value="other" ${receipt.category === 'other' || !receipt.category ? 'selected' : ''}>Other</option>
          </select>`;
      } else {
          html += `<span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 12px; color: var(--gray);">Category: <strong style="color:var(--white);">${receipt.category || 'other'}</strong></span>`;
      }
      
      html += `<span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 12px; color: var(--gray);">Status: <strong style="color:var(--white);">${receipt.status || 'unknown'}</strong></span>
      </div>`;
      
      if (receipt.originalImageUrl) {
          html += `<div style="margin-bottom: 24px;">
              <img src="${receipt.originalImageUrl}" alt="Receipt" style="width: 100%; border-radius: 8px; border: 1px solid var(--border);" />
          </div>`;
      }
      
      html += `<h4 style="margin-top:0; border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 12px;">Parsed Items</h4>`;
      html += `<div class="crm-table-container"><table style="width: 100%; font-size: 13px; border-collapse: collapse;">
         <tr style="color: var(--gray); border-bottom: 1px solid var(--border);">
            <th style="text-align: left; padding: 4px 0;">Item</th>
            <th style="text-align: center; padding: 4px 0;">Qty</th>
            <th style="text-align: right; padding: 4px 0;">Price</th>
            <th style="text-align: right; padding: 4px 0;">Total</th>
            ${editMode ? `<th style="text-align: right; padding: 4px 0;"></th>` : ''}
         </tr>`;
      
      (receipt.items || []).forEach((item, idx) => {
          const uPrice = parseFloat(String(item.unitPrice || 0).replace(/[^0-9.-]+/g, "")) || 0;
          const lTotal = parseFloat(String(item.lineTotal || 0).replace(/[^0-9.-]+/g, "")) || 0;
          
          if (editMode) {
              html += `<tr class="edit-item-row" data-idx="${idx}">
                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                      <input type="text" class="crm-input edit-item-name" value="${escapeHtml(item.name || '')}" style="width: 100%; margin-bottom: 4px;">
                      <div style="font-size: 11px; color: var(--gray);">Raw: ${escapeHtml(item.rawText || 'N/A')}</div>
                      <input type="hidden" class="edit-item-rawtext" value="${escapeHtml(item.rawText || '')}">
                      <input type="hidden" class="edit-item-cat" value="${escapeHtml(item.category || '')}">
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: center;">
                      <input type="number" class="crm-input edit-item-qty" value="${item.quantity || 1}" style="width: 60px; text-align: center;">
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">
                      $<input type="number" class="crm-input edit-item-price" step="0.01" value="${uPrice.toFixed(2)}" style="width: 70px; text-align: right;">
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">
                      $<input type="number" class="crm-input edit-item-linetotal" step="0.01" value="${lTotal.toFixed(2)}" style="width: 70px; text-align: right;">
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">
                      <button class="crm-btn-icon" onclick="this.closest('tr').remove()" style="color: #ef4444; font-size: 16px;">×</button>
                  </td>
              </tr>`;
          } else {
              html += `<tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                      <div style="font-weight: bold;">${escapeHtml(item.name || 'Unknown')}</div>
                      <div style="font-size: 11px; color: var(--gray);">Raw: ${escapeHtml(item.rawText || 'N/A')}</div>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: center;">${item.quantity || 1}</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">$${uPrice.toFixed(2)}</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">$${lTotal.toFixed(2)}</td>
              </tr>`;
          }
      });
      html += `</table></div>`;
      
      content.innerHTML = html;
  };

  window.saveReceiptEdit = async (receiptId) => {
      try {
          const vendor = document.getElementById('edit-vendor').value.trim();
          const dateVal = document.getElementById('edit-date').value;
          const totalVal = parseFloat(document.getElementById('edit-total').value) || 0;
          const category = document.getElementById('edit-category').value;
          
          let purchaseDate = null;
          if (dateVal) {
              const d = new Date(dateVal + "T12:00:00");
              if (!isNaN(d.getTime())) purchaseDate = Timestamp.fromDate(d);
          }
          
          const items = [];
          const rows = document.querySelectorAll('.edit-item-row');
          rows.forEach(row => {
              const name = row.querySelector('.edit-item-name').value.trim();
              const rawText = row.querySelector('.edit-item-rawtext').value;
              const cat = row.querySelector('.edit-item-cat').value;
              const qty = parseFloat(row.querySelector('.edit-item-qty').value) || 1;
              const price = parseFloat(row.querySelector('.edit-item-price').value) || 0;
              const lineTotal = parseFloat(row.querySelector('.edit-item-linetotal').value) || (qty * price);
              
              if (name) {
                  items.push({
                      name,
                      rawText: rawText || name,
                      category: cat || category,
                      quantity: qty,
                      unitPrice: price,
                      lineTotal: lineTotal
                  });
              }
          });
          
          // Re-calculate subtotal
          const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
          const tax = Math.max(0, totalVal - subtotal);
          
          const updateData = {
              vendor,
              category,
              total: totalVal,
              subtotal,
              tax,
              items
          };
          if (purchaseDate) updateData.purchaseDate = purchaseDate;
          
          await updateDoc(doc(db, "expenses", receiptId), updateData);
          showToast("Receipt updated successfully.");
          
          // Refresh slide
          const updatedReceipt = window.expenseDocsArray.find(d => d.id === receiptId);
          if (updatedReceipt) {
             Object.assign(updatedReceipt, updateData);
             document.getElementById('slide-edit-btn').style.display = 'inline-block';
             document.getElementById('slide-save-btn').style.display = 'none';
             window.renderReceiptSlideContent(updatedReceipt, false);
          }
      } catch (err) {
          console.error("Error updating receipt:", err);
          alert("Failed to update receipt: " + err.message);
      }
  };

  window.openReceiptSlide = (receipt) => {
      const deleteBtn = document.getElementById('slide-delete-btn');
      const editBtn = document.getElementById('slide-edit-btn');
      const saveBtn = document.getElementById('slide-save-btn');
      
      if (deleteBtn) deleteBtn.onclick = () => window.deleteSavedReceipt(receipt.id);
      
      let isEditMode = false;
      
      if (editBtn) {
          editBtn.style.display = 'inline-block';
          editBtn.onclick = () => {
              isEditMode = true;
              editBtn.style.display = 'none';
              if (saveBtn) saveBtn.style.display = 'inline-block';
              window.renderReceiptSlideContent(receipt, isEditMode);
          };
      }
      
      if (saveBtn) {
          saveBtn.style.display = 'none';
          saveBtn.onclick = () => {
              window.saveReceiptEdit(receipt.id);
          };
      }

      if (!receipt) return;
      const slide = document.getElementById('receipt-slide-over');
      const backdrop = document.getElementById('receipt-slide-backdrop');
      if (slide) slide.style.transform = 'translateX(0)';
      if (backdrop) {
          backdrop.style.opacity = '1';
          backdrop.style.pointerEvents = 'auto';
      }

      window.renderReceiptSlideContent(receipt, false);
  };

  window.initEconomicsListeners = () => {
      const savedExpensesContainer = document.getElementById('expenseDocsTbody');
      if (!savedExpensesContainer) return;
      
      const expensesQuery = query(collection(db, "expenses"));
      
      window.expensesUnsub = onSnapshot(expensesQuery, (snapshot) => {
        try {
          savedExpensesContainer.innerHTML = '';
          if (snapshot.empty) {
            savedExpensesContainer.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">No saved expenses yet.</td></tr>';
            return;
          }

          let allDocsArray = [];
          snapshot.forEach(docSnap => {
              const data = docSnap.data();
              let dDate = data.confirmedAt?.toDate ? data.confirmedAt.toDate() : (data.purchaseDate?.toDate ? data.purchaseDate.toDate() : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date()));
              allDocsArray.push({ id: docSnap.id, ...data, _parsedDate: dDate });
          });
          
          allDocsArray.sort((a,b) => b._parsedDate.getTime() - a._parsedDate.getTime());
          
          window.processExpenseSnapshot = () => {
              const filterSelect = document.getElementById('expense-date-filter');
              const filterVal = filterSelect ? filterSelect.value : '30';
              
              let cutoffDate = null;
              if (filterVal !== 'all') {
                  cutoffDate = new Date();
                  cutoffDate.setDate(cutoffDate.getDate() - parseInt(filterVal));
              }
              
              let filteredDocsArray = allDocsArray;
              if (cutoffDate) {
                  filteredDocsArray = allDocsArray.filter(d => d._parsedDate >= cutoffDate);
              }
              
              window.expenseDocsArray = filteredDocsArray;
              
              renderExpenseAnalytics(filteredDocsArray);
              initPriceTrends(filteredDocsArray);
              renderExpenseStats(allDocsArray);
          };
          
          window.processExpenseSnapshot();
          let docsArray = window.expenseDocsArray;
          
          // Render Pending Inbox
          const pendingInboxSection = document.getElementById('pending-inbox-section');
          const pendingInboxList = document.getElementById('pending-inbox-list');
          if (pendingInboxSection && pendingInboxList) {
            const pendingDocs = docsArray.filter(d => !d.status || d.status === 'draft' || d.status === 'pending');
            
            if (pendingDocs.length > 0) {
              pendingInboxSection.style.display = 'block';
              pendingInboxList.innerHTML = pendingDocs.map(d => {
                const vendor = escapeHtml(d.vendor || 'Unknown Vendor');
                const dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString() : 'N/A';
                const totalStr = d.total != null ? `$${parseFloat(String(d.total).replace(/[^0-9.-]+/g, "")).toFixed(2)}` : '—';
                const itemCount = d.items ? d.items.length : 0;
                
                // Store the data in a globally accessible way for the click handler
                window[`draft_data_${d.id}`] = d;
                
                return `
                  <div onclick="openDraftReview('${d.id}')" style="background: var(--bg); border: 1px solid var(--accent); border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(233,171,0,0.1)'" onmouseout="this.style.background='var(--bg)'">
                    <div>
                      <strong style="color: var(--white); font-size: 16px;">${vendor}</strong>
                      <div style="font-size: 13px; color: var(--gray); margin-top: 4px;">${dateStr} &bull; ${itemCount} items</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 16px;">
                      <strong style="color: var(--accent); font-size: 18px;">${totalStr}</strong>
                      <button type="button" class="btn-primary btn-small" style="padding: 6px 12px; pointer-events: none;">Review</button>
                    </div>
                  </div>
                `;
              }).join('');
            } else {
              pendingInboxSection.style.display = 'none';
              pendingInboxList.innerHTML = '';
            }
          }

          window.renderExpenseDocs = (filter = "", dateFilter = "") => {
            savedExpensesContainer.innerHTML = '';
            let filteredDocs = docsArray;
            if (filter) {
              const lowerFilter = filter.toLowerCase();
              filteredDocs = filteredDocs.filter(d => 
                (d.vendor || "").toLowerCase().includes(lowerFilter) ||
                (d.status || "").toLowerCase().includes(lowerFilter)
              );
            }
            if (dateFilter) {
              filteredDocs = filteredDocs.filter(d => {
                let dDate;
                if (d.createdAt?.toDate) dDate = d.createdAt.toDate();
                else if (d.createdAt) dDate = new Date(d.createdAt);
                else if (d.purchaseDate?.toDate) dDate = d.purchaseDate.toDate();
                else if (d.purchaseDate) dDate = new Date(d.purchaseDate);
                
                if (!dDate || isNaN(dDate.getTime())) return false;
                
                const localISO = new Date(dDate.getTime() - (dDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                return localISO === dateFilter;
              });
            }
            if (filteredDocs.length === 0) {
              savedExpensesContainer.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">No recent expenses found.</td></tr>';
              const loadMoreBtn = document.getElementById('btn-load-more-expenses');
              if (loadMoreBtn) loadMoreBtn.style.display = 'none';
              return;
            }
            
            if (!window.expenseRenderLimit) window.expenseRenderLimit = 50;
            
            let rowCount = 0;
            filteredDocs.forEach(data => {
              if (rowCount >= window.expenseRenderLimit) return;
              rowCount++;
              const dateStr = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : (data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'N/A');
              const itemCount = data.items ? data.items.length : 0;
              const parsedDataTotal = parseFloat(String(data.total || 0).replace(/[^0-9.-]+/g, "")) || 0;
              const totalStr = data.total != null ? `$${parsedDataTotal.toFixed(2)}` : '—';
              const vendor = escapeHtml(data.vendor || 'Unknown Vendor');
              const status = escapeHtml(data.status || 'pending');
              
              let statusBadge = ``;
              if (status === 'confirmed') statusBadge = `<span style="background: rgba(16,185,129,0.15); color: #10b981; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase;">Confirmed</span>`;
              else if (status === 'needs_review') statusBadge = `<span style="background: rgba(245,158,11,0.15); color: #f59e0b; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase;">Review</span>`;
              else statusBadge = `<span style="background: rgba(161,161,170,0.15); color: var(--text-muted); padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase;">${status}</span>`;

              const tr = document.createElement("tr");
              tr.style.borderBottom = "1px solid var(--border-admin)";
              tr.innerHTML = `
                <td data-label="Date" style="padding: 16px;">${dateStr}</td>
                <td data-label="Vendor" style="padding: 16px; font-weight: 600;">${vendor} <br><span style="font-size: 12px; color: var(--text-muted); font-weight: normal;">${itemCount} items</span></td>
                <td data-label="Total" style="padding: 16px; font-weight: bold; color: var(--accent-admin);">$${parsedDataTotal.toFixed(2)}</td>
                <td data-label="Status" style="padding: 16px;">${statusBadge}</td>
                <td data-label="Action" style="padding: 16px; text-align: right;">
                  <button class="btn-outline btn-small" onclick="window.transferReceiptToInventory('${data.id}')" style="margin-right: 8px;">Transfer to Inv</button>
                  <button class="btn-outline btn-small" onclick="window.openReceiptSlide(window.expenseDocsArray.find(d => d.id === '${data.id}'))">View Details</button>
                </td>
              `;
              savedExpensesContainer.appendChild(tr);
            });
            
            const loadMoreBtn = document.getElementById('btn-load-more-expenses');
            if (loadMoreBtn) {
               if (filteredDocs.length > window.expenseRenderLimit) {
                   loadMoreBtn.style.display = 'inline-block';
               } else {
                   loadMoreBtn.style.display = 'none';
               }
            }
          };

          const triggerExpenseRender = (resetLimit = false) => {
             if (resetLimit) window.expenseRenderLimit = 50;
             const searchVal = document.getElementById('expense-search') ? document.getElementById('expense-search').value : "";
             const dateVal = document.getElementById('expense-specific-date-filter') ? document.getElementById('expense-specific-date-filter').value : "";
             window.renderExpenseDocs(searchVal, dateVal);
          };

          const expenseSearchInput = document.getElementById('expense-search');
          if (expenseSearchInput) expenseSearchInput.addEventListener('input', () => triggerExpenseRender(true));
          const expenseDateFilter = document.getElementById('expense-specific-date-filter');
          if (expenseDateFilter) expenseDateFilter.addEventListener('input', () => triggerExpenseRender(true));
          
          const loadMoreBtn = document.getElementById('btn-load-more-expenses');
          if (loadMoreBtn && !window.loadMoreAttached) {
             loadMoreBtn.addEventListener('click', () => {
                window.expenseRenderLimit += 50;
                triggerExpenseRender(false);
             });
             window.loadMoreAttached = true;
          }
          
          triggerExpenseRender();
          
          const globalDateFilter = document.getElementById('expense-date-filter');
          if (globalDateFilter && !window.globalDateFilterAttached) {
              globalDateFilter.addEventListener('change', () => {
                  if (window.processExpenseSnapshot) window.processExpenseSnapshot();
                  triggerExpenseRender(true);
              });
              window.globalDateFilterAttached = true;
          }
          
          const btnSyncAll = document.getElementById('btn-sync-all-receipts');
          if (btnSyncAll) {
             btnSyncAll.addEventListener('click', () => {
                 window.transferAllReceiptsToInventory();
             });
          }
        } catch (e) {
          console.error("Javascript Error during receipt rendering:", e);
          savedExpensesContainer.innerHTML = `<div style="padding: 16px; color: #ff4d4d; white-space: pre-wrap; font-family: monospace; grid-column: 1 / -1;"><b>CRASH!</b> ${e.message}\n${e.stack}</div>`;
        }
      }, (err) => {
        console.error("Expenses sync error:", err);
        savedExpensesContainer.innerHTML = '<div style="padding: 16px; text-align: center; color: #f44336; grid-column: 1 / -1;">Error loading expenses. Check console.</div>';
      });

    // Inventory Tracker Logic
    const inventoryTbody = document.getElementById('inventory-tbody');
    const inventorySearch = document.getElementById('inventory-search');
    let inventoryDataCache = [];

    const renderInventory = (filter = "", catFilter = "", dateFilter = "") => {
      if (!inventoryTbody) return;
      inventoryTbody.innerHTML = "";
      
      const totalItemsEl = document.getElementById('inv-total-items');
      const lowStockEl = document.getElementById('inv-low-stock');
      const costTrendEl = document.getElementById('inv-cost-trend');
      
      if (totalItemsEl) totalItemsEl.textContent = inventoryDataCache.length;
      
      let lowCount = 0;
      inventoryDataCache.forEach(d => {
         if ((parseFloat(d.stockQuantity) || 0) < 10) lowCount++;
      });
      if (lowStockEl) lowStockEl.textContent = lowCount;
      if (costTrendEl) costTrendEl.textContent = "Stable"; // Placeholder, can be calculated dynamically

      if (inventoryDataCache.length === 0) {
         inventoryTbody.innerHTML = '<tr><td colspan="8" style="padding: 24px; text-align: center; color: var(--gray);">No inventory tracked yet. Add items manually or confirm receipts.</td></tr>';
         return;
      }
      
      const filtered = inventoryDataCache.filter(data => {
         let match = true;
         if (filter) {
            match = match && ((data.name || "").toLowerCase().includes(filter.toLowerCase()) || 
                              (data.category || "").toLowerCase().includes(filter.toLowerCase()));
         }
         if (catFilter) {
            match = match && (data.category || "").toLowerCase().includes(catFilter.toLowerCase());
         }
         if (dateFilter) {
            // Compare date bought or createdAt? Let's assume dateBought
            match = match && (data.dateBought === dateFilter);
         }
         return match;
      });

      if (filtered.length === 0) {
         inventoryTbody.innerHTML = '<tr><td colspan="8" style="padding: 24px; text-align: center; color: var(--gray);">No ingredients found.</td></tr>';
         return;
      }

      filtered.forEach(data => {
         let priceTrendHtml = '-';
         let avgPrice = data.lastPrice || 0;
         if (data.priceHistory && data.priceHistory.length > 1) {
            const history = data.priceHistory;
            const current = history[history.length - 1].price;
            const prev = history[history.length - 2].price;
            const sum = history.reduce((acc, curr) => acc + curr.price, 0);
            avgPrice = sum / history.length;
            
            if (current > prev) {
               const pct = ((current - prev) / prev) * 100;
               priceTrendHtml = `<span style="color:#f44336; font-weight:bold; background: rgba(244,67,54,0.1); padding: 4px 8px; border-radius: 4px;">↑ ${pct.toFixed(1)}%</span>`;
            } else if (current < prev) {
               const pct = ((prev - current) / prev) * 100;
               priceTrendHtml = `<span style="color:#4caf50; font-weight:bold; background: rgba(76,175,80,0.1); padding: 4px 8px; border-radius: 4px;">↓ ${pct.toFixed(1)}%</span>`;
            } else {
               priceTrendHtml = `<span style="color:var(--gray);">—</span>`;
            }
         }

         const qty = parseFloat(data.stockQuantity) || 0;
         let stockLevelHtml = '';
         if (qty < 10) {
            stockLevelHtml = `<div style="display:flex; align-items:center; gap:8px;"><div style="flex:1; height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;"><div style="width: ${Math.min(qty*10, 100)}%; height:100%; background:#f44336;"></div></div><span style="color:#f44336; font-size:11px; font-weight:bold;">LOW</span></div>`;
         } else if (qty > 50) {
            stockLevelHtml = `<div style="display:flex; align-items:center; gap:8px;"><div style="flex:1; height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;"><div style="width: 100%; height:100%; background:#4caf50;"></div></div><span style="color:#4caf50; font-size:11px; font-weight:bold;">GOOD</span></div>`;
         } else {
            stockLevelHtml = `<div style="display:flex; align-items:center; gap:8px;"><div style="flex:1; height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;"><div style="width: ${Math.min(qty*2, 100)}%; height:100%; background:#ffeb3b;"></div></div><span style="color:#ffeb3b; font-size:11px; font-weight:bold;">OK</span></div>`;
         }
         
         const tr = document.createElement("tr");
         tr.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
         tr.innerHTML = `
            <td data-label="Item / Category" style="padding: 12px; font-weight: 600;">
              <div>${escapeHtml(data.name || 'Unknown')}</div>
              <div style="font-size:11px; color:var(--gray); text-transform:uppercase; margin-top:4px;">${escapeHtml(data.category || 'other')}</div>
            </td>
            <td data-label="Status" style="padding: 12px; min-width: 120px;">
              ${stockLevelHtml}
            </td>
            <td data-label="Qty" style="padding: 12px;">
              <input type="number" class="inventory-stock-input" data-id="${data.id}" value="${qty}" step="0.01" style="width: 80px; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: var(--white); text-align: right; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(255,255,255,0.2)'">
            </td>
            <td data-label="Last Price" style="padding: 12px; font-weight:bold; color:var(--white);">$${(data.lastPrice || 0).toFixed(2)}</td>
            <td data-label="Avg Price" style="padding: 12px; color:var(--gray);">$${(avgPrice || 0).toFixed(2)}</td>
            <td data-label="Trend" style="padding: 12px;">${priceTrendHtml}</td>
            <td data-label="Deadline" style="padding: 12px;">
              <input type="date" class="inventory-deadline-input" data-id="${data.id}" value="${data.deadline || ''}" style="width: 130px; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: var(--white); outline: none;">
            </td>
            <td data-label="Actions" style="padding: 12px; text-align: right;">
              <button class="btn-outline btn-small" onclick="deleteInventoryItem('${data.id}')" style="border-color: rgba(244,67,54,0.3); color: #f44336;">Del</button>
            </td>
         `;
         inventoryTbody.appendChild(tr);
      });

      // Attach inline editing listeners
      document.querySelectorAll('.inventory-stock-input').forEach(input => {
         input.addEventListener('change', async (e) => {
             const id = e.target.getAttribute('data-id');
             const val = e.target.value;
             try {
                 await updateDoc(doc(db, 'inventory', id), { stockQuantity: parseFloat(val) || 0 });
                 e.target.style.borderColor = "#4caf50";
                 setTimeout(() => e.target.style.borderColor = "rgba(255,255,255,0.2)", 1500);
             } catch (err) {
                 console.error(err);
                 alert("Failed to update stock");
             }
         });
      });
      document.querySelectorAll('.inventory-deadline-input').forEach(input => {
         input.addEventListener('change', async (e) => {
             const id = e.target.getAttribute('data-id');
             const val = e.target.value;
             try {
                 await updateDoc(doc(db, 'inventory', id), { deadline: val });
                 e.target.style.borderColor = "#4caf50";
                 setTimeout(() => e.target.style.borderColor = "rgba(255,255,255,0.2)", 1500);
             } catch (err) {
                 console.error(err);
                 alert("Failed to update deadline");
             }
         });
      });
    };

    if (inventoryTbody) {
       window.window.inventoryUnsub = onSnapshot(collection(db, 'inventory'), (snapshot) => {
          inventoryDataCache = [];
          snapshot.forEach(docSnap => {
             const data = docSnap.data();
             data.id = docSnap.id;
             inventoryDataCache.push(data);
          });
          const currentFilter = inventorySearch ? inventorySearch.value : "";
          const catFilter = document.getElementById('inventory-category-filter') ? document.getElementById('inventory-category-filter').value : "";
          const dateFilter = document.getElementById('inventory-date-filter') ? document.getElementById('inventory-date-filter').value : "";
          renderInventory(currentFilter, catFilter, dateFilter);
       }, (err) => {
          console.error("Inventory sync error:", err);
          inventoryTbody.innerHTML = '<tr><td colspan="8" style="padding: 24px; text-align: center; color: #f44336;">Error loading inventory. Check console.</td></tr>';
       });

       const triggerRender = () => {
          const currentFilter = inventorySearch ? inventorySearch.value : "";
          const catFilter = document.getElementById('inventory-category-filter') ? document.getElementById('inventory-category-filter').value : "";
          const dateFilter = document.getElementById('inventory-date-filter') ? document.getElementById('inventory-date-filter').value : "";
          renderInventory(currentFilter, catFilter, dateFilter);
       };

       if (inventorySearch) inventorySearch.addEventListener('input', triggerRender);
       const invCatFilter = document.getElementById('inventory-category-filter');
       if (invCatFilter) invCatFilter.addEventListener('input', triggerRender);
       const invDateFilter = document.getElementById('inventory-date-filter');
       if (invDateFilter) invDateFilter.addEventListener('input', triggerRender);

       // Add Inventory Flow
       const btnAddInventory = document.getElementById('btn-add-inventory');
       const addInventoryModal = document.getElementById('add-inventory-modal');
       const addInventoryForm = document.getElementById('add-inventory-form');
       
       if (btnAddInventory && addInventoryModal) {
         btnAddInventory.addEventListener('click', () => {
           addInventoryForm.reset();
           document.getElementById('add-inv-date').valueAsDate = new Date();
           addInventoryModal.classList.add('open');
         });
       }
       
       window.openAddInventoryModal = (name, category, price, date) => {
           addInventoryForm.reset();
           document.getElementById('add-inv-name').value = name || "";
           document.getElementById('add-inv-category').value = category !== "undefined" ? category : "";
           document.getElementById('add-inv-price').value = price ? parseFloat(price).toFixed(2) : "0.00";
           if (date) {
               document.getElementById('add-inv-date').value = date;
           } else {
               document.getElementById('add-inv-date').valueAsDate = new Date();
           }
           addInventoryModal.classList.add('open');
       };
       
       if (addInventoryForm) {
         addInventoryForm.addEventListener('submit', async (e) => {
           e.preventDefault();
           const name = document.getElementById('add-inv-name').value.trim();
           const cat = document.getElementById('add-inv-category').value.trim();
           const stock = parseFloat(document.getElementById('add-inv-stock').value) || 0;
           const price = parseFloat(document.getElementById('add-inv-price').value) || 0;
           const dateBought = document.getElementById('add-inv-date').value;
           const pieces = parseInt(document.getElementById('add-inv-pieces').value) || 1;
           
           if(!name) return alert("Item name is required.");
           
           const docId = name.toLowerCase().replace(/[^a-z0-9]/g, '');
           try {
             await setDoc(doc(db, 'inventory', docId), {
               name: name,
               category: cat,
               stockQuantity: stock,
               piecesPerBox: pieces,
               dateBought: dateBought,
               lastPrice: price,
               priceHistory: [{ date: dateBought ? new Date(dateBought) : new Date(), price: price }],
               updatedAt: serverTimestamp()
             }, { merge: true }); // Use merge: true to avoid overwriting existing data completely
             addInventoryModal.classList.remove('open');
             addInventoryForm.reset();
             showToast("Item added successfully");
           } catch(err) {
             console.error(err);
             alert("Failed to add inventory item.");
           }
         });
       }
    }
  };
  
  window.deleteInventoryItem = async (id) => {
    if(!confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteDoc(doc(db, 'inventory', id));
      showToast("Item deleted");
    } catch(err) {
      console.error(err);
      alert("Failed to delete item");
    }
  };
  
  window.updateInventoryStock = async (id, val) => {
     try {
        await updateDoc(doc(db, 'inventory', id), { stockQuantity: parseFloat(val) || 0 });
     } catch (e) {
        console.error(e);
        alert("Failed to update stock");
     }
  };

  const processItemTransfer = async (item, expenseDate) => {
      if (!item.name) return 0;
      const docId = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const docRef = doc(db, 'inventory', docId);
      const docSnap = await getDoc(docRef);
      
      const qty = parseFloat(item.quantity) || 1;
      const uPrice = parseFloat(item.unitPrice) || 0;
      const dateBought = expenseDate.toISOString().split('T')[0];
      const priceEntry = { date: expenseDate, price: uPrice };
      const category = item.category || 'other';

      if (docSnap.exists()) {
          const existing = docSnap.data();
          const newStock = (parseFloat(existing.stockQuantity) || 0) + qty;
          const newHistory = existing.priceHistory || [];
          newHistory.push(priceEntry);
          
          await updateDoc(docRef, {
              stockQuantity: newStock,
              lastPrice: uPrice,
              dateBought: dateBought,
              priceHistory: newHistory,
              updatedAt: serverTimestamp()
          });
      } else {
          await setDoc(docRef, {
              name: item.name,
              category: category,
              stockQuantity: qty,
              piecesPerBox: 1,
              dateBought: dateBought,
              lastPrice: uPrice,
              priceHistory: [priceEntry],
              updatedAt: serverTimestamp()
          });
      }
      return 1;
  };

  window.transferReceiptToInventory = async (receiptId) => {
    const receipt = window.expenseDocsArray.find(d => d.id === receiptId);
    if (!receipt || !receipt.items || receipt.items.length === 0) {
      return showToast("No items to transfer.");
    }
    if (!confirm(`Transfer ${receipt.items.length} items to inventory?`)) return;
    
    try {
      showToast("Transferring items to inventory...");
      let successCount = 0;
      const expenseDate = receipt.createdAt?.toDate ? receipt.createdAt.toDate() : new Date();
      for (const item of receipt.items) {
         successCount += await processItemTransfer(item, expenseDate);
      }
      showToast(`Successfully transferred ${successCount} items!`);
    } catch (e) {
      console.error(e);
      alert("Error transferring receipt to inventory.");
    }
  };

  window.transferAllReceiptsToInventory = async () => {
      if (!confirm(`Transfer ALL recent receipts to inventory? This may take a moment.`)) return;
      
      try {
         showToast("Transferring all receipts...");
         let totalSuccess = 0;
         for (const receipt of window.expenseDocsArray) {
             if (!receipt.items) continue;
             const expenseDate = receipt.createdAt?.toDate ? receipt.createdAt.toDate() : new Date();
             for (const item of receipt.items) {
                 totalSuccess += await processItemTransfer(item, expenseDate);
             }
         }
         showToast(`Successfully transferred ${totalSuccess} items!`);
      } catch (e) {
         console.error(e);
         alert("Error transferring receipts.");
      }
  };



