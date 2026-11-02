const fs = require('fs');

let code = fs.readFileSync('src/admin/catering.js', 'utf8');

// 1. Expose window.state
if (!code.includes('window.state = state;')) {
  code = code.replace(
    "import { state } from './shared.js';",
    "import { state } from './shared.js';\nwindow.state = state;"
  );
}

// 2. Add window.openPackageRequestById and window.convertPackageRequestById
const handlersCode = `
window.openPackageRequestById = (id) => {
  const req = (state.packageRequests || []).find(r => r.id === id);
  if (req) openPackageRequestModal(req);
};
window.convertPackageRequestById = (id) => {
  const req = (state.packageRequests || []).find(r => r.id === id);
  if (req) convertPackageRequestToQuote(req);
};
`;

if (!code.includes('window.openPackageRequestById')) {
  code = code.replace(
    "window.renderPackageRequests = renderPackageRequests;",
    "window.renderPackageRequests = renderPackageRequests;\n" + handlersCode
  );
}

// 3. Fix onclick handlers in renderPackageRequests
code = code.replace(
  `onclick="window.openPackageRequestModal(state.packageRequests.find(r => r.id === '\${req.id}'))"`,
  `onclick="window.openPackageRequestById('\${req.id}')"`
);

code = code.replace(
  `onclick="window.convertPackageRequestToQuote(state.packageRequests.find(r => r.id === '\${req.id}'))"`,
  `onclick="window.convertPackageRequestById('\${req.id}')"`
);

// 4. Update renderQuoteEditorItems to be 100% mobile responsive (no fixed 6-column grid blowout)
const oldRenderItemsRegex = /export function renderQuoteEditorItems\(\) \{[\s\S]*?container\.innerHTML = html;\s*\}/;

const newRenderItemsCode = `export function renderQuoteEditorItems() {
  const container = document.getElementById('quote-editor-items-container') || document.getElementById('qe-items-container');
  if (!container) return;

  if (currentQuoteItems.length === 0) {
    container.innerHTML = \`
      <div style="text-align: center; padding: 24px; color: var(--text-muted); border: 1px dashed var(--border-admin); border-radius: 8px;">
        No items in this quote yet. Click "Add from Menu" or "Add Custom Item" below.
      </div>
    \`;
    return;
  }

  let html = '<div style="display: flex; flex-direction: column; gap: 12px; width: 100%; box-sizing: border-box;">';

  currentQuoteItems.forEach((item, index) => {
    html += \`
      <div style="background: var(--bg-admin); border: 1px solid var(--border-admin); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 10px; width: 100%; box-sizing: border-box;">
        <!-- Row 1: Image, Title, Portion & Remove -->
        <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
          <div style="flex-shrink: 0;">
            \${item.imageUrl 
              ? \`<img src="\${item.imageUrl}" alt="\${escapeHtml(item.name)}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-admin);">\`
              : \`<div style="width: 48px; height: 48px; background: var(--surface-admin); border-radius: 6px; border: 1px solid var(--border-admin); display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--text-muted);">No Pic</div>\`}
          </div>

          <div style="flex: 1; min-width: 0;">
            <input type="text" class="crm-input" value="\${escapeHtml(item.name)}" oninput="window.updateQuoteItemField(\${index}, 'name', this.value)" placeholder="Dish Name" style="font-weight: 600; padding: 6px 10px; font-size: 13px; margin-bottom: 4px; width: 100%; box-sizing: border-box;">
            <input type="text" class="crm-input" value="\${escapeHtml(item.portionSize || '')}" oninput="window.updateQuoteItemField(\${index}, 'portionSize', this.value)" placeholder="Portion (e.g. Serves 25-30)" style="font-size: 12px; padding: 4px 8px; color: var(--text-muted); width: 100%; box-sizing: border-box;">
          </div>

          <div style="flex-shrink: 0;">
            <button type="button" class="btn-outline" onclick="window.removeQuoteItem(\${index})" title="Remove item" style="padding: 6px; width: 34px; height: 34px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--danger); border-color: rgba(239,68,68,0.3); cursor: pointer;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <!-- Row 2: Qty, Unit Price, Line Total -->
        <div style="display: flex; gap: 10px; align-items: flex-end; padding-top: 8px; border-top: 1px dashed var(--border-admin); width: 100%; box-sizing: border-box;">
          <div style="flex: 1; min-width: 65px;">
            <label style="font-size: 10px; color: var(--text-muted); display: block; text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">Qty</label>
            <input type="number" min="1" class="crm-input" value="\${item.quantity || 1}" oninput="window.updateQuoteItemField(\${index}, 'quantity', parseInt(this.value) || 1)" style="padding: 6px 8px; font-size: 13px; text-align: center; width: 100%; box-sizing: border-box;">
          </div>

          <div style="flex: 1.2; min-width: 85px;">
            <label style="font-size: 10px; color: var(--text-muted); display: block; text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">Unit Price</label>
            <div style="position: relative; width: 100%;">
              <span style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; color: var(--text-muted); pointer-events: none;">$</span>
              <input type="number" step="0.01" min="0" class="crm-input" value="\${item.unitPrice || 0}" oninput="window.updateQuoteItemField(\${index}, 'unitPrice', parseFloat(this.value) || 0)" style="padding: 6px 8px 6px 20px; font-size: 13px; width: 100%; box-sizing: border-box;">
            </div>
          </div>

          <div style="flex: 1.2; text-align: right;">
            <label style="font-size: 10px; color: var(--text-muted); display: block; text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">Line Total</label>
            <div style="font-weight: 700; font-size: 15px; color: var(--text-main); padding-top: 4px;">
              $\${((item.quantity || 1) * (item.unitPrice || 0)).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    \`;
  });

  html += '</div>';
  container.innerHTML = html;
}`;

