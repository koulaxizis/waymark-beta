/* =========================================================
   WAYMARK — POI Viewer Module
   Fetch and display POIs from Overpass API.
   ========================================================= */

var poiViewerState = {
  mapMarkers: [],
  isLoading: false
};

function getPoiMap() { return window.appState ? window.appState.map : null; }

function initPoiViewer(map, container, appState) {
  renderPoiUI(container);

  var m = getPoiMap();
  var timer = null;
  if (m) {
    m.on('moveend', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { fetchPoisInViewport(); }, 600);
    });
  }

  window.onMapClick_poiViewer = function (lat, lng) {};
}

function renderPoiUI(container) {
  var isEl = getCurrentLang() === 'el';
  container.innerHTML =
    '<div class="poi-viewer-ui">' +
    '  <div class="form-group"><label>' + (isEl ? 'Τύπος POI:' : 'POI Type:') + '</label>' +
    '    <select id="poiType" class="form-control">' +
    '      <option value="amenity">' + (isEl ? 'Παροχές' : 'Amenities') + '</option>' +
    '      <option value="shop">' + (isEl ? 'Καταστήματα' : 'Shops') + '</option>' +
    '      <option value="tourism">' + (isEl ? 'Τουρισμός' : 'Tourism') + '</option>' +
    '      <option value="leisure">' + (isEl ? 'Αναψυχή' : 'Leisure') + '</option>' +
    '      <option value="historic">' + (isEl ? 'Ιστορικά' : 'Historic') + '</option>' +
    '    </select>' +
    '  </div>' +
    '  <button id="fetchPoisBtn" class="btn btn-primary">🔍 ' + (isEl ? 'Φόρτωση' : 'Fetch POIs') + '</button>' +
    '  <div id="poiStats" class="note-description" style="margin-top:0.5rem;"></div>' +
    '  <div id="poiList" class="results-list"></div>' +
    '</div>';

  var btn = document.getElementById('fetchPoisBtn');
  var sel = document.getElementById('poiType');
  if (btn) btn.addEventListener('click', fetchPoisInViewport);
  if (sel) sel.addEventListener('change', fetchPoisInViewport);
}

async function fetchPoisInViewport() {
  if (poiViewerState.isLoading) return;
  poiViewerState.isLoading = true;

  var map = getPoiMap();
  if (!map) { poiViewerState.isLoading = false; return; }

  var typeEl = document.getElementById('poiType');
  var poiType = typeEl ? typeEl.value : 'amenity';
  var isEl = getCurrentLang() === 'el';

  showPoiSpinner(true);

  try {
    var bounds = map.getBounds();
    var bbox = bounds.getSouth() + ',' + bounds.getWest() + ',' + bounds.getNorth() + ',' + bounds.getEast();

    var query = '[out:json][timeout:25];(' +
      'node["' + poiType + '"](' + bbox + ');' +
      'way["' + poiType + '"](' + bbox + ');' +
      ');out center 50;';

    var data = await safeOverpassFetch(query, isEl);
    var elements = data.elements || [];

    clearPoiMarkers();

    var listEl = document.getElementById('poiList');
    if (!listEl) { poiViewerState.isLoading = false; showPoiSpinner(false); return; }
    listEl.innerHTML = '';

    if (elements.length === 0) {
      listEl.innerHTML = '<p>' + (isEl ? 'Δεν βρέθηκαν POI' : 'No POIs found') + '</p>';
      var s0 = document.getElementById('poiStats');
      if (s0) s0.textContent = '';
      poiViewerState.isLoading = false;
      showPoiSpinner(false);
      return;
    }

    elements.forEach(function (el) {
      var lat = el.lat || (el.center ? el.center.lat : null);
      var lon = el.lon || (el.center ? el.center.lon : null);
      if (!lat || !lon) return;

      var name = el.tags ? (el.tags.name || el.tags[poiType] || 'POI') : 'POI';

      var marker = L.circleMarker([lat, lon], {
        radius: 6, fillColor: '#6d4aff', color: '#6d4aff', weight: 1, fillOpacity: 0.7
      }).addTo(map);

      marker.bindPopup(buildPoiPopup(el, poiType));
      poiViewerState.mapMarkers.push({ leaflet: marker, data: el });

      var item = document.createElement('div');
      item.className = 'result-item';
      item.innerHTML =
        '<strong>' + escapeHtml(name) + '</strong>' +
        '<small>' + poiType + (el.tags && el.tags[poiType] ? ': ' + escapeHtml(el.tags[poiType]) : '') + '</small>';
      item.addEventListener('click', function () { map.setView([lat, lon], 17); marker.openPopup(); });
      listEl.appendChild(item);
    });

    var statsEl = document.getElementById('poiStats');
    if (statsEl) statsEl.textContent = isEl ? 'Βρέθηκαν ' + elements.length + ' POI' : 'Found ' + elements.length + ' POIs';

  } catch (err) {
    console.error('POI fetch error:', err);
    alert((isEl ? 'Σφάλμα: ' : 'Error fetching POIs: ') + err.message);
  } finally {
    poiViewerState.isLoading = false;
    showPoiSpinner(false);
  }
}

function buildPoiPopup(el, poiType) {
  var html = '<div style="font-size:0.85rem;max-width:250px;">';
  var name = el.tags ? (el.tags.name || el.tags[poiType] || 'POI') : 'POI';
  html += '<strong style="color:#6d4aff">' + escapeHtml(name) + '</strong><br/>';

  if (el.tags) {
    var count = 0;
    Object.keys(el.tags).forEach(function (k) {
      if (count < 10) {
        html += '<small><strong>' + escapeHtml(k) + ':</strong> ' + escapeHtml(el.tags[k]) + '</small><br/>';
        count++;
      }
    });
  }

  html += '<br/><a href="https://openstreetmap.org/' + el.type + '/' + el.id + '" target="_blank" style="color:#6d4aff">OSM ↗</a>';
  html += '</div>';
  return html;
}

function clearPoiMarkers() {
  var map = getPoiMap();
  if (!map) return;
  poiViewerState.mapMarkers.forEach(function (m) { if (m.leaflet) map.removeLayer(m.leaflet); });
  poiViewerState.mapMarkers = [];
}

function showPoiSpinner(show) {
  var btn = document.getElementById('fetchPoisBtn');
  if (!btn) return;
  var isEl = getCurrentLang() === 'el';
  btn.disabled = show;
  btn.textContent = show ? (isEl ? 'Φόρτωση...' : 'Loading...') : (isEl ? 'Φόρτωση' : 'Fetch POIs');
}

function _poiViewerCleanup() {
  delete window.onMapClick_poiViewer;
  clearPoiMarkers();
  poiViewerState = { mapMarkers: [], isLoading: false };
}
window._poiViewerCleanup = _poiViewerCleanup;