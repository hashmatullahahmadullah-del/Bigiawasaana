import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function trackPageView() {
  try {
    // Only track if we are in a browser environment (not SSR)
    if (typeof window === 'undefined') return;

    // Don't track admin or internal pages
    const path = window.location.pathname;
    if (path.startsWith('/admin') || path.startsWith('/kitchen') || path.startsWith('/tv-menu') || path.startsWith('/customer-display') || path.startsWith('/order-status')) {
      return;
    }

    const referrer = document.referrer || 'Direct';
    
    await addDoc(collection(db, 'page_views'), {
      path: path,
      referrer: referrer,
      userAgent: navigator.userAgent,
      timestamp: serverTimestamp(),
      title: document.title
    });
    
    console.log('Analytics: Page view recorded.');
  } catch (error) {
    // Fail silently so we don't break the user experience
    console.warn('Analytics: Failed to record page view.');
  }
}

// Automatically track on load
if (typeof window !== 'undefined') {
  // Use setTimeout to not block main thread rendering
  setTimeout(trackPageView, 1000);
}
