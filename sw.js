// Service worker Planken Wambuis
// Strategie:
// - De app zelf (pagina's, /assets/*.js en .css): network-first met cache-fallback —
//   nieuwe deploys winnen altijd, offline opent de laatst bekende versie.
// - Lettertypen, iconen en afbeeldingen: cache-first (veranderen zelden).
// - /api/*: nooit cachen (antwoorden, weer en meldingen zijn per definitie actueel;
//   de app bewaart zelf de laatst geladen stand met datum).
const CACHE = 'pw-v83';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/assets/app.css',
  '/assets/core.js',
  '/assets/vogels.js',
  '/assets/chat.js',
  '/assets/kaart.js',
  '/assets/gebieden.js',
  '/assets/leaflet/leaflet.js',
  '/assets/leaflet/leaflet.css',
  '/assets/meldingen.js',
  '/assets/profiel.js',
  '/assets/landschap.svg',
  '/assets/fonts/fira-sans-latin-400-normal.woff2',
  '/assets/fonts/fira-sans-latin-500-normal.woff2',
  '/assets/fonts/fira-sans-latin-600-normal.woff2',
  '/assets/fonts/fira-sans-latin-700-normal.woff2',
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

function bewaar(request, res) {
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then(function(cache) { cache.put(request, copy); });
  }
  return res;
}

self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  // API-verkeer nooit cachen
  if (url.pathname.startsWith('/api/')) return;

  // Navigaties: network-first met cache-fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(function(res) {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(function(cache) { cache.put('/', copy); }); }
        return res;
      }).catch(function() { return caches.match('/'); })
    );
    return;
  }

  // Lettertypen, iconen en afbeeldingen: cache-first
  if (/^\/(icons|assets\/fonts|assets\/img)\//.test(url.pathname) || /\.(png|svg|woff2|webp|jpg)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        return cached || fetch(event.request).then(function(res) { return bewaar(event.request, res); });
      })
    );
    return;
  }

  // Scripts, opmaak en overige bestanden: network-first met cache-fallback
  event.respondWith(
    fetch(event.request).then(function(res) { return bewaar(event.request, res); })
      .catch(function() { return caches.match(event.request); })
  );
});
