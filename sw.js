/* =========================================================
   WAYMARK — Service Worker
   Caches static assets for offline use.
   Updated: fixed module paths.
   ========================================================= */

const CACHE_NAME = 'waymark-beta-v2-1-1';
const STATIC_ASSETS = [
  './',
  './app.html',
  './config.js',
  './styles.css',
  './i18n.js',
  './app.js',
  './modules/utils.js',
  './modules/nominatim.js',
  './modules/poi-viewer.js',
  './modules/gpx-editor.js',
  './modules/xml-generator.js',
  './modules/osm-editor.js',
  './modules/quality-checker.js',
  './modules/heatmap.js',
  './modules/tags-lookup.js',
  './modules/notes-browser.js',
  './modules/track-recorder.js',
  './modules/building-editor.js',
  './modules/road-editor.js',
  './modules/address-mapper.js',
  './modules/quest-mode.js',
  './manifest.json',
  './favicon.svg',
  './callback.html',

  // Leaflet
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.error('SW install error:', err))
  );
});

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

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;

  // Skip OSM API & proxy requests (always network)
  if (url.hostname.includes('openstreetmap.org') ||
      url.hostname.includes('overpass-api.de') ||
      url.hostname.includes('kumi.systems') ||
      url.hostname.includes('nominatim') ||
      url.hostname.includes('workers.dev') ||
      url.hostname.includes('taginfo') ||
      url.hostname.includes('osm.org')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Skip external tile servers
  if (url.hostname.includes('tile.') ||
      url.hostname.includes('server.') ||
      url.hostname.includes('basemaps.') ||
      url.hostname.includes('arcgisonline') ||
      url.hostname.includes('opentopomap') ||
      url.hostname.includes('cyclosm') ||
      url.hostname.includes('thunderforest')) {
    return;
  }

  // Cache-first for local static assets
  if (url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.json') ||
      url.pathname.endsWith('.html')) {

    event.respondWith(cacheFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

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