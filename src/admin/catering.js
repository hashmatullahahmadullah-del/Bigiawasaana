import { DEFAULT_CATERING_CATALOG, DEFAULT_PACKAGE_TEMPLATES } from '../lib/catering-catalog-data.js';
import { state } from './shared.js';
window.state = state;
import { db, app } from '../firebase.js';
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { showToast } from './orders.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateQuoteNumber() {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const randomHex = Math.random().toString(16).substring(2, 6).toUpperCase();
  return `BA-Q-${year}${month}-${randomHex}`;
}

function generateSecureToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Global state for current quote editor
let currentEditingQuoteId = null;
let currentQuoteItems = [];

/**
 * ─────────────────────────────────────────────────────────────────
 * Tab Switching (Inquiries | Quotes | Confirmed Bookings)
 * ─────────────────────────────────────────────────────────────────
 */
export function switchCateringTab(tabName) {
  const tabs = ['inquiries', 'packages', 'quotes', 'bookings', 'catalog'];
  tabs.forEach(t => {
    const btn = document.getElementById(`btn-cat-${t}`);
    const pane = document.getElementById(`cat-tab-${t}`);
    if (btn) btn.classList.toggle('active', t === tabName);
    if (pane) pane.style.display = t === tabName ? 'block' : 'none';
  });

  if (tabName === 'inquiries') renderCateringInquiries();
  if (tabName === 'packages') renderPackageRequests();
  if (tabName === 'quotes') renderCateringQuotes();
  if (tabName === 'bookings') renderConfirmedBookings();
  if (tabName === 'catalog') renderCateringCatalog();
}
window.switchCateringTab = switchCateringTab;

/**
 * ─────────────────────────────────────────────────────────────────
 * 1. Catering Inquiries Tab
 * ─────────────────────────────────────────────────────────────────
 */
export function renderCateringInquiries() {
  const tbody = document.getElementById('catering-table-body');
  if (!tbody) return;

  const inquiries = state.catering || [];

  // Update KPI counters
  const totalEl = document.getElementById('catering-total');
  if (totalEl) totalEl.textContent = inquiries.length;
  const newEl = document.getElementById('catering-new');
  if (newEl) newEl.textContent = inquiries.filter(c => c.status === 'new').length;
  const contactedEl = document.getElementById('catering-contacted');
  if (contactedEl) contactedEl.textContent = inquiries.filter(c => c.status === 'contacted').length;
  const resolvedEl = document.getElementById('catering-resolved');
  if (resolvedEl) resolvedEl.textContent = inquiries.filter(c => c.status === 'resolved').length;

  // Update tab badge
  const badgeInq = document.getElementById('badge-cat-inquiries');
  if (badgeInq) badgeInq.textContent = inquiries.filter(c => c.status === 'new').length;

  tbody.innerHTML = '';

  if (inquiries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">No catering inquiries found.</td></tr>';
    return;
  }

  inquiries.forEach(inquiry => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';

    const statusBg = inquiry.status === 'new' 
      ? 'background: rgba(255,152,0,0.15); color: #ff9800; border: 1px solid rgba(255,152,0,0.3);'
      : inquiry.status === 'contacted'
      ? 'background: rgba(33,150,243,0.15); color: #2196f3; border: 1px solid rgba(33,150,243,0.3);'
      : 'background: rgba(76,175,80,0.15); color: #4caf50; border: 1px solid rgba(76,175,80,0.3);';

    tr.innerHTML = `
      <td data-label="Date">${inquiry.createdAt ? new Date(inquiry.createdAt).toLocaleDateString() : 'N/A'}</td>
      <td data-label="Customer">
        <strong>${escapeHtml(inquiry.name)}</strong>
        <br><small style="color: var(--text-muted);">${escapeHtml(inquiry.phone || inquiry.email || '')}</small>
      </td>
      <td data-label="Event Date">${escapeHtml(inquiry.date || 'N/A')}</td>
      <td data-label="Guests">${escapeHtml(String(inquiry.guests || 'N/A'))}</td>
      <td data-label="Status">
        <span class="status-badge" style="${statusBg} padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: uppercase;">
          ${escapeHtml(inquiry.status)}
        </span>
      </td>
      <td data-label="Actions" style="text-align: right; white-space: nowrap;">
        <button type="button" class="btn-outline btn-sm action-quote-btn" style="padding: 6px 12px; font-size: 12px; border-radius: var(--radius-sm, 6px); margin-right: 6px;">
          Create Quote
        </button>
        <button type="button" class="btn-outline btn-sm action-view-btn" style="padding: 6px 12px; font-size: 12px; border-radius: var(--radius-sm, 6px);">
          Details
        </button>
      </td>
    `;

    tr.querySelector('.action-quote-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      window.createQuoteFromInquiry(inquiry);
    });

    tr.querySelector('.action-view-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      window.showCateringDetails(inquiry);
    });

    tr.addEventListener('click', () => {
      window.showCateringDetails(inquiry);
    });

    tbody.appendChild(tr);
  });
}
window.renderCatering = renderCateringInquiries;

/**
 * Inquiry Details Modal
 */