code = code.replace(oldRenderItemsRegex, newRenderItemsCode);

// 5. Update copyQuotePortalLink with animation feedback
const oldCopyRegex = /window\.copyQuotePortalLink = \(quote\) => \{[\s\S]*?\};\s*\};/;

const newCopyCode = `window.copyQuotePortalLink = (quote, triggerBtn = null) => {
  if (!quote) return;
  const token = quote.security?.directAccessToken || '';
  const url = \`https://www.bigiawasaana.com/quote.html?q=\${encodeURIComponent(quote.quoteNumber)}&token=\${encodeURIComponent(token)}\`;

  const btn = triggerBtn || document.querySelector(\`[data-quote-num="\${quote.quoteNumber}"] .action-copy-link\`);

  navigator.clipboard.writeText(url).then(() => {
    if (btn) {
      const origText = btn.innerHTML;
      btn.classList.add('copy-link-success');
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>Copied!';
      setTimeout(() => {
        btn.classList.remove('copy-link-success');
        btn.innerHTML = origText;
      }, 2000);
    }
    showToast(\`Copied private client link for #\${quote.quoteNumber}!\`);
  }).catch(() => {
    prompt('Private Client Quote Link:', url);
  });
};`;

code = code.replace(oldCopyRegex, newCopyCode);

// Update tr.querySelector('.action-copy-link') in renderCateringQuotes to pass event target
code = code.replace(
  "tr.querySelector('.action-copy-link').addEventListener('click', () => window.copyQuotePortalLink(quote));",
  "tr.querySelector('.action-copy-link').addEventListener('click', (e) => window.copyQuotePortalLink(quote, e.currentTarget));"
);

// 6. Update saveQuoteDraft with loading spinner and button disabled state
const oldSaveRegex = /window\.saveQuoteDraft = async \(\) => \{([\s\S]*?)try \{[\s\S]*?window\.closeQuoteEditorModal\(\);[\s\S]*?\} catch \(err\) \{[\s\S]*?\}[\s\S]*?\};/;

