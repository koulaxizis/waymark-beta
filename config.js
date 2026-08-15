/* =========================================================
   WAYMARK — User Configuration
   ========================================================= */

const WAYMARK_CONFIG = {
  // OAuth 2.0 — from https://www.openstreetmap.org/oauth2/applications
  OSM_CLIENT_ID: 'YOUR_CLIENT_ID_HERE',

  // Use beta for testing, stable for production
  REDIRECT_URI: 'https://koulaxizis.github.io/waymark-beta/callback.html',

  // Cloudflare Worker URL (after deploy — see instructions below)
  PROXY_URL: 'https://waymark-proxy.koulaxizis.workers.dev',
};

window.WAYMARK_CONFIG = WAYMARK_CONFIG;