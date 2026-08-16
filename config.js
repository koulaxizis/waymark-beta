/* =========================================================
   WAYMARK — Configuration
   ========================================================= */

const WAYMARK_CONFIG = {
  // Cloudflare Worker proxy URL
  PROXY_URL: 'https://waymark-proxy.koulaxizis.workers.dev',

  // OAuth 2.0 settings
  OSM_CLIENT_ID: 'jzN7Vg3ipAflZ-zkwey4ozTfBFnoB_Qhv13KsvXkhIE',
  REDIRECT_URI: 'https://koulaxizis.github.io/waymark-beta/callback.html',

  // OAuth scopes
  OAUTH_SCOPE: 'read_prefs write_api write_notes write_gpx',

  // Default map center (Greece)
  DEFAULT_LAT: 39.0742,
  DEFAULT_LON: 21.8243,
  DEFAULT_ZOOM: 7,

  // Map tile layers
  TILE_LAYERS: {
    standard: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
      maxZoom: 19
    },
    cycle: {
      url: 'https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=YOUR_API_KEY',
      attribution: '&copy; Thunderforest, &copy; OpenStreetMap contributors',
      maxZoom: 19
    },
    transport: {
      url: 'https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=YOUR_API_KEY',
      attribution: '&copy; Thunderforest, &copy; OpenStreetMap contributors',
      maxZoom: 19
    }
  }
};

window.WAYMARK_CONFIG = WAYMARK_CONFIG;