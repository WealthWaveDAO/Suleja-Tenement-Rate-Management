/**
 * Suleja LGA Revenue Administration Platform
 * Service Worker (sw.js)
 * Enables complete offline access for field inspectors, tax evaluators, and administrative agents.
 */

const CACHE_NAME = 'suleja-revenue-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Suleja SW] Caching core application shell and resources');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[Suleja SW] Core assets caching failed during install event:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Suleja SW] Erasing legacy cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle HTTP/S origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Bypass service worker or handle chat API cleanly when offline
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({
            reply: "Your device is currently offline or in an area with poor cellular coverage. I have registered your assessment data locally on your field device. It will automatically synchronize once central network services are restored in Suleja LGA!",
            offline: true
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Network-First with Cache-Fallback approach for dynamic real-time land tax administration
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        console.log('[Suleja SW] Offline cache match trigger:', event.request.url);
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Default fallback page if user requests a document and has no network
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
  );
});
