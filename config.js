// =======================================================
// Waymark Configuration
// =======================================================

const WAYMARK_CONFIG = {
  // OAuth 2.0
  OSM_CLIENT_ID: 'jzN7Vg3ipAflZ-zkwey4ozTfBFnoB_Qhv13KsvXkhIE',
  REDIRECT_URI: 'https://koulaxizis.github.io/waymark-beta/callback.html',
  PROXY_URL: 'https://waymark-proxy.koulaxizis.workers.dev',
  OAUTH_SCOPE: 'read_prefs write_api write_notes write_gpx',

  // Map defaults
  DEFAULT_LAT: 39.0742,
  DEFAULT_LON: 21.8243,
  DEFAULT_ZOOM: 7,

  // Tile layers (Fix #5 - Added all layers: standard, satellite, cycle, transport, dark, topographic)
  TILE_LAYERS: {
    standard: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 19
    },
    cycle: {
      url: 'https://{s}.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.opencyclemap.org">OpenCycleMap</a>',
      maxZoom: 18
    },
    transport: {
      url: 'https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=YOUR_THUNDERFOREST_API_KEY',
      attribution: '&copy; <a href="https://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18
    },
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20
    },
    topographic: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.opentopomap.org">OpenTopoMap</a>',
      maxZoom: 17
    }
  },

  // APIs
  NOMINATIM_URL: 'https://nominatim.openstreetmap.org/search',
  OVERPASS_URL: 'https://overpass-api.de/api/interpreter',
  OSM_API_URL: 'https://api.openstreetmap.org',

  // Overpass timeout
  OVERPASS_TIMEOUT: 30,
};