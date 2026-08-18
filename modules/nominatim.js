/* =========================================================
   WAYMARK — Nominatim Search Module
   Forward and reverse geocoding via Nominatim API.
   ========================================================= */

var nominatimState = {
  searchResults: [],
  mapMarkers: [],
  isLoading: false,
};

function getNmMap() { return window.appState ? window.appState.map : null; }

function initNominatim(map, container, appState) {
  renderNominatimUI(container);
  clearNmMarkers();
  window.onMapClick_nominatim = function (lat, lng) {
    reverseGeocode(lat, lng);
  };
}

function renderNominatimUI(container) {
  var isEl = getCurrentLang() === 'el';

  container.innerHTML =
    '<div class="nominatim-ui">' +
    '  <div class="form-group"><label>' + (isEl ? 'Αναζήτηση τόπου:' : 'Search place:') + '</label>' +
    '    <input type="text" id="nmSearch" class="form-control" placeholder="' +
    (isEl ? 'π.χ. Αθήνα, Ελλάδα' : 'e.g. Athens, Greece') + '" autofocus>' +
    '  </div>' +
    '  <button id="nmSearchBtn" class="btn btn-primary">🔍 ' +
    (isEl ? 'Αναζήτηση' : 'Search') + '</button>' +
    '  <hr>' +
    '  <div id="nmStats" class="note-description">' +
    (isEl ? '0 αποτελέσματα' : '0 results') + '</div>' +
    '  <div id="nmResults" class="results-list"></div>' +
    '</div>';

  var btn = document.getElementById('nmSearchBtn');
  var input = document.getElementById('nmSearch');

  if (btn) btn.addEventListener('click', searchPlace);
  if (input) input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') searchPlace();
  });
}

async function searchPlace() {
  if (nominatimState.isLoading) return;
  nominatimState.isLoading = true;

  var map = getNmMap();
  if (!map) { nominatimState.isLoading = false; return; }

  var query = '';
  var inputEl = document.getElementById('nmSearch');
  if (inputEl) query = inputEl.value.trim();

  var isEl = getCurrentLang() === 'el';

  if (!query) {
    alert(isEl ? 'Δώσε κείμενο αναζήτησης' : 'Enter search text');
    nominatimState.isLoading = false;
    return;
  }

  showNmSpinner(true);
  clearNmMarkers();

  try {
    var params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: 1,
      limit: 50,
      countrycodes: 'gr',
    });

    var response = await fetch(
      'https://nominatim.openstreetmap.org/search?' + params.toString(),
      { headers: { 'Accept-Language': isEl ? 'el-GR,en-US' : 'en-US,en' } }
    );

    if (!response.ok) throw new Error('HTTP ' + response.status);

    var results = await response.json();
    nominatimState.searchResults = results;

    var resultsEl = document.getElementById('nmResults');
    if (!resultsEl) { nominatimState.isLoading = false; showNmSpinner(false); return; }
    resultsEl.innerHTML = '';

    if (results.length === 0) {
      resultsEl.innerHTML = '<p>' + (isEl ? 'Δεν βρέθηκαν αποτελέσματα' : 'No results found') + '</p>';
      var s0 = document.getElementById('nmStats');
      if (s0) s0.textContent = '';
      nominatimState.isLoading = false;
      showNmSpinner(false);
      return;
    }

    results.forEach(function (res, idx) {
      var lat = parseFloat(res.lat);
      var lon = parseFloat(res.lon);

      var marker = L.marker([lat, lon], {
        title: (res.display_name || '').substring(0, 40),
      }).addTo(map);

      marker.bindPopup(buildNmPopup(res));

      nominatimState.mapMarkers.push({
        lat: lat, lon: lon, data: res, leaflet: marker, index: idx,
      });

      var name = res.name || (res.address && res.address.road) || 'Unknown';

      var addrParts = [];
      var a = res.address || {};
      if (a.road) addrParts.push(a.road);
      if (a.postcode) addrParts.push(a.postcode);
      if (a.city || a.town || a.village) addrParts.push(a.city || a.town || a.village);
      if (a.state) addrParts.push(a.state);

      var item = document.createElement('div');
      item.className = 'result-item';
      item.innerHTML =
        '<strong>' + escapeHtml(name) + '</strong>' +
        '<small>' + escapeHtml(addrParts.join(', ') || (res.display_name || '').substring(0, 80)) + '</small>' +
        '<small style="color:var(--accent)">📍 ' + lat.toFixed(6) + ', ' + lon.toFixed(6) + '</small>';
      item.addEventListener('click', function () { selectNmResult(idx); });
      resultsEl.appendChild(item);
    });

    var statsEl = document.getElementById('nmStats');
    if (statsEl) {
      statsEl.textContent = isEl
        ? 'Βρέθηκαν ' + results.length + ' αποτελέσματα'
        : 'Found ' + results.length + ' results';
    }

  } catch (err) {
    console.error('Nominatim error:', err);
    alert((isEl ? 'Σφάλμα αναζήτησης: ' : 'Search error: ') + err.message);
  } finally {
    nominatimState.isLoading = false;
    showNmSpinner(false);
  }
}

