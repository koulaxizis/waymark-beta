/* =========================================================
   WAYMARK — Building Editor Module
   Draw building outlines on map and upload to OSM.
   ========================================================= */

var buildingEditorState = {
  points: [],
  polygon: null,
  markers: [],
  dragMarkers: [],
};

function getBeMap() { return window.appState ? window.appState.map : null; }

function initBuildingEditor(map, container, appState) {
  renderBuildingEditorUI(container);
  refreshBeLoginStatus();

  window.addEventListener('storage', function (e) {
    if (e.key === 'osm_access_token' || e.key === 'osm_user_id' || e.key === 'osm_user_name') {
      refreshBeLoginStatus();
      if (window.updateGlobalLoginBtn) window.updateGlobalLoginBtn();
    }
  });

  window.onMapClick_buildingEditor = function (lat, lng) {
    if (!window.isLoggedIn || !window.isLoggedIn()) {
      showNotification(
        getCurrentLang() === 'el' ? 'Σύνδεσου πρώτα!' : 'Login first!',
        'warning'
      );
      return;
    }
    addBuildingPoint(lat, lng);
  };
}

function refreshBeLoginStatus() {
  var badge = document.getElementById('beLoginBadge');
  if (!badge) return;
  var isEl = getCurrentLang() === 'el';

  if (window.isLoggedIn && window.isLoggedIn()) {
    badge.classList.add('active');
    var name = localStorage.getItem('osm_user_name') || '';
    badge.textContent = isEl
      ? '✅ Συνδεδεμένος' + (name ? ' (' + name + ')' : '')
      : '✅ Logged in' + (name ? ' (' + name + ')' : '');

    var loginBtn = document.getElementById('beLoginBtn');
    var logoutBtn = document.getElementById('beLogoutBtn');
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'block';
  } else {
    badge.classList.remove('active');
    badge.textContent = isEl ? '❌ Όχι συνδεδεμένος' : '❌ Not logged in';

    var loginBtn = document.getElementById('beLoginBtn');
    var logoutBtn = document.getElementById('beLogoutBtn');
    if (loginBtn) loginBtn.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}

function renderBuildingEditorUI(container) {
  var isEl = getCurrentLang() === 'el';

  container.innerHTML =
    '<div class="building-editor-ui">' +
    '  <div id="beLoginBadge" class="login-badge">' +
    (isEl ? '❌ Όχι συνδεδεμένος' : '❌ Not logged in') + '</div>' +
    '  <button id="beLoginBtn" class="btn btn-success">🔑 ' +
    (isEl ? 'Σύνδεση με OSM' : 'Login with OSM') + '</button>' +
    '  <button id="beLogoutBtn" class="btn btn-danger" style="display:none;">🔓 ' +
    (isEl ? 'Αποσύνδεση' : 'Logout') + '</button>' +
    '  <hr>' +
    '  <div class="note-description">' + (isEl
      ? 'Κάνε κλικ στον χάρτη για να σχεδιάσεις το περίγραμμα του κτηρίου. Τουλάχιστον 3 σημεία απαιτούνται.'
      : 'Click on map to draw the building outline. At least 3 points required.') + '</div>' +

    '  <div class="form-group"><label>' + (isEl ? 'Τύπος Κτηρίου:' : 'Building Type:') + '</label>' +
    '    <select id="beBuildingType" class="form-control">' +
    '      <option value="yes">' + (isEl ? 'Γενικό' : 'Generic (yes)') + '</option>' +
    '      <option value="apartments">' + (isEl ? 'Πολυκατοικία' : 'Apartments') + '</option>' +
    '      <option value="house">' + (isEl ? 'Μονοκατοικία' : 'House') + '</option>' +
    '      <option value="detached">' + (isEl ? 'Αυτόνομο' : 'Detached') + '</option>' +
    '      <option value="commercial">' + (isEl ? 'Εμπορικό' : 'Commercial') + '</option>' +
    '      <option value="industrial">' + (isEl ? 'Βιομηχανικό' : 'Industrial') + '</option>' +
    '      <option value="garage">' + (isEl ? 'Γκαράζ' : 'Garage') + '</option>' +
    '      <option value="shed">' + (isEl ? 'Αποθήκη' : 'Shed') + '</option>' +
    '      <option value="roof">' + (isEl ? 'Στέγη' : 'Roof') + '</option>' +
    '      <option value="construction">' + (isEl ? 'Υπό κατασκευή' : 'Construction') + '</option>' +
    '    </select>' +
    '  </div>' +

    '  <div class="form-group"><label>' + (isEl ? 'Όνομα (προαιρετικό):' : 'Name (optional):') + '</label>' +
    '    <input type="text" id="beBuildingName" class="form-control" placeholder="' +
    (isEl ? 'π.χ. Πολυκατοικία Παπαδιαμάντη' : 'e.g. Papadiamanti Apartments') + '">' +
    '  </div>' +

    '  <div class="form-group"><label>' + (isEl ? 'Διεύθυνση (προαιρετικό):' : 'Address (optional):') + '</label>' +
    '    <input type="text" id="beAddrStreet" class="form-control" placeholder="' +
    (isEl ? 'π.χ. Οδός Σοφοκλέους' : 'e.g. Sofokleous St') + '">' +
    '  </div>' +

    '  <div class="form-group"><label>' + (isEl ? 'Αριθμός:' : 'House Number:') + '</label>' +
    '    <input type="text" id="beAddrNum" class="form-control" placeholder="' +
    (isEl ? 'π.χ. 15' : 'e.g. 15') + '">' +
    '  </div>' +

    '  <div class="form-group"><label>' + (isEl ? 'Changeset Comment:' : 'Changeset Comment:') + '</label>' +
    '    <input type="text" id="beComment" class="form-control" placeholder="' +
    (isEl ? 'π.χ. add building' : 'e.g. add building') + '">' +
    '  </div>' +

    '  <button id="beCreateBtn" class="btn btn-success">🏠 ' +
    (isEl ? 'Δημιουργία Κτηρίου' : 'Create Building') + '</button>' +
    '  <button id="beUndoBtn" class="btn btn-secondary">↩️ ' +
    (isEl ? 'Αναίρεση Τελευταίου' : 'Undo Last') + '</button>' +
    '  <button id="beClearBtn" class="btn btn-danger">🗑️ ' +
    (isEl ? 'Καθαρισμός' : 'Clear') + '</button>' +

    '  <hr>' +
    '  <div id="beInfo" class="note-description">' + (isEl ? '0 σημεία' : '0 points') + '</div>' +
    '</div>';

  var loginBtn = document.getElementById('beLoginBtn');
  var logoutBtn = document.getElementById('beLogoutBtn');
  var createBtn = document.getElementById('beCreateBtn');
  var undoBtn = document.getElementById('beUndoBtn');
  var clearBtn = document.getElementById('beClearBtn');

  if (loginBtn) loginBtn.addEventListener('click', function () {
    if (typeof initiateOAuth === 'function') initiateOAuth();
  });
  if (logoutBtn) logoutBtn.addEventListener('click', beLogout);
  if (createBtn) createBtn.addEventListener('click', createBuilding);
  if (undoBtn) undoBtn.addEventListener('click', undoLastPoint);
  if (clearBtn) clearBtn.addEventListener('click', clearBuildingEditor);
}

function beLogout() {
  localStorage.removeItem('osm_access_token');
  localStorage.removeItem('osm_user_id');
  localStorage.removeItem('osm_user_name');
  localStorage.removeItem('pkce_verifier');
  refreshBeLoginStatus();
  if (window.updateGlobalLoginBtn) window.updateGlobalLoginBtn();
  showNotification(getCurrentLang() === 'el' ? 'Αποσυνδέθηκες' : 'Logged out', 'info');
}

function addBuildingPoint(lat, lng) {
  buildingEditorState.points.push({ lat: lat, lng: lng });

  // Add a small vertex marker
  var map = getBeMap();
  if (map) {
    var vertex = L.circleMarker([lat, lng], {
      radius: 4,
      fillColor: '#6d4aff',
      color: 'white',
      weight: 1,
      fillOpacity: 1,
    }).addTo(map);

    buildingEditorState.markers.push(vertex);
  }

  renderBuildingPolygon();
  updateBuildingInfo();
}

function renderBuildingPolygon() {
  var map = getBeMap();
  if (!map) return;

  if (buildingEditorState.polygon) {
    map.removeLayer(buildingEditorState.polygon);
    buildingEditorState.polygon = null;
  }

  var pts = buildingEditorState.points;
  if (pts.length === 0) return;

  var latlngs = pts.map(function (p) { return [p.lat, p.lng]; });

  if (pts.length >= 3) {
    // Closed polygon
    buildingEditorState.polygon = L.polygon(latlngs, {
      color: '#6d4aff',
      weight: 2,
      fillColor: '#6d4aff',
      fillOpacity: 0.3,
    }).addTo(map);
  } else if (pts.length === 2) {
    // Line preview
    buildingEditorState.polygon = L.polyline(latlngs, {
      color: '#6d4aff',
      weight: 2,
      dashArray: '5 5',
      opacity: 0.8,
    }).addTo(map);
  } else if (pts.length === 1) {
    buildingEditorState.polygon = L.circleMarker([pts[0].lat, pts[0].lng], {
      radius: 6,
      fillColor: '#6d4aff',
      color: 'white',
      weight: 2,
      fillOpacity: 0.8,
    }).addTo(map);
  }
}

function updateBuildingInfo() {
  var isEl = getCurrentLang() === 'el';
  var info = document.getElementById('beInfo');
  if (!info) return;
  var count = buildingEditorState.points.length;
  var ready = count >= 3;
  info.textContent = isEl
    ? count + ' σημεία' + (ready ? ' ✅ (' + (isEl ? 'έτοιμο' : 'ready') + ')' : ' (χρειάζονται 3)')
    : count + ' points' + (ready ? ' ✅ (ready)' : ' (need 3)');
}

function undoLastPoint() {
  if (buildingEditorState.points.length === 0) return;

  buildingEditorState.points.pop();

  var map = getBeMap();
  if (map && buildingEditorState.markers.length > 0) {
    var lastMarker = buildingEditorState.markers.pop();
    map.removeLayer(lastMarker);
  }

  renderBuildingPolygon();
  updateBuildingInfo();
}

async function createBuilding() {
  var isEl = getCurrentLang() === 'el';

  if (!window.isLoggedIn || !window.isLoggedIn()) {
    alert(isEl ? 'Σύνδεσου πρώτα!' : 'Login first!');
    return;
  }

  if (buildingEditorState.points.length < 3) {
    alert(isEl ? 'Τουλάχιστον 3 σημεία απαιτούνται' : 'At least 3 points required');
    return;
  }

  var typeEl = document.getElementById('beBuildingType');
  var nameEl = document.getElementById('beBuildingName');
  var addrStreetEl = document.getElementById('beAddrStreet');
  var addrNumEl = document.getElementById('beAddrNum');
  var commentEl = document.getElementById('beComment');

  var buildingType = typeEl ? typeEl.value : 'yes';
  var name = nameEl ? nameEl.value.trim() : '';
  var addrStreet = addrStreetEl ? addrStreetEl.value.trim() : '';
  var addrNum = addrNumEl ? addrNumEl.value.trim() : '';
  var comment = commentEl ? commentEl.value.trim() : (isEl ? 'Προσθήκη κτηρίου' : 'Add building');

  var token = localStorage.getItem('osm_access_token');
  if (!token) {
    alert(isEl ? 'Δεν υπάρχει token. Σύνδεσου ξανά.' : 'No token. Login again.');
    return;
  }

  // Build OSC: nodes + way (closed polygon)
  var nodesXml = buildingEditorState.points.map(function (p, i) {
    var id = -(i + 1);
    return '    <node id="' + id + '" lat="' + p.lat.toFixed(7) + '" lon="' + p.lng.toFixed(7) + '" version="0" />';
  }).join('\n');

  var ndRefs = buildingEditorState.points.map(function (p, i) {
    return '      <nd ref="' + (-(i + 1)) + '" />';
  }).join('\n');

  // First node ref repeated to close the polygon
  ndRefs += '\n      <nd ref="-1" />';

  var wayTags = '      <tag k="building" v="' + escapeXml(buildingType) + '" />\n';
  if (name) wayTags += '      <tag k="name" v="' + escapeXml(name) + '" />\n';
  if (addrStreet) wayTags += '      <tag k="addr:street" v="' + escapeXml(addrStreet) + '" />\n';
  if (addrNum) wayTags += '      <tag k="addr:housenumber" v="' + escapeXml(addrNum) + '" />\n';
  wayTags += '      <tag k="created_by" v="Waymark" />';

  var oscXml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<osmChange version="0.6" generator="Waymark">\n' +
    '  <create>\n' +
    nodesXml + '\n' +
    '    <way id="-1" version="0">\n' +
    ndRefs + '\n' +
    wayTags + '\n' +
    '    </way>\n' +
    '  </create>\n' +
    '</osmChange>';

  var createBtn = document.getElementById('beCreateBtn');
  if (createBtn) {
    createBtn.disabled = true;
    createBtn.textContent = isEl ? 'Ενημέρωση...' : 'Uploading...';
  }

  showNotification(isEl ? 'Ανέβασμα στο OSM...' : 'Uploading to OSM...', 'info');

  try {
    var result = await uploadBeOSC(token, oscXml, comment);

    if (result.success) {
      showNotification(
        isEl ? '✅ Επιτυχία! ID: ' + result.newId : '✅ Success! ID: ' + result.newId,
        'success'
      );

      // Show green polygon on map for confirmation
      var map = getBeMap();
      if (map && buildingEditorState.polygon) {
        map.removeLayer(buildingEditorState.polygon);
      }

      var latlngs = buildingEditorState.points.map(function (p) { return [p.lat, p.lng]; });
      if (map) {
        L.polygon(latlngs, {
          color: '#22c55e',
          weight: 2,
          fillColor: '#22c55e',
          fillOpacity: 0.2,
        }).addTo(map).bindPopup('<strong>✅ New Building</strong><br/>ID: ' + result.newId).openPopup();
      }

      clearBuildingEditor();
    } else {
      alert((isEl ? 'Αποτυχία: ' : 'Failed: ') + result.error);
    }
  } catch (err) {
    alert((isEl ? 'Σφάλμα: ' : 'Error: ') + err.message);
  } finally {
    if (createBtn) {
      createBtn.disabled = false;
      createBtn.textContent = isEl ? 'Δημιουργία Κτηρίου' : 'Create Building';
    }
  }
}

function uploadBeOSC(accessToken, oscContent, changesetComment) {
  var cfg = window.WAYMARK_CONFIG || {};
  var proxyUrl = cfg.PROXY_URL;

  if (!proxyUrl) {
    return Promise.reject(new Error('PROXY_URL not configured'));
  }

  var changesetXml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<osm version="0.6" generator="Waymark">\n' +
    '<changeset>\n' +
    '  <tag k="created_by" v="Waymark"/>\n' +
    '  <tag k="comment" v="' + escapeXml(changesetComment || 'Waymark building edit') + '"/>\n' +
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

function clearBuildingEditor() {
  var map = getBeMap();
  if (!map) return;

  if (buildingEditorState.polygon) {
    map.removeLayer(buildingEditorState.polygon);
    buildingEditorState.polygon = null;
  }

  buildingEditorState.markers.forEach(function (m) {
    map.removeLayer(m);
  });
  buildingEditorState.markers = [];

  buildingEditorState.points = [];

  var nameEl = document.getElementById('beBuildingName');
  var addrStreetEl = document.getElementById('beAddrStreet');
  var addrNumEl = document.getElementById('beAddrNum');
  var commentEl = document.getElementById('beComment');

  if (nameEl) nameEl.value = '';
  if (addrStreetEl) addrStreetEl.value = '';
  if (addrNumEl) addrNumEl.value = '';
  if (commentEl) commentEl.value = '';

  updateBuildingInfo();
}

function _buildingEditorCleanup() {
  delete window.onMapClick_buildingEditor;

  var map = getBeMap();
  if (!map) return;

  if (buildingEditorState.polygon) {
    map.removeLayer(buildingEditorState.polygon);
  }

  buildingEditorState.markers.forEach(function (m) {
    map.removeLayer(m);
  });

  buildingEditorState = {
    points: [],
    polygon: null,
    markers: [],
    dragMarkers: [],
  };
}

window._buildingEditorCleanup = _buildingEditorCleanup;