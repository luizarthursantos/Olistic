// Stamped with the build id at build time (see vite.config.ts). A per-build
// cache name means activating a new worker drops the previous build's entries,
// so a momentary network failure can never fall back to a months-old bundle.
const CACHE_NAME = 'olistic-__BUILD_ID__';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Delete old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Let API traffic go straight to the network. These are never cacheable, and
  // proxying them adds two failure modes for the streamed Claude chat: the
  // offline fallback resolves to `undefined` for an uncached POST (which the
  // page sees as an opaque network error instead of the real one), and the
  // response body has to be piped through the worker while it streams.
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Network-first: always try fresh content, fall back to cache for offline
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
