/* =========================================================
   WAYMARK — Heatmap Module
   Visualize POI density using circle markers.
   ========================================================= */

var heatmapState = {
  mapMarkers: [],
  isLoading: false,
};

function getHmMap() { return window.appState ? window.appState.map : null; }

function initHeatmap(map, container, appState) {
  renderHeatmapUI(container);

  var m = getHmMap();
  if (m) {
    var timer = null;
    m.on('moveend', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { generateHeatmap(); }, 600);
    });
  }

  window.onMapClick_heatmap = function (lat, lng) {};
}

function renderHeatmapUI(container) {
  var isEl = getCurrentLang() === 'el';

  container.innerHTML =
    '<div class="heatmap-ui">' +
    '  <div class="form-group"><label>' + (isEl ? 'Κατηγορία:' : 'Category:') + '</label>' +
    '    <select id="heatCat" class="form-control">' +
    '      <option value="amenity">Amenity</option>' +
    '      <option value="shop">Shop</option>' +
    '      <option value="building">Building</option>' +
    '      <option value="highway">Highway</option>' +
    '    </select>' +
    '  </div>' +
    '  <button id="genHeatBtn" class="btn btn-primary">🔥 ' +
    (isEl ? 'Δημιουργία' : 'Generate') + '</button>' +
    '  <div id="heatStats" class="note-description" style="margin-top:0.5rem;"></div>' +
    '  <hr>' +
    '  <div id="heatSpinner" style="display:none;text-align:center;padding:0.5rem;">' +
    '    <div class="spinner"></div>' +
    '  </div>' +
    '</div>';

  var catEl = document.getElementById('heatCat');
  var genBtn = document.getElementById('genHeatBtn');

  if (catEl) catEl.addEventListener('change', function () {
    // Only auto-run if we already have results
    if (heatmapState.mapMarkers.length > 0) generateHeatmap();
  });
  if (genBtn) genBtn.addEventListener('click', generateHeatmap);
}

async function generateHeatmap() {
  if (heatmapState.isLoading) return;
  heatmapState.isLoading = true;

  var map = getHmMap();
  if (!map) { heatmapState.isLoading = false; return; }

  var catEl = document.getElementById('heatCat');
  var cat = catEl ? catEl.value : 'amenity';
  var isEl = getCurrentLang() === 'el';

  // Show loading spinner
  var spinnerEl = document.getElementById('heatSpinner');
  if (spinnerEl) spinnerEl.style.display = 'block';

  // Disable generate button
  var genBtn = document.getElementById('genHeatBtn');
  if (genBtn) {
    genBtn.disabled = true;
    genBtn.textContent = isEl ? 'Φόρτωση...' : 'Loading...';
  }

  try {
    var bounds = map.getBounds();
    var bbox = bounds.getSouth() + ',' + bounds.getWest() + ',' +
               bounds.getNorth() + ',' + bounds.getEast();

    var query = '[out:json][timeout:25];(' +
      'node["' + cat + '"](' + bbox + ');' +
      ');out 200;';

    var data = await safeOverpassFetch(query, isEl);
    var elements = data.elements || [];

    clearHeatMarkers();

    if (elements.length === 0) {
      var statsEl0 = document.getElementById('heatStats');
      if (statsEl0) statsEl0.textContent = isEl ? 'Δεν βρέθηκαν δεδομένα' : 'No data found';
      heatmapState.isLoading = false;
      if (spinnerEl) spinnerEl.style.display = 'none';
      if (genBtn) {
        genBtn.disabled = false;
        genBtn.textContent = isEl ? 'Δημιουργία' : 'Generate';
      }
      return;
    }

    var maxCount = 1;
    var grid = {};

    elements.forEach(function (el) {
      if (!el.lat || !el.lon) return;
      var key = Math.round(el.lat * 1000) + '_' + Math.round(el.lon * 1000);
      grid[key] = (grid[key] || 0) + 1;
      if (grid[key] > maxCount) maxCount = grid[key];
    });

    Object.keys(grid).forEach(function (key) {
      var parts = key.split('_');
      var lat = parseInt(parts[0], 10) / 1000;
      var lon = parseInt(parts[1], 10) / 1000;
      var count = grid[key];

      var radius = 8 + (count / maxCount) * 20;
      var opacity = 0.2 + (count / maxCount) * 0.6;

      var marker = L.circleMarker([lat, lon], {
        radius: radius,
        fillColor: '#6d4aff',
        color: '#6d4aff',
        weight: 0,
        fillOpacity: opacity,
      }).addTo(map);

      heatmapState.mapMarkers.push(marker);
    });

    var statsEl = document.getElementById('heatStats');
    if (statsEl) {
      statsEl.textContent = isEl
        ? elements.length + ' στοιχεία σε ' + Object.keys(grid).length + ' περιοχές'
        : elements.length + ' items in ' + Object.keys(grid).length + ' zones';
    }

  } catch (err) {
    console.error('Heatmap error:', err);
    alert((isEl ? 'Σφάλμα: ' : 'Heatmap error: ') + err.message);
  } finally {
    heatmapState.isLoading = false;
    if (spinnerEl) spinnerEl.style.display = 'none';
    if (genBtn) {
      genBtn.disabled = false;
      genBtn.textContent = isEl ? 'Δημιουργία' : 'Generate';
    }
  }
}

function clearHeatMarkers() {
  var map = getHmMap();
  if (!map) return;
  heatmapState.mapMarkers.forEach(function (m) {
    if (m) map.removeLayer(m);
  });
  heatmapState.mapMarkers = [];
}

function _heatmapCleanup() {
  delete window.onMapClick_heatmap;
  clearHeatMarkers();
  heatmapState = { mapMarkers: [], isLoading: false };
}

window._heatmapCleanup = _heatmapCleanup;