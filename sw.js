/* =========================================================
   WAYMARK — Service Worker
   Caches static assets for offline use.
   Updated version with lazy module caching.
   ========================================================= */

const CACHE_NAME = 'waymark-beta-v2-1-0';
const STATIC_ASSETS = [
  './',
  './app.html',
  './config.js',
  './styles.css',
  './i18n.js',
  './theme.js',
  './app.js',
  './utils.js',
  './manifest.json',
  './favicon.svg',
  './callback.html',

  // Leaflet
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

// =======================================================
// Install — Pre-cache core static assets
// =======================================================

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.error('SW install error:', err))
  );
});

// =======================================================
// Activate — Clean old caches
// =======================================================

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key.startsWith('waymark'))
          .map(key => {
            console.log('Deleting old cache:', key);
            return caches.delete(key);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// =======================================================
// Fetch — Cache-first for static, network-first for APIs
// =======================================================

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip OSM API & proxy requests (always network)
  if (url.hostname.includes('openstreetmap.org') ||
      url.hostname.includes('overpass-api.de') ||
      url.hostname.includes('kumi.systems') ||
      url.hostname.includes('nominatim') ||
      url.hostname.includes('workers.dev') ||
      url.hostname.includes('osm.org')) {
    // Network-first for APIs
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Skip external tile servers (let them be handled by browser cache)
  if (url.hostname.includes('tile.') ||
      url.hostname.includes('server.') ||
      url.hostname.includes('basemaps.')) {
    return;
  }

  // Cache-first for local static assets
  if (STATIC_ASSETS.includes(event.request.url) ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.json') ||
      url.pathname.endsWith('.html')) {

    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Default: cache-first with network fallback
  event.respondWith(cacheFirst(event.request));
});

// =======================================================
// Cache-first strategy
// =======================================================

function cacheFirst(request) {
  return caches.match(request)
    .then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (response && response.ok && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => null);
    });
}

// =======================================================
// Network-first strategy (for APIs)
// =======================================================

function networkFirst(request) {
  return fetch(request)
    .then(response => {
      if (response && response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
      }
      return response;
    })
    .catch(() => caches.match(request));
}