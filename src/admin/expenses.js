import { compressImage } from './menu.js';
import { showToast } from './orders.js';
import { escapeHtml } from './shared.js';
import { app, db, storage } from '../firebase.js';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc, setDoc, deleteDoc, serverTimestamp, limit } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';



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
      } catch(e) {}
      
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
  const cameraInput = document.getElementById("receipt-input-camera");
  const galleryInput = document.getElementById("receipt-input-gallery");
  const statusEl = document.getElementById("upload-status");
  const reviewSection = document.getElementById("review-section");
  const reviewMeta = document.getElementById("review-meta");
  const reviewTbody = document.getElementById("review-tbody");
  const confirmBtn = document.getElementById("confirm-expense-btn");
  const receiptActions = document.getElementById("receipt-actions");
  const retakeBtn = document.getElementById("receipt-retake-btn");
  const deleteBtn = document.getElementById("receipt-delete-btn");

  // Compress image client-side before uploading (faster transfer + faster Gemini parsing)
  function compressImage(file, maxWidth = 1600, quality = 0.7) {
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

    const handleFileSelected = async (file) => {
      if (!file) return;

      // Hide actions while processing
      if (receiptActions) receiptActions.style.display = "none";
      reviewSection.style.display = "none";
      currentExpenseId = null;
      currentItems = [];
      currentStoragePath = null;

      statusEl.textContent = "Compressing image...";

      try {
        // Compress the image first (speeds up upload + Gemini processing)
        const compressed = await compressImage(file);
        const compressedSize = (compressed.size / 1024).toFixed(0);
        statusEl.textContent = `Uploading (${compressedSize} KB)...`;

        const timestamp = Date.now();
        const path = `receipts/unsorted/${timestamp}_receipt.webp`;
        currentStoragePath = path;
        const storageReference = ref(storage, path);

        await uploadBytes(storageReference, compressed, { contentType: 'image/webp' });
        statusEl.textContent = "Parsing receipt with AI (this can take a few seconds)...";

        const functions = getFunctions(app);
        const parseReceipt = httpsCallable(functions, "parseReceipt");
        const result = await parseReceipt({ storagePath: path });
        const data = result.data;

        currentExpenseId = data.id;
        currentItems = data.items || [];

        renderReview(data);
        statusEl.textContent = "✅ Parsed! Review the items below, then click Confirm & Save.";

        // Show retake/delete actions
        if (receiptActions) receiptActions.style.display = "flex";
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Error parsing receipt: " + err.message;
        if (receiptActions) receiptActions.style.display = "flex";
      }
    };

    if (cameraInput) {
      cameraInput.addEventListener("change", (e) => {
        handleFileSelected(e.target.files[0]);
        cameraInput.value = "";
      });
    }
    if (galleryInput) {
      galleryInput.addEventListener("change", (e) => {
        handleFileSelected(e.target.files[0]);
        galleryInput.value = "";
      });
    }

    // Retake: reset the form and let user pick a new file
    if (retakeBtn) {
      retakeBtn.addEventListener("click", async () => {
        // If there's a draft, delete it first
        if (currentExpenseId) {
          try {
            await deleteDoc(doc(db, "expenses", currentExpenseId));
          } catch(e) { console.warn("Could not delete draft:", e); }
        }
        // If there's an uploaded file, attempt to delete from storage
        if (currentStoragePath) {
          try {
            await deleteObject(ref(storage, currentStoragePath));
          } catch(e) { console.warn("Could not delete storage file:", e); }
        }
        currentExpenseId = null;
        currentItems = [];
        currentStoragePath = null;
        reviewSection.style.display = "none";
        if (receiptActions) receiptActions.style.display = "none";
        statusEl.textContent = "Draft cleared. Select a new receipt above.";
      });
    }

    // Delete draft
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async () => {
        if (!currentExpenseId) {
          statusEl.textContent = "Nothing to delete.";
          return;
        }
        if (!confirm("Delete this receipt draft?")) return;
        try {
          await deleteDoc(doc(db, "expenses", currentExpenseId));
          if (currentStoragePath) {
            try { await deleteObject(ref(storage, currentStoragePath)); } catch(e) {}
          }
          currentExpenseId = null;
          currentItems = [];
          currentStoragePath = null;
          reviewSection.style.display = "none";
          if (receiptActions) receiptActions.style.display = "none";
          statusEl.textContent = "Draft deleted.";
          showToast("Draft deleted");
        } catch(err) {
          console.error(err);
          statusEl.textContent = "Error deleting draft: " + err.message;
        }
      });
    }

    function renderReview(data) {
      reviewMeta.innerHTML = `
        <strong>Vendor:</strong> ${data.vendor || "Unknown"} &nbsp;
        <strong>Total:</strong> $${data.total != null ? data.total.toFixed(2) : "\u2014"} &nbsp;
        ${data.needsReview ? '<span style="color:#b00;">\u26a0 Needs review</span>' : ""}
      `;

      // Build options for known menu ingredients
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
        
        // Auto-select linked ingredient if available
        if (item.matchedMenuIngredient) {
            const select = tr.querySelector('.item-link-input');
            if (select) select.value = item.matchedMenuIngredient;
        }
        
        reviewTbody.appendChild(tr);
      });

      reviewTbody.querySelectorAll("input, select").forEach((input) => {
        input.addEventListener("change", (e) => {
          const idx = parseInt(e.target.dataset.idx, 10);
          const field = e.target.dataset.field;
          let value = e.target.value;
          if (e.target.type === "number") value = parseFloat(value);
          if (value === "") value = null;
          currentItems[idx][field] = value;
        });
      });

      reviewSection.style.display = "block";
    }

    confirmBtn.addEventListener("click", async () => {
      if (!currentExpenseId) return;
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Saving & Learning...";

      try {
        // 1. Save mappings
        for (const item of currentItems) {
           if (item.name) {
              const mapKey = item.name.toLowerCase().trim();
              const mapData = {};
              if (item.category) mapData.category = item.category;
              if (item.matchedMenuIngredient) mapData.matchedMenuIngredient = item.matchedMenuIngredient;
              
              if (Object.keys(mapData).length > 0) {
                 await setDoc(doc(db, 'receipt_mappings', mapKey), mapData, { merge: true });
              }
           }
           
           // 2. Update Inventory
           if (item.name && item.quantity > 0) {
              const invRef = doc(db, 'inventory', item.matchedMenuIngredient || item.name.toLowerCase().trim());
              const invSnap = await getDoc(invRef);
              
              let newStock = item.quantity;
              let priceHistory = [{ date: new Date().toISOString(), price: item.unitPrice, vendor: reviewMeta.innerText.includes('Vendor:') ? reviewMeta.innerText.split('Vendor:')[1].split('\u00a0')[0].trim() : 'Unknown' }];
              
              if (invSnap.exists()) {
                 const invData = invSnap.data();
                 newStock += (invData.stockQuantity || 0);
                 priceHistory = [...(invData.priceHistory || []), ...priceHistory].slice(-10); // Keep last 10
              }
              
              await setDoc(invRef, {
                 name: item.matchedMenuIngredient ? (window.adminMenuData[item.matchedMenuIngredient]?.name || item.name) : item.name,
                 category: item.category || 'other',
                 stockQuantity: newStock,
                 lastPrice: item.unitPrice,
                 priceHistory: priceHistory,
                 updatedAt: serverTimestamp()
              }, { merge: true });
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

        statusEl.textContent = "✅ Expense confirmed, learned, and inventory updated.";
        reviewSection.style.display = "none";
        if (receiptActions) receiptActions.style.display = "none";
        currentExpenseId = null;
        currentItems = [];
        currentStoragePath = null;
        showToast("Expense confirmed!");
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Error saving: " + err.message;
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

  const renderExpenseStats = (snapshot) => {
    let totalSpent = 0;
    let allTimeSpent = 0;
    let receiptCount = 0;
    let mostExpensiveReceipt = { total: 0, vendor: '' };
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.status !== 'confirmed') return;
      
      const total = parseFloat(String(data.total || 0).replace(/[^0-9.-]+/g, "")) || 0;
      allTimeSpent += total;
      totalSpent += total; // Now represents Total Spending (all time) to avoid UI confusion
      receiptCount++;
      
      if (total > mostExpensiveReceipt.total) {
        mostExpensiveReceipt = { total, vendor: data.vendor || 'Unknown' };
      }
    });

    const avgReceipt = receiptCount > 0 ? (totalSpent / receiptCount) : 0;

    const elAllTime = document.getElementById('exp-all-time-total');
    const elTotal = document.getElementById('exp-30d-total');
    const elAvg = document.getElementById('exp-avg-receipt');
    const elCount = document.getElementById('exp-receipt-count');
    const elMax = document.getElementById('exp-most-expensive');

    if (elAllTime) elAllTime.textContent = `$${allTimeSpent.toFixed(2)}`;
    if (elTotal) elTotal.textContent = `$${totalSpent.toFixed(2)}`;
    if (elAvg) elAvg.textContent = `$${avgReceipt.toFixed(2)}`;
    if (elCount) elCount.textContent = receiptCount.toString();
    if (elMax) elMax.textContent = mostExpensiveReceipt.total > 0 ? `$${mostExpensiveReceipt.total.toFixed(2)} (${mostExpensiveReceipt.vendor})` : '-';
  };

  const initPriceTrends = (snapshot) => {
    const selectEl = document.getElementById('price-trend-item-select');
    const ctxTrend = document.getElementById('priceTrendChart');
    if (!selectEl || !ctxTrend) return;

    let itemsData = {};

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.status !== 'confirmed') return;
      const expenseDate = data.confirmedAt?.toDate ? data.confirmedAt.toDate() : new Date();

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
            y: { beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#aaa' } },
            x: { grid: { display: false }, ticks: { color: '#aaa' } }
          }
        }
      });
    };

    selectEl.onchange = renderChart;
    
    // Initial render
    renderChart();
  };

  const renderExpenseAnalytics = (snapshot) => {
    const ctxCategory = document.getElementById('expenseChart');
    const ctxTopItems = document.getElementById('expenseTopItemsChart');
    const ctxVendor = document.getElementById('expenseVendorChart');
    if (!ctxCategory) return;
    
    let catTotals = {};
    let itemTotals = {};
    let vendorTotals = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.status !== 'confirmed') return;
      
      const expenseDate = data.confirmedAt?.toDate ? data.confirmedAt.toDate() : new Date();

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
           itemTotals[cleanName] = (itemTotals[cleanName] || 0) + total;
         }
      });
    });

    // 1. Render Category Doughnut Chart
    const catLabels = Object.keys(catTotals);
    const catData = Object.values(catTotals);
    
    if (expenseChartInst) {
       expenseChartInst.destroy();
    }
    
    expenseChartInst = new Chart(ctxCategory, {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{
          data: catData,
          backgroundColor: ['#ff4d4d', '#4caf50', '#ffeb3b', '#2196f3', '#9c27b0', '#ff9800'],
          borderColor: '#111',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#e0e0e0' } }
        }
      }
    });
    
    // 2. Render Top Items Bar Chart
    if (ctxTopItems) {
      const sortedItems = Object.entries(itemTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Top 10 items
        
      if (expenseTopItemsChartInst) {
         expenseTopItemsChartInst.destroy();
      }
      
      expenseTopItemsChartInst = new Chart(ctxTopItems, {
        type: 'bar',
        data: {
          labels: sortedItems.map(item => item[0]),
          datasets: [{
            label: 'Total Spent ($)',
            data: sortedItems.map(item => item[1]),
            backgroundColor: 'rgba(33,150,243,0.7)',
            borderColor: '#2196f3',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { 
              beginAtZero: true,
              grid: { color: '#333' }, 
              ticks: { color: '#aaa' } 
            },
            x: { 
              grid: { display: false }, 
              ticks: { color: '#aaa', maxRotation: 45, minRotation: 45 } 
            }
          }
        }
      });
    }

    // 3. Render Vendor Chart
    if (ctxVendor) {
      const sortedVendors = Object.entries(vendorTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
        
      if (expenseVendorChartInst) expenseVendorChartInst.destroy();
      
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
            x: { beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#aaa' } },
            y: { grid: { display: false }, ticks: { color: '#aaa' } }
          }
        }
      });
    }

    // 4. Render Recent Receipts Table (Slide-Over Trigger)
    const tbody = document.getElementById('recent-receipts-body');
    if (tbody) {
      tbody.innerHTML = '';
      const receipts = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        if (d.status === 'confirmed') receipts.push({ id: docSnap.id, ...d });
      });
      // Sort strictly descending by the most relevant date (confirmedAt > createdAt > purchaseDate)
      receipts.sort((a,b) => {
          const getMs = (r) => {
              if (r.confirmedAt && typeof r.confirmedAt.toDate === 'function') return r.confirmedAt.toDate().getTime();
              if (r.createdAt && typeof r.createdAt.toDate === 'function') return r.createdAt.toDate().getTime();
              if (r.purchaseDate && typeof r.purchaseDate.toDate === 'function') return r.purchaseDate.toDate().getTime();
              if (r.createdAt) return new Date(r.createdAt).getTime();
              return 0;
          };
          return getMs(b) - getMs(a);
      });
      
      const recent = receipts.slice(0, 10);
      if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 16px; color: var(--gray);">No receipts found.</td></tr>';
      } else {
        recent.forEach(r => {
          const scannedDateStr = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : 'N/A';
          const purchaseDateStr = r.purchaseDate?.toDate ? r.purchaseDate.toDate().toLocaleDateString() : 'Unknown';
          const parsedTotal = parseFloat(String(r.total || 0).replace(/[^0-9.-]+/g, "")) || 0;
          const tr = document.createElement('tr');
          tr.style.cursor = 'pointer';
          tr.style.transition = "background 0.2s";
          tr.onmouseover = () => tr.style.background = "rgba(255,255,255,0.05)";
          tr.onmouseout = () => tr.style.background = "transparent";
          
          tr.innerHTML = `
            <td style="padding: 12px 8px; border-bottom: 1px solid var(--border);">${scannedDateStr}</td>
            <td style="padding: 12px 8px; border-bottom: 1px solid var(--border); color: var(--gray);">${purchaseDateStr}</td>
            <td style="padding: 12px 8px; font-weight: bold; border-bottom: 1px solid var(--border);">${window.escapeHtml(r.vendor || 'Unknown')}</td>
            <td style="padding: 12px 8px; border-bottom: 1px solid var(--border);">${window.escapeHtml(r.category || 'other')}</td>
            <td style="padding: 12px 8px; text-align: right; color: var(--accent); font-weight: bold; border-bottom: 1px solid var(--border);">$${parsedTotal.toFixed(2)}</td>
          `;
          tr.addEventListener('click', () => {
             try { window.openReceiptSlide(r); } 
             catch(e) { console.error("Error opening receipt slide:", e); alert("Error loading receipt details."); }
          });
          tbody.appendChild(tr);
        });
      }
    }
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
  window.openReceiptSlide = (receipt) => {
      if (!receipt) return;
      const slide = document.getElementById('receipt-slide-over');
      const backdrop = document.getElementById('receipt-slide-backdrop');
      if (slide) slide.style.transform = 'translateX(0)';
      if (backdrop) {
          backdrop.style.opacity = '1';
          backdrop.style.pointerEvents = 'auto';
      }

      document.getElementById('slide-vendor').textContent = receipt.vendor || 'Unknown Vendor';
      document.getElementById('slide-date').textContent = receipt.purchaseDate?.toDate ? receipt.purchaseDate.toDate().toLocaleDateString() : 'N/A';
      const parsedTotal = parseFloat(String(receipt.total || 0).replace(/[^0-9.-]+/g, "")) || 0;
      document.getElementById('slide-total').textContent = '$' + parsedTotal.toFixed(2);
      
      const content = document.getElementById('slide-content');
      let html = `<div style="margin-bottom: 24px; display:flex; gap: 8px;">
          <span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 12px; color: var(--gray);">Category: <strong style="color:var(--white);">${receipt.category || 'other'}</strong></span>
          <span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 12px; color: var(--gray);">Status: <strong style="color:var(--white);">${receipt.status || 'unknown'}</strong></span>
      </div>`;
      
      if (receipt.originalImageUrl) {
          html += `<div style="margin-bottom: 24px;">
              <img src="${receipt.originalImageUrl}" alt="Receipt" style="width: 100%; border-radius: 8px; border: 1px solid var(--border);" />
          </div>`;
      }
      
      html += `<h4 style="margin-top:0; border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 12px;">Parsed Items</h4>`;
      html += `<table style="width: 100%; font-size: 13px; border-collapse: collapse;">
         <tr style="color: var(--gray); border-bottom: 1px solid var(--border);">
            <th style="text-align: left; padding: 4px 0;">Item</th>
            <th style="text-align: center; padding: 4px 0;">Qty</th>
            <th style="text-align: right; padding: 4px 0;">Price</th>
            <th style="text-align: right; padding: 4px 0;">Total</th>
         </tr>`;
      
      (receipt.items || []).forEach(item => {
          const uPrice = parseFloat(String(item.unitPrice || 0).replace(/[^0-9.-]+/g, "")) || 0;
          const lTotal = parseFloat(String(item.lineTotal || 0).replace(/[^0-9.-]+/g, "")) || 0;
          html += `<tr>
              <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                  <div style="font-weight: bold;">${item.name || 'Unknown'}</div>
                  <div style="font-size: 11px; color: var(--gray);">Raw: ${item.rawText || 'N/A'}</div>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: center;">${item.quantity || 1}</td>
              <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">$${uPrice.toFixed(2)}</td>
              <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">$${lTotal.toFixed(2)}</td>
          </tr>`;
      });
      html += `</table>`;
      
      content.innerHTML = html;
  };

  window.initEconomicsListeners = () => {
    const savedExpensesTbody = document.getElementById("saved-expenses-tbody");
    if (savedExpensesTbody) {
      const expensesQuery = query(collection(db, "expenses"), limit(200));
      window.window.expensesUnsub = onSnapshot(expensesQuery, (snapshot) => {
        savedExpensesTbody.innerHTML = "";
        if (snapshot.empty) {
          savedExpensesTbody.innerHTML = '<tr><td colspan="5" style="padding: 16px; text-align: center; color: var(--gray);">No saved expenses yet.</td></tr>';
          return;
        }

        renderExpenseAnalytics(snapshot);
        renderExpenseStats(snapshot);
        initPriceTrends(snapshot);

        let docsArray = [];
        snapshot.forEach(docSnap => docsArray.push(docSnap.data()));
        docsArray.sort((a,b) => {
           const getMs = (r) => {
               if (r.createdAt?.toDate) return r.createdAt.toDate().getTime();
               if (r.createdAt) return new Date(r.createdAt).getTime();
               if (r.purchaseDate?.toDate) return r.purchaseDate.toDate().getTime();
               return 0;
           };
           return getMs(b) - getMs(a);
        });

        let rowCount = 0;
        docsArray.forEach(data => {
          if (rowCount >= 50) return;
          rowCount++;
          const dateStr = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : (data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'N/A');
          const itemCount = data.items ? data.items.length : 0;
          const parsedDataTotal = parseFloat(String(data.total || 0).replace(/[^0-9.-]+/g, "")) || 0;
          const totalStr = data.total != null ? `$${parsedDataTotal.toFixed(2)}` : '—';
          
          const mainTr = document.createElement("tr");
          mainTr.style.borderBottom = "1px solid var(--border)";
          mainTr.style.cursor = "pointer";
          mainTr.style.transition = "background 0.2s";
          mainTr.onmouseover = () => mainTr.style.background = "rgba(255,255,255,0.05)";
          mainTr.onmouseout = () => mainTr.style.background = "transparent";
          mainTr.innerHTML = `
            <td data-label="Date" style="padding: 12px;"><span class="expand-icon" style="margin-right: 8px; font-size: 10px; display: inline-block; width: 12px;">▶</span>${dateStr}</td>
            <td data-label="Vendor" style="padding: 12px; font-weight: 600;">${window.escapeHtml(data.vendor || 'Unknown')}</td>
            <td data-label="Items" style="padding: 12px;">${itemCount} items</td>
            <td data-label="Total" style="padding: 12px; font-weight: bold; color: var(--accent);">${totalStr}</td>
            <td data-label="Status" style="padding: 12px;">
              <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; background: rgba(255,255,255,0.1); color: var(--white); text-transform: uppercase;">
                ${window.escapeHtml(data.status || 'pending')}
              </span>
            </td>
          `;
          
          const detailTr = document.createElement("tr");
          detailTr.style.display = "none";
          detailTr.style.background = "rgba(233,171,0,0.05)";
          
          let itemsHtml = '<div style="display: flex; flex-direction: column; gap: 8px;">';
          (Array.isArray(data.items) ? data.items : []).forEach(item => {
             const uPrice = parseFloat(String(item.unitPrice || 0).replace(/[^0-9.-]+/g, "")) || 0;
             const lTotal = parseFloat(String(item.lineTotal || 0).replace(/[^0-9.-]+/g, "")) || 0;
             itemsHtml += `<div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <strong style="font-size: 14px;">${window.escapeHtml(item.name || 'Unknown')}</strong>
                  <span style="font-size: 11px; color: var(--gray); text-transform: uppercase;">${window.escapeHtml(item.category || 'other')}</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                  <strong style="font-size: 14px; color: var(--white);">$${lTotal.toFixed(2)}</strong>
                  <span style="font-size: 11px; color: var(--gray);">${item.quantity || 1} @ $${uPrice.toFixed(2)}</span>
                </div>
             </div>`;
          });
          itemsHtml += '</div>';
          
          detailTr.innerHTML = `<td colspan="5" data-label="" style="padding: 0; display: block; width: 100%; border: none;">
            <div style="padding: 16px; border-bottom: 1px solid var(--border);">
              <h4 style="margin: 0 0 12px 0; font-family: 'Barlow Condensed'; font-size: 16px; color: var(--white); text-transform: uppercase;">Receipt Items</h4>
              ${itemsHtml}
            </div>
          </td>`;
          
          mainTr.addEventListener("click", () => {
             const isHidden = detailTr.style.display === "none";
             detailTr.style.display = isHidden ? "table-row" : "none";
             const icon = mainTr.querySelector('.expand-icon');
             if (icon) icon.textContent = isHidden ? "▼" : "▶";
          });
          
          savedExpensesTbody.appendChild(mainTr);
          savedExpensesTbody.appendChild(detailTr);
        });
      }, (err) => {
        console.error("Expenses sync error:", err);
        savedExpensesTbody.innerHTML = '<tr><td colspan="5" style="padding: 16px; text-align: center; color: #f44336;">Error loading expenses. Check console.</td></tr>';
      });
    }

    // Inventory Tracker Logic
    const inventoryTbody = document.getElementById('inventory-tbody');
    const inventorySearch = document.getElementById('inventory-search');
    let inventoryDataCache = [];

    const renderInventory = (filter = "") => {
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
         inventoryTbody.innerHTML = '<tr><td colspan="7" style="padding: 24px; text-align: center; color: var(--gray);">No inventory tracked yet. Add items manually or confirm receipts.</td></tr>';
         return;
      }
      
      const filtered = inventoryDataCache.filter(data => 
         (data.name || "").toLowerCase().includes(filter.toLowerCase()) || 
         (data.category || "").toLowerCase().includes(filter.toLowerCase())
      );

      if (filtered.length === 0) {
         inventoryTbody.innerHTML = '<tr><td colspan="7" style="padding: 24px; text-align: center; color: var(--gray);">No ingredients found.</td></tr>';
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
              <div>${window.escapeHtml(data.name || 'Unknown')}</div>
              <div style="font-size:11px; color:var(--gray); text-transform:uppercase; margin-top:4px;">${window.escapeHtml(data.category || 'other')}</div>
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
          renderInventory(currentFilter);
       }, (err) => {
          console.error("Inventory sync error:", err);
          inventoryTbody.innerHTML = '<tr><td colspan="7" style="padding: 24px; text-align: center; color: #f44336;">Error loading inventory. Check console.</td></tr>';
       });

       if (inventorySearch) {
          inventorySearch.addEventListener('input', (e) => {
             renderInventory(e.target.value);
          });
       }

       // Add Inventory Flow
       const btnAddInventory = document.getElementById('btn-add-inventory');
       const addInventoryModal = document.getElementById('add-inventory-modal');
       const addInventoryForm = document.getElementById('add-inventory-form');
       
       if (btnAddInventory && addInventoryModal) {
         btnAddInventory.addEventListener('click', () => {
           addInventoryModal.classList.add('open');
         });
       }
       
       if (addInventoryForm) {
         addInventoryForm.addEventListener('submit', async (e) => {
           e.preventDefault();
           const name = document.getElementById('add-inv-name').value.trim();
           const cat = document.getElementById('add-inv-category').value.trim();
           const stock = parseFloat(document.getElementById('add-inv-stock').value) || 0;
           const price = parseFloat(document.getElementById('add-inv-price').value) || 0;
           
           if(!name) return alert("Item name is required.");
           
           const docId = name.toLowerCase().replace(/[^a-z0-9]/g, '');
           try {
             await setDoc(doc(db, 'inventory', docId), {
               name: name,
               category: cat,
               stockQuantity: stock,
               lastPrice: price,
               priceHistory: [{ date: new Date(), price: price }],
               updatedAt: serverTimestamp()
             });
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



