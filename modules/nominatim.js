/* =========================================================
   WAYMARK — Nominatim Search Module
   ========================================================= */

var nominatimState = {
  searchResults: [],
  mapMarkers: [],
  isLoading: false,
};

function getMap() { return window.appState ? window.appState.map : null; }

function initNominatim(map, container, appState) {
  renderNominatimUI(container);
  clearNmMarkers();
  window.onMapClick_nominatim = function (lat, lng) { reverseGeocode(lat, lng); };
}

function renderNominatimUI(container) {
  var isEl = getCurrentLang() === 'el';
  container.innerHTML =
    '<div class="nominatim-ui">' +
    '  <div class="form-group"><label>' + (isEl ? 'Αναζήτηση τόπου:' : 'Search place:') + '</label>' +
    '    <input type="text" id="nmSearch" class="form-control" placeholder="' + (isEl ? 'π.χ. Αθήνα, Ελλάδα' : 'e.g. Athens, Greece') + '" autofocus>' +
    '  </div>' +
    '  <button id="nmSearchBtn" class="btn btn-primary">🔍 ' + (isEl ? 'Αναζήτηση' : 'Search') + '</button>' +
    '  <hr>' +
    '  <div id="nmStats" class="note-description">' + (isEl ? '0 αποτελέσματα' : '0 results') + '</div>' +
    '  <div id="nmResults" class="results-list"></div>' +
    '</div>';

  document.getElementById('nmSearchBtn').addEventListener('click', searchPlace);
  document.getElementById('nmSearch').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') searchPlace();
  });
}

async function searchPlace() {
  if (nominatimState.isLoading) return;
  nominatimState.isLoading = true;

  var map = getMap();
  var query = document.getElementById('nmSearch').value.trim();
  var isEl = getCurrentLang() === 'el';

  if (!query) { alert(isEl ? 'Δώσε κείμενο' : 'Enter text'); nominatimState.isLoading = false; return; }

  showNmSpinner(true);
  clearNmMarkers();

  try {
    var params = new URLSearchParams({
      q: query, format: 'json', addressdetails: 1, limit: 50, countrycodes: 'gr'
    });

    var response = await fetch('https://nominatim.openstreetmap.org/search?' + params.toString(), {
      headers: { 'Accept-Language': isEl ? 'el-GR,en-US' : 'en-US,en' }
    });

    if (!response.ok) throw new Error('HTTP ' + response.status);

    var results = await response.json();
    nominatimState.searchResults = results;

    var resultsEl = document.getElementById('nmResults');
    resultsEl.innerHTML = '';

    if (results.length === 0) {
      resultsEl.innerHTML = '<p>' + (isEl ? 'Δεν βρέθηκαν' : 'No results') + '</p>';
      document.getElementById('nmStats').textContent = '';
      return;
    }

    results.forEach(function (res, idx) {
      var lat = parseFloat(res.lat);
      var lon = parseFloat(res.lon);

      var marker = L.marker([lat, lon]).addTo(map);
      marker.bindPopup(buildNmPopup(res));

      nominatimState.mapMarkers.push({ lat: lat, lon: lon, data: res, leaflet: marker, index: idx });

      var item = document.createElement('div');
      item.className = 'result-item';
      item.innerHTML =
        '<strong>' + escapeHtml(res.name || (res.address && res.address.road) || 'Unknown') + '</strong>' +
        '<small>' + escapeHtml((res.display_name || '').substring(0, 80)) + '</small>' +
        '<small style="color:var(--accent)">📍 ' + lat.toFixed(6) + ', ' + lon.toFixed(6) + '</small>';
      item.addEventListener('click', function () { selectNmResult(idx); });
      resultsEl.appendChild(item);
    });

    document.getElementById('nmStats').textContent = isEl ? 'Βρέθηκαν ' + results.length + ' αποτελέσματα' : 'Found ' + results.length + ' results';

  } catch (err) {
    console.error('Nominatim error:', err);
    alert((isEl ? 'Σφάλμα: ' : 'Search error: ') + err.message);
  } finally {
    nominatimState.isLoading = false;
    showNmSpinner(false);
  }
}

