/* =========================================================
   WAYMARK — Service Worker
   Caches static assets for offline use.
   ========================================================= */

const CACHE_NAME = 'waymark-v2-0-0';
const CACHE_VERSION = '20260816';

const STATIC_ASSETS = [
  './',
  './app.html',
  './config.js',
  './styles.css',
  './i18n.js',
  './theme.js',
  './app.js',
  './manifest.json',
  './favicon.svg',
  './callback.html',

  // Modules
  './modules/nominatim.js',
  './modules/poi-viewer.js',
  './modules/gpx-editor.js',
  './modules/xml-generator.js',
  './modules/quality-checker.js',
  './modules/heatmap.js',
  './modules/tags-lookup.js',
  './modules/notes-browser.js',
  './modules/tutorial.js',
  './modules/osm-editor.js',
  './modules/track-recorder.js',
  './modules/building-editor.js',
  './modules/road-editor.js',
  './modules/address-mapper.js',
  './modules/quest-mode.js',

  // External (Leaflet)
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

// =======================================================
// Install — Pre-cache static assets
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
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
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
      url.hostname.includes('workers.dev')) {
    return;
  }

  // Cache-first for static assets
  if (STATIC_ASSETS.includes(event.request.url) ||
      STATIC_ASSETS.includes('./' + url.pathname.split('/').pop())) {

    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || fetch(event.request))
    );
    return;
  }

  // Stale-while-revalidate for other GET requests (tiles, etc.)
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);

      // Clone response immediately before any async ops
      const networkPromise = fetch(event.request).then(response => {
        if (response && response.ok && response.type !== 'opaque') {
          cache.put(event.request, response.clone());
        }
        return response;
      }).catch(() => null);

      return cached || networkPromise;
    })
  );
});