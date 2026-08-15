/* =========================================================
   WAYMARK — Address Search Module (Nominatim API)
   CORS-enabled. No backend needed.
   ========================================================= */

function initNominatim(map, container, appState) {
  container.innerHTML = `
    <h2>🔍 ${t('module.nominatim')}</h2>
    <div class="module-form">
      <div class="form-group">
        <label for="nominatimQuery">${t('common.search')}</label>
        <input type="text" id="nominatimQuery" placeholder="${getCurrentLang() === 'el' ? 'π.χ. Ακρόπολη, Αθήνα' : 'e.g. Acropolis, Athens'}" />
      </div>
      <button class="btn" id="nominatimSearchBtn">${t('common.search')}</button>
      <div class="results-list" id="nominatimResults"></div>
    </div>
  `;

  let selectedResult = null;

  document.getElementById('nominatimSearchBtn').addEventListener('click', async () => {
    const query = document.getElementById('nominatimQuery').value.trim();
    if (!query) return;

    const resultsDiv = document.getElementById('nominatimResults');
    resultsDiv.innerHTML = '<div class="spinner"></div>';

    try {
      const response = await fetch(
        'https://nominatim.openstreetmap.org/search?format=json&q=' +
        encodeURIComponent(query) + '&addressdetails=1&limit=5'
      );
      const results = await response.json();

      resultsDiv.innerHTML = '';

      if (results.length === 0) {
        resultsDiv.innerHTML = '<div class="result-item">' + t('common.no_results') + '</div>';
        return;
      }

      results.forEach((result) => {
        const item = document.createElement('div');
        item.className = 'result-item';
        const parts = result.display_name.split(',');
        item.innerHTML = '<strong>' + parts[0] + '</strong><br><small>' + parts.slice(1).join(',') + '</small>';
        item.addEventListener('click', () => {
          selectedResult = result;
          document.querySelectorAll('#nominatimResults .result-item').forEach(el => el.style.background = 'transparent');
          item.style.background = 'var(--accent)';

          appState.mapMarkers.forEach(m => map.removeLayer(m));
          appState.mapMarkers = [];
          const marker = L.marker([result.lat, result.lon]).addTo(map);
          appState.mapMarkers.push(marker);
          marker.bindPopup(result.display_name).openPopup();
          map.setView([result.lat, result.lon], 14);
        });
        resultsDiv.appendChild(item);
      });
    } catch (error) {
      resultsDiv.innerHTML = '<div class="result-item">' + t('common.error') + ': ' + error.message + '</div>';
    }
  });

  document.getElementById('nominatimQuery').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('nominatimSearchBtn').click();
  });
}

window.initNominatim = initNominatim;