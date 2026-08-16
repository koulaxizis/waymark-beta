/* =========================================================
   WAYMARK — Density Heatmap Module (Overpass API)
   With fallback server + proper error handling.
   ========================================================= */

async function safeOverpassFetch(query, isEl) {
  const servers = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  for (let i = 0; i < servers.length; i++) {
    try {
      const response = await fetch(servers[i], {
        method: 'POST',
        body: query
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

function initHeatmap(map, container, appState) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
    <style>
      .hm-info { font-size: 0.8rem; color: var(--fg-muted); margin-bottom: 0.5rem; }
    </style>
    <h2>🌡️ ${t('module.heatmap')}</h2>
    <div class="module-form">
      <div class="form-group">
        <label for="hmType">${isEl ? 'Τύπος POI' : 'POI Type'}</label>
        <select id="hmType">
          <option value="amenity">${isEl ? 'Όλα τα amenity' : 'All amenities'}</option>
          <option value="shop">${isEl ? 'Όλα τα shop' : 'All shops'}</option>
          <option value="tourism">${isEl ? 'Τουρισμός' : 'Tourism'}</option>
          <option value="leisure">${isEl ? 'Αναψυχή' : 'Leisure'}</option>
        </select>
      </div>
      <button class="btn" id="hmGenerateBtn">${isEl ? 'Δημιουργία Heatmap' : 'Generate Heatmap'}</button>
      <button class="btn btn-secondary" id="hmClearBtn">${t('common.clear')}</button>
      <div class="results-list" id="hmInfo">
        <div class="result-item" style="cursor: default; opacity: 0.6;">
          ${isEl ? 'Η πυκνότητα θα υπολογιστεί για την ορατή περιοχή.' : 'Density will be calculated for the visible area.'}
        </div>
      </div>
    </div>
  `;

  let heatLayer = null;

  document.getElementById('hmGenerateBtn').addEventListener('click', async () => {
    const heatType = document.getElementById('hmType').value;
    const resultsDiv = document.getElementById('hmInfo');
    resultsDiv.innerHTML = '<div class="spinner"></div>';

    const bounds = map.getBounds();
    const bbox = bounds.getSouth() + ',' + bounds.getWest() + ',' + bounds.getNorth() + ',' + bounds.getEast();

    const query = '[out:json][timeout:25];node["' + heatType + '"](' + bbox + ');out body 500;';

    try {
      const data = await safeOverpassFetch(query, isEl);

      if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
      appState.mapMarkers.forEach(m => map.removeLayer(m));
      appState.mapMarkers = [];

      const points = data.elements.filter(e => e.lat && e.lon);

      if (points.length === 0) {
        resultsDiv.innerHTML = '<div class="result-item">' + t('common.no_results') + '</div>';
        return;
      }

      heatLayer = L.layerGroup();
      points.forEach(pt => {
        const circle = L.circleMarker([pt.lat, pt.lon], {
          radius: 8,
          fillColor: '#6d4aff',
          color: '#6d4aff',
          fillOpacity: 0.3,
          weight: 0
        });
        heatLayer.addLayer(circle);
      });
      heatLayer.addTo(map);

      resultsDiv.innerHTML =
        '<div class="result-item">' +
        '<strong>' + (isEl ? 'Σημεία:' : 'Points:') + '</strong> ' + points.length + '<br>' +
        '<small>' + (isEl ? 'Η διαφάνεια δείχνει πυκνότητα.' : 'Opacity indicates density.') + '</small>' +
        '</div>';
    } catch (err) {
      let msg = err.message;
      if (msg === 'Failed to fetch') {
        msg = isEl
          ? 'Αδυναμία σύνδεσης. Ίσως ο server είναι απασχολημένος — δοκίμασε ξανά.'
          : 'Cannot connect. Server may be busy — try again.';
      }
      resultsDiv.innerHTML = '<div class="result-item">' + t('common.error') + ': ' + msg + '</div>';
    }
  });

  document.getElementById('hmClearBtn').addEventListener('click', () => {
    if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
    appState.mapMarkers.forEach(m => map.removeLayer(m));
    appState.mapMarkers = [];
    document.getElementById('hmInfo').innerHTML =
      '<div class="result-item" style="opacity:0.6;">' + (isEl ? 'Καθαρίστηκε.' : 'Cleared.') + '</div>';
  });
}

window.initHeatmap = initHeatmap;
window.safeOverpassFetch = safeOverpassFetch;