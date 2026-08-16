/* =========================================================
   WAYMARK — POI Viewer Module (Overpass API)
   With fallback server + proper error handling.
   ========================================================= */

function initPoiViewer(map, container, appState) {
  const isEl = getCurrentLang() === 'el';

  const poiTypes = [
    { value: 'amenity=cafe', label: '☕ Cafes' },
    { value: 'amenity=restaurant', label: '🍽️ Restaurants' },
    { value: 'amenity=bar', label: '🍺 Bars' },
    { value: 'shop=supermarket', label: '🛒 Supermarkets' },
    { value: 'amenity=pharmacy', label: '💊 Pharmacies' },
    { value: 'amenity=hospital', label: '🏥 Hospitals' },
    { value: 'amenity=fuel', label: '⛽ Fuel Stations' },
    { value: 'amenity=atm', label: '💳 ATMs' },
    { value: 'tourism=hotel', label: '🏨 Hotels' },
    { value: 'leisure=park', label: '🌳 Parks' },
    { value: 'highway=bus_stop', label: '🚌 Bus Stops' },
    { value: 'amenity=parking', label: '🅿️ Parking' },
  ];

  const options = poiTypes.map(p => '<option value="' + p.value + '">' + p.label + '</option>').join('');

  container.innerHTML = `
    <h2>📍 ${t('module.poi_viewer')}</h2>
    <div class="module-form">
      <div class="form-group">
        <label for="poiType">${isEl ? 'Κατηγορία' : 'Category'}</label>
        <select id="poiType">${options}</select>
      </div>
      <div class="form-group">
        <label for="poiRadius">${isEl ? 'Ακτίνα (μέτρα)' : 'Radius (meters)'}</label>
        <input type="number" id="poiRadius" value="1000" min="100" max="5000" step="100" />
      </div>
      <button class="btn" id="poiSearchBtn">${isEl ? 'Αναζήτηση' : 'Search'}</button>
      <div class="results-list" id="poiResults">
        <div class="result-item" style="cursor: default; opacity: 0.6;">
          ${isEl ? 'Πάτησε αναζήτηση για να βρεις σημεία γύρω από το κέντρο του χάρτη.' : 'Click search to find points around the map center.'}
        </div>
      </div>
    </div>
  `;

  document.getElementById('poiSearchBtn').addEventListener('click', async () => {
    const poiType = document.getElementById('poiType').value;
    const radius = parseInt(document.getElementById('poiRadius').value);
    const center = map.getCenter();

    const resultsDiv = document.getElementById('poiResults');
    resultsDiv.innerHTML = '<div class="spinner"></div>';

    const [key, val] = poiType.split('=');
    const query = '[out:json][timeout:25];(' +
      'node["' + key + '"="' + val + '"](around:' + radius + ',' + center.lat + ',' + center.lng + ');' +
      'way["' + key + '"="' + val + '"](around:' + radius + ',' + center.lat + ',' + center.lng + ');' +
      ');out body center;';

    try {
      const fetchFn = window.safeOverpassFetch || safeOverpassFetch;
      const data = await fetchFn(query, isEl);

      resultsDiv.innerHTML = '';

      appState.mapMarkers.forEach(m => map.removeLayer(m));
      appState.mapMarkers = [];

      const nodes = data.elements.filter(e => e.type === 'node' || (e.center && e.type === 'way'));

      if (nodes.length === 0) {
        resultsDiv.innerHTML = '<div class="result-item">' + t('common.no_results') + '</div>';
        return;
      }

      nodes.forEach((el, idx) => {
        const lat = el.lat || (el.center && el.center.lat);
        const lon = el.lon || (el.center && el.center.lon);
        if (!lat || !lon) return;

        const marker = L.marker([lat, lon]).addTo(map);
        appState.mapMarkers.push(marker);

        const tags = el.tags || {};
        const name = tags.name || (isEl ? 'Χωρίς όνομα' : 'Unnamed');
        const info = Object.entries(tags).slice(0, 4).map(([k, v]) => k + ': ' + v).join('<br>');

        marker.bindPopup('<b>' + name + '</b><br>' + info);

        const item = document.createElement('div');
        item.className = 'result-item';
        item.innerHTML = '<strong>' + name + '</strong><br><small>(' + (idx + 1) + '/' + nodes.length + ')</small>';
        item.addEventListener('click', () => {
          map.setView([lat, lon], 16);
          marker.openPopup();
        });
        resultsDiv.appendChild(item);
      });

      if (appState.mapMarkers.length > 0) {
        const group = L.featureGroup(appState.mapMarkers);
        map.fitBounds(group.getBounds(), { padding: [50, 50] });
      }
    } catch (error) {
      let msg = error.message;
      if (msg === 'Failed to fetch') {
        msg = isEl
          ? 'Αδυναμία σύνδεσης. Ίσως ο server είναι απασχολημένος — δοκίμασε ξανά.'
          : 'Cannot connect. Server may be busy — try again.';
      }
      resultsDiv.innerHTML = '<div class="result-item">' + t('common.error') + ': ' + msg + '</div>';
    }
  });
}

window.initPoiViewer = initPoiViewer;