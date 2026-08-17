/* =========================================================
   WAYMARK — Heatmap Module
   Visualizes OSM data density using Overpass API.
   ========================================================= */

let heatmapState = {
  circleMarkers: [],
  isLoading: false,
};

function initHeatmap(map, container, appState) {
  renderHeatmapUI(container);

  let viewportTimer = null;
  map.on('moveend', () => {
    clearTimeout(viewportTimer);
    viewportTimer = setTimeout(() => {
      if (heatmapState.lastQuery) {
        loadHeatmapData(map, heatmapState.lastQuery);
      }
    }, 500);
  });

  function handleMapClick(lat, lng) {}
  window.onMapClick_heatmap = handleMapClick;
}

function renderHeatmapUI(container) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
    <div class="heatmap-ui">
      <div class="form-group">
        <label>${isEl ? 'Κατηγορία:' : 'Category:'}</label>
        <select id="hmCategory" class="form-control">
          <option value="amenity">Amenity</option>
          <option value="shop">Shop</option>
      </select>
      </div>

      <div class="form-group">
        <label>${isEl ? 'Ακτίνα (m):' : 'Radius (m):'}</label>
        <input type="number" id="hmRadius" class="form-control" value="50" min="10" max="500">
      </div>

      <button id="hmLoadBtn" class="btn btn-primary">
        🔥 ${isEl ? 'Δημιουργία Heatmap' : 'Generate Heatmap'}
      </button>

      <div id="hmStats" class="note-description" style="margin-top:0.5rem;"></div>
      <button id="hmClearBtn" class="btn btn-danger">🗑️ ${isEl ? 'Καθαρισμός' : 'Clear'}</button>
    </div>
  `;

  document.getElementById('hmLoadBtn').addEventListener('click', () => {
    const category = document.getElementById('hmCategory').value;
    loadHeatmapData(map, category);
  });

  document.getElementById('hmClearBtn').addEventListener('click', () => {
    clearHeatmap();
  });
}

async function loadHeatmapData(map, category) {
  if (heatmapState.isLoading) return;
  heatmapState.isLoading = true;

  const isEl = getCurrentLang() === 'el';
  const radius = parseInt(document.getElementById('hmRadius')?.value || '50', 10);

  showHmSpinner(true);

  try {
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const bboxStr = `${sw.lat},${sw.lon},${ne.lat},${ne.lon}`;

    const query = `
[out:json][timeout:25];
(
  node["${category}"](${bboxStr});
);
out body 200;
`.trim();

    const result = await safeOverpassFetch(query, isEl);

    clearHeatmap();

    if (!result.elements || result.elements.length === 0) {
      document.getElementById('hmStats').textContent = isEl ? 'Δεν βρέθηκαν δεδομένα' : 'No data found';
      return;
    }

    result.elements.forEach(el => {
      if (el.lat && el.lon) {
        const marker = L.circleMarker([el.lat, el.lon], {
          radius: Math.max(4, radius / 10),
          fillColor: '#6d4aff',
          color: '#6d4aff',
          weight: 1,
          fillOpacity: 0.3,
        }).addTo(map);

        heatmapState.circleMarkers.push(marker);
      }
    });

    heatmapState.lastQuery = category;

    document.getElementById('hmStats').textContent =
      isEl ? `${result.elements.length} σημεία εμφανίζονται` : `${result.elements.length} points plotted`;

  } catch (err) {
    console.error('Heatmap error:', err);
    alert(isEl ? 'Σφάλμα heatmap: ' + err.message : 'Heatmap error: ' + err.message);
  } finally {
    heatmapState.isLoading = false;
    showHmSpinner(false);
  }
}

function clearHeatmap() {
  heatmapState.circleMarkers.forEach(m => {
    if (window.appState?.map) window.appState.map.removeLayer(m);
  });
  heatmapState.circleMarkers = [];
}

function showHmSpinner(show) {
  const btn = document.getElementById('hmLoadBtn');
  if (show) {
    btn.disabled = true;
    btn.textContent = getCurrentLang() === 'el' ? 'Φόρτωση...' : 'Loading...';
  } else {
    btn.disabled = false;
    btn.textContent = getCurrentLang() === 'el' ? 'Δημιουργία Heatmap' : 'Generate Heatmap';
  }
}

function _heatmapCleanup() {
  delete window.onMapClick_heatmap;
  clearHeatmap();
  heatmapState = { circleMarkers: [], isLoading: false, lastQuery: null };
}

window._heatmapCleanup = _heatmapCleanup;