async function reverseGeocode(lat, lng) {
  var map = getNmMap();
  if (!map) return;

  var isEl = getCurrentLang() === 'el';
  showNmSpinner(true);

  try {
    var params = new URLSearchParams({
      lat: lat.toFixed(6),
      lon: lng.toFixed(6),
      format: 'json',
      addressdetails: 1,
    });

    var response = await fetch(
      'https://nominatim.openstreetmap.org/reverse?' + params.toString()
    );

    if (!response.ok) throw new Error('HTTP ' + response.status);

    var result = await response.json();

    clearNmMarkers();

    var marker = L.circleMarker([lat, lng], {
      radius: 8,
      fillColor: '#ffb143',
      color: '#ffb143',
      weight: 2,
      fillOpacity: 0.8,
    }).addTo(map);

    nominatimState.mapMarkers.push({
      lat: lat, lon: lng, data: result, leaflet: marker, index: 0,
    });

    var resultsEl = document.getElementById('nmResults');
    if (resultsEl) {
      resultsEl.innerHTML = '';

      if (result.display_name) {
        var item = document.createElement('div');
        item.className = 'result-item';
        item.innerHTML =
          '<strong>' + (isEl ? 'Αντεστραμμένη αναζήτηση' : 'Reverse geocoding') + '</strong>' +
          '<small>' + escapeHtml(result.display_name.substring(0, 100)) + '</small>' +
          '<small style="color:var(--accent)">📍 ' + lat.toFixed(6) + ', ' + lng.toFixed(6) + '</small>';
        resultsEl.appendChild(item);
      }
    }

    var statsEl = document.getElementById('nmStats');
    if (statsEl) statsEl.textContent = isEl ? '1 αποτέλεσμα' : '1 result';

    map.setView([lat, lng], 16);

  } catch (err) {
    console.error('Reverse geocode error:', err);
    alert((isEl ? 'Σφάλμα: ' : 'Error: ') + err.message);
  } finally {
    showNmSpinner(false);
  }
}

function buildNmPopup(res) {
  var isEl = getCurrentLang() === 'el';
  var html = '<div style="font-size:0.85rem;max-width:250px;">';

  if (res.name) {
    html += '<strong style="color:#6d4aff">' + escapeHtml(res.name) + '</strong><br/>';
  }

  var a = res.address || {};
  var parts = [];
  if (a.house_number) parts.push(a.house_number);
  if (a.road) parts.push(a.road);
  if (a.postcode) parts.push(a.postcode);
  if (a.city || a.town || a.village) parts.push(a.city || a.town || a.village);
  if (a.state) parts.push(a.state);

  if (parts.length > 0) {
    html += '<span style="color:var(--fg-muted)">' + escapeHtml(parts.join(', ')) + '</span><br/>';
  }

  html += '<br/><a href="https://openstreetmap.org/?mlat=' + res.lat + '&mlon=' + res.lon + '" ' +
    'target="_blank" style="color:var(--accent);font-size:0.8rem;">OpenStreetMap ↗</a>';
  html += '</div>';
  return html;
}

function selectNmResult(index) {
  var map = getNmMap();
  if (!map) return;

  var res = nominatimState.searchResults[index];
  if (!res) return;

  var lat = parseFloat(res.lat);
  var lon = parseFloat(res.lon);

  map.setView([lat, lon], 15);

  var markerInfo = nominatimState.mapMarkers.find(function (m) { return m.index === index; });
  if (markerInfo && markerInfo.leaflet) markerInfo.leaflet.openPopup();
}

function clearNmMarkers() {
  var map = getNmMap();
  if (!map) return;
  nominatimState.mapMarkers.forEach(function (m) {
    if (m.leaflet) map.removeLayer(m.leaflet);
  });
  nominatimState.mapMarkers = [];
}

function showNmSpinner(show) {
  var btn = document.getElementById('nmSearchBtn');
  if (!btn) return;
  var isEl = getCurrentLang() === 'el';
  btn.disabled = show;
  btn.textContent = show
    ? (isEl ? 'Φόρτωση...' : 'Loading...')
    : (isEl ? 'Αναζήτηση' : 'Search');
}

function _nominatimCleanup() {
  delete window.onMapClick_nominatim;
  clearNmMarkers();
  nominatimState = { searchResults: [], mapMarkers: [], isLoading: false };
}

window._nominatimCleanup = _nominatimCleanup;