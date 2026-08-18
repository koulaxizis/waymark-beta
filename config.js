// =======================================================
// Waymark Configuration
// =======================================================

window.WAYMARK_CONFIG = {
  // OAuth 2.0
  OSM_CLIENT_ID: 'jzN7Vg3ipAflZ-zkwey4ozTfBFnoB_Qhv13KsvXkhIE',
  REDIRECT_URI: 'https://koulaxizis.github.io/waymark-beta/callback.html',
  PROXY_URL: 'https://waymark-proxy.koulaxizis.workers.dev',
  OAUTH_SCOPE: 'read_prefs write_api write_notes write_gpx',

  // Map defaults
  DEFAULT_LAT: 39.0742,
  DEFAULT_LON: 21.8243,
  DEFAULT_ZOOM: 7,

  // Tile layers — named LAYERS (not TILE_LAYERS) to match app.js
  LAYERS: [
    {
      id: 'standard',
      name: { en: 'Standard', el: 'Standard' },
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    },
    {
      id: 'satellite',
      name: { en: 'Satellite', el: 'Δορυφορικό' },
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 19
    },
    {
      id: 'dark',
      name: { en: 'Dark', el: 'Σκούρο' },
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20,
      subdomains: 'abcd'
    },
    {
      id: 'topographic',
      name: { en: 'Topographic', el: 'Τοπογραφικό' },
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
      maxZoom: 17,
      subdomains: 'abc'
    },
    {
      id: 'cycle',
      name: { en: 'Cycle', el: 'Ποδήλατο' },
      url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
      attribution: '&copy; CyclOSM &copy; OpenStreetMap contributors',
      maxZoom: 19,
      subdomains: 'abc'
    },
    {
      id: 'transit',
      name: { en: 'Transit', el: 'Μεταφορές' },
      url: 'https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=',
      attribution: '&copy; Thunderforest &copy; OpenStreetMap contributors',
      maxZoom: 19,
      subdomains: 'abc'
    }
  ],

  // APIs (used as fallbacks / reference)
  NOMINATIM_URL: 'https://nominatim.openstreetmap.org/search',
  OVERPASS_URL: 'https://overpass-api.de/api/interpreter',
  OSM_API_URL: 'https://www.openstreetmap.org',

  // Overpass timeout
  OVERPASS_TIMEOUT: 30,

  // Thunderforest API key (leave empty if not available)
  TF_API_KEY: '',
};