window.showCateringDetails = (inquiry) => {
  const modal = document.getElementById('catering-modal');
  const title = document.getElementById('modal-catering-title');
  const content = document.getElementById('modal-catering-content');

  if (!modal || !title || !content) return;

  title.textContent = `Inquiry: ${inquiry.name}`;
  content.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 20px;">
      <div>
        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Event Date</div>
        <div style="font-size: 15px; font-weight: 500; margin-top: 2px;">${escapeHtml(inquiry.date || 'N/A')}</div>
      </div>
      <div>
        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Guest Count</div>
        <div style="font-size: 15px; font-weight: 500; margin-top: 2px;">${escapeHtml(String(inquiry.guests || 'N/A'))}</div>
      </div>
      <div>
        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Phone Number</div>
        <div style="font-size: 15px; font-weight: 500; margin-top: 2px;">
          <a href="tel:${escapeHtml(inquiry.phone || '')}" style="color: var(--accent-admin); text-decoration: none;">${escapeHtml(inquiry.phone || 'N/A')}</a>
        </div>
      </div>
      <div>
        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Email Address</div>
        <div style="font-size: 15px; font-weight: 500; margin-top: 2px;">
          <a href="mailto:${escapeHtml(inquiry.email || '')}" style="color: var(--accent-admin); text-decoration: none; word-break: break-all;">${escapeHtml(inquiry.email || 'N/A')}</a>
        </div>
      </div>
    </div>

    <div style="margin-bottom: 24px;">
      <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">Event Details & Requests</div>
      <div style="background: var(--bg-admin); border: 1px solid var(--border-admin); padding: 14px; border-radius: 8px; white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: var(--text-main);">
        ${escapeHtml(inquiry.details || 'No additional details provided.')}
      </div>
    </div>

    <div style="background: rgba(225, 29, 72, 0.06); border: 1px solid rgba(225, 29, 72, 0.2); padding: 16px; border-radius: 8px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
      <div>
        <strong style="color: var(--text-main); font-size: 14px; display: block;">Convert to Official Quote</strong>
        <span style="font-size: 12px; color: var(--text-muted);">Transfer this client's event details into the custom catering quote builder.</span>
      </div>
      <button type="button" class="btn-primary" id="btn-inquiry-to-quote" style="padding: 10px 18px; font-size: 13px; font-weight: 600; border-radius: 6px; cursor: pointer;">
        Create Quote Now
      </button>
    </div>

    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
      <button class="btn-outline" onclick="window.updateCateringStatus('${inquiry.id}', 'contacted')" style="flex: 1; min-width: 130px; padding: 10px;">Mark Contacted</button>
      <button class="btn-outline" onclick="window.updateCateringStatus('${inquiry.id}', 'resolved')" style="flex: 1; min-width: 130px; padding: 10px;">Mark Resolved</button>
      <button class="btn-outline" onclick="window.closeCateringModal()" style="flex: 1; min-width: 100px; padding: 10px;">Close</button>
    </div>
  `;

  document.getElementById('btn-inquiry-to-quote').onclick = () => {
    window.closeCateringModal();
    window.createQuoteFromInquiry(inquiry);
  };

  modal.style.display = 'flex'; modal.classList.add('open');
};

window.closeCateringModal = () => {
  const modal = document.getElementById('catering-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = '';
  }
};

window.updateCateringStatus = async (id, status) => {
  try {
    await updateDoc(doc(db, 'catering_inquiries', id), { 
      status,
      updatedAt: serverTimestamp()
    });
    showToast('Inquiry status updated.');
    window.closeCateringModal();
  } catch (error) {
    console.error('Error updating catering status:', error);
    showToast('Failed to update status.', true);
  }
};

/**
 * ─────────────────────────────────────────────────────────────────
 * 2. Catering Quotes Tab
 * ─────────────────────────────────────────────────────────────────
 */
export function renderCateringQuotes() {
  const tbody = document.getElementById('catering-quotes-table-body') || document.getElementById('quotes-table-body');
  if (!tbody) return;

  const quotes = state.quotes || [];

  // Filter quotes based on search and status
  const searchTerm = (document.getElementById('quote-search-input')?.value || document.getElementById('quotes-search')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('quote-status-filter')?.value || document.getElementById('quotes-status-filter')?.value || 'all';

  const filtered = quotes.filter(q => {
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    const matchesSearch = !searchTerm || 
      (q.quoteNumber && q.quoteNumber.toLowerCase().includes(searchTerm)) ||
      (q.customer?.name && q.customer.name.toLowerCase().includes(searchTerm)) ||
      (q.customer?.phone && q.customer.phone.includes(searchTerm)) ||
      (q.customer?.email && q.customer.email.toLowerCase().includes(searchTerm)) ||
      (q.event?.title && q.event.title.toLowerCase().includes(searchTerm));
    return matchesStatus && matchesSearch;
  });

  // Calculate KPI stats
  const totalQuotesCount = quotes.length;
  const sentQuotesCount = quotes.filter(q => ['sent', 'viewed', 'accepted'].includes(q.status)).length;
  const confirmedQuotesCount = quotes.filter(q => ['deposit_paid', 'confirmed', 'completed'].includes(q.status)).length;
  const pipelineValue = quotes
    .filter(q => q.status !== 'canceled')
    .reduce((sum, q) => sum + (Number(q.pricing?.total) || 0), 0);

  const totalEl = document.getElementById('quotes-stat-total') || document.getElementById('quotes-total-count');
  if (totalEl) totalEl.textContent = totalQuotesCount;
  const sentEl = document.getElementById('quotes-stat-pending') || document.getElementById('quotes-sent-count');
  if (sentEl) sentEl.textContent = sentQuotesCount;
  const confirmedEl = document.getElementById('quotes-stat-accepted') || document.getElementById('quotes-confirmed-count');
  if (confirmedEl) confirmedEl.textContent = confirmedQuotesCount;
  const valueEl = document.getElementById('quotes-stat-revenue') || document.getElementById('quotes-pipeline-value');
  if (valueEl) valueEl.textContent = `${pipelineValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const badgeQuotes = document.getElementById('badge-cat-quotes');
  if (badgeQuotes) badgeQuotes.textContent = quotes.filter(q => q.status === 'draft' || q.status === 'sent').length;

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 32px;">No catering quotes found matching criteria.</td></tr>';
    return;
  }

  filtered.forEach(quote => {
    const tr = document.createElement('tr');
    
    // Status Badge Styling
    let statusBg = 'background: rgba(161, 161, 170, 0.15); color: #a1a1aa; border: 1px solid rgba(161, 161, 170, 0.3);';
    let statusLabel = quote.status || 'draft';

    if (quote.status === 'sent') {
      statusBg = 'background: rgba(33, 150, 243, 0.15); color: #2196f3; border: 1px solid rgba(33, 150, 243, 0.3);';
    } else if (quote.status === 'viewed') {
      statusBg = 'background: rgba(156, 39, 176, 0.15); color: #9c27b0; border: 1px solid rgba(156, 39, 176, 0.3);';
    } else if (quote.status === 'accepted') {
      statusBg = 'background: rgba(255, 152, 0, 0.15); color: #ff9800; border: 1px solid rgba(255, 152, 0, 0.3);';
      statusLabel = 'Accepted';
    } else if (quote.status === 'deposit_paid' || quote.status === 'confirmed') {
      statusBg = 'background: rgba(76, 175, 80, 0.15); color: #4caf50; border: 1px solid rgba(76, 175, 80, 0.3);';
      statusLabel = quote.status === 'deposit_paid' ? 'Deposit Paid' : 'Confirmed';
    } else if (quote.status === 'completed') {
      statusBg = 'background: rgba(0, 150, 136, 0.15); color: #009688; border: 1px solid rgba(0, 150, 136, 0.3);';
    } else if (quote.status === 'canceled') {
      statusBg = 'background: rgba(244, 67, 54, 0.15); color: #f44336; border: 1px solid rgba(244, 67, 54, 0.3);';
    }

    const total = Number(quote.pricing?.total) || 0;
    const deposit = Number(quote.pricing?.depositAmount) || (total * 0.3);

    tr.innerHTML = `
      <td data-label="Quote #">
        <strong style="color: var(--accent-admin); font-family: monospace; font-size: 13px;">${escapeHtml(quote.quoteNumber)}</strong>
        <br><small style="color: var(--text-muted);">${quote.createdAtDate ? quote.createdAtDate.toLocaleDateString() : 'N/A'}</small>
      </td>
      <td data-label="Customer">
        <strong>${escapeHtml(quote.customer?.name || 'Unknown')}</strong>
        ${quote.customer?.company ? `<br><small style="color: var(--text-muted);">${escapeHtml(quote.customer.company)}</small>` : ''}
        <br><small style="color: var(--text-muted);">${escapeHtml(quote.customer?.phone || quote.customer?.email || '')}</small>
      </td>
      <td data-label="Event Date">
        <strong>${escapeHtml(quote.event?.date || 'N/A')}</strong>
        ${quote.event?.serviceType ? `<br><small style="color: var(--text-muted); text-transform: capitalize;">${escapeHtml(quote.event.serviceType.replace('_', ' '))}</small>` : ''}
      </td>
      <td data-label="Guests">${escapeHtml(String(quote.event?.guests || 0))}</td>
      <td data-label="Total">
        <strong>$${total.toFixed(2)}</strong>
      </td>
      <td data-label="Deposit">
        <span style="color: #4caf50; font-weight: 600;">$${deposit.toFixed(2)}</span>
        <br><small style="color: var(--text-muted); font-size: 11px;">(${quote.pricing?.depositPercentage || 30}%)</small>
      </td>
      <td data-label="Status">
        <span class="status-badge" style="${statusBg} padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: uppercase;">
          ${escapeHtml(statusLabel)}
        </span>
      </td>
      <td data-label="Actions" style="text-align: right; white-space: nowrap;">
        <button type="button" class="btn-outline btn-sm action-edit-quote" title="Edit Quote" style="padding: 6px 10px; font-size: 12px; border-radius: var(--radius-sm, 6px); margin-right: 4px;">
          Edit
        </button>
        <button type="button" class="btn-outline btn-sm action-copy-link" title="Copy Private Portal Link" style="padding: 6px 10px; font-size: 12px; border-radius: var(--radius-sm, 6px); margin-right: 4px;">
          Copy Link
        </button>
        <button type="button" class="btn-outline btn-sm action-preview-quote" title="Preview Customer View" style="padding: 6px 10px; font-size: 12px; border-radius: var(--radius-sm, 6px); margin-right: 4px;">
          Preview
        </button>
        <button type="button" class="btn-outline btn-sm action-dup-quote" title="Duplicate Quote" style="padding: 6px 10px; font-size: 12px; border-radius: var(--radius-sm, 6px); margin-right: 4px;">
          Duplicate
        </button>
      </td>
    `;

    tr.querySelector('.action-edit-quote').addEventListener('click', () => window.openEditQuoteModal(quote));
    tr.querySelector('.action-copy-link').addEventListener('click', (e) => window.copyQuotePortalLink(quote, e.currentTarget));
    tr.querySelector('.action-preview-quote').addEventListener('click', () => window.previewQuotePortal(quote));
    tr.querySelector('.action-dup-quote').addEventListener('click', () => window.duplicateQuote(quote));

    tbody.appendChild(tr);
  });
}
window.renderCateringQuotes = renderCateringQuotes;

/**
 * ─────────────────────────────────────────────────────────────────
 * 3. Confirmed Bookings Tab
 * ─────────────────────────────────────────────────────────────────
 */
export function renderConfirmedBookings() {
  const container = document.getElementById('cat-bookings-list');
  if (!container) return;

  const quotes = state.quotes || [];
  const bookings = quotes.filter(q => ['deposit_paid', 'confirmed', 'completed'].includes(q.status));

  const badgeBookings = document.getElementById('badge-cat-bookings');
  if (badgeBookings) badgeBookings.textContent = bookings.length;

  if (bookings.length === 0) {
    container.innerHTML = `
      <div class="crm-panel" style="text-align: center; padding: 48px 24px; color: var(--text-muted);">
        <p style="margin: 0; font-size: 15px;">No confirmed catering bookings yet.</p>
        <p style="margin: 8px 0 0 0; font-size: 13px;">When customers accept a quote and pay their deposit through Square, their booked events will appear here.</p>
      </div>
    `;
    return;
  }

  // Sort by event date
  bookings.sort((a, b) => {
    const dateA = a.event?.date || '';
    const dateB = b.event?.date || '';
    return dateA.localeCompare(dateB);
  });

  let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px;">';

  bookings.forEach(b => {
    const total = Number(b.pricing?.total) || 0;
    const paidDeposit = (b.payments || [])
      .filter(p => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const balance = Math.max(0, total - paidDeposit);

    // Calculate days remaining
    let daysDiffText = '';
    if (b.event?.date) {
      const eventTime = new Date(b.event.date + 'T12:00:00').getTime();
      const nowTime = new Date().getTime();
      const diffDays = Math.ceil((eventTime - nowTime) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) daysDiffText = 'Today!';
      else if (diffDays === 1) daysDiffText = 'Tomorrow';
      else if (diffDays > 1) daysDiffText = `In ${diffDays} days`;
      else daysDiffText = 'Past Event';
    }

    html += `
      <div class="crm-panel" style="padding: 20px; display: flex; flex-direction: column; justify-content: space-between; border-left: 4px solid #4caf50;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div>
              <span style="font-size: 11px; font-weight: 700; color: #4caf50; text-transform: uppercase; letter-spacing: 0.5px;">Confirmed Event</span>
              <h3 style="margin: 4px 0 0 0; font-size: 18px; color: var(--text-main);">${escapeHtml(b.event?.title || 'Catering Event')}</h3>
            </div>
            ${daysDiffText ? `<span style="background: rgba(76, 175, 80, 0.1); color: #4caf50; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 99px;">${daysDiffText}</span>` : ''}
          </div>

          <div style="font-size: 13px; color: var(--text-muted); line-height: 1.6; margin-bottom: 16px;">
            <div><strong>Client:</strong> <span style="color: var(--text-main);">${escapeHtml(b.customer?.name || 'Unknown')}</span></div>
            <div><strong>Phone:</strong> <a href="tel:${escapeHtml(b.customer?.phone || '')}" style="color: var(--accent-admin); text-decoration: none;">${escapeHtml(b.customer?.phone || 'N/A')}</a></div>
            <div><strong>Date & Time:</strong> ${escapeHtml(b.event?.date || 'N/A')} (${escapeHtml(b.event?.startTime || '')} - ${escapeHtml(b.event?.endTime || '')})</div>
            <div><strong>Guests:</strong> ${escapeHtml(String(b.event?.guests || 0))} guests</div>
            <div><strong>Service:</strong> <span style="text-transform: capitalize;">${escapeHtml((b.event?.serviceType || 'buffet').replace('_', ' '))}</span></div>
            <div><strong>Location:</strong> ${escapeHtml(b.event?.location?.address || '18411 Victory Blvd, Reseda, CA 91335')}</div>
          </div>

          <div style="background: var(--bg-admin); border: 1px solid var(--border-admin); padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: var(--text-muted);">Total Value:</span>
              <strong>$${total.toFixed(2)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #4caf50;">Deposit Received:</span>
              <strong style="color: #4caf50;">$${paidDeposit.toFixed(2)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-admin); padding-top: 4px; margin-top: 4px;">
              <span style="color: var(--text-muted);">Remaining Balance:</span>
              <strong style="color: ${balance > 0 ? '#ff9800' : '#4caf50'};">$${balance.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 8px; border-top: 1px solid var(--border-admin); padding-top: 14px;">
          <button type="button" class="btn-outline btn-sm" onclick="window.openEditQuoteModalById('${b.id}')" style="flex: 1; padding: 8px;">
            View Quote
          </button>
          <button type="button" class="btn-outline btn-sm" onclick="window.copyQuotePortalLinkById('${b.id}', this)" style="flex: 1; padding: 8px;">
            Client Link
          </button>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}
window.renderConfirmedBookings = renderConfirmedBookings;

/**
 * ─────────────────────────────────────────────────────────────────
 * 4. Quote Editor & Builder
 * ─────────────────────────────────────────────────────────────────
 */
export function openCreateQuoteModal(initialData = null) {
  currentEditingQuoteId = initialData?.id || null;
  currentQuoteItems = initialData?.items ? JSON.parse(JSON.stringify(initialData.items)) : [];

  const modal = document.getElementById('quote-editor-modal');
  if (!modal) return;

  const quoteNumber = initialData?.quoteNumber || generateQuoteNumber();

  // Title & quote number
  const qnEl = document.getElementById('quote-editor-number-badge') || document.getElementById('qe-quote-number');
  if (qnEl) {
    if ('value' in qnEl) qnEl.value = quoteNumber;
    qnEl.textContent = quoteNumber;
  }

  const modalTitle = document.getElementById('quote-editor-title') || document.getElementById('qe-modal-title');
  if (modalTitle) {
    modalTitle.textContent = currentEditingQuoteId ? `Edit Quote: ${initialData.quoteNumber}` : 'Create New Catering Quote';
  }

  const setVal = (val, ...ids) => {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) {
        if ('value' in el) el.value = val;
        else el.textContent = val;
        return;
      }
    }
  };

  // Pre-fill Customer fields
  setVal(initialData?.customer?.name || '', 'quote-client-name', 'qe-cust-name');
  setVal(initialData?.customer?.phone || '', 'quote-client-phone', 'qe-cust-phone');
  setVal(initialData?.customer?.email || '', 'quote-client-email', 'qe-cust-email');
  setVal(initialData?.customer?.company || '', 'quote-client-company', 'qe-cust-company');
  setVal(initialData?.inquiryId || '', 'quote-linked-inquiry', 'qe-linked-inquiry-id');

  // Pre-fill Event fields
  setVal(initialData?.event?.title || 'Catering Event', 'quote-event-title', 'qe-event-title');
  setVal(initialData?.event?.date || '', 'quote-event-date', 'qe-event-date');
  setVal(initialData?.event?.startTime || '17:00', 'quote-event-time', 'qe-event-start');
  setVal(initialData?.event?.endTime || '21:00', 'qe-event-end');
  setVal(initialData?.event?.guests || 50, 'quote-guest-count', 'qe-event-guests');
  setVal(initialData?.event?.serviceType || 'drop_off', 'quote-service-style', 'qe-event-service');
  setVal(initialData?.event?.location?.address || '', 'quote-venue-address', 'qe-event-address');
  setVal(initialData?.event?.location?.notes || '', 'quote-special-notes', 'qe-event-notes');

  // Pre-fill Pricing fields
  setVal(initialData?.pricing?.deliveryFee !== undefined ? initialData.pricing.deliveryFee : 50, 'quote-delivery-fee', 'qe-delivery-fee');
  setVal(initialData?.pricing?.setupFee !== undefined ? initialData.pricing.setupFee : 0, 'qe-setup-fee');
  setVal(initialData?.pricing?.taxRate !== undefined ? (initialData.pricing.taxRate * 100) : 9.5, 'qe-tax-rate');
  setVal(initialData?.pricing?.discount || 0, 'quote-discount', 'qe-discount');
  setVal(initialData?.pricing?.depositPercentage || 30, 'quote-deposit-pct', 'qe-deposit-pct');

  // Pre-fill Terms
  setVal(initialData?.terms?.customNotes || 'Includes Afghan flatbread, green cilantro chutney, and garlic yogurt sauce.', 'quote-special-notes', 'qe-notes');

  // If no items yet, add default popular trays
  if (currentQuoteItems.length === 0) {
    currentQuoteItems = [
      {
        id: 'chapli-kabob-tray',
        name: "Bigi's Chapli Kabob Tray",
        description: 'Crispy seasoned ground beef patties, charred tomatoes, serrano peppers.',
        imageUrl: '/m-img/1791950307107_1000004875.webp',
        portionSize: 'Large Party Tray (Serves 25-30)',
        quantity: 2,
        unitPrice: 145.00,
        totalPrice: 290.00
      },
      {
        id: 'qabuli-palau-tray',
        name: "Bigi's Qabuli Palau Rice Tray",
        description: 'Traditional spiced brown sella basmati rice with sweet carrots and black raisins.',
        imageUrl: '/m-img/1788130324869_BigiAwasaana_QabuliPalau.webp',
        portionSize: 'Large Party Tray (Serves 25-30)',
        quantity: 2,
        unitPrice: 110.00,
        totalPrice: 220.00
      }
    ];
  }

  renderQuoteEditorItems();
  recalculateQuoteTotals();

  modal.classList.add('open');
}
window.openCreateQuoteModal = openCreateQuoteModal;

window.openEditQuoteModal = (quote) => {
  openCreateQuoteModal(quote);
};

window.openEditQuoteModalById = (id) => {
  const quote = (state.quotes || []).find(q => q.id === id);
  if (quote) openCreateQuoteModal(quote);
};

window.closeQuoteEditorModal = () => {
  const modal = document.getElementById('quote-editor-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = '';
  }
};

/**
 * Hand-off: Create Quote Directly from Inquiry
 */
window.createQuoteFromInquiry = (inquiry) => {
  const initialData = {
    inquiryId: inquiry.id,
    quoteNumber: generateQuoteNumber(),
    customer: {
      name: inquiry.name || '',
      phone: inquiry.phone || '',
      email: inquiry.email || '',
      company: ''
    },
    event: {
      title: `${inquiry.name}'s Catering Event`,
      date: inquiry.date || '',
      guests: parseInt(inquiry.guests) || 50,
      serviceType: 'buffet_dropoff',
      location: {
        address: '',
        notes: inquiry.details || ''
      }
    },
    terms: {
      customNotes: inquiry.details ? `Client Request: ${inquiry.details}` : ''
    }
  };

  openCreateQuoteModal(initialData);
};

/**
 * Render Items inside Quote Editor
 */
export function renderQuoteEditorItems() {
  const container = document.getElementById('quote-editor-items-container') || document.getElementById('qe-items-container');
  if (!container) return;

  if (currentQuoteItems.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 24px; color: var(--text-muted); border: 1px dashed var(--border-admin); border-radius: 8px;">
        No items in this quote yet. Click "Add from Menu" or "Add Custom Item" below.
      </div>
    `;
    return;
  }

  let html = '<div style="display: flex; flex-direction: column; gap: 12px; width: 100%; box-sizing: border-box;">';

  currentQuoteItems.forEach((item, index) => {
    html += `
      <div style="background: var(--bg-admin); border: 1px solid var(--border-admin); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 10px; width: 100%; box-sizing: border-box;">
        <!-- Row 1: Image, Title, Portion & Remove -->
        <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
          <div style="flex-shrink: 0;">
            ${item.imageUrl 
              ? `<img src="${item.imageUrl}" alt="${escapeHtml(item.name)}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-admin);">`
              : `<div style="width: 48px; height: 48px; background: var(--surface-admin); border-radius: 6px; border: 1px solid var(--border-admin); display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--text-muted);">No Pic</div>`}
          </div>

          <div style="flex: 1; min-width: 0;">
            <input type="text" class="crm-input" value="${escapeHtml(item.name)}" oninput="window.updateQuoteItemField(${index}, 'name', this.value)" placeholder="Dish Name" style="font-weight: 600; padding: 6px 10px; font-size: 13px; margin-bottom: 4px; width: 100%; box-sizing: border-box;">
            <input type="text" class="crm-input" value="${escapeHtml(item.portionSize || '')}" oninput="window.updateQuoteItemField(${index}, 'portionSize', this.value)" placeholder="Portion (e.g. Serves 25-30)" style="font-size: 12px; padding: 4px 8px; color: var(--text-muted); width: 100%; box-sizing: border-box;">
          </div>

          <div style="flex-shrink: 0;">
            <button type="button" class="btn-outline" onclick="window.removeQuoteItem(${index})" title="Remove item" style="padding: 6px; width: 34px; height: 34px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--danger); border-color: rgba(239,68,68,0.3); cursor: pointer;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <!-- Row 2: Qty, Unit Price, Line Total -->
        <div style="display: flex; gap: 10px; align-items: flex-end; padding-top: 8px; border-top: 1px dashed var(--border-admin); width: 100%; box-sizing: border-box;">
          <div style="flex: 1; min-width: 65px;">
            <label style="font-size: 10px; color: var(--text-muted); display: block; text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">Qty</label>
            <input type="number" min="1" class="crm-input" value="${item.quantity || 1}" oninput="window.updateQuoteItemField(${index}, 'quantity', parseInt(this.value) || 1)" style="padding: 6px 8px; font-size: 13px; text-align: center; width: 100%; box-sizing: border-box;">
          </div>

          <div style="flex: 1.2; min-width: 85px;">
            <label style="font-size: 10px; color: var(--text-muted); display: block; text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">Unit Price</label>
            <div style="position: relative; width: 100%;">
              <span style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; color: var(--text-muted); pointer-events: none;">$</span>
              <input type="number" step="0.01" min="0" class="crm-input" value="${item.unitPrice || 0}" oninput="window.updateQuoteItemField(${index}, 'unitPrice', parseFloat(this.value) || 0)" style="padding: 6px 8px 6px 20px; font-size: 13px; width: 100%; box-sizing: border-box;">
            </div>
          </div>

          <div style="flex: 1.2; text-align: right;">
            <label style="font-size: 10px; color: var(--text-muted); display: block; text-transform: uppercase; font-weight: 600; margin-bottom: 2px;">Line Total</label>
            <div style="font-weight: 700; font-size: 15px; color: var(--text-main); padding-top: 4px;">
              ${((item.quantity || 1) * (item.unitPrice || 0)).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

window.updateQuoteItemField = (index, field, value) => {
  if (currentQuoteItems[index]) {
    currentQuoteItems[index][field] = value;
    if (field === 'quantity' || field === 'unitPrice') {
      currentQuoteItems[index].totalPrice = (currentQuoteItems[index].quantity || 1) * (currentQuoteItems[index].unitPrice || 0);
    }
    recalculateQuoteTotals();
  }
};

window.removeQuoteItem = (index) => {
  currentQuoteItems.splice(index, 1);
  renderQuoteEditorItems();
  recalculateQuoteTotals();
};

window.addCustomQuoteItem = () => {
  currentQuoteItems.push({
    id: `custom-${Date.now()}`,
    name: 'Custom Catering Dish',
    description: '',
    imageUrl: '',
    portionSize: 'Party Tray (Serves 20)',
    quantity: 1,
    unitPrice: 100.00,
    totalPrice: 100.00
  });
  renderQuoteEditorItems();
  recalculateQuoteTotals();
};

/**
 * Dish Picker Modal (Choose from Live Menu)
 */
window.openDishPickerModal = () => {
  const modal = document.getElementById('dish-picker-modal');
  const container = document.getElementById('dish-picker-list');
  if (!modal || !container) return;

  const menu = state.menu || [];
  
  if (menu.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 24px;">No menu items loaded.</p>';
    modal.classList.add('open');
    return;
  }

  let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; max-height: 60vh; overflow-y: auto; padding-right: 6px;">';

  menu.forEach(dish => {
    const dishPrice = typeof dish.price === 'number' ? dish.price : parseFloat(dish.price) || 0;
    // Suggest platter price: if single portion is $16, party platter (serves ~15) is around $120
    const trayPrice = Math.round(dishPrice * 8);

    html += `
      <div style="background: var(--bg-admin); border: 1px solid var(--border-admin); border-radius: 8px; padding: 12px; display: flex; gap: 12px; align-items: center;">
        <img src="${dish.img || dish.image || '/logo.webp'}" alt="${escapeHtml(dish.name)}" style="width: 52px; height: 52px; object-fit: cover; border-radius: 6px; flex-shrink: 0;">
        <div style="flex: 1; min-width: 0;">
          <strong style="font-size: 13px; color: var(--text-main); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(dish.name)}</strong>
          <span style="font-size: 11px; color: var(--text-muted); display: block;">${escapeHtml(dish.category || 'Menu')}</span>
          <span style="font-size: 12px; color: var(--accent-admin); font-weight: 700;">Suggested Tray: $${trayPrice}</span>
        </div>
        <button type="button" class="btn-primary" onclick="window.selectDishForQuote('${dish.id}', '${escapeHtml(dish.name)}', '${dish.img || dish.image || ''}', ${trayPrice})" style="padding: 6px 10px; font-size: 12px; border-radius: 6px; flex-shrink: 0; cursor: pointer;">
          Add
        </button>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
  modal.classList.add('open');
};

window.closeDishPickerModal = () => {
  const modal = document.getElementById('dish-picker-modal');
  if (modal) modal.classList.remove('open');
};

window.selectDishForQuote = (id, name, img, price) => {
  currentQuoteItems.push({
    id,
    name: `${name} Party Tray`,
    description: `Freshly grilled authentic Afghan specialty for catering events. 100% Zabiha Halal.`,
    imageUrl: img,
    portionSize: 'Party Tray (Serves 20-25)',
    quantity: 1,
    unitPrice: price,
    totalPrice: price
  });

  renderQuoteEditorItems();
  recalculateQuoteTotals();
  window.closeDishPickerModal();
  showToast(`Added ${name} tray to quote.`);
};

/**
 * Live Financial & Deposit Calculation
 */
export function recalculateQuoteTotals() {
  const subtotal = currentQuoteItems.reduce((sum, item) => sum + ((item.quantity || 1) * (item.unitPrice || 0)), 0);
  const deliveryFee = parseFloat(document.getElementById('quote-delivery-fee')?.value || document.getElementById('qe-delivery-fee')?.value) || 0;
  const setupFee = parseFloat(document.getElementById('qe-setup-fee')?.value) || 0;
  const isExempt = document.getElementById('quote-tax-exempt')?.checked || false;
  const taxRate = isExempt ? 0 : (parseFloat(document.getElementById('qe-tax-rate')?.value) || 9.5) / 100;
  const discount = parseFloat(document.getElementById('quote-discount')?.value || document.getElementById('qe-discount')?.value) || 0;
  const depositPct = parseFloat(document.getElementById('quote-deposit-pct')?.value || document.getElementById('qe-deposit-pct')?.value) || 30;

  const taxableAmount = Math.max(0, subtotal - discount);
  const taxAmount = Math.round(taxableAmount * taxRate * 100) / 100;
  const grandTotal = Math.max(0, taxableAmount + deliveryFee + setupFee + taxAmount);
  
  const depositAmount = Math.round(grandTotal * (depositPct / 100) * 100) / 100;
  const remainingBalance = Math.max(0, grandTotal - depositAmount);

  // Update Summary UI
  const setText = (txt, ...ids) => {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    }
  };

  setText(`${subtotal.toFixed(2)}`, 'quote-subtotal-display', 'qe-calc-subtotal');
  setText(`${taxAmount.toFixed(2)}`, 'quote-tax-display', 'qe-calc-tax');
  setText(`${grandTotal.toFixed(2)}`, 'quote-grand-total-display', 'qe-calc-total');
  setText(`${depositAmount.toFixed(2)}`, 'quote-deposit-due-display', 'qe-calc-deposit');
  setText(`${remainingBalance.toFixed(2)}`, 'quote-balance-due-display', 'qe-calc-balance');

  return {
    subtotal,
    deliveryFee,
    setupFee,
    taxRate,
    taxAmount,
    discount,
    total: grandTotal,
    depositPercentage: depositPct,
    depositAmount,
    remainingBalance
  };
}
window.recalculateQuoteTotals = recalculateQuoteTotals;

/**
 * Save Quote Draft / Update Firestore
 */
window.saveQuoteDraft = async () => {
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
        phoneLast4: customerPhone.replace(/\D/g, '').slice(-4)
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
};

/**
 * Copy Private Portal Link with visual animation feedback
 */
window.copyQuotePortalLink = (quote, triggerBtn = null) => {
  if (!quote) return;
  const token = quote.security?.directAccessToken || '';
  const url = `https://www.bigiawasaana.com/quote.html?q=${encodeURIComponent(quote.quoteNumber)}&token=${encodeURIComponent(token)}`;

  const btn = triggerBtn || (typeof event !== 'undefined' && event?.currentTarget ? event.currentTarget : null);

  const applyAnimation = () => {
    if (btn) {
      const origText = btn.innerHTML;
      btn.classList.add('copy-link-success');
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>Copied!';
      setTimeout(() => {
        btn.classList.remove('copy-link-success');
        btn.innerHTML = origText;
      }, 2000);
    }
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      applyAnimation();
      showToast(`Copied private client link for #${quote.quoteNumber}!`);
    }).catch(() => {
      applyAnimation();
      prompt('Private Client Quote Link:', url);
    });
  } else {
    applyAnimation();
    prompt('Private Client Quote Link:', url);
  }
};

window.copyQuotePortalLinkById = (id, btn = null) => {
  const quote = (state.quotes || []).find(q => q.id === id);
  if (quote) window.copyQuotePortalLink(quote, btn);
};

/**
 * Preview Quote Portal in New Tab
 */
window.previewQuotePortal = (quote) => {
  if (!quote) return;
  const token = quote.security?.directAccessToken || '';
  const url = `/quote.html?q=${encodeURIComponent(quote.quoteNumber)}&token=${encodeURIComponent(token)}`;
  window.open(url, '_blank');
};

/**
 * Duplicate Quote
 */
window.duplicateQuote = async (quote) => {
  if (!confirm(`Duplicate Quote #${quote.quoteNumber}?`)) return;

  const newQuote = JSON.parse(JSON.stringify(quote));
  delete newQuote.id;
  newQuote.quoteNumber = generateQuoteNumber();
  newQuote.status = 'draft';
  newQuote.createdAt = serverTimestamp();
  newQuote.updatedAt = serverTimestamp();
  newQuote.payments = [];
  newQuote.security = {
    directAccessToken: generateSecureToken(),
    phoneLast4: (newQuote.customer?.phone || '').replace(/\D/g, '').slice(-4)
  };

  try {
    await addDoc(collection(db, 'catering_quotes'), newQuote);
    showToast(`Duplicated as new quote #${newQuote.quoteNumber}!`);
  } catch (err) {
    console.error('Error duplicating quote:', err);
    showToast('Failed to duplicate quote.', true);
  }
};

/**
 * Send Quote via Email (Calls Cloud Function)
 */
window.sendQuoteEmailToClient = async () => {
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
};


/**
 * ═══════════════════════════════════════════════════════════════════
 * 1B. Package Requests Controller & Quote Conversion
 * ═══════════════════════════════════════════════════════════════════
 */
let currentInspectingPackage = null;

export function renderPackageRequests() {
  const tbody = document.getElementById('catering-packages-table-body');
  if (!tbody) return;

  const requests = state.packageRequests || [];

  // Update KPI counters
  const totalCountEl = document.getElementById('pkg-total-count');
  const newCountEl = document.getElementById('pkg-new-count');
  const quotedCountEl = document.getElementById('pkg-quoted-count');
  const pipelineValEl = document.getElementById('pkg-pipeline-val');

  const newCount = requests.filter(r => r.status === 'new').length;
  const quotedCount = requests.filter(r => r.status === 'quoted').length;
  const pipelineVal = requests
    .filter(r => r.status !== 'closed')
    .reduce((sum, r) => sum + (Number(r.estimatedPriceBreakdown?.estimatedTotal) || 0), 0);

  if (totalCountEl) totalCountEl.textContent = requests.length;
  if (newCountEl) newCountEl.textContent = newCount;
  if (quotedCountEl) quotedCountEl.textContent = quotedCount;
  if (pipelineValEl) pipelineValEl.textContent = '$' + pipelineVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Update Subnav badge
  const badge = document.getElementById('badge-package-requests');
  if (badge) {
    badge.textContent = newCount;
    badge.style.display = newCount > 0 ? 'inline-block' : 'none';
  }

  // Filter criteria
  const searchInput = document.getElementById('pkg-search');
  const statusFilter = document.getElementById('pkg-status-filter');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const selectedStatus = statusFilter ? statusFilter.value : 'all';

  const filtered = requests.filter(r => {
    if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
    if (searchTerm) {
      const name = (r.customerContact?.name || '').toLowerCase();
      const email = (r.customerContact?.email || '').toLowerCase();
      const phone = (r.customerContact?.phone || '').toLowerCase();
      const num = (r.requestNumber || '').toLowerCase();
      return name.includes(searchTerm) || email.includes(searchTerm) || phone.includes(searchTerm) || num.includes(searchTerm);
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 32px;">No catering package requests found.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(req => {
    const itemsCount = (req.selectedItems || []).reduce((s, it) => s + (it.quantity || 1), 0);
    const estTotal = Number(req.estimatedPriceBreakdown?.estimatedTotal) || 0;
    
    // Status color
    let statusBg = 'rgba(161,161,170,0.15)';
    let statusColor = '#a1a1aa';
    if (req.status === 'new') { statusBg = 'rgba(245,158,11,0.15)'; statusColor = '#f59e0b'; }
    else if (req.status === 'reviewing') { statusBg = 'rgba(59,130,246,0.15)'; statusColor = '#60a5fa'; }
    else if (req.status === 'quoted') { statusBg = 'rgba(16,185,129,0.15)'; statusColor = '#34d399'; }

    return `
      <tr>
        <td style="font-family: monospace; font-weight: 700; color: var(--accent-admin);">
          ${escapeHtml(req.requestNumber || req.id)}
        </td>
        <td>
          <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(req.customerContact?.name || 'Unknown')}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(req.customerContact?.phone || '')} &bull; ${escapeHtml(req.customerContact?.email || '')}</div>
        </td>
        <td>
          <div style="color: var(--text-main);">${escapeHtml(req.eventDetails?.date || 'N/A')}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(String(req.eventDetails?.guests || 0))} guests (${escapeHtml(req.eventDetails?.type || 'Event')})</div>
        </td>
        <td>
          <span style="font-size: 12px; text-transform: uppercase; font-weight: 700; color: ${req.eventDetails?.fulfillment === 'delivery' ? '#ff9800' : '#4caf50'};">
            ${escapeHtml(req.eventDetails?.fulfillment || 'pickup')}
          </span>
        </td>
        <td style="font-weight: 700; color: var(--text-main);">
          $${estTotal.toFixed(2)}
          <div style="font-size: 11px; font-weight: normal; color: var(--text-muted);">${itemsCount} trays</div>
        </td>
        <td>
          <span style="display: inline-block; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: ${statusBg}; color: ${statusColor};">
            ${escapeHtml(req.status || 'new')}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn-outline btn-sm" onclick="window.openPackageRequestById('${req.id}')" style="padding: 6px 10px; font-size: 12px;">
              Review
            </button>
            <button type="button" class="btn-primary btn-sm" onclick="window.convertPackageRequestById('${req.id}')" style="padding: 6px 12px; font-size: 12px; font-weight: 700;">
              Convert
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}
window.renderPackageRequests = renderPackageRequests;

window.openPackageRequestById = (id) => {
  const req = (state.packageRequests || []).find(r => r.id === id);
  if (req) openPackageRequestModal(req);
};
window.convertPackageRequestById = (id) => {
  const req = (state.packageRequests || []).find(r => r.id === id);
  if (req) convertPackageRequestToQuote(req);
};

window.filterPackageRequests = renderPackageRequests;

export function openPackageRequestModal(pkg) {
  if (!pkg) return;
  currentInspectingPackage = pkg;

  const modal = document.getElementById('package-request-modal');
  if (!modal) return;

  document.getElementById('prm-req-num').textContent = pkg.requestNumber || pkg.id;
  document.getElementById('prm-status-select').value = pkg.status || 'new';

  document.getElementById('prm-cust-name').textContent = pkg.customerContact?.name || 'Unknown';
  const emailEl = document.getElementById('prm-cust-email');
  emailEl.textContent = pkg.customerContact?.email || 'N/A';
  emailEl.href = `mailto:${pkg.customerContact?.email || ''}`;

  const phoneEl = document.getElementById('prm-cust-phone');
  phoneEl.textContent = pkg.customerContact?.phone || 'N/A';
  phoneEl.href = `tel:${pkg.customerContact?.phone || ''}`;

  document.getElementById('prm-cust-contact-pref').textContent = pkg.customerContact?.preferredContact || 'phone';

  document.getElementById('prm-event-type').textContent = pkg.eventDetails?.type || 'Celebration';
  document.getElementById('prm-event-date-time').textContent = `${pkg.eventDetails?.date || 'N/A'} at ${pkg.eventDetails?.time || '17:00'}`;
  document.getElementById('prm-event-guests').textContent = `${pkg.eventDetails?.guests || 0} Guests`;
  document.getElementById('prm-event-fulfillment').textContent = (pkg.eventDetails?.fulfillment || 'pickup').toUpperCase();

  const addressRow = document.getElementById('prm-event-address-row');
  const addressEl = document.getElementById('prm-event-address');
  if (pkg.eventDetails?.fulfillment === 'delivery' && pkg.eventDetails?.deliveryAddress) {
    addressRow.style.display = 'block';
    addressEl.textContent = pkg.eventDetails.deliveryAddress;
  } else {
    addressRow.style.display = 'none';
  }

  document.getElementById('prm-special-notes').textContent = pkg.eventDetails?.specialInstructions || 'None provided.';

  // Render items
  const itemsTbody = document.getElementById('prm-items-tbody');
  itemsTbody.innerHTML = (pkg.selectedItems || []).map(it => `
    <tr>
      <td>
        <div style="display: flex; align-items: center; gap: 10px;">
          ${it.imageUrl ? `<img src="${it.imageUrl}" alt="${escapeHtml(it.name)}" style="width: 36px; height: 36px; border-radius: 4px; object-fit: cover;">` : ''}
          <strong style="color: var(--text-main);">${escapeHtml(it.name)}</strong>
        </div>
      </td>
      <td style="color: var(--text-muted); font-size: 12px;">${escapeHtml(it.portionSize || 'Party Tray')}</td>
      <td style="font-weight: 700;">${it.quantity}</td>
      <td>$${(Number(it.unitPrice) || 0).toFixed(2)}</td>
      <td style="font-weight: 700; color: var(--text-main);">$${(Number(it.totalPrice) || (it.unitPrice * it.quantity) || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  // Render services
  const srvSection = document.getElementById('prm-services-section');
  const srvList = document.getElementById('prm-services-list');
  if (pkg.selectedServices && pkg.selectedServices.length > 0) {
    srvSection.style.display = 'block';
    srvList.innerHTML = pkg.selectedServices.map(s => `
      <div>&bull; <strong>${escapeHtml(s.name)}</strong> ${s.price ? `($${Number(s.price).toFixed(2)})` : ''}</div>
    `).join('');
  } else {
    srvSection.style.display = 'none';
  }

  // Price breakdown
  const b = pkg.estimatedPriceBreakdown || {};
  document.getElementById('prm-food-subtotal').textContent = `$${(Number(b.foodSubtotal) || 0).toFixed(2)}`;
  document.getElementById('prm-services-total').textContent = `$${(Number(b.servicesTotal) || 0).toFixed(2)}`;
  document.getElementById('prm-delivery-fee').textContent = `$${(Number(b.deliveryFee) || 0).toFixed(2)}`;
  document.getElementById('prm-tax-amount').textContent = `$${(Number(b.taxAmount) || 0).toFixed(2)}`;
  document.getElementById('prm-estimated-total').textContent = `$${(Number(b.estimatedTotal) || 0).toFixed(2)}`;

  modal.classList.add('open');
}
window.openPackageRequestModal = openPackageRequestModal;

export function closePackageRequestModal() {
  const modal = document.getElementById('package-request-modal');
  if (modal) modal.classList.remove('open');
  currentInspectingPackage = null;
}
window.closePackageRequestModal = closePackageRequestModal;

export async function updatePackageRequestStatus(newStatus) {
  if (!currentInspectingPackage) return;
  try {
    await updateDoc(doc(db, 'catering_package_requests', currentInspectingPackage.id), {
      status: newStatus,
      updatedAt: serverTimestamp()
    });
    currentInspectingPackage.status = newStatus;
    showToast(`Status updated to ${newStatus}`, 'success');
  } catch (err) {
    console.error('Failed to update status:', err);
    showToast('Failed to update status.', 'error');
  }
}
window.updatePackageRequestStatus = updatePackageRequestStatus;

export function convertCurrentPackageToQuote() {
  if (currentInspectingPackage) {
    convertPackageRequestToQuote(currentInspectingPackage);
  }
}
window.convertCurrentPackageToQuote = convertCurrentPackageToQuote;

export function convertPackageRequestToQuote(pkg) {
  if (!pkg) return;

  const quoteData = {
    customer: {
      name: pkg.customerContact?.name || '',
      phone: pkg.customerContact?.phone || '',
      email: pkg.customerContact?.email || '',
      company: ''
    },
    event: {
      title: `${pkg.eventDetails?.type || 'Catering'} Banquet`,
      date: pkg.eventDetails?.date || '',
      startTime: pkg.eventDetails?.time || '17:00',
      endTime: '21:00',
      guests: pkg.eventDetails?.guests || 50,
      serviceType: pkg.eventDetails?.fulfillment === 'delivery' ? 'buffet_dropoff' : 'pickup',
      location: {
        address: pkg.eventDetails?.deliveryAddress || '18411 Victory Blvd, Reseda, CA 91335',
        notes: pkg.eventDetails?.specialInstructions || ''
      }
    },
    items: (pkg.selectedItems || []).map(it => ({
      id: it.id,
      name: it.name,
      description: it.portionSize || '',
      imageUrl: it.imageUrl || '',
      portionSize: it.portionSize || '',
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      totalPrice: it.totalPrice || (it.unitPrice * it.quantity)
    })),
    pricing: {
      deliveryFee: pkg.estimatedPriceBreakdown?.deliveryFee !== undefined ? pkg.estimatedPriceBreakdown.deliveryFee : 50,
      setupFee: 0,
      taxRate: 0.1025,
      discount: 0,
      depositPercentage: 30
    },
    terms: {
      customNotes: `Converted from Package Request ${pkg.requestNumber || ''}. Includes authentic Afghan flatbread and house chutneys.`
    },
    packageRequestId: pkg.id
  };

  closePackageRequestModal();
  openCreateQuoteModal(quoteData);

  // Link quote to package request
  if (pkg.id) {
    updateDoc(doc(db, 'catering_package_requests', pkg.id), {
      status: 'reviewing',
      updatedAt: serverTimestamp()
    }).catch(() => {});
  }

  showToast(`Package ${pkg.requestNumber || ''} transferred to Quote Editor.`, 'success');
}
window.convertPackageRequestToQuote = convertPackageRequestToQuote;

/**
 * ═══════════════════════════════════════════════════════════════════
 * 1C. Catering Catalog & Preset Templates Admin View
 * ═══════════════════════════════════════════════════════════════════
 */
export function renderCateringCatalog() {
  const dishesGrid = document.getElementById('catalog-dishes-grid');
  const templatesGrid = document.getElementById('catalog-templates-admin-grid');

  if (dishesGrid) {
    dishesGrid.innerHTML = DEFAULT_CATERING_CATALOG.map(dish => `
      <div style="background: var(--surface-admin); border: 1px solid var(--border-admin); border-radius: 8px; overflow: hidden; display: flex; flex-direction: column;">
        <img src="${dish.imageUrl}" alt="${escapeHtml(dish.nameEn)}" style="width: 100%; height: 130px; object-fit: cover; background: #000;">
        <div style="padding: 14px; flex: 1; display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
            <h4 style="font-size: 15px; font-weight: 700; color: var(--text-main); margin: 0;">${escapeHtml(dish.nameEn)}</h4>
            <span style="font-weight: 700; color: var(--accent-admin);">$${dish.unitPrice.toFixed(2)}</span>
          </div>
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">${escapeHtml(dish.portionSize)}</div>
          <p style="font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.4; flex: 1;">${escapeHtml(dish.descriptionEn)}</p>
          <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-admin); padding-top: 8px;">
            <span style="font-size: 11px; color: #4caf50; font-weight: 600;">Yield: ~${dish.servingYield} guests</span>
            <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Published</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  if (templatesGrid) {
    templatesGrid.innerHTML = DEFAULT_PACKAGE_TEMPLATES.map(tpl => `
      <div style="background: var(--surface-admin); border: 1px solid var(--border-admin); border-radius: 8px; overflow: hidden; display: flex; flex-direction: column;">
        <img src="${tpl.imageUrl}" alt="${escapeHtml(tpl.titleEn)}" style="width: 100%; height: 130px; object-fit: cover; background: #000;">
        <div style="padding: 14px; flex: 1; display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
            <h4 style="font-size: 15px; font-weight: 700; color: var(--text-main); margin: 0;">${escapeHtml(tpl.titleEn)}</h4>
            <span style="font-size: 11px; background: rgba(225,29,72,0.1); color: var(--accent-admin); padding: 2px 8px; border-radius: 99px; font-weight: 700;">~${tpl.recommendedGuests} Guests</span>
          </div>
          <p style="font-size: 12px; color: var(--text-muted); margin: 0 0 8px; line-height: 1.4; flex: 1;">${escapeHtml(tpl.descriptionEn)}</p>
          <div style="font-size: 12px; color: var(--text-main); font-weight: 600;">Included Trays: ${tpl.defaultItems.length} dish types</div>
        </div>
      </div>
    `).join('');
  }
}
window.renderCateringCatalog = renderCateringCatalog;