const newSaveCode = `window.saveQuoteDraft = async () => {
  const getVal = (defaultVal, ...ids) => {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) {
        if ('value' in el && el.value !== undefined) return el.value.trim();
        if (el.textContent) return el.textContent.trim();
      }
    }
    return defaultVal;
  };

  const quoteNumber = getVal(generateQuoteNumber(), 'quote-editor-number-badge', 'qe-quote-number');
  const customerName = getVal('', 'quote-client-name', 'qe-cust-name');
  const customerPhone = getVal('', 'quote-client-phone', 'qe-cust-phone');
  const customerEmail = getVal('', 'quote-client-email', 'qe-cust-email');
  const customerCompany = getVal('', 'quote-client-company', 'qe-cust-company');
  const linkedInquiryId = getVal('', 'quote-linked-inquiry', 'qe-linked-inquiry-id');

  if (!customerName || !customerPhone) {
    alert('Please provide at least a customer name and phone number.');
    return;
  }

  const totals = recalculateQuoteTotals();

  const quoteDocData = {
    quoteNumber,
    inquiryId: linkedInquiryId || null,
    customer: {
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      company: customerCompany
    },
    event: {
      title: getVal('Catering Event', 'quote-event-title', 'qe-event-title'),
      date: getVal('', 'quote-event-date', 'qe-event-date'),
      startTime: getVal('17:00', 'quote-event-time', 'qe-event-start'),
      endTime: getVal('21:00', 'qe-event-end'),
      guests: parseInt(getVal('50', 'quote-guest-count', 'qe-event-guests')) || 50,
      serviceType: getVal('drop_off', 'quote-service-style', 'qe-event-service'),
      location: {
        address: getVal('', 'quote-venue-address', 'qe-event-address'),
        notes: getVal('', 'quote-special-notes', 'qe-event-notes')
      }
    },
    items: currentQuoteItems,
    pricing: {
      ...totals,
      depositStatus: 'pending'
    },
    terms: {
      meatStandard: '100% Hand-Slaughtered Zabiha Halal',
      cancellationPolicy: 'Deposits are refundable up to 7 days prior to event.',
      customNotes: getVal('Includes Afghan flatbread, green cilantro chutney, and garlic yogurt sauce.', 'quote-special-notes', 'qe-notes')
    },
    updatedAt: serverTimestamp()
  };

  // Find save buttons for animation
  const saveBtn = document.getElementById('qe-btn-save-draft') || document.querySelector('#quote-editor-modal button[onclick*="saveQuoteDraft"]');
  let origSaveHtml = '';
  if (saveBtn) {
    origSaveHtml = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="crm-spinner"></span> Saving...';
  }

  try {
    if (currentEditingQuoteId) {
      await updateDoc(doc(db, 'catering_quotes', currentEditingQuoteId), quoteDocData);
      showToast('Catering quote updated successfully.');
    } else {
      quoteDocData.status = 'draft';
      quoteDocData.createdAt = serverTimestamp();
      quoteDocData.payments = [];
      quoteDocData.security = {
        directAccessToken: generateSecureToken(),
        phoneLast4: customerPhone.replace(/\\D/g, '').slice(-4)
      };

      const docRef = await addDoc(collection(db, 'catering_quotes'), quoteDocData);
      currentEditingQuoteId = docRef.id;
      showToast('New catering quote created.');
    }

    if (saveBtn) {
      saveBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Saved!';
    }
    setTimeout(() => {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = origSaveHtml;
      }
      window.closeQuoteEditorModal();
    }, 400);
  } catch (err) {
    console.error('Error saving quote:', err);
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = origSaveHtml;
    }
    showToast('Failed to save catering quote.', true);
  }
};`;

code = code.replace(oldSaveRegex, newSaveCode);

// 7. Update sendQuoteEmailToClient with spinner animation
const oldSendRegex = /window\.sendQuoteEmailToClient = async \(\) => \{[\s\S]*?btn\.textContent = 'Sending\.\.\.';[\s\S]*?showToast\('Official catering proposal sent to client!'\);[\s\S]*?window\.closeQuoteEditorModal\(\);[\s\S]*?\} catch \(err\) \{[\s\S]*?\}[\s\S]*?\};/;

const newSendCode = `window.sendQuoteEmailToClient = async () => {
  if (!currentEditingQuoteId) {
    alert('Please save the quote draft before sending.');
    return;
  }

  const btn = document.getElementById('qe-btn-send-email') || document.querySelector('#quote-editor-modal button[onclick*="sendQuoteEmailToClient"]');
  let origBtnHtml = '';
  if (btn) {
    origBtnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="crm-spinner"></span> Sending Proposal...';
  }

  try {
    const functions = getFunctions(app);
    const sendFn = httpsCallable(functions, 'sendCateringQuoteEmail');
    await sendFn({ quoteId: currentEditingQuoteId });

    if (btn) {
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Sent!';
    }
    showToast('Official catering proposal sent to client!');
    setTimeout(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origBtnHtml;
      }
      window.closeQuoteEditorModal();
    }, 500);
  } catch (err) {
    console.error('Error sending quote email:', err);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origBtnHtml;
    }
    showToast('Failed to send proposal email.', true);
  }
};`;

code = code.replace(oldSendRegex, newSendCode);

fs.writeFileSync('src/admin/catering.js', code, 'utf8');
console.log('Successfully patched src/admin/catering.js');
