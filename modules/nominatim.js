/* =========================================================
   WAYMARK — Nominatim Search Module
   Search places and addresses using Nominatim API.
   ========================================================= */

let nominatimState = {
  searchResults: [],
  mapMarkers: [],
  isLoading: false,
};

function initNominatim(map, container, appState) {
  renderNominatimUI(container);
  clearMarkers();

  function handleMapClick(lat, lng) {
    reverseGeocode(lat, lng);
  }

  window.onMapClick_nominatim = handleMapClick;
}

function renderNominatimUI(container) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
    <div class="nominatim-ui">
      <div class="form-group">
        <label>${isEl ? 'Αναζήτηση τόπου:' : 'Search place:'}</label>
        <input type="text" id="nmSearch" class="form-control"
               placeholder="${isEl ? 'π.χ. Αθήνα, Ελλάδα' : 'e.g. Athens, Greece'}"
               autofocus>
      </div>

      <button id="nmSearchBtn" class="btn btn-primary">
        🔍 ${isEl ? 'Αναζήτηση' : 'Search'}
      </button>

      <hr>

      <div id="nmStats" class="note-description">${isEl ? '0 αποτελέσματα' : '0 results'}</div>
      <div id="nmResults" class="results-list"></div>
    </div>
  `;

  document.getElementById('nmSearchBtn').addEventListener('click', () => {
    searchPlace(map);
  });

  document.getElementById('nmSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchPlace(map);
  });
}

async function searchPlace(map) {
  if (nominatimState.isLoading) return;
  nominatimState.isLoading = true;

  const query = document.getElementById('nmSearch').value.trim();
  const isEl = getCurrentLang() === 'el';
  const cfg = window.WAYMARK_CONFIG || {};

  if (!query) {
    alert(isEl ? 'Δώσε κείμενο αναζήτησης' : 'Enter search text');
    nominatimState.isLoading = false;
    return;
  }

  showNmSpinner(true);
  clearMarkers();

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: 1,
      limit: 50,
      countrycodes: 'gr',
    });

    // Try primary Nominatim first, then fallback to proxy
    let response;
    try {
      response = await fetch(
        `${cfg.NOMINATIM_URL}?${params.toString()}`,
        { headers: { 'Accept-Language': isEl ? 'el-GR,en-US' : 'en-US,en' } }
      );
    } catch (e) {
      response = await fetch(`${cfg.PROXY_URL}/nominatim/search?${params.toString()}`);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const results = await response.json();
    nominatimState.searchResults = results;

    const resultsEl = document.getElementById('nmResults');
    resultsEl.innerHTML = '';

    if (results.length === 0) {
      resultsEl.innerHTML = `<p>${isEl ? 'Δεν βρέθηκαν αποτελέσματα' : 'No results found'}</p>`;
      document.getElementById('nmStats').textContent = '';
      showNmSpinner(false);
      return;
    }

    results.forEach((res, idx) => {
      const lat = parseFloat(res.lat);
      const lon = parseFloat(res.lon);

      // Add marker
      const marker = L.marker([lat, lon], {
        title: (res.display_name || '').substring(0, 40),
      }).addTo(map);

      const popupContent = buildResultPopup(res);
      marker.bindPopup(popupContent);

      nominatimState.mapMarkers.push({
        lat,
        lon,
        data: res,
        leaflet: marker,
        index: idx,
      });

      // Build result item
      const item = document.createElement('div');
      item.className = 'result-item';
      
      const addressParts = [];
      if (res.address?.house_number) addressParts.push(res.address.house_number);
      if (res.address?.road) addressParts.push(res.address.road);
      if (res.address?.postcode) addressParts.push(res.address.postcode);
      if (res.address?.city) addressParts.push(res.address.city);
      if (res.address?.state) addressParts.push(res.address.state);

      item.innerHTML = `
        <strong>${escapeHtml(res.name || (res.address?.road || 'Unknown'))}</strong>
        <small>${escapeHtml(addressParts.join(', ') || res.display_name.substring(0, 80))}</small>
        <small style="color:var(--accent)">📍 ${lat.toFixed(6)}, ${lon.toFixed(6)}</small>
      `;

      item.addEventListener('click', () => {
        selectResult(idx, map);
      });

      resultsEl.appendChild(item);
    });

    document.getElementById('nmStats').textContent =
      isEl ? `Βρέθηκαν ${results.length} αποτελέσματα` : `Found ${results.length} results`;

  } catch (err) {
    console.error('Nominatim error:', err);
    alert(isEl ? 'Σφάλμα αναζήτησης: ' + err.message : 'Search error: ' + err.message);
  } finally {
    nominatimState.isLoading = false;
    showNmSpinner(false);
  }
}

async function reverseGeocode(lat, lng) {
  const isEl = getCurrentLang() === 'el';
  const cfg = window.WAYMARK_CONFIG || {};

  showNmSpinner(true);

  try {
    const params = new URLSearchParams({
      lat: lat.toFixed(6),
      lon: lng.toFixed(6),
      format: 'json',
      addressdetails: 1,
    });

    let response;
    try {
      response = await fetch(`${cfg.NOMINATIM_URL}/reverse?${params.toString()}`);
    } catch (e) {
      response = await fetch(`${cfg.PROXY_URL}/nominatim/reverse?${params.toString()}`);
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();

    // Clear previous results
    clearMarkers();

    // Add single marker
    const marker = L.circleMarker([lat, lng], {
      radius: 8,
      fillColor: '#ffb143',
      color: '#ffb143',
      weight: 2,
      fillOpacity: 0.8,
    }).addTo(window.appState.map);

    nominatimState.mapMarkers.push({
      lat,
      lon,
      data: result,
      leaflet: marker,
      index: 0,
    });

    const resultsEl = document.getElementById('nmResults');
    resultsEl.innerHTML = '';

    if (result.display_name) {
      const item = document.createElement('div');
      item.className = 'result-item';
      item.innerHTML = `
        <strong>${isEl ? 'Αντεστραμμένη γεωκεντρική' : 'Reverse Geocoding'}</strong>
        <small>${escapeHtml(result.display_name.substring(0, 100))}</small>
        <small style="color:var(--accent)">📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}</small>
      `;
      item.addEventListener('click', () => selectResult(0, map));
      resultsEl.appendChild(item);
    }

    document.getElementById('nmStats').textContent =
      isEl ? '1 αποτέλεσμα' : '1 result';

    // Center map on location
    map.setView([lat, lng], 16);

  } catch (err) {
    console.error('Reverse geocode error:', err);
    alert(isEl ? 'Σφάλμα αντιστροφής: ' + err.message : 'Reverse error: ' + err.message);
  } finally {
    showNmSpinner(false);
  }
}

function buildResultPopup(res) {
  const isEl = getCurrentLang() === 'el';
  let html = `<div style="font-size:0.85rem; max-width:250px;">`;

  if (res.name) {
    html += `<strong style="color:var(--accent);">${escapeHtml(res.name)}</strong><br/>`;
  }

  const addr = res.address || {};
  const parts = [];
  if (addr.house_number) parts.push(addr.house_number);
  if (addr.road) parts.push(addr.road);
  if (addr.postcode) parts.push(addr.postcode);
  if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
  if (addr.state) parts.push(addr.state);

  if (parts.length > 0) {
    html += `<span style="color:var(--fg-muted);">${parts.join(', ')}</span><br/>`;
  }

  html += `<br/><a href="https://openstreetmap.org/?mlat=${res.lat}&mlon=${res.lon}" target="_blank"
            style="color:var(--accent);font-size:0.8rem;">OpenStreetMap ↗</a>`;
  html += '</div>';

  return html;
}

function selectResult(index, map) {
  const res = nominatimState.searchResults[index];
  if (!res) return;

  const lat = parseFloat(res.lat);
  const lon = parseFloat(res.lon);

  map.setView([lat, lon], 15);

  // Find and open the marker popup
  const markerInfo = nominatimState.mapMarkers.find(m => m.index === index);
  if (markerInfo && markerInfo.leaflet) {
    markerInfo.leaflet.openPopup();
  }

  // Copy coordinates to clipboard
  navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
  showNotification(getCurrentLang() === 'el' ? 'Συντεταγμένες αντιγράφηκαν!' : 'Coordinates copied!', 'success');
}

function clearMarkers() {
  if (window.appState?.map) {
    nominatimState.mapMarkers.forEach(m => {
      if (m.leaflet) window.appState.map.removeLayer(m.leaflet);
    });
  }
  nominatimState.mapMarkers = [];
}

function showNmSpinner(show) {
  const btn = document.getElementById('nmSearchBtn');
  if (show) {
    btn.disabled = true;
    btn.textContent = getCurrentLang() === 'el' ? 'Φόρτωση...' : 'Loading...';
  } else {
    btn.disabled = false;
    btn.textContent = getCurrentLang() === 'el' ? 'Αναζήτηση' : 'Search';
  }
}

function _nominatimCleanup() {
  delete window.onMapClick_nominatim;
  clearMarkers();
  nominatimState = { searchResults: [], mapMarkers: [], isLoading: false };
}

window._nominatimCleanup = _nominatimCleanup;