async function reverseGeocode(lat, lng) {
  var isEl = getCurrentLang() === 'el';
  var map = getMap();
  showNmSpinner(true);

  try {
    var params = new URLSearchParams({ lat: lat.toFixed(6), lon: lng.toFixed(6), format: 'json', addressdetails: 1 });
    var response = await fetch('https://nominatim.openstreetmap.org/reverse?' + params.toString());

    if (!response.ok) throw new Error('HTTP ' + response.status);
    var result = await response.json();

    clearNmMarkers();

    var marker = L.circleMarker([lat, lng], {
      radius: 8, fillColor: '#ffb143', color: '#ffb143', weight: 2, fillOpacity: 0.8
    }).addTo(map);

    nominatimState.mapMarkers.push({ lat: lat, lon: lng, data: result, leaflet: marker, index: 0 });

    var resultsEl = document.getElementById('nmResults');
    resultsEl.innerHTML = '';

    if (result.display_name) {
      var item = document.createElement('div');
      item.className = 'result-item';
      item.innerHTML =
        '<strong>' + (isEl ? 'Αντεστραμμένη' : 'Reverse') + '</strong>' +
        '<small>' + escapeHtml(result.display_name.substring(0, 100)) + '</small>' +
        '<small style="color:var(--accent)">📍 ' + lat.toFixed(6) + ', ' + lng.toFixed(6) + '</small>';
      resultsEl.appendChild(item);
    }

    document.getElementById('nmStats').textContent = isEl ? '1 αποτέλεσμα' : '1 result';
    map.setView([lat, lng], 16);

  } catch (err) {
    console.error('Reverse geocode error:', err);
    alert((isEl ? 'Σφάλμα: ' : 'Error: ') + err.message);
  } finally {
    showNmSpinner(false);
  }
}

function buildNmPopup(res) {
  var html = '<div style="font-size:0.85rem;max-width:250px;">';
  if (res.name) html += '<strong style="color:#6d4aff">' + escapeHtml(res.name) + '</strong><br/>';
  html += '<small>' + escapeHtml(res.display_name || '') + '</small><br/>';
  html += '<br/><a href="https://openstreetmap.org/?mlat=' + res.lat + '&mlon=' + res.lon + '" target="_blank" style="color:#6d4aff">OSM ↗</a>';
  html += '</div>';
  return html;
}

function selectNmResult(index) {
  var map = getMap();
  var res = nominatimState.searchResults[index];
  if (!res || !map) return;

  var lat = parseFloat(res.lat);
  var lon = parseFloat(res.lon);
  map.setView([lat, lon], 15);

  var markerInfo = nominatimState.mapMarkers.find(function (m) { return m.index === index; });
  if (markerInfo && markerInfo.leaflet) markerInfo.leaflet.openPopup();
}

function clearNmMarkers() {
  var map = getMap();
  if (!map) return;
  nominatimState.mapMarkers.forEach(function (m) { if (m.leaflet) map.removeLayer(m.leaflet); });
  nominatimState.mapMarkers = [];
}

function showNmSpinner(show) {
  var btn = document.getElementById('nmSearchBtn');
  if (!btn) return;
  var isEl = getCurrentLang() === 'el';
  btn.disabled = show;
  btn.textContent = show ? (isEl ? 'Φόρτωση...' : 'Loading...') : (isEl ? 'Αναζήτηση' : 'Search');
}

function _nominatimCleanup() {
  delete window.onMapClick_nominatim;
  clearNmMarkers();
  nominatimState = { searchResults: [], mapMarkers: [], isLoading: false };
}
window._nominatimCleanup = _nominatimCleanup;