// Minimal service worker to satisfy PWA install requirements
self.addEventListener('fetch', (event) => {
  // Pass-through for all requests
  event.respondWith(fetch(event.request));
});
