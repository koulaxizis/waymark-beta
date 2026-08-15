/* =========================================================
   WAYMARK — POI Viewer Module (Overpass API)
   CORS-enabled. No backend needed.
   ========================================================= */

function initPoiViewer(map, container, appState) {
  const isEl = getCurrentLang() === 'el';

  const poiTypes = [
    { value: 'amenity=cafe', label: '☕ ' + (isEl ? 'Cafes' : 'Cafes') },
    { value: 'amenity=restaurant', label: '🍽️ ' + (isEl ? 'Εστιατόρια' : 'Restaurants') },
    { value: 'amenity=bar', label: '🍺 ' + (isEl ? 'Μπαρ' : 'Bars') },
    { value: 'shop=supermarket', label: '🛒 ' + (isEl ? 'Supermarket' : 'Supermarkets') },
    { value: 'amenity=pharmacy', label: '💊 ' + (isEl ? 'Φαρμακεία' : 'Pharmacies') },
    { value: 'amenity=hospital', label: '🏥 ' + (isEl ? 'Νοσοκομεία' : 'Hospitals') },
    { value: 'amenity=fuel', label: '⛽ ' + (isEl ? 'Βενζινάδικα' : 'Fuel Stations') },
    { value: 'amenity=atm', label: '💳 ' + (isEl ? 'ATM' : 'ATMs') },
    { value: 'tourism=hotel', label: '🏨 ' + (isEl ? 'Ξενοδοχεία' : 'Hotels') },
    { value: 'leisure=park', label: '🌳 ' + (isEl ? 'Πάρκα' : 'Parks') },
    { value: 'highway=bus_stop', label: '🚌 ' + (isEl ? 'Στάσεις λεωφορείων' : 'Bus Stops') },
    { value: 'amenity=parking', label: '🅿️ ' + (isEl ? 'Parking' : 'Parking') },
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
    const query = '[out:json][timeout:15];(' +
      'node["' + key + '"="' + val + '"](around:' + radius + ',' + center.lat + ',' + center.lng + ');' +
      'way["' + key + '"="' + val + '"](around:' + radius + ',' + center.lat + ',' + center.lng + ');' +
      ');out body center;';

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query
      });
      const data = await response.json();

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
      resultsDiv.innerHTML = '<div class="result-item">' + t('common.error') + ': ' + error.message + '</div>';
    }
  });
}

window.initPoiViewer = initPoiViewer;