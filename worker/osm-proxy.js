/* =========================================================
   WAYMARK — Cloudflare Worker
   CORS proxy for OSM API + OAuth 2.0 token exchange.
   Deploy: wrangler deploy
   ========================================================= */

const OSM_API = 'https://api.openstreetmap.org';
const OSM_OAUTH = 'https://www.openstreetmap.org';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env) {
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // ── OAuth token exchange ──
    if (path === '/oauth2/token') {
      return handleTokenExchange(request);
    }

    // ── OSM API proxy ──
    // Strip leading slash and prefix with OSM API
    const osmUrl = OSM_API + path + url.search;

    const headers = new Headers(request.headers);
    headers.delete('Origin');
    headers.delete('Referer');
    headers.set('Host', 'api.openstreetmap.org');

    const fetchOpts = {
      method: request.method,
      headers: headers,
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const body = await request.text();
      if (body) fetchOpts.body = body;
    }

    try {
      const response = await fetch(osmUrl, fetchOpts);

      const respHeaders = new Headers(response.headers);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => {
        if (k !== 'Access-Control-Allow-Methods' && k !== 'Access-Control-Max-Age') {
          respHeaders.set(k, v);
        }
      });

      return new Response(response.body, {
        status: response.status,
        headers: respHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }
  }
};

async function handleTokenExchange(request) {
  try {
    const body = await request.text();

    // Forward to OSM OAuth token endpoint
    const tokenResp = await fetch(OSM_OAUTH + '/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: body,
    });

    const respText = await tokenResp.text();

    const respHeaders = new Headers({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });

    return new Response(respText, {
      status: tokenResp.status,
      headers: respHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}