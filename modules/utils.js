/* =========================================================
   WAYMARK — Shared Utilities
   Common helper functions used across modules
   ========================================================= */

(function () {
  'use strict';

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  function escapeXml(str) {
    if (!str) return '';
    return String(str).replace(/[<>&'"]/g, (c) => ({
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      "'": '&apos;',
      '"': '&quot;'
    }[c]));
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function safeOverpassFetch(query, isEl) {
    const servers = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter'
    ];

    for (let i = 0; i < servers.length; i++) {
      try {
        const response = await fetch(servers[i], {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(query)
        });

        if (!response.ok) {
          if (i < servers.length - 1) continue;
          const text = await response.text();
          throw new Error(text.substring(0, 150));
        }

        const ct = response.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          if (i < servers.length - 1) continue;
          const text = await response.text();
          throw new Error(text.substring(0, 150));
        }

        return await response.json();
      } catch (err) {
        if (err.message === 'Failed to fetch' && i < servers.length - 1) continue;
        if (i < servers.length - 1) continue;
        throw err;
      }
    }

    throw new Error(isEl ? 'Αδυναμία σύνδεσης με Overpass API' : 'Cannot connect to Overpass API');
  }

  // Export globally
  window.escapeHtml = escapeHtml;
  window.escapeXml = escapeXml;
  window.downloadFile = downloadFile;
  window.safeOverpassFetch = safeOverpassFetch;

})();