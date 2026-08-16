/* =========================================================
   WAYMARK — Cloudflare Worker (CORS Proxy)
   /oauth2/* → www.openstreetmap.org
   /api/*    → api.openstreetmap.org
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

    const targetBase = url.pathname.startsWith('/oauth2')
      ? 'https://www.openstreetmap.org'
      : 'https://api.openstreetmap.org';

    const targetUrl = targetBase + url.pathname + url.search;

    // Read body synchronously
    let body = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.text();
    }

    // Clean headers — remove ones that confuse OSM
    const headers = new Headers(request.headers);
    headers.delete('Host');
    headers.delete('Origin');
    headers.delete('Referer');
    headers.set('User-Agent', 'Waymark/1.0 (+https://github.com/koulaxizis/waymark)');

    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: headers,
      body: body,
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