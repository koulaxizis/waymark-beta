/* =========================================================
   WAYMARK — Quality Checker Module (Overpass API)
   Finds data quality issues in the visible area.
   ========================================================= */

function initQualityChecker(map, container, appState) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
    <h2>⚠️ ${t('module.quality_checker')}</h2>
    <div class="module-form">
      <p style="font-size: 0.85rem; color: var(--fg-muted);">
        ${isEl
          ? 'Ελέγχει την ορατή περιοχή του χάρτη για τυχόν προβλήματα ποιότητας δεδομένων.'
          : 'Checks the visible map area for data quality issues.'}
      </p>
      <button class="btn" id="qcCheckBtn">${isEl ? 'Έλεγχος περιοχής' : 'Check area'}</button>
      <div class="results-list" id="qcResults"></div>
    </div>
  `;

  document.getElementById('qcCheckBtn').addEventListener('click', async () => {
    const resultsDiv = document.getElementById('qcResults');
    resultsDiv.innerHTML = '<div class="spinner"></div>';

    const bounds = map.getBounds();
    const bbox = bounds.getSouth() + ',' + bounds.getWest() + ',' + bounds.getNorth() + ',' + bounds.getEast();

    const queries = [
      { label: isEl ? 'Κτήρια χωρίς name' : 'Buildings without name', q: 'way["building"](bbox);way["building"]["!name"](bbox);' },
      { label: isEl ? 'Δρόμοι χωρίς name' : 'Roads without name', q: 'way["highway"]["!name"](bbox);' },
      { label: isEl ? 'POIs χωρίς source' : 'POIs without source', q: 'node["amenity"]["!source"](bbox);' },
    ];

    let allResults = [];

    for (const queryObj of queries) {
      const fullQuery = '[out:json][timeout:15];' + queryObj.q.replace(/bbox/g, '(' + bbox + ')') + ';out body center;';
      try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST', body: fullQuery
        });
        const data = await response.json();
        allResults.push({ label: queryObj.label, count: data.elements.length, elements: data.elements });
      } catch (err) {
        allResults.push({ label: queryObj.label, count: 0, error: err.message });
      }
    }

    appState.mapMarkers.forEach(m => map.removeLayer(m));
    appState.mapMarkers = [];

    resultsDiv.innerHTML = '';
    let totalIssues = 0;

    allResults.forEach(result => {
      const item = document.createElement('div');
      item.className = 'result-item';
      const color = result.count > 0 ? 'var(--warning)' : 'var(--success)';
      item.innerHTML = '<strong>' + result.label + '</strong>: <span style="color:' + color + ';">' + result.count + '</span>';
      resultsDiv.appendChild(item);
      totalIssues += result.count;

      if (result.elements) {
        result.elements.slice(0, 50).forEach(el => {
          const lat = el.lat || (el.center && el.center.lat);
          const lon = el.lon || (el.center && el.center.lon);
          if (!lat || !lon) return;

          const marker = L.circleMarker([lat, lon], {
            radius: 5, fillColor: '#ffd43b', color: '#ffd43b', fillOpacity: 0.7
          }).addTo(map);
          appState.mapMarkers.push(marker);
        });
      }
    });

    const summary = document.createElement('div');
    summary.className = 'result-item';
    summary.style.cssText = 'border-top: 1px solid var(--border); margin-top: 0.5rem; padding-top: 0.5rem;';
    summary.innerHTML = '<strong>' + (isEl ? 'Συνολικά προβλήματα:' : 'Total issues:') + '</strong> ' + totalIssues;
    resultsDiv.appendChild(summary);
  });
}

window.initQualityChecker = initQualityChecker;