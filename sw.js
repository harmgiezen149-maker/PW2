// Service worker Planken Wambuis
// Strategie:
// - Navigaties (de app zelf): network-first, cache-fallback — nieuwe deploys winnen altijd,
//   offline opent de laatst bekende versie.
// - /api/*: nooit cachen (antwoorden, weer, suggesties zijn per definitie actueel).
// - Statische bestanden (manifest, iconen): cache-first.
const CACHE = 'pw-v67';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);

  // API-verkeer nooit cachen
  if (url.pathname.startsWith('/api/')) return;
  if (event.request.method !== 'GET') return;

  // Navigaties: network-first met cache-fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(function(res) {
        const copy = res.clone();
        caches.open(CACHE).then(function(cache) { cache.put('/', copy); });
        return res;
      }).catch(function() {
        return caches.match('/');
      })
    );
    return;
  }

  // Eigen statische bestanden: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        return cached || fetch(event.request).then(function(res) {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(function(cache) { cache.put(event.request, copy); });
          }
          return res;
        });
      })
    );
  }
});
