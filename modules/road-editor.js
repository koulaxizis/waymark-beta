/* =========================================================
   WAYMARK — Road Editor Module
   Add/edit road segments on OSM.
   ========================================================= */

var roadEditorState = {
  points: [],
  polyline: null,
  selectedNodes: [],
};

function getReMap() { return window.appState ? window.appState.map : null; }

function initRoadEditor(map, container, appState) {
  renderRoadEditorUI(container);
  refreshLoginStatus();

  window.addEventListener('storage', function (e) {
    if (e.key === 'osm_access_token' || e.key === 'osm_user_id' || e.key === 'osm_user_name') {
      refreshLoginStatus();
      if (window.updateGlobalLoginBtn) window.updateGlobalLoginBtn();
    }
  });

  window.onMapClick_roadEditor = function (lat, lng) {
    if (!window.isLoggedIn || !window.isLoggedIn()) {
      showNotification(
        getCurrentLang() === 'el' ? 'Σύνδεσου πρώτα!' : 'Login first!',
        'warning'
      );
      return;
    }
    addRoadPoint(lat, lng);
  };
}

function refreshLoginStatus() {
  var badge = document.getElementById('reLoginBadge');
  if (!badge) return;
  var isEl = getCurrentLang() === 'el';

  if (window.isLoggedIn && window.isLoggedIn()) {
    badge.classList.add('active');
    var name = localStorage.getItem('osm_user_name') || '';
    badge.textContent = isEl
      ? '✅ Συνδεδεμένος' + (name ? ' (' + name + ')' : '')
      : '✅ Logged in' + (name ? ' (' + name + ')' : '');

    var loginBtn = document.getElementById('reLoginBtn');
    var logoutBtn = document.getElementById('reLogoutBtn');
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'block';
  } else {
    badge.classList.remove('active');
    badge.textContent = isEl ? '❌ Όχι συνδεδεμένος' : '❌ Not logged in';

    var loginBtn = document.getElementById('reLoginBtn');
    var logoutBtn = document.getElementById('reLogoutBtn');
    if (loginBtn) loginBtn.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}

function renderRoadEditorUI(container) {
  var isEl = getCurrentLang() === 'el';

  container.innerHTML =
    '<div class="road-editor-ui">' +

    '<div id="reLoginBadge" class="login-badge">' +
    (isEl ? '❌ Όχι συνδεδεμένος' : '❌ Not logged in') + '</div>' +
    '<button id="reLoginBtn" class="btn btn-success">🔑 ' +
    (isEl ? 'Σύνδεση με OSM' : 'Login with OSM') + '</button>' +
    '<button id="reLogoutBtn" class="btn btn-danger" style="display:none;">🔓 ' +
    (isEl ? 'Αποσύνδεση' : 'Logout') + '</button>' +

    '<hr>' +

    '<div class="note-description">' + (isEl
      ? 'Κάνε κλικ στον χάρτη για να προσθέσεις σημεία δρόμου. Το τελευταίο σημείο είναι το "head" του δρόμου.'
      : 'Click on map to add road points. The last point is the road "head".') + '</div>' +

    '<div class="form-group"><label>' + (isEl ? 'Τύπος Δρόμου:' : 'Road Type:') + '</label>' +
    '<select id="reRoadType" class="form-control">' +
    '  <option value="residential">' + (isEl ? 'Κατοικητική' : 'Residential') + '</option>' +
    '  <option value="service">' + (isEl ? 'Σειραφ' : 'Service') + '</option>' +
    '  <option value="track">' + (isEl ? 'Διαδρομή' : 'Track') + '</option>' +
    '  <option value="footway">' + (isEl ? 'Πεζοδρόμιο' : 'Footway') + '</option>' +
    '  <option value="path">' + (isEl ? 'Διαδρομή' : 'Path') + '</option>' +
    '</select></div>' +

    '<div class="form-group"><label>' + (isEl ? 'Όνομα (προαιρετικό):' : 'Name (optional):') + '</label>' +
    '<input type="text" id="reRoadName" class="form-control" placeholder="' +
    (isEl ? 'π.χ. Οδός Παπαδιαμάντη' : 'e.g. Papadiamanti Street') + '"></div>' +

    '<div class="form-group"><label>' + (isEl ? 'Μέγιστη Ταχύτητα:' : 'Max Speed:') + '</label>' +
    '<input type="text" id="reMaxSpeed" class="form-control" placeholder="' +
    (isEl ? 'π.χ. 50 km/h' : 'e.g. 50 km/h') + '"></div>' +

    '<div class="form-group"><label>' + (isEl ? 'Changeset Comment:' : 'Changeset Comment:') + '</label>' +
    '<input type="text" id="reComment" class="form-control"' +
    'placeholder="' + (isEl ? 'π.χ. add residential road' : 'e.g. add residential road') + '"></div>' +

    '<button id="reCreateBtn" class="btn btn-success">🛣️ ' +
    (isEl ? 'Δημιουργία Δρόμου' : 'Create Road') + '</button>' +
    '<button id="reClearBtn" class="btn btn-danger">🗑️ ' +
    (isEl ? 'Καθαρισμός' : 'Clear') + '</button>' +

    '<hr>' +

    '<div id="reInfo" class="note-description">' + (isEl ? '0 σημεία' : '0 points') + '</div>' +

    '</div>';

  var loginBtn = document.getElementById('reLoginBtn');
  var logoutBtn = document.getElementById('reLogoutBtn');
  var createBtn = document.getElementById('reCreateBtn');
  var clearBtn = document.getElementById('reClearBtn');

  if (loginBtn) loginBtn.addEventListener('click', function () {
    if (typeof initiateOAuth === 'function') initiateOAuth();
  });
  if (logoutBtn) logoutBtn.addEventListener('click', function () {
    localStorage.removeItem('osm_access_token');
    localStorage.removeItem('osm_user_id');
    localStorage.removeItem('osm_user_name');
    localStorage.removeItem('pkce_verifier');
    refreshLoginStatus();
    if (window.updateGlobalLoginBtn) window.updateGlobalLoginBtn();
    showNotification(isEl ? 'Αποσυνδέθηκες' : 'Logged out', 'info');
  });
  if (createBtn) createBtn.addEventListener('click', createRoad);
  if (clearBtn) clearBtn.addEventListener('click', clearRoadEditor);
}

function addRoadPoint(lat, lng) {
  roadEditorState.points.push({ lat: lat, lng: lng });
  renderRoadPolyline();
  updateRoadInfo();
}

function renderRoadPolyline() {
  var map = getReMap();
  if (!map) return;

  if (roadEditorState.polyline) {
    map.removeLayer(roadEditorState.polyline);
    roadEditorState.polyline = null;
  }

  if (roadEditorState.points.length >= 2) {
    var latlngs = roadEditorState.points.map(function (p) { return [p.lat, p.lng]; });
    roadEditorState.polyline = L.polyline(latlngs, {
      color: '#6d4aff',
      weight: 5,
      opacity: 0.8,
      dashArray: null,
    }).addTo(map);
  } else if (roadEditorState.points.length === 1) {
    roadEditorState.polyline = L.circleMarker([roadEditorState.points[0].lat, roadEditorState.points[0].lng], {
      radius: 8,
      fillColor: '#ffb143',
      color: '#ffb143',
      weight: 2,
      fillOpacity: 0.8,
    }).addTo(map);
  }
}

function updateRoadInfo() {
  var isEl = getCurrentLang() === 'el';
  var info = document.getElementById('reInfo');
  if (!info) return;
  var count = roadEditorState.points.length;
  info.textContent = isEl ? count + ' σημεία' : count + ' points';
}

async function createRoad() {
  var isEl = getCurrentLang() === 'el';

  if (!window.isLoggedIn || !window.isLoggedIn()) {
    alert(isEl ? 'Σύνδεσου πρώτα!' : 'Login first!');
    return;
  }

  if (roadEditorState.points.length < 2) {
    alert(isEl ? 'Τουλάχιστον 2 σημεία απαιτούνται' : 'At least 2 points required');
    return;
  }

  var typeEl = document.getElementById('reRoadType');
  var nameEl = document.getElementById('reRoadName');
  var speedEl = document.getElementById('reMaxSpeed');
  var commentEl = document.getElementById('reComment');

  var roadType = typeEl ? typeEl.value : 'residential';
  var name = nameEl ? nameEl.value.trim() : '';
  var maxSpeed = speedEl ? speedEl.value.trim() : '';
  var comment = commentEl ? commentEl.value.trim() : 'Add road';

  var token = localStorage.getItem('osm_access_token');
  if (!token) {
    alert(isEl ? 'Δεν υπάρχει token. Σύνδεσου ξανά.' : 'No token. Login again.');
    return;
  }

  // Build OSC for way creation
  var nodesXml = roadEditorState.points.map(function (p, i) {
    var id = -(i + 1);
    return '    <node id="' + id + '" lat="' + p.lat.toFixed(7) + '" lon="' + p.lng.toFixed(7) + '" version="0" />';
  }).join('\n');

  var ndRefs = roadEditorState.points.map(function (p, i) {
    return '      <nd ref="' + (-(i + 1)) + '" />';
  }).join('\n');

  var wayTags = '      <tag k="highway" v="' + escapeXml(roadType) + '" />\n';
  if (name) wayTags += '      <tag k="name" v="' + escapeXml(name) + '" />\n';
  if (maxSpeed) wayTags += '      <tag k="maxspeed" v="' + escapeXml(maxSpeed) + '" />\n';
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

  showNotification(isEl ? 'Αναβάθμιση στο OSM...' : 'Uploading to OSM...', 'info');

  uploadOSC(token, oscXml, comment).then(function (result) {
    if (result.success) {
      showNotification(
        isEl ? '✅ Επιτυχία! ID: ' + result.newId : '✅ Success! ID: ' + result.newId,
        'success'
      );
      clearRoadEditor();
      var map = getReMap();
      if (map) map.invalidateSize();
    } else {
      alert((isEl ? 'Αποτυχία: ' : 'Failed: ') + result.error);
    }
  }).catch(function (err) {
    alert((isEl ? 'Σφάλμα: ' : 'Error: ') + err.message);
  });
}

function uploadOSC(accessToken, oscContent, changesetComment) {
  var cfg = window.WAYMARK_CONFIG || {};
  var proxyUrl = cfg.PROXY_URL;
  var isEl = getCurrentLang() === 'el';

  if (!proxyUrl) {
    return Promise.reject(new Error('PROXY_URL not configured'));
  }

  var changesetXml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<osm version="0.6" generator="Waymark">\n' +
    '<changeset>\n' +
    '  <tag k="created_by" v="Waymark"/>\n' +
    '  <tag k="comment" v="' + escapeXml(changesetComment || 'Waymark road edit') + '"/>\n' +
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
      if (!resp.ok) {
        return resp.text().then(function (t) {
          throw new Error(isEl ? 'Άνοιγμα changeset: ' + t : 'Open changeset: ' + t);
        });
      }
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
          if (!uploadResp.ok) {
            return uploadResp.text().then(function (t) {
              throw new Error(isEl ? 'Upload: ' + t : 'Upload: ' + t);
            });
          }
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

function clearRoadEditor() {
  var map = getReMap();
  if (map && roadEditorState.polyline) {
    map.removeLayer(roadEditorState.polyline);
  }
  roadEditorState.points = [];
  roadEditorState.polyline = null;

  var nameEl = document.getElementById('reRoadName');
  var speedEl = document.getElementById('reMaxSpeed');
  var commentEl = document.getElementById('reComment');

  if (nameEl) nameEl.value = '';
  if (speedEl) speedEl.value = '';
  if (commentEl) commentEl.value = '';

  updateRoadInfo();
}

function _roadEditorCleanup() {
  delete window.onMapClick_roadEditor;
  var map = getReMap();
  if (map && roadEditorState.polyline) {
    map.removeLayer(roadEditorState.polyline);
  }
  roadEditorState = { points: [], polyline: null, selectedNodes: [] };
}

window._roadEditorCleanup = _roadEditorCleanup;