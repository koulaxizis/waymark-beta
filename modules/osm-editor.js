/* =========================================================
   WAYMARK — OSM Editor Module
   OAuth 2.0 PKCE via same-window redirect.
   Token stored in localStorage (shared across tabs).
   ========================================================= */

var osmEditorState = {
  editingPoi: null,
  editingMarkers: [],
  pendingLat: null,
  pendingLon: null,
};

var OSM_TAG_PRESETS = {
  amenity: ['bench', 'cafe', 'restaurant', 'bar', 'fast_food', 'pub', 'pharmacy',
    'hospital', 'clinic', 'school', 'library', 'fuel', 'atm', 'bank',
    'post_office', 'police', 'parking', 'toilets', 'drinking_water',
    'recycling', 'theatre', 'cinema', 'place_of_worship', 'marketplace'],
  shop: ['supermarket', 'convenience', 'bakery', 'butcher', 'greengrocer',
    'beverages', 'chemist', 'clothes', 'shoes', 'books', 'mobile_phone',
    'electronics', 'hardware', 'florist', 'optician', 'kiosk', 'pet', 'art'],
  building: ['yes', 'apartments', 'house', 'detached', 'garage', 'shed',
    'commercial', 'industrial', 'construction', 'roof'],
  highway: ['residential', 'living_street', 'service', 'pedestrian', 'track',
    'footway', 'path', 'cycleway', 'steps'],
  leisure: ['park', 'pitch', 'playground', 'swimming_pool', 'garden', 'sports_centre'],
  sport: ['soccer', 'tennis', 'basketball', 'volleyball', 'swimming', 'cycling']
};

function initOsmEditor(map, container, appState) {
  renderEditorUI(container);
  refreshLoginStatus();

  window.addEventListener('storage', function (e) {
    if (e.key === 'osm_access_token' || e.key === 'osm_user_id') {
      refreshLoginStatus();
    }
  });

  function handleMapClick(lat, lng) {
    if (!isLoggedIn()) {
      showNotification(getCurrentLang() === 'el' ? 'Σύνδεσου πρώτα!' : 'Please login first!', 'warning');
      return;
    }
    osmEditorState.pendingLat = lat;
    osmEditorState.pendingLon = lng;
    showNotification(getCurrentLang() === 'el'
      ? 'Θέση ορίστηke. Συμπλήρωσε τα πεδία και πάτα "Δημιουργία".'
      : 'Position set. Fill in the fields and press "Create".', 'info');
  }

  window.onMapClick_osmEditor = handleMapClick;
}

function isLoggedIn() {
  return !!localStorage.getItem('osm_access_token');
}

function refreshLoginStatus() {
  var badge = document.getElementById('editorLoginBadge');
  if (!badge) return;
  var isEl = getCurrentLang() === 'el';

  if (isLoggedIn()) {
    badge.classList.add('active');
    badge.textContent = isEl ? '✅ Συνδεδεμένος' : '✅ Logged in';
    var userId = localStorage.getItem('osm_user_id');
    if (userId) badge.title = 'User ID: ' + userId;

    var loginBtn = document.getElementById('osmLoginBtn');
    var logoutBtn = document.getElementById('osmLogoutBtn');
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'block';
  } else {
    badge.classList.remove('active');
    badge.textContent = isEl ? '❌ Όχι συνδεδεμένος' : '❌ Not logged in';

    var loginBtn = document.getElementById('osmLoginBtn');
    var logoutBtn = document.getElementById('osmLogoutBtn');
    if (loginBtn) loginBtn.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}

function renderEditorUI(container) {
  var isEl = getCurrentLang() === 'el';

  container.innerHTML =
    '<div class="osm-editor-ui">' +
    '  <div id="editorLoginBadge" class="login-badge">' + (isEl ? '❌ Όχι συνδεδεμένος' : '❌ Not logged in') + '</div>' +
    '  <button id="osmLoginBtn" class="btn btn-success">🔑 ' + (isEl ? 'Σύνδεση με OSM' : 'Login with OSM') + '</button>' +
    '  <button id="osmLogoutBtn" class="btn btn-danger" style="display:none;">🔓 ' + (isEl ? 'Αποσύνδεση' : 'Logout') + '</button>' +
    '  <hr>' +
    '  <h3>' + (isEl ? 'Δημιουργία Νέου Σημείου' : 'Create New Point') + '</h3>' +
    '  <div class="form-group"><label>' + (isEl ? 'Τύπος:' : 'Type:') + '</label>' +
    '    <select id="newPoiType" class="form-control">' +
    '      <option value="amenity">Amenity</option>' +
    '      <option value="shop">Shop</option>' +
    '      <option value="leisure">Leisure</option>' +
    '      <option value="sport">Sport</option>' +
    '      <option value="building">Building</option>' +
    '      <option value="highway">Highway</option>' +
    '    </select>' +
    '  </div>' +
    '  <div class="form-group"><label>' + (isEl ? 'Κύριο Tag:' : 'Main Tag:') + '</label>' +
    '    <input type="text" id="newPoiTag" list="presetOptions" class="form-control" placeholder="' + (isEl ? 'π.χ. bench, cafe...' : 'e.g. bench, cafe...') + '">' +
    '    <datalist id="presetOptions"></datalist>' +
    '  </div>' +
    '  <div class="form-group"><label>' + (isEl ? 'Πρόσθετα Tags:' : 'Additional Tags:') + '</label>' +
    '    <textarea id="additionalTags" rows="3" class="form-control" placeholder="key=value, ' + (isEl ? 'ένα ανά γραμμή' : 'one per line') + '"></textarea>' +
    '  </div>' +
    '  <div class="form-group"><label>' + (isEl ? 'Σχόλιο Changeset:' : 'Changeset Comment:') + '</label>' +
    '    <input type="text" id="changesetComment" class="form-control" placeholder="' + (isEl ? 'π.χ. add bench' : 'e.g. add bench') + '">' +
    '  </div>' +
    '  <button id="createNewPointBtn" class="btn btn-success">📍 ' + (isEl ? 'Δημιουργία στο χάρτη' : 'Create on Map') + '</button>' +
    '  <hr>' +
    '  <div id="editExistingSection" style="display:none;">' +
    '    <h3>' + (isEl ? 'Επεξεργασία Σημείου' : 'Edit Point') + '</h3>' +
    '    <div id="editInfo" class="note-description"></div>' +
    '    <div class="form-group"><label>' + (isEl ? 'Tags (key=value ανά γραμμή):' : 'Tags (key=value per line):') + '</label>' +
    '      <textarea id="editTags" rows="4" class="form-control"></textarea>' +
    '    </div>' +
    '    <button id="saveEditsBtn" class="btn btn-success">💾 ' + (isEl ? 'Αποθήκευση' : 'Save') + '</button>' +
    '    <button id="cancelEditBtn" class="btn btn-secondary">✖️ ' + (isEl ? 'Άκυρο' : 'Cancel') + '</button>' +
    '  </div>' +
    '  <hr>' +
    '  <h3>Tags Database</h3>' +
    '  <input type="text" id="tagSearch" class="form-control" placeholder="' + (isEl ? 'Αναζήτηση tag...' : 'Search tag...') + '" style="margin-bottom:0.5rem;">' +
    '  <div id="tagResults" class="results-list"></div>' +
    '</div>';

  updatePresetOptions();

  document.getElementById('osmLoginBtn').addEventListener('click', initiateOAuth);
  document.getElementById('osmLogoutBtn').addEventListener('click', logoutFromOSM);
  document.getElementById('newPoiType').addEventListener('change', updatePresetOptions);
  document.getElementById('createNewPointBtn').addEventListener('click', createNewPoint);
  document.getElementById('saveEditsBtn').addEventListener('click', saveEdits);
  document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);
  document.getElementById('tagSearch').addEventListener('input', searchTagsDb);
}

function updatePresetOptions() {
  var type = document.getElementById('newPoiType').value;
  var datalist = document.getElementById('presetOptions');
  var options = OSM_TAG_PRESETS[type] || [];

  datalist.innerHTML = '';
  options.forEach(function (opt) {
    var li = document.createElement('option');
    li.value = opt;
    datalist.appendChild(li);
  });
}

