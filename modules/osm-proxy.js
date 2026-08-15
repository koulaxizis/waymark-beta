/* =========================================================
   WAYMARK — Cloudflare Worker (CORS Proxy)
   Deploys to Cloudflare Workers free tier (100k req/day).
   Proxies browser requests to api.openstreetmap.org
   with proper CORS headers.
   ========================================================= */

const OSM_API_BASE = 'https://api.openstreetmap.org';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request) {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // Rewrite the URL to point to api.openstreetmap.org
    const targetUrl = OSM_API_BASE + url.pathname + url.search;

    // Clone request headers, force a proper User-Agent
    const headers = new Headers(request.headers);
    headers.set('User-Agent', 'Waymark/1.0 (+https://github.com/koulaxizis/waymark)');

    // Forward the request to OSM API
    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    });

    try {
      const response = await fetch(proxyRequest);

      // Return response with CORS headers added
      const responseHeaders = new Headers(response.headers);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => {
        responseHeaders.set(k, v);
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
      });
    }
  },
};