// Use a versioned cache name to ensure updates are reflected
const CACHE_VERSION = 'v10.1'; // Increment this version when you make changes
const CACHE_NAME = `rizit-cache-${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event: Cache the specified assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Force the new Service Worker to activate immediately
        self.skipWaiting();
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...', CACHE_NAME);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      self.clients.claim();
    })
  );
});

// Fetch event: Network-first strategy with cache fallback
self.addEventListener('fetch', event => {
  // Ignore non-GET requests (e.g., POST)
  if (event.request.method !== 'GET') {
    return;
  }

  // Only cache requests for our own origin
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    // Try to fetch from the network first
    fetch(event.request)
      .then(networkResponse => {
        // If the network request succeeds, update the cache
        if (networkResponse && networkResponse.status === 200) {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If the network fails (e.g., offline), fall back to the cache
        return caches.match(event.request).then(cachedResponse => {
          return cachedResponse || new Response('Offline: No cached version available.', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});