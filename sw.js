/* =========================================================
   WAYMARK — Service Worker
   Caches app shell + map tiles for offline use
   Does NOT intercept API calls — they go direct.
   ========================================================= */

const CACHE_NAME = 'waymark-v1';
const OFFLINE_FALLBACK = './offline.html';

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
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Map tiles — Cache First
  if (url.hostname.includes('tile.openstreetmap.org') ||
      url.hostname.includes('basemaps.cartocdn.com') ||
      url.hostname.includes('arcgisonline.com') ||
      url.hostname.includes('opentopomap.org')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Skip SW for all API calls — let browser handle directly
  // (Overpass, Nominatim, OSM API, Cloudflare Worker)
  if (url.hostname.includes('overpass-api.de') ||
      url.hostname.includes('overpass.kumi.systems') ||
      url.hostname.includes('nominatim.openstreetmap.org') ||
      url.hostname.includes('api.openstreetmap.org') ||
      url.hostname.includes('www.openstreetmap.org') ||
      url.hostname.includes('workers.dev')) {
    return; // Don't intercept — browser handles natively
  }

  // Everything else (app shell) — Stale While Revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
          });
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});