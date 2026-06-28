import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { initNav } from './nav.js';

// Init mobile nav
initNav();


// Auto-Quote Calculator
const guestInput = document.getElementById('cat-guests');
const quoteDisplay = document.getElementById('cat-quote-display');
const quoteAmount = document.getElementById('cat-quote-amount');

if (guestInput && quoteDisplay && quoteAmount) {
  guestInput.addEventListener('input', (e) => {
    const guests = parseInt(e.target.value) || 0;
    if (guests > 0) {
      const estimate = guests * 18;
      quoteAmount.textContent = '$' + estimate.toLocaleString();
      quoteDisplay.style.display = 'block';
    } else {
      quoteDisplay.style.display = 'none';
    }
  });
}

// Catering Form Logic
const cateringForm = document.getElementById('catering-form');
const catStatus = document.getElementById('cat-status');
const catSubmitBtn = document.getElementById('cat-submit-btn');

if (cateringForm) {
  cateringForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('cat-name').value.trim();
    const email = document.getElementById('cat-email').value.trim();
    const phone = document.getElementById('cat-phone').value.trim();
    const date = document.getElementById('cat-date').value;
    const guests = document.getElementById('cat-guests').value;
    const details = document.getElementById('cat-details').value.trim();

    // Button loading state
    catSubmitBtn.disabled = true;
    catSubmitBtn.textContent = 'Sending...';

    try {
      await addDoc(collection(db, 'catering_inquiries'), {
        name,
        email,
        phone,
        date,
        guests,
        details,
        status: 'new',
        createdAt: serverTimestamp()
      });

      // Success
      cateringForm.reset();
      catStatus.style.display = 'block';
      catStatus.style.background = 'rgba(37, 211, 102, 0.1)';
      catStatus.style.borderColor = '#25D366';
      catStatus.style.color = '#25D366';
      catStatus.textContent = '✅ Inquiry sent! We will contact you within 24 hours.';

      setTimeout(() => {
        catStatus.style.display = 'none';
      }, 6000);

    } catch (err) {
      console.error('Catering form error:', err);
      catStatus.style.display = 'block';
      catStatus.style.background = 'rgba(255,69,0,0.1)';
      catStatus.style.borderColor = 'var(--accent)';
      catStatus.style.color = 'var(--accent)';
      catStatus.textContent = '❌ Something went wrong. Please call us at (323) 421-1646.';
    } finally {
      catSubmitBtn.disabled = false;
      catSubmitBtn.textContent = 'Submit Inquiry';
    }
  });
}
