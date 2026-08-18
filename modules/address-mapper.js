/* =========================================================
   WAYMARK — Address Mapper Module
   Find buildings missing addresses and add them via OSM API.
   ========================================================= */

var addressMapperState = {
  targets: [],
  mapMarkers: [],
  isLoading: false,
  currentIndex: -1,
  currentMarker: null,
};

function getAmMap() { return window.appState ? window.appState.map : null; }

function initAddressMapper(map, container, appState) {
  renderAddressMapperUI(container);
  refreshAmLoginStatus();

  window.addEventListener('storage', function (e) {
    if (e.key === 'osm_access_token' || e.key === 'osm_user_id' || e.key === 'osm_user_name') {
      refreshAmLoginStatus();
      if (window.updateGlobalLoginBtn) window.updateGlobalLoginBtn();
    }
  });

  window.onMapClick_addressMapper = function (lat, lng) {};
}

function renderAddressMapperUI(container) {
  var isEl = getCurrentLang() === 'el';

  container.innerHTML =
    '<div class="address-mapper-ui">' +
    '  <div id="amLoginBadge" class="login-badge">' +
    (isEl ? '❌ Όχι συνδεδεμένος' : '❌ Not logged in') + '</div>' +
    '  <button id="amLoginBtn" class="btn btn-success">🔑 ' +
    (isEl ? 'Σύνδεση με OSM' : 'Login with OSM') + '</button>' +
    '  <button id="amLogoutBtn" class="btn btn-danger" style="display:none;">🔓 ' +
    (isEl ? 'Αποσύνδεση' : 'Logout') + '</button>' +
    '  <hr>' +
    '  <div class="note-description">' + (isEl
      ? 'Βρίσκει κτήρια χωρίς διεύθυνση στην περιοχή που βλέπεις και σε βοηθά να προσθέσεις street + housenumber.'
      : 'Finds buildings without addresses in your viewport and helps you add street + housenumber.') + '</div>' +
    '  <button id="amScanBtn" class="btn btn-primary">🔍 ' +
    (isEl ? 'Σάρωση Περιοχής' : 'Scan Area') + '</button>' +
    '  <hr>' +
    '  <div id="amStats" class="note-description"></div>' +
    '  <div id="amTargets" class="results-list"></div>' +

    '  <div id="amEditPanel" style="display:none;">' +
    '    <hr>' +
    '    <h3>' + (isEl ? 'Επεξεργασία Διεύθυνσης' : 'Edit Address') + '</h3>' +
    '    <div id="amTargetInfo" class="note-description"></div>' +
    '    <div class="form-group"><label>' + (isEl ? 'Οδός:' : 'Street:') + '</label>' +
    '      <input type="text" id="amStreet" class="form-control" placeholder="' +
    (isEl ? 'π.χ. Λεωφόρος Συγγρού' : 'e.g. Syngrou Avenue') + '">' +
    '    </div>' +
    '    <div class="form-group"><label>' + (isEl ? 'Αριθμός:' : 'House Number:') + '</label>' +
    '      <input type="text" id="amHouseNum" class="form-control" placeholder="' +
    (isEl ? 'π.χ. 42' : 'e.g. 42') + '">' +
    '    </div>' +
    '    <div class="form-group"><label>' + (isEl ? 'Ταχυδρομικός Κώδικας:' : 'Postcode:') + '</label>' +
    '      <input type="text" id="amPostcode" class="form-control" placeholder="' +
    (isEl ? 'π.χ. 11741' : 'e.g. 11741') + '">' +
    '    </div>' +
    '    <div class="form-group"><label>' + (isEl ? 'Changeset Comment:' : 'Changeset Comment:') + '</label>' +
    '      <input type="text" id="amComment" class="form-control" placeholder="' +
    (isEl ? 'π.χ. add address tags' : 'e.g. add address tags') + '">' +
    '    </div>' +
    '    <button id="amSaveBtn" class="btn btn-success">💾 ' +
    (isEl ? 'Αποθήκευση' : 'Save') + '</button>' +
    '    <button id="amSkipBtn" class="btn btn-secondary">⏭️ ' +
    (isEl ? 'Παράλειψη' : 'Skip') + '</button>' +
    '  </div>' +
    '</div>';

  var loginBtn = document.getElementById('amLoginBtn');
  var logoutBtn = document.getElementById('amLogoutBtn');
  var scanBtn = document.getElementById('amScanBtn');
  var saveBtn = document.getElementById('amSaveBtn');
  var skipBtn = document.getElementById('amSkipBtn');

  if (loginBtn) loginBtn.addEventListener('click', function () {
    if (typeof initiateOAuth === 'function') initiateOAuth();
  });
  if (logoutBtn) logoutBtn.addEventListener('click', amLogout);
  if (scanBtn) scanBtn.addEventListener('click', scanArea);
  if (saveBtn) saveBtn.addEventListener('click', saveAddress);
  if (skipBtn) skipBtn.addEventListener('click', skipTarget);
}

function refreshAmLoginStatus() {
  var badge = document.getElementById('amLoginBadge');
  if (!badge) return;
  var isEl = getCurrentLang() === 'el';

  if (window.isLoggedIn && window.isLoggedIn()) {
    badge.classList.add('active');
    var name = localStorage.getItem('osm_user_name') || '';
    badge.textContent = isEl
      ? '✅ Συνδεδεμένος' + (name ? ' (' + name + ')' : '')
      : '✅ Logged in' + (name ? ' (' + name + ')' : '');

    var loginBtn = document.getElementById('amLoginBtn');
    var logoutBtn = document.getElementById('amLogoutBtn');
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'block';
  } else {
    badge.classList.remove('active');
    badge.textContent = isEl ? '❌ Όχι συνδεδεμένος' : '❌ Not logged in';

    var loginBtn = document.getElementById('amLoginBtn');
    var logoutBtn = document.getElementById('amLogoutBtn');
    if (loginBtn) loginBtn.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}

function amLogout() {
  localStorage.removeItem('osm_access_token');
  localStorage.removeItem('osm_user_id');
  localStorage.removeItem('osm_user_name');
  localStorage.removeItem('pkce_verifier');
  refreshAmLoginStatus();
  if (window.updateGlobalLoginBtn) window.updateGlobalLoginBtn();
  showNotification(getCurrentLang() === 'el' ? 'Αποσυνδέθηκες' : 'Logged out', 'info');
}

async function scanArea() {
  if (addressMapperState.isLoading) return;

  var map = getAmMap();
  if (!map) return;

  var isEl = getCurrentLang() === 'el';
  addressMapperState.isLoading = true;

  var scanBtn = document.getElementById('amScanBtn');
  if (scanBtn) {
    scanBtn.disabled = true;
    scanBtn.textContent = isEl ? 'Σάρωση...' : 'Scanning...';
  }

  clearAmMarkers();

  try {
    var bounds = map.getBounds();
    var bbox = bounds.getSouth() + ',' + bounds.getWest() + ',' +
               bounds.getNorth() + ',' + bounds.getEast();

    var query = '[out:json][timeout:25];(' +
      'way["building"]["addr:housenumber"!~".+"](' + bbox + ');' +
      ');out center 50;';

    var data = await safeOverpassFetch(query, isEl);
    var elements = data.elements || [];

    addressMapperState.targets = elements;

    var listEl = document.getElementById('amTargets');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (elements.length === 0) {
      listEl.innerHTML = '<p>' + (isEl ? 'Δεν βρέθηκαν κτήρια χωρίς διεύθυνση ✅' : 'No buildings without address found ✅') + '</p>';
      var statsEl0 = document.getElementById('amStats');
      if (statsEl0) statsEl0.textContent = '';
      addressMapperState.isLoading = false;
      if (scanBtn) {
        scanBtn.disabled = false;
        scanBtn.textContent = isEl ? 'Σάρωση Περιοχής' : 'Scan Area';
      }
      return;
    }

    elements.forEach(function (el, idx) {
      var lat = el.center ? el.center.lat : el.lat;
      var lon = el.center ? el.center.lon : el.lon;
      if (!lat || !lon) return;

      var marker = L.circleMarker([lat, lon], {
        radius: 7,
        fillColor: '#ffb143',
        color: '#ffb143',
        weight: 1,
        fillOpacity: 0.6,
      }).addTo(map);

      addressMapperState.mapMarkers.push({ leaflet: marker, data: el, index: idx });

      var existingName = el.tags && el.tags.name ? el.tags.name : '';
      var buildingType = el.tags && el.tags.building ? el.tags.building : 'building';
      var preview = existingName || buildingType;

      var item = document.createElement('div');
      item.className = 'result-item';
      item.innerHTML =
        '<strong>🏠 ' + escapeHtml(preview) + '</strong>' +
        '<small>ID: ' + el.id + ' • 📍 ' + lat.toFixed(5) + ', ' + lon.toFixed(5) + '</small>';
      item.addEventListener('click', function () {
        openAddressEditor(idx);
      });
      listEl.appendChild(item);
    });

    var statsEl = document.getElementById('amStats');
    if (statsEl) {
      statsEl.textContent = isEl
        ? elements.length + ' κτήρια χωρίς διεύθυνση'
        : elements.length + ' buildings without address';
    }

  } catch (err) {
    console.error('Address scan error:', err);
    alert((isEl ? 'Σφάλμα: ' : 'Error: ') + err.message);
  } finally {
    addressMapperState.isLoading = false;
    if (scanBtn) {
      scanBtn.disabled = false;
      scanBtn.textContent = isEl ? 'Σάρωση Περιοχής' : 'Scan Area';
    }
  }
}

function openAddressEditor(index) {
  var target = addressMapperState.targets[index];
  if (!target) return;

  var map = getAmMap();
  if (!map) return;

  addressMapperState.currentIndex = index;
  var isEl = getCurrentLang() === 'el';

  var lat = target.center ? target.center.lat : target.lat;
  var lon = target.center ? target.center.lon : target.lon;

  // Highlight current target
  if (addressMapperState.currentMarker) {
    map.removeLayer(addressMapperState.currentMarker);
  }

  addressMapperState.currentMarker = L.circleMarker([lat, lon], {
    radius: 12,
    fillColor: '#6d4aff',
    color: 'white',
    weight: 3,
    fillOpacity: 0.9,
  }).addTo(map);

  map.setView([lat, lon], 18);

  var infoEl = document.getElementById('amTargetInfo');
  if (infoEl) {
    var existingTags = target.tags || {};
    var tagSummary = Object.keys(existingTags).map(function (k) {
      return k + ': ' + existingTags[k];
    }).join(', ');

    infoEl.innerHTML =
      '<strong>🏠 #' + target.id + '</strong><br>' +
      '<small>📍 ' + lat.toFixed(6) + ', ' + lon.toFixed(6) + '</small><br>' +
      '<small>' + escapeHtml(tagSummary.substring(0, 80)) + '</small>';
  }

  // Pre-fill street name if nearby streets are known
  var streetInput = document.getElementById('amStreet');
  if (streetInput) streetInput.value = '';
  var numInput = document.getElementById('amHouseNum');
  if (numInput) numInput.value = '';
  var pcInput = document.getElementById('amPostcode');
  if (pcInput) pcInput.value = '';

  var editPanel = document.getElementById('amEditPanel');
  if (editPanel) editPanel.style.display = 'block';
}

async function saveAddress() {
  var isEl = getCurrentLang() === 'el';

  if (!window.isLoggedIn || !window.isLoggedIn()) {
    alert(isEl ? 'Σύνδεσου πρώτα!' : 'Login first!');
    return;
  }

  if (addressMapperState.currentIndex < 0) return;

  var target = addressMapperState.targets[addressMapperState.currentIndex];
  if (!target) return;

  var streetEl = document.getElementById('amStreet');
  var numEl = document.getElementById('amHouseNum');
  var pcEl = document.getElementById('amPostcode');
  var commentEl = document.getElementById('amComment');

  var street = streetEl ? streetEl.value.trim() : '';
  var houseNum = numEl ? numEl.value.trim() : '';
  var postcode = pcEl ? pcEl.value.trim() : '';
  var comment = commentEl ? commentEl.value.trim() : (isEl ? 'Προσθήκη διεύθυνσης' : 'Add address');

  if (!street && !houseNum) {
    alert(isEl ? 'Συμπλήρωσε οδό ή αριθμό' : 'Fill in street or house number');
    return;
  }

  var existingTags = target.tags || {};
  var tags = {};

  // Preserve existing tags
  Object.keys(existingTags).forEach(function (k) {
    tags[k] = existingTags[k];
  });

  // Add/overwrite address tags
  if (street) tags['addr:street'] = street;
  if (houseNum) tags['addr:housenumber'] = houseNum;
  if (postcode) tags['addr:postcode'] = postcode;

  // Build modify OSC
  var tagLines = Object.keys(tags).map(function (k) {
    return '      <tag k="' + escapeXml(k) + '" v="' + escapeXml(tags[k]) + '" />';
  }).join('\n');

  var lat = target.center ? target.center.lat : target.lat;
  var lon = target.center ? target.center.lon : target.lon;

  var oscXml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<osmChange version="0.6" generator="Waymark">\n' +
    '  <modify>\n' +
    '    <way id="' + target.id + '" version="' + (target.version || 1) + '">\n' +
    tagLines + '\n' +
    '    </way>\n' +
    '  </modify>\n' +
    '</osmChange>';

  var token = localStorage.getItem('osm_access_token');
  if (!token) {
    alert(isEl ? 'Δεν υπάρχει token. Σύνδεσου ξανά.' : 'No token. Login again.');
    return;
  }

  var saveBtn = document.getElementById('amSaveBtn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = isEl ? 'Αποθήκευση...' : 'Saving...';
  }

  showNotification(isEl ? 'Ανέβασμα στο OSM...' : 'Uploading to OSM...', 'info');

  try {
    var result = await uploadAmOSC(token, oscXml, comment);

    if (result.success) {
      showNotification(isEl ? '✅ Αποθηκεύτηκε!' : '✅ Saved!', 'success');

      // Update marker color to green (done)
      var markerInfo = addressMapperState.mapMarkers[addressMapperState.currentIndex];
      if (markerInfo && markerInfo.leaflet) {
        markerInfo.leaflet.setStyle({ fillColor: '#22c55e', color: '#22c55e' });
      }

      // Move to next target
      skipTarget();
    } else {
      alert((isEl ? 'Αποτυχία: ' : 'Failed: ') + result.error);
    }
  } catch (err) {
    alert((isEl ? 'Σφάλμα: ' : 'Error: ') + err.message);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = isEl ? 'Αποθήκευση' : 'Save';
    }
  }
}

function uploadAmOSC(accessToken, oscContent, changesetComment) {
  var cfg = window.WAYMARK_CONFIG || {};
  var proxyUrl = cfg.PROXY_URL;

  if (!proxyUrl) {
    return Promise.reject(new Error('PROXY_URL not configured'));
  }

  var changesetXml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<osm version="0.6" generator="Waymark">\n' +
    '<changeset>\n' +
    '  <tag k="created_by" v="Waymark"/>\n' +
    '  <tag k="comment" v="' + escapeXml(changesetComment || 'Waymark address edit') + '"/>\n' +
    '</changeset>\n' +
    '</osm>';

  return fetch(proxyUrl + '/api/0.6/changeset/open', {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/xml',
    },
    body: changesetXml,
  })
    .then(function (resp) {
      if (!resp.ok) return resp.text().then(function (t) { throw new Error('Open changeset: ' + t); });
      return resp.text();
    })
    .then(function (changesetId) {
      changesetId = changesetId.trim();

      return fetch(proxyUrl + '/api/0.6/changeset/' + changesetId + '/upload', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/xml',
        },
        body: oscContent,
      })
        .then(function (uploadResp) {
          if (!uploadResp.ok) return uploadResp.text().then(function (t) { throw new Error('Upload: ' + t); });
          return uploadResp.text();
        })
        .then(function (diffResult) {
          var idMatch = diffResult.match(/id="(\d+)"/);
          var newId = idMatch ? idMatch[1] : null;

          return fetch(proxyUrl + '/api/0.6/changeset/' + changesetId + '/close', {
            method: 'PUT',
            headers: {
              'Authorization': 'Bearer ' + accessToken,
              'Content-Type': 'text/plain',
            },
          }).then(function () {
            return { success: true, newId: newId };
          });
        });
    })
    .catch(function (err) {
      return { success: false, error: err.message };
    });
}

function skipTarget() {
  var map = getAmMap();
  if (map && addressMapperState.currentMarker) {
    map.removeLayer(addressMapperState.currentMarker);
    addressMapperState.currentMarker = null;
  }

  var editPanel = document.getElementById('amEditPanel');
  if (editPanel) editPanel.style.display = 'none';

  addressMapperState.currentIndex = -1;
}

function clearAmMarkers() {
  var map = getAmMap();
  if (!map) return;

  addressMapperState.mapMarkers.forEach(function (m) {
    if (m.leaflet) map.removeLayer(m.leaflet);
  });
  addressMapperState.mapMarkers = [];

  if (addressMapperState.currentMarker) {
    map.removeLayer(addressMapperState.currentMarker);
    addressMapperState.currentMarker = null;
  }
}

function _addressMapperCleanup() {
  delete window.onMapClick_addressMapper;
  clearAmMarkers();
  addressMapperState = {
    targets: [],
    mapMarkers: [],
    isLoading: false,
    currentIndex: -1,
    currentMarker: null,
  };
}

window._addressMapperCleanup = _addressMapperCleanup;