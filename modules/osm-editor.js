/* =========================================================
   WAYMARK — OSM Editor Module
   Direct upload via OAuth 2.0 PKCE + Cloudflare Worker proxy.
   Features: Login, Create POI, Edit Existing POI,
   Autocomplete tag keys/values,
   Load tags when clicking POI,
   check_date quick confirm.
   ========================================================= */

let osmEditorState = {
  accessToken: null,
  editingPoi: null,
  editingMarkers: [],
  tagCache: null,
  pendingLat: null,
  pendingLon: null,
};

// Common OSM tag presets for autocomplete
const OSM_TAG_PRESETS = {
  amenity: ['bench', 'cafe', 'restaurant', 'bar', 'fast_food', 'pub', 'pharmacy', 'hospital',
    'clinic', 'dentist', 'doctors', 'veterinary', 'school', 'kindergarten', 'college',
    'university', 'library', 'fuel', 'atm', 'bank', 'post_office', 'police', 'fire_station',
    'place_of_worship', 'parking', 'toilets', 'drinking_water', 'fountain', 'waste_basket',
    'recycling', 'telephone', 'emergency_phone', 'theatre', 'cinema', 'arts_centre',
    'community_centre', 'social_facility', 'childcare', 'grave_yard', 'crematorium',
    'post_box', 'bicycle_rental', 'bicycle_parking', 'car_wash', 'car_sharing',
    'charging_station', 'boat_rental', 'shelter', 'public_building', 'townhall', 'courthouse',
    'embassy', 'marketplace'],
  shop: ['supermarket', 'convenience', 'bakery', 'butcher', 'greengrocer', 'fishmonger',
    'beverages', 'alcohol', 'chemist', 'cosmetics', 'hairdresser', 'clothes', 'shoes',
    'jewelry', 'sports', 'books', 'stationery', 'gift', 'toy', 'mobile_phone', 'computer',
    'electronics', 'furniture', 'hardware', 'garden_centre', 'florist', 'optician',
    'kiosk', 'tobacco', 'tea', 'coffee', 'farm', 'pet', 'art', 'bookmaker'],
  building: ['yes', 'apartments', 'house', 'detached', 'semi_detached', 'terraced',
    'farm_auxiliary', 'garage', 'garages', 'shed', 'bungalow', 'roof', 'kiosk', 'hut',
    'construction', 'bakehouse', 'gatehouse', 'tower', 'stakehouse', 'bunker_silo',
    'silos', 'cowshed', 'stable', 'sty', 'hen_house', 'pigsty', 'hangar'],
  highway: ['residential', 'living_street', 'service', 'pedestrian', 'track', 'unclassified',
    'road', 'footway', 'path', 'steps', 'corridor', 'cycleway', 'bridleway', 'service'],
  leisure: ['park', 'pitch', 'playground', 'slipway', 'nature_reserve', 'swimming_pool',
    'dog_park', 'marina', 'bandstand', 'bbq', 'firepit', 'garden', 'horse_riding',
    'ice_rink', 'miniature_golf', 'outdoor_seating', 'pitch', 'sauna', 'sports_centre',
    'stadium', 'summer_toboggan_run', 'turf'],
  sport: ['soccer', 'tennis', 'swimming', 'basketball', 'volleyball', 'athletics',
    'baseball', 'cricket', 'rugby', 'golf', 'boxing', 'skiing', 'cycling',
    'skateboard', 'hockey', 'equestrian', 'climbing', 'rowing', 'badminton',
    'table_tennis', 'bowling', 'gymnastics', 'handball']
};

function initOsmEditor(map, container, appState) {
  const cfg = window.WAYMARK_CONFIG || {};

  // Check if we're returning from OAuth callback
  const params = new URLSearchParams(window.location.search);
  if (params.has('code') && params.has('state')) {
    handleOAuthCallback(params.get('code'), params.get('state'));
    return;
  }

  renderEditorUI(container);
  refreshLoginStatus();

  // Listen for login status changes from localStorage
  window.addEventListener('storage', (e) => {
    if (e.key === 'osm_access_token' || e.key === 'osm_user_id') {
      refreshLoginStatus();
    }
  });

  function handleMapClick(lat, lng) {
    if (!isLoggedIn()) {
      showNotification(isEl ? 'Σύνδεσου πρώτα!' : 'Please login first!', 'warning');
      return;
    }
    osmEditorState.pendingLat = lat;
    osmEditorState.pendingLon = lng;
    showNotification(isEl ? 'Επίλεξε preset για να δημιουργήσεις σημείο.' : 'Select a preset to create a point.', 'info');
  }

  window.onMapClick_osmEditor = handleMapClick;
}

function handleOAuthCallback(code, state) {
  const cfg = window.WAYMARK_CONFIG || {};
  const proxyUrl = cfg.PROXY_URL;

  if (!proxyUrl) {
    alert(isEl ? 'Config: PROXY_URL not set' : 'Config: PROXY_URL not set');
    return;
  }

  fetch(proxyUrl + '/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: cfg.REDIRECT_URI,
      code_verifier: sessionStorage.getItem('pkce_verifier') || ''
    })
  })
  .then(res => res.json().catch(() => ({})))
  .then(data => {
    if (data.access_token) {
      sessionStorage.setItem('osm_access_token', data.access_token);
      sessionStorage.removeItem('pkce_verifier');
      osmEditorState.accessToken = data.access_token;

      // Fetch user info
      fetch(proxyUrl + '/api/0.6/user/details', {
        headers: { Authorization: `Bearer ${data.access_token}` }
      })
      .then(u => u.json().catch(() => ({})))
      .then(userData => {
        const userId = userData.osm?.user?.id;
        if (userId) {
          sessionStorage.setItem('osm_user_id', userId.toString());
        }
        refreshLoginStatus();
        // Redirect to main app
        window.history.replaceState({}, '', 'app.html');
        window.location.href = 'app.html';
      })
      .catch(err => {
        console.error(err);
        alert(isEl ? 'Λάθος στη λήψη πληροφοριών χρήστη' : 'Failed to fetch user info');
      });
    } else {
      console.error('Token exchange failed:', data);
      alert(isEl ? `Απέτυχε η ανταλλαγή token: ${JSON.stringify(data)}` : `Token exchange failed: ${JSON.stringify(data)}`);
    }
  })
  .catch(err => {
    console.error('Network error:', err);
    alert(isEl ? 'Δίκτυο: ' + err.message : 'Network error: ' + err.message);
  });
}

function isLoggedIn() {
  return !!sessionStorage.getItem('osm_access_token');
}

async function refreshLoginStatus() {
  const badge = document.getElementById('editorLoginBadge');
  if (!badge) return;

  if (isLoggedIn()) {
    badge.classList.add('active');
    badge.textContent = isEl ? '✅ Συνδεδεμένος' : '✅ Logged in';

    const userId = sessionStorage.getItem('osm_user_id');
    if (userId) {
      badge.title = `User ID: ${userId}`;
    }
  } else {
    badge.classList.remove('active');
    badge.textContent = isEl ? '❌ Όχι συνδεδεμένος' : '❌ Not logged in';
  }
}

function renderEditorUI(container) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
    <div class="osm-editor-ui">
      <div id="editorLoginBadge" class="login-badge">${isEl ? '❌ Όχι συνδεδεμένος' : '❌ Not logged in'}</div>

      <button id="osmLoginBtn" class="btn btn-success">
        🔑 ${isEl ? 'Σύνδεση με OSM' : 'Login with OSM'}
      </button>

      <button id="osmLogoutBtn" class="btn btn-danger" style="display:none;">
        🔓 ${isEl ? 'Αποσύνδεση' : 'Logout'}
      </button>

      <hr>

      <h3>${isEl ? 'Δημιουργία Νέου Σημείου' : 'Create New Point'}</h3>

      <div class="form-group">
        <label>${isEl ? 'Τύπος:' : 'Type:'}</label>
        <select id="newPoiType" class="form-control">
          <option value="amenity">Amenity</option>
          <option value="shop">Shop</option>
          <option value="leisure">Leisure</option>
          <option value="sport">Sport</option>
          <option value="building">Building</option>
          <option value="highway">Highway</option>
        </select>
      </div>

      <div class="form-group">
        <label>${isEl ? 'Κύριο Tag:' : 'Main Tag:'}</label>
        <input type="text" id="newPoiTag" list="presetOptions" class="form-control"
               placeholder="${isEl ? 'π.χ. bench, cafe, restaurant...' : 'e.g. bench, cafe, restaurant...'}">
        <datalist id="presetOptions"></datalist>
      </div>

      <div class="form-group">
        <label>${isEl ? 'Πρόσθετα Tags (επιλογή):' : 'Additional Tags (optional):'}</label>
        <textarea id="additionalTags" rows="3" class="form-control"
                  placeholder="${isEl ? 'key=value, ένα ανά γραμμή' : 'key=value, one per line'}"></textarea>
      </div>

      <div class="form-group">
        <label>${isEl ? 'Σχόλιο Changeset (απαραίτητο):' : 'Changeset Comment (required):'}</label>
        <input type="text" id="changesetComment" class="form-control"
               placeholder="${isEl ? 'π.χ. add bench, map café' : 'e.g. add bench, map café'}">
      </div>

      <button id="createNewPointBtn" class="btn btn-success">
        📍 ${isEl ? 'Δημιουργία στο χάρτη' : 'Create on Map'}
      </button>

      <hr>

      <div id="editExistingSection" style="display:none;">
        <h3>${isEl ? 'Επεξεργασία Υπάρχοντος Σημείου' : 'Edit Existing Point'}</h3>
        <div id="editInfo" class="note-description"></div>
        <div class="form-group">
          <label>${isEl ? 'Ετικέτες:' : 'Tags:'}</label>
          <textarea id="editTags" rows="4" class="form-control"></textarea>
        </div>
        <button id="saveEditsBtn" class="btn btn-success">💾 ${isEl ? 'Αποθήκευση' : 'Save'} ✏️</button>
        <button id="cancelEditBtn" class="btn btn-secondary">✖️ ${isEl ? 'Άκυρο' : 'Cancel'}</button>
      </div>

      <hr>

      <h3>${isEl ? 'Tags Database' : 'Tags Database'}</h3>
      <input type="text" id="tagSearch" class="form-control"
             placeholder="${isEl ? 'Αναζήτηση tag key/value...' : 'Search tag key/value...'}"
             style="margin-bottom:0.5rem;">
      <div id="tagResults" class="results-list"></div>
    </div>
  `;

  // Bind datalist options
  updatePresetOptions();

  // Event listeners
  document.getElementById('osmLoginBtn').addEventListener('click', initiateOAuth);
  document.getElementById('osmLogoutBtn').addEventListener('click', logoutFromOSM);
  document.getElementById('newPoiType').addEventListener('change', updatePresetOptions);
  document.getElementById('createNewPointBtn').addEventListener('click', createNewPoint);
  document.getElementById('saveEditsBtn').addEventListener('click', saveEdits);
  document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);
  document.getElementById('tagSearch').addEventListener('input', searchTags);
}

function updatePresetOptions() {
  const type = document.getElementById('newPoiType').value;
  const datalist = document.getElementById('presetOptions');
  const options = OSM_TAG_PRESETS[type] || [];

  datalist.innerHTML = '';
  options.forEach(opt => {
    const li = document.createElement('option');
    li.value = opt;
    datalist.appendChild(li);
  });
}

function initiateOAuth() {
  const cfg = window.WAYMARK_CONFIG || {};

  if (!cfg.OSM_CLIENT_ID || !cfg.REDIRECT_URI) {
    alert(isEl ? 'Config: OSM_CLIENT_ID ή REDIRECT_URI δεν ρυθμίστηκαν' : 'Config: OSM_CLIENT_ID or REDIRECT_URI not set');
    return;
  }

  // Generate PKCE challenge
  const verifier = generateRandomString(64);
  const challenge = generateHash(verifier);

  sessionStorage.setItem('pkce_verifier', verifier);

  const scopes = cfg.OAUTH_SCOPE || 'read_prefs write_api write_notes write_gpx';
  const authUrl = `https://www.openstreetmap.org/oauth2/authorize?client_id=${encodeURIComponent(cfg.OSM_CLIENT_ID)}&redirect_uri=${encodeURIComponent(cfg.REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=waymark_editor&code_challenge=${challenge}&code_challenge_method=S256`;

  window.open(authUrl, '_blank');
}

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  let str = '';
  for (let i = 0; i < length; i++) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return str;
}

function generateHash(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  return crypto.subtle.digest('SHA-256', data).then(h => {
    return btoa(String.fromCharCode(...new Uint8Array(h)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  });
}

// Async version for OAuth flow
async function generateHashSync(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function logoutFromOSM() {
  sessionStorage.removeItem('osm_access_token');
  sessionStorage.removeItem('osm_user_id');
  osmEditorState.accessToken = null;
  refreshLoginStatus();
  hideEditSection();
}

async function createNewPoint() {
  const type = document.getElementById('newPoiType').value;
  const tagValue = document.getElementById('newPoiTag').value.trim();
  const additionalTags = document.getElementById('additionalTags').value.trim();
  const comment = document.getElementById('changesetComment').value.trim();

  if (!tagValue) {
    alert(isEl ? 'Διάλεξε κύριο tag' : 'Select a main tag');
    return;
  }
  if (!comment) {
    alert(isEl ? 'Ορίστε το changeset comment' : 'Set the changeset comment');
    return;
  }

  // Build tags object
  const tags = { [type]: tagValue };
  if (additionalTags) {
    additionalTags.split('\n').forEach(line => {
      const [k, v] = line.split('=').map(s => s.trim());
      if (k && v) tags[k] = v;
    });
  }

  const lat = osmEditorState.pendingLat;
  const lon = osmEditorState.pendingLon;

  if (lat === null || lon === null) {
    // Use map center
    const center = window.appState?.map?.getCenter();
    if (center) {
      osmEditorState.pendingLat = lat = center.lat;
      osmEditorState.pendingLon = lon = center.lng;
    } else {
      alert(isEl ? 'Κάνε κλικ στον χάρτη για να ορίσεις θέση' : 'Click on map to set position');
      return;
    }
  }

  const oscXml = buildOscNodeUpload(osmEditorState.pendingLat, osmEditorState.pendingLon, tags, comment);

  try {
    const result = await uploadOSC(osmEditorState.accessToken, oscXml);
    if (result.success) {
      alert(isEl ? 'Επιτυχία! ID: ' + result.newId : 'Success! New Node ID: ' + result.newId);
      osmEditorState.pendingLat = null;
      osmEditorState.pendingLon = null;
      // Refresh map to show new node (if layer has it)
      if (window.appState?.map) {
        window.appState.map.invalidateSize();
      }
    } else {
      alert(isEl ? 'Απέτυχε το ανέβασμα: ' + result.error : 'Upload failed: ' + result.error);
    }
  } catch (err) {
    alert(isEl ? 'Σφάλμα δικτύου: ' + err.message : 'Network error: ' + err.message);
  }
}

function buildOscNodeUpload(lat, lon, tags, comment) {
  const tagEntries = Object.entries(tags).map(([k, v]) =>
    `        <tag k="${escapeXml(k)}" v="${escapeXml(v)}"/>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<osmChange version="0.6" generator="Waymark">
  <create>
    <node lat="${lat}" lon="${lon}" version="1">
${tagEntries}
    </node>
  </create>
  <modify>
    <changeset id="-1" user="" created_at="1970-01-01T00:00:00Z" closed_at="2038-01-01T00:00:00Z"
             open="false" changes_count="1" comments="${escapeXml(comment)}"
             bounding_box min_lat="-90" min_lon="-180" max_lat="90" max_lon="180"/>
  </modify>
</osmChange>`;
}

async function uploadOSC(accessToken, oscContent) {
  const cfg = window.WAYMARK_CONFIG || {};
  const proxyUrl = cfg.PROXY_URL;

  if (!proxyUrl) {
    return { success: false, error: 'Proxy URL not configured' };
  }

  try {
    // Step 1: Open changeset
    const openResp = await fetch(proxyUrl + '/api/0.6/changeset/open', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/xml'
      },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<osm xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="0.6" generator="Waymark">
  <changeset>
    <tag k="created_by" v="Waymark"/>
  </changeset>
</osm>`
    });

    if (!openResp.ok) {
      const txt = await openResp.text();
      return { success: false, error: 'Failed to open changeset: ' + txt };
    }

    const changesetId = await openResp.text();

    // Step 2: Upload content
    const uploadResp = await fetch(proxyUrl + `/api/0.6/changeset/${changesetId}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/xml'
      },
      body: oscContent
    });

    if (!uploadResp.ok) {
      const txt = await uploadResp.text();
      return { success: false, error: 'Upload failed: ' + txt };
    }

    const diff = await uploadResp.text();

    // Extract new node ID from diff response
    const idMatch = diff.match(/id="(\d+)"/);
    const newId = idMatch ? idMatch[1] : null;

    // Step 3: Close changeset
    await fetch(proxyUrl + `/api/0.6/changeset/${changesetId}/close`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain'
      }
    });

    return { success: true, newId };

  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Cleanup function
function _osmEditorCleanup() {
  delete window.onMapClick_osmEditor;
  osmEditorState = {
    accessToken: null,
    editingPoi: null,
    editingMarkers: [],
    tagCache: null,
    pendingLat: null,
    pendingLon: null,
  };
}

window._osmEditorCleanup = _osmEditorCleanup;