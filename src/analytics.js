import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

let isTracked = false;

export async function trackPageView() {
  try {
    // Only track in browser environment (not SSR)
    if (typeof window === 'undefined') return;
    if (isTracked) return;

    // Don't track admin, internal operational display views, or local preview/testing
    const path = window.location.pathname || '/';
    const hostname = window.location.hostname || '';
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      path.startsWith('/admin') ||
      path.startsWith('/kitchen') ||
      path.startsWith('/tv1') ||
      path.startsWith('/tv2') ||
      path.startsWith('/customer-display') ||
      path.startsWith('/order-status')
    ) {
      return;
    }

    isTracked = true;
    const referrer = document.referrer || 'Direct';
    
    await addDoc(collection(db, 'page_views'), {
      path: path,
      referrer: referrer,
      userAgent: navigator.userAgent || '',
      timestamp: serverTimestamp(),
      title: document.title || ''
    });
  } catch (error) {
    // Fail silently so tracking never disrupts customer experience
  }
}

// Automatically track when the main thread is completely idle
if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => trackPageView(), { timeout: 4000 });
  } else {
    setTimeout(trackPageView, 2500);
  }
}
