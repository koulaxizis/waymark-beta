/* =========================================================
   WAYMARK — Cloudflare Worker (CORS Proxy)
   Routes /oauth2/* to www.openstreetmap.org
   Routes /api/* to api.openstreetmap.org
   ========================================================= */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // Route OAuth requests to www.openstreetmap.org
    // Route API requests to api.openstreetmap.org
    const targetBase = url.pathname.startsWith('/oauth2')
      ? 'https://www.openstreetmap.org'
      : 'https://api.openstreetmap.org';

    const targetUrl = targetBase + url.pathname + url.search;

    const headers = new Headers(request.headers);
    headers.set('User-Agent', 'Waymark/1.0 (+https://github.com/koulaxizis/waymark)');

    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    });

    try {
      const response = await fetch(proxyRequest);

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