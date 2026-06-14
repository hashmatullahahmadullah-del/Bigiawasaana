const CACHE_NAME = 'bigi-admin-cache-v1';

self.addEventListener('install', (e) => {
  // Service worker installed. We don't precache anything since the admin needs live data.
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Let the browser handle fetches normally, prioritizing network
  e.respondWith(fetch(e.request));
});
