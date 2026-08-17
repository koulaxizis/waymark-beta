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

  // Tile layers — all use working free URLs (no API keys needed)
  TILE_LAYERS: {
    standard: {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 19
    },
    cycle: {
      url: 'https://tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=6170aad10fed42a38d1d8a5eab8935fc',
      attribution: '&copy; <a href="https://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    },
    transport: {
      url: 'https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=6170aad10fed42a38d1d8a5eab8935fc',
      attribution: '&copy; <a href="https://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    },
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20
    },
    topographic: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
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