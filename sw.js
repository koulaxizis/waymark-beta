/* =========================================================
   WAYMARK — Service Worker
   ========================================================= */

const CACHE_NAME = 'waymark-v2';

const STATIC_ASSETS = [
  './',
  './index.html',
  './app.html',
  './favicon.svg',
  './styles.css',
  './app.js',
  './i18n.js',
  './theme.js',
  './config.js',
  './manifest.json',
  './offline.html',
  './callback.html',
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
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip ALL API calls — browser handles directly
  if (url.hostname.includes('overpass') ||
      url.hostname.includes('nominatim') ||
      url.hostname.includes('openstreetmap') ||
      url.hostname.includes('workers.dev')) {
    return;
  }

  // Map tiles — Cache First
  if (url.hostname.includes('tile.openstreetmap') ||
      url.hostname.includes('cartocdn') ||
      url.hostname.includes('arcgisonline') ||
      url.hostname.includes('opentopomap')) {

    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;

        return fetch(event.request).then((response) => {
          // Clone IMMEDIATELY before any async operations
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
          return response;
        }).catch(() => {
          return caches.match(event.request);
        });
      })
    );
    return;
  }

  // Static assets — Stale While Revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response.ok) {
          // Clone IMMEDIATELY before returning
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => cached);

      return cached || networkFetch;
    })
  );
});