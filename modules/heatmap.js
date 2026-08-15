/* =========================================================
   WAYMARK — Density Heatmap Module (Overpass API)
   Visualizes POI density using circle markers.
   Uses Overpass + clustered circle markers (no external deps).
   ========================================================= */

function initHeatmap(map, container, appState) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
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

    const query = '[out:json][timeout:20];node["' + heatType + '"](' + bbox + ');out body;';

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: query });
      const data = await response.json();

      if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
      appState.mapMarkers.forEach(m => map.removeLayer(m));
      appState.mapMarkers = [];

      const points = data.elements.filter(e => e.lat && e.lon);

      if (points.length === 0) {
        resultsDiv.innerHTML = '<div class="result-item">' + t('common.no_results') + '</div>';
        return;
      }

      // Create circle markers with varying radius based on proximity
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
      resultsDiv.innerHTML = '<div class="result-item">' + t('common.error') + ': ' + err.message + '</div>';
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