const CACHE_NAME = 'tsgt-cache-v2';
const CACHE_MAX_AGE = 31536000; // 1 year in seconds

// Install event - activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event - take control immediately and clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - aggressive caching for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache-first strategy for static assets (JS, CSS, images)
  if (
    request.destination === 'script' || 
    request.destination === 'style' ||
    request.destination === 'image' ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached version immediately
            return cachedResponse;
          }
          
          // Fetch from network and cache with long TTL
          return fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              // Clone and cache the response
              const responseToCache = networkResponse.clone();
              cache.put(request, responseToCache);
            }
            return networkResponse;
          }).catch(() => {
            // If fetch fails, return a fallback
            return new Response('Network error', { status: 408 });
          });
        });
      })
    );
    return;
  }

  // Network-first for other requests (API calls, HTML)
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && request.method === 'GET') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
