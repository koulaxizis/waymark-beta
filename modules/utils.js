/* =========================================================
   WAYMARK — Shared Utilities
   Escape functions, file download, Overpass fetch,
   notification system.
   ========================================================= */

(function () {
  'use strict';

  // ── Escape HTML ──
  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  // ── Escape XML ──
  function escapeXml(str) {
    if (!str) return '';
    return String(str).replace(/[<>&'"]/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c];
    });
  }

  // ── Download File ──
  function downloadFile(content, filename, mimeType) {
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Safe Overpass Fetch (with failover) ──
  async function safeOverpassFetch(query, isEl) {
    var servers = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter'
    ];

    for (var i = 0; i < servers.length; i++) {
      try {
        var response = await fetch(servers[i], {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(query)
        });

        if (!response.ok) {
          if (i < servers.length - 1) continue;
          var text = await response.text();
          throw new Error('HTTP ' + response.status + ': ' + text.substring(0, 120));
        }

        var ct = response.headers.get('content-type') || '';
        if (ct.indexOf('application/json') === -1) {
          if (i < servers.length - 1) continue;
          var text2 = await response.text();
          throw new Error(text2.substring(0, 120));
        }

        return await response.json();
      } catch (err) {
        if (i < servers.length - 1) continue;
        throw err;
      }
    }

    throw new Error(isEl ? 'Αδυναμία σύνδεσης με Overpass API' : 'Cannot connect to Overpass API');
  }

  // ── Show Notification ──
  function showNotification(message, type) {
    var existing = document.getElementById('waymark-notification');
    if (existing) existing.remove();

    var notif = document.createElement('div');
    notif.id = 'waymark-notification';

    var bgColor = '#6d4aff';
    if (type === 'success') bgColor = '#22c55e';
    else if (type === 'warning') bgColor = '#ffb143';
    else if (type === 'critical') bgColor = '#ef4444';

    notif.style.cssText =
      'position:fixed;top:calc(var(--header-h,44px) + 8px);left:50%;' +
      'transform:translateX(-50%);background:' + bgColor + ';color:white;' +
      'padding:0.5rem 1rem;border-radius:6px;z-index:10000;font-size:0.85rem;' +
      'box-shadow:0 4px 12px rgba(0,0,0,0.3);max-width:90%;text-align:center;' +
      'transition:opacity 0.3s;';

    notif.textContent = message;
    document.body.appendChild(notif);

    setTimeout(function () {
      notif.style.opacity = '0';
      setTimeout(function () {
        if (notif.parentNode) notif.remove();
      }, 300);
    }, 3000);
  }

  // ── Global exports ──
  window.escapeHtml = escapeHtml;
  window.escapeXml = escapeXml;
  window.downloadFile = downloadFile;
  window.safeOverpassFetch = safeOverpassFetch;
  window.showNotification = showNotification;

})();