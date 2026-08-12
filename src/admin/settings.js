import { showToast } from './orders.js';
import { errorEl, state } from './shared.js';
import { auth, db } from '../firebase.js';
import { updatePassword, verifyBeforeUpdateEmail, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';



export const settingsEmailForm = document.getElementById('settings-email-form');
export const settingsPwdForm = document.getElementById('settings-password-form');
export const reauthForm = document.getElementById('reauth-form');

// Keep track of the pending action that requires re-auth
export let pendingReauthAction = null;

if (settingsEmailForm) {
  settingsEmailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    const newEmail = document.getElementById('settings-new-email').value.trim();
    
    const action = async () => {
      const btn = document.getElementById('btn-settings-email');
      btn.disabled = true;
      btn.textContent = 'Sending...';
      try {
        await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
        showToast('Verification link sent. Please check your new email to confirm.');
        document.getElementById('settings-new-email').value = '';
      } catch (err) {
        if (err.code === 'auth/requires-recent-login') {
          pendingReauthAction = action;
          document.getElementById('reauth-modal').classList.add('open');
        } else {
          showToast('Error: ' + err.message, true);
        }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send Verification Link';
      }
    };
    
    await action();
  });
}

if (settingsPwdForm) {
  settingsPwdForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    const newPwd = document.getElementById('settings-new-password').value;
    const confirmPwd = document.getElementById('settings-confirm-password').value;
    const errorEl = document.getElementById('settings-password-error');
    errorEl.style.display = 'none';

    if (newPwd !== confirmPwd) {
      errorEl.textContent = 'Passwords do not match.';
      errorEl.style.display = 'block';
      return;
    }
    
    const action = async () => {
      const btn = document.getElementById('btn-settings-password');
      btn.disabled = true;
      btn.textContent = 'Updating...';
      try {
        await updatePassword(auth.currentUser, newPwd);
        showToast('Password updated successfully.');
        document.getElementById('settings-new-password').value = '';
        document.getElementById('settings-confirm-password').value = '';
      } catch (err) {
        if (err.code === 'auth/requires-recent-login') {
          pendingReauthAction = action;
          document.getElementById('reauth-modal').classList.add('open');
        } else {
          errorEl.textContent = err.message;
          errorEl.style.display = 'block';
        }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Update Password';
      }
    };
    
    await action();
  });
}

if (reauthForm) {
  reauthForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pwdInput = document.getElementById('reauth-password-input');
    const errorEl = document.getElementById('reauth-error');
    const btn = document.getElementById('btn-reauth-submit');
    
    errorEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Verifying...';
    
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, pwdInput.value);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      document.getElementById('reauth-modal').classList.remove('open');
      pwdInput.value = '';
      
      if (pendingReauthAction) {
        await pendingReauthAction();
        pendingReauthAction = null;
      }
    } catch (err) {
      errorEl.textContent = 'Incorrect password. Please try again.';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Verify';
    }
  });
}





export function loadPickupSettings() {
  onSnapshot(doc(db, 'settings', 'pickupConfig'), (docSnap) => {
    if (docSnap.exists()) {
      const config = docSnap.data();
      document.getElementById('pickup-base-prep').value = config.basePrepTimeMinutes || 15;
      document.getElementById('pickup-per-order').value = config.perOrderIncrementMinutes || 3;
      document.getElementById('pickup-max-wait').value = config.maxWaitMinutes || 60;
      document.getElementById('pickup-busy-offset').value = config.busyModeOffsetMinutes || 0;
      document.getElementById('pickup-min-lead').value = config.minLeadTimeMinutes || 20;
      document.getElementById('pickup-max-days').value = config.maxScheduleDaysAhead || 3;
      document.getElementById('pickup-slot-interval').value = config.slotIntervalMinutes || 15;
      document.getElementById('pickup-prep-buffer').value = config.prepBufferBeforeCloseMinutes || 30;
      if (config.businessHours) {
        document.getElementById('pickup-open-time').value = config.businessHours.open || '12:00';
        document.getElementById('pickup-close-time').value = config.businessHours.close || '22:30';
      }
      const openDays = config.openDays || [0, 1, 2, 3, 4, 5, 6];
      document.querySelectorAll('.pickup-day-cb').forEach(cb => {
        cb.checked = openDays.includes(parseInt(cb.value, 10));
      });
    }
  });
}

document.getElementById('pickup-config-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.textContent = 'Saving...';
  
  const config = {
    basePrepTimeMinutes: parseInt(document.getElementById('pickup-base-prep').value, 10),
    perOrderIncrementMinutes: parseInt(document.getElementById('pickup-per-order').value, 10),
    maxWaitMinutes: parseInt(document.getElementById('pickup-max-wait').value, 10),
    busyModeOffsetMinutes: parseInt(document.getElementById('pickup-busy-offset').value, 10) || 0,
    minLeadTimeMinutes: parseInt(document.getElementById('pickup-min-lead').value, 10),
    maxScheduleDaysAhead: parseInt(document.getElementById('pickup-max-days').value, 10),
    slotIntervalMinutes: parseInt(document.getElementById('pickup-slot-interval').value, 10),
    prepBufferBeforeCloseMinutes: parseInt(document.getElementById('pickup-prep-buffer').value, 10),
    businessHours: {
      open: document.getElementById('pickup-open-time').value,
      close: document.getElementById('pickup-close-time').value
    },
    openDays: Array.from(document.querySelectorAll('.pickup-day-cb'))
                   .filter(cb => cb.checked)
                   .map(cb => parseInt(cb.value, 10)),
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(doc(db, 'settings', 'pickupConfig'), config, { merge: true });
    showToast('Pickup settings saved!');
  } catch (err) {
    console.error('Error saving pickup settings', err);
    showToast('Error saving pickup settings', true);
  }
  btn.textContent = 'Save Pickup Settings';
});

export function renderUpcomingScheduledOrders() {
  const tbody = document.getElementById('upcoming-scheduled-list');
  if (!tbody) return;

  // Filter orders
  const upcoming = state.orders.filter(o => 
    o.pickup && 
    o.pickup.type === 'scheduled' && 
    o.pickup.releasedToKitchen === false &&
    ['pending', 'preparing', 'RESERVED', 'PREPARED'].includes(o.status)
  );

  // Sort by requestedTime ascending
  upcoming.sort((a, b) => {
    const tA = a.pickup.requestedTime?.toDate() || new Date(9999,11,31);
    const tB = b.pickup.requestedTime?.toDate() || new Date(9999,11,31);
    return tA - tB;
  });

  if (upcoming.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="padding: 16px; text-align: center; color: var(--gray);">No upcoming scheduled orders.</td></tr>';
    return;
  }

  tbody.innerHTML = upcoming.map(o => {
    const requestedTimeStr = o.pickup.requestedTime?.toDate()
      ? o.pickup.requestedTime.toDate().toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      : 'N/A';
    
    const qty = o.items ? o.items.reduce((sum, item) => sum + item.qty, 0) : 0;
    
    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td data-label="Requested Time" style="padding: 12px; font-weight: 600; color: var(--accent);">${requestedTimeStr}</td>
        <td data-label="Customer" style="padding: 12px; font-weight: 500;">${o.customerName || 'N/A'}</td>
        <td data-label="Total" style="padding: 12px;">$${o.total.toFixed(2)}</td>
        <td data-label="Items" style="padding: 12px;">${qty} items</td>
        <td data-label="Status" style="padding: 12px;">
          <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; background: rgba(255,255,255,0.1); color: var(--white); text-transform: uppercase;">
            ${o.status}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