function initiateOAuth() {
  var cfg = window.WAYMARK_CONFIG || {};
  var isEl = getCurrentLang() === 'el';

  if (!cfg.OSM_CLIENT_ID || !cfg.REDIRECT_URI) {
    alert(isEl ? 'Config: OSM_CLIENT_ID ή REDIRECT_URI δεν ρυθμίστηκαν' : 'Config: OSM_CLIENT_ID or REDIRECT_URI not set');
    return;
  }

  var verifier = generateRandomString(64);

  generateHash(verifier).then(function (challenge) {
    localStorage.setItem('pkce_verifier', verifier);

    var scopes = cfg.OAUTH_SCOPE || 'read_prefs write_api write_notes write_gpx';
    var authUrl = 'https://www.openstreetmap.org/oauth2/authorize' +
      '?client_id=' + encodeURIComponent(cfg.OSM_CLIENT_ID) +
      '&redirect_uri=' + encodeURIComponent(cfg.REDIRECT_URI) +
      '&response_type=code' +
      '&scope=' + encodeURIComponent(scopes) +
      '&state=waymark_editor' +
      '&code_challenge=' + challenge +
      '&code_challenge_method=S256';

    window.location.href = authUrl;
  });
}

function generateRandomString(length) {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  var str = '';
  for (var i = 0; i < length; i++) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return str;
}

function generateHash(str) {
  var encoder = new TextEncoder();
  var data = encoder.encode(str);
  return crypto.subtle.digest('SHA-256', data).then(function (h) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(h)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  });
}

function logoutFromOSM() {
  localStorage.removeItem('osm_access_token');
  localStorage.removeItem('osm_user_id');
  localStorage.removeItem('pkce_verifier');
  refreshLoginStatus();
  hideEditSection();
}

function createNewPoint() {
  var isEl = getCurrentLang() === 'el';
  var type = document.getElementById('newPoiType').value;
  var tagValue = document.getElementById('newPoiTag').value.trim();
  var additionalTags = document.getElementById('additionalTags').value.trim();
  var comment = document.getElementById('changesetComment').value.trim();

  if (!tagValue) { alert(isEl ? 'Διάλεξε κύριο tag' : 'Select a main tag'); return; }
  if (!comment) { alert(isEl ? 'Ορίστε changeset comment' : 'Set changeset comment'); return; }

  var tags = {};
  tags[type] = tagValue;
  if (additionalTags) {
    additionalTags.split('\n').forEach(function (line) {
      var parts = line.split('=').map(function (s) { return s.trim(); });
      if (parts[0] && parts[1]) tags[parts[0]] = parts[1];
    });
  }

  var lat = osmEditorState.pendingLat;
  var lon = osmEditorState.pendingLon;

  if (lat === null || lon === null) {
    var center = window.appState && window.appState.map ? window.appState.map.getCenter() : null;
    if (center) {
      lat = center.lat;
      lon = center.lng;
      osmEditorState.pendingLat = lat;
      osmEditorState.pendingLon = lon;
    } else {
      alert(isEl ? 'Κάνε κλικ στον χάρτη για θέση' : 'Click on map to set position');
      return;
    }
  }

  var oscXml = buildOscNodeUpload(lat, lon, tags, comment);
  var token = localStorage.getItem('osm_access_token');

  uploadOSC(token, oscXml).then(function (result) {
    if (result.success) {
      alert(isEl ? '✅ Επιτυχία! ID: ' + result.newId : '✅ Success! ID: ' + result.newId);
      osmEditorState.pendingLat = null;
      osmEditorState.pendingLon = null;
      if (window.appState && window.appState.map) window.appState.map.invalidateSize();
    } else {
      alert((isEl ? 'Απέτυχε: ' : 'Failed: ') + result.error);
    }
  }).catch(function (err) {
    alert((isEl ? 'Σφάλμα: ' : 'Error: ') + err.message);
  });
}

function buildOscNodeUpload(lat, lon, tags, comment) {
  var tagEntries = Object.keys(tags).map(function (k) {
    return '        <tag k="' + escapeXml(k) + '" v="' + escapeXml(tags[k]) + '"/>';
  }).join('\n');

  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<osmChange version="0.6" generator="Waymark">\n' +
    '  <create>\n' +
    '    <node lat="' + lat + '" lon="' + lon + '" version="1">\n' +
    tagEntries + '\n' +
    '    </node>\n' +
    '  </create>\n' +
    '</osmChange>';
}

function uploadOSC(accessToken, oscContent) {
  var cfg = window.WAYMARK_CONFIG || {};
  var proxyUrl = cfg.PROXY_URL;

  if (!proxyUrl) {
    return Promise.resolve({ success: false, error: 'Proxy URL not configured' });
  }

  return fetch(proxyUrl + '/api/0.6/changeset/open', {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/xml' },
    body: '<?xml version="1.0" encoding="UTF-8"?>\n<osm version="0.6" generator="Waymark"><changeset><tag k="created_by" v="Waymark"/></changeset></osm>'
  }).then(function (openResp) {
    if (!openResp.ok) return openResp.text().then(function (t) { throw new Error('Open: ' + t); });
    return openResp.text();
  }).then(function (changesetId) {
    changesetId = changesetId.trim();
    return fetch(proxyUrl + '/api/0.6/changeset/' + changesetId + '/upload', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/xml' },
      body: oscContent
    }).then(function (uploadResp) {
      if (!uploadResp.ok) return uploadResp.text().then(function (t) { throw new Error('Upload: ' + t); });
      return uploadResp.text();
    }).then(function (diff) {
      var idMatch = diff.match(/id="(\d+)"/);
      var newId = idMatch ? idMatch[1] : null;
      return fetch(proxyUrl + '/api/0.6/changeset/' + changesetId + '/close', {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'text/plain' }
      }).then(function () {
        return { success: true, newId: newId };
      });
    });
  }).catch(function (err) {
    return { success: false, error: err.message };
  });
}

function saveEdits() {
  var isEl = getCurrentLang() === 'el';
  if (!osmEditorState.editingPoi) return;

  var tagsText = document.getElementById('editTags').value.trim();
  var tags = {};
  tagsText.split('\n').forEach(function (line) {
    var parts = line.split('=').map(function (s) { return s.trim(); });
    if (parts[0] && parts[1]) tags[parts[0]] = parts[1];
  });

  var el = osmEditorState.editingPoi;
  var elType = el.type || 'node';
  var latLonAttrs = elType === 'node' ? 'lat="' + (el.lat || '') + '" lon="' + (el.lon || '') + '"' : '';

  var tagLines = Object.keys(tags).map(function (k) {
    return '      <tag k="' + escapeXml(k) + '" v="' + escapeXml(tags[k]) + '"/>';
  }).join('\n');

  var oscXml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<osmChange version="0.6" generator="Waymark">\n' +
    '  <modify>\n' +
    '    <' + elType + ' id="' + el.id + '" version="' + (el.version || 1) + '" ' + latLonAttrs + '>\n' +
    tagLines + '\n' +
    '    </' + elType + '>\n' +
    '  </modify>\n' +
    '</osmChange>';

  var token = localStorage.getItem('osm_access_token');
  uploadOSC(token, oscXml).then(function (result) {
    if (result.success) {
      alert(isEl ? '✅ Αποθηκεύτηκε!' : '✅ Saved!');
      cancelEdit();
    } else {
      alert((isEl ? 'Αποτυχία: ' : 'Failed: ') + result.error);
    }
  });
}

function cancelEdit() {
  hideEditSection();
  osmEditorState.editingPoi = null;
}

function hideEditSection() {
  var sec = document.getElementById('editExistingSection');
  if (sec) sec.style.display = 'none';
}

function searchTagsDb() {
  var query = document.getElementById('tagSearch').value.trim().toLowerCase();
  var resultsEl = document.getElementById('tagResults');
  var isEl = getCurrentLang() === 'el';

  if (!query) {
    resultsEl.innerHTML = '';
    return;
  }

  fetch('https://taginfo.openstreetmap.org/api/4/tags/popular?key=' + encodeURIComponent(query) + '&page=1&rp=15&sortname=count_all&sortorder=desc')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      resultsEl.innerHTML = '';
      if (!data.data || data.data.length === 0) {
        resultsEl.innerHTML = '<p>' + (isEl ? 'Δεν βρέθηκαν' : 'None found') + '</p>';
        return;
      }
      data.data.forEach(function (item) {
        var div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = '<strong>' + escapeHtml(item.key) + '=' + escapeHtml(item.value) + '</strong><small>' + item.count_all + ' uses</small>';
        div.addEventListener('click', function () {
          navigator.clipboard.writeText(item.key + '=' + item.value);
          showNotification(isEl ? 'Αντιγράφηκε!' : 'Copied!', 'success');
        });
        resultsEl.appendChild(div);
      });
    })
    .catch(function (err) {
      console.error('Tag search error:', err);
    });
}

function _osmEditorCleanup() {
  delete window.onMapClick_osmEditor;
  osmEditorState = { editingPoi: null, editingMarkers: [], pendingLat: null, pendingLon: null };
}

window._osmEditorCleanup = _osmEditorCleanup;
window.initiateOAuth = initiateOAuth;
window.uploadOSC = uploadOSC;