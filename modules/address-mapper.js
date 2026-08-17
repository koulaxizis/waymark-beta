/* =========================================================
   WAYMARK — Address Mapper Module
   Batch address mapping with login support.
   ========================================================= */

let addressMapperState = {
  isLoading: false,
  addressPoints: [],
};

function initAddressMapper(map, container, appState) {
  renderAddressMapperUI(container);
  checkLoginStatus();

  function handleMapClick(lat, lng) {
    if (!isLoggedInAddressMapper()) {
      showNotification(getCurrentLang() === 'el' ? 'Σύνδεσε πρώτα!' : 'Please login first!', 'warning');
      return;
    }
    showAddressForm(lat, lng);
  }

  window.onMapClick_addressMapper = handleMapClick;
}

function renderAddressMapperUI(container) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
    <div class="address-mapper-ui">
      <div id="amLoginBadge" class="login-badge">
        ${isEl ? '❌ Όχι συνδεδεμένος' : '❌ Not logged in'}
      </div>

      <button id="amLoginBtn" class="btn btn-success">
        🔑 ${isEl ? 'Σύνδεση με OSM' : 'Login with OSM'}
      </button>

      <hr>

      <h3>${isEl ? 'Εισαγωγή Διεύθυνσης' : 'Add Address'}</h3>
      <div class="form-group">
        <label>${isEl ? 'Όνομα οδού:' : 'Street name:'}</label>
        <input type="text" id="amStreetName" class="form-control"
               placeholder="${isEl ? 'π.χ. Ερμού' : 'e.g. Ermou'}">
      </div>
      <div class="form-group">
        <label>${isEl ? 'Αριθμός:' : 'Number:'}</label>
        <input type="text" id="amHouseNumber" class="form-control"
               placeholder="${isEl ? 'π.χ. 42' : 'e.g. 42'}">
      </div>
      <div class="form-group">
        <label>${isEl ? 'Ταχ. Κώδικας:' : 'Postcode:'}</label>
        <input type="text" id="amPostcode" class="form-control"
               placeholder="${isEl ? 'π.χ. 10557' : 'e.g. 10557'}">
      </div>
      <div class="form-group">
        <label>${isEl ? 'Πόλη:' : 'City:'}</label>
        <input type="text" id="amCity" class="form-control"
               placeholder="${isEl ? 'π.χ. Αθήνα' : 'e.g. Athens'}">
      </div>

      <button id="amAddPointBtn" class="btn btn-success">
        📍 ${isEl ? 'Προσθήκη στο χάρτη' : 'Add to Map'}
      </button>
      <button id="amUploadBtn" class="btn btn-success" disabled>
        📤 ${isEl ? 'Ανέβασμα στο OSM' : 'Upload to OSM'}
      </button>
      <button id="amClearBtn" class="btn btn-danger">
        🗑️ ${isEl ? 'Καθαρισμός' : 'Clear'}
      </button>

      <hr>

      <h3>${isEl ? 'Διευθύνσεις' : 'Addresses'} (<span id="amCount">0</span>)</h3>
      <div id="amAddressList" class="results-list"></div>
    </div>
  `;

  document.getElementById('amLoginBtn').addEventListener('click', initiateOAuthLogin);
  document.getElementById('amAddPointBtn').addEventListener('click', addAddressPoint);
  document.getElementById('amUploadBtn').addEventListener('click', uploadAddresses);
  document.getElementById('amClearBtn').addEventListener('click', clearAddresses);
}

function checkLoginStatus() {
  const badge = document.getElementById('amLoginBadge');
  if (!badge) return;

  const token = sessionStorage.getItem('osm_access_token');
  if (token) {
    badge.classList.add('active');
    badge.textContent = getCurrentLang() === 'el' ? '✅ Συνδεδεμένος' : '✅ Logged in';
    document.getElementById('amUploadBtn').disabled = false;
  } else {
    badge.classList.remove('active');
    badge.textContent = getCurrentLang() === 'el' ? '❌ Όχι συνδεδεμένος' : '❌ Not logged in';
    document.getElementById('amUploadBtn').disabled = true;
  }
}

function isLoggedInAddressMapper() {
  return !!sessionStorage.getItem('osm_access_token');
}

function initiateOAuthLogin() {
  // Reuse osm-editor's OAuth flow
  if (typeof window.initiateOAuth === 'function') {
    window.initiateOAuth();
  } else {
    alert(getCurrentLang() === 'el' ? 'OSM Editor module required for login' : 'OSM Editor module required for login');
  }
}

function showAddressForm(lat, lng) {
  // Pre-fill lat/lon into a temporary holder
  addressMapperState.pendingLat = lat;
  addressMapperState.pendingLon = lng;

  showNotification(getCurrentLang() === 'el'
    ? `📍 Θέση: ${lat.toFixed(5)}, ${lng.toFixed(5)} — Συμπλήρωσε τα πεδία`
    : `📍 Position: ${lat.toFixed(5)}, ${lng.toFixed(5)} — Fill in the fields`,
    'info');
}

function addAddressPoint() {
  const street = document.getElementById('amStreetName').value.trim();
  const number = document.getElementById('amHouseNumber').value.trim();
  const postcode = document.getElementById('amPostcode').value.trim();
  const city = document.getElementById('amCity').value.trim();
  const isEl = getCurrentLang() === 'el';

  if (!street || !number) {
    alert(isEl ? 'Όνομα οδού και αριθμός είναι απαραίτητα' : 'Street name and number are required');
    return;
  }

  let lat, lon;
  if (addressMapperState.pendingLat !== null) {
    lat = addressMapperState.pendingLat;
    lon = addressMapperState.pendingLon;
  } else {
    const center = window.appState?.map?.getCenter();
    if (center) {
      lat = center.lat;
      lon = center.lng;
    } else {
      alert(isEl ? 'Κάνε κλικ στον χάρτη πρώτα' : 'Click on map first');
      return;
    }
  }

  const point = {
    lat,
    lon,
    tags: {
      'addr:street': street,
      'addr:housenumber': number,
      'addr:postcode': postcode,
      'addr:city': city,
    }
  };

  addressMapperState.addressPoints.push(point);
  addressMapperState.pendingLat = null;
  addressMapperState.pendingLon = null;

  // Add marker to map
  const marker = L.circleMarker([lat, lon], {
    radius: 6,
    fillColor: '#22c55e',
    color: 'white',
    weight: 1,
    fillOpacity: 0.8,
  }).addTo(window.appState.map);

  point.marker = marker;

  updateAddressList();

  // Clear inputs
  document.getElementById('amStreetName').value = '';
  document.getElementById('amHouseNumber').value = '';
  document.getElementById('amPostcode').value = '';
  document.getElementById('amCity').value = '';
}

function updateAddressList() {
  const listEl = document.getElementById('amAddressList');
  const isEl = getCurrentLang() === 'el';
  listEl.innerHTML = '';

  addressMapperState.addressPoints.forEach((point, idx) => {
    const item = document.createElement('div');
    item.className = 'result-item';
    item.innerHTML = `
      <strong>${point.tags['addr:street']} ${point.tags['addr:housenumber']}</strong>
      <small>${point.tags['addr:postcode'] || ''} ${point.tags['addr:city'] || ''}</small>
      <small>📍 ${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}</small>
    `;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-danger btn-sm';
    removeBtn.textContent = '🗑️';
    removeBtn.style.marginTop = '0.25rem';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (point.marker) window.appState.map.removeLayer(point.marker);
      addressMapperState.addressPoints.splice(idx, 1);
      updateAddressList();
    });

    item.appendChild(removeBtn);
    listEl.appendChild(item);
  });

  document.getElementById('amCount').textContent = addressMapperState.addressPoints.length;
  document.getElementById('amUploadBtn').disabled = addressMapperState.addressPoints.length === 0;
}

async function uploadAddresses() {
  if (!isLoggedInAddressMapper()) {
    alert(getCurrentLang() === 'el' ? 'Σύνδεσε πρώτα!' : 'Please login first!');
    return;
  }

  if (addressMapperState.addressPoints.length === 0) return;

  const isEl = getCurrentLang() === 'el';
  const comment = prompt(
    isEl ? 'Σχόλιο changeset:' : 'Changeset comment:',
    'Added addresses via Waymark'
  );

  if (!comment) return;

  const token = sessionStorage.getItem('osm_access_token');

  try {
    for (const point of addressMapperState.addressPoints) {
      const oscXml = buildAddressOsc(point);
      const result = await uploadOSC(token, oscXml);
      if (!result.success) {
        alert(isEl ? `Αποτυχία στη διεύθυνση ${point.tags['addr:street']}: ${result.error}` : `Failed for ${point.tags['addr:street']}: ${result.error}`);
        return;
      }
    }

    alert(isEl ? `✅ Ανέβηκαν ${addressMapperState.addressPoints.length} διευθύνσεις!` : `✅ Uploaded ${addressMapperState.addressPoints.length} addresses!`);
    clearAddresses();
  } catch (err) {
    alert(isEl ? 'Σφάλμα δικτύου: ' + err.message : 'Network error: ' + err.message);
  }
}

function buildAddressOsc(point) {
  const tagPairs = Object.entries(point.tags).map(([k, v]) =>
    `        <tag k="${escapeXml(k)}" v="${escapeXml(v)}"/>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<osmChange version="0.6" generator="Waymark">
  <create>
    <node lat="${point.lat}" lon="${point.lon}" version="1">
${tagPairs}
    </node>
  </create>
</osmChange>`;
}

function clearAddresses() {
  addressMapperState.addressPoints.forEach(p => {
    if (p.marker) window.appState.map.removeLayer(p.marker);
  });
  addressMapperState.addressPoints = [];
  updateAddressList();
}

function _addressMapperCleanup() {
  delete window.onMapClick_addressMapper;
  if (window.appState?.map) {
    addressMapperState.addressPoints.forEach(p => {
      if (p.marker) window.appState.map.removeLayer(p.marker);
    });
  }
  addressMapperState = { isLoading: false, addressPoints: [] };
}

window._addressMapperCleanup = _addressMapperCleanup;