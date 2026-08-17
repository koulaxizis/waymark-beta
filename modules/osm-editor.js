/* =========================================================
   WAYMARK — OSM Editor Module
   Direct upload via OAuth 2.0 PKCE + Cloudflare Worker proxy.
   Features: Login, Create POI, Edit Existing POI,
   Autocomplete tag keys/values (Fix #4),
   Load tags when clicking POI (Fix #13),
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

// Common OSM tag presets for autocomplete (Fix #4)
const OSM_TAG_PRESETS = {
  amenity: ['bench', 'cafe', 'restaurant', 'bar', 'fast_food', 'pub', 'pharmacy', 'hospital',
    'clinic', 'dentist', 'doctors', 'veterinary', 'school', 'kindergarten', 'college',
    'university', 'library', 'fuel', 'atm', 'bank', 'post_office', 'police', 'fire_station',
    'place_of_worship', 'parking', 'toilets', 'drinking_water', 'fountain', 'waste_basket',
    'recycling', 'telephone', 'emergency_phone', 'theatre', 'cinema', 'arts_centre',
    'community_centre', 'social_facility', 'childcare', 'grave_yard', 'crematorium',
    'post_box', 'bicycle_rental', 'bicycle_parking', 'car_wash', 'car_sharing',
    'charging_station', 'boat_rental', 'shelter', 'public_building', 'townhall', 'courthouse',
    'embassy', 'marketplace', 'stripclub', 'nightclub', 'casino', 'studio', 'health_post',
    'nursing_home', 'animal_boarding', 'animal_shelter', 'vending_machine', 'bbq',
    'water_point', 'shower', 'sanitary_dump_station', 'motorcycle_parking', 'kneipp_water_cure'],
  shop: ['supermarket', 'convenience', 'bakery', 'butcher', 'greengrocer', 'fishmonger',
    'beverages', 'alcohol', 'chemist', 'cosmetics', 'hairdresser', 'beauty', 'clothes',
    'shoes', 'jewelry', 'watches', 'sports', 'books', 'stationery', 'gift', 'toy',
    'mobile_phone', 'computer', 'electronics', 'furniture', 'interior_decoration',
    'hardware', 'garden_centre', 'doityourself', 'florist', 'optician', 'hearing_aids',
    'medical_supply', 'kiosk', 'tobacco', 'e-cigarette', 'pyrotechnics', 'tea',
    'coffee', 'chocolate', 'confectionery', 'ice_cream', 'health_food', 'organic',
    'farm', 'laundry', 'dry_cleaning', 'tailor', 'fashion', 'bags', 'accessories',
    'variety_store', 'department_store', 'mall', 'general', 'pet', 'photo', 'video',
    'music', 'art', 'craft', 'travel_agency', 'ticket', 'estate_agent', 'car', 'car_repair',
    'tyres', 'motorcycle', 'bicycle', 'boating', 'sewing', 'fabric', 'curtain', 'bed',
    'frame', 'houseware', 'kitchen', 'paint', 'window_blind', 'flooring', 'tiles',
    'electrical', 'lighting', 'security', 'locksmith', 'hifi', 'video_games', 'board_games',
    'model', 'trophy', 'collector', 'antiques', 'musical_instrument', 'second_hand',
    'charity', 'books', 'newsagent', 'camera', 'communication', 'copyshop', 'printing',
    'money_lender', 'financial_service', 'massage', 'tattoo', 'piercing', 'funeral_directors'],
  building: ['yes', 'apartments', 'house', 'detached', 'residential', 'commercial',
    'industrial', 'warehouse', 'retail', 'office', 'public', 'civic', 'religious',
    'church', 'chapel', 'cathedral', 'mosque', 'temple', 'synagogue', 'shrine',
    'school', 'kindergarten', 'college', 'university', 'hospital', 'clinic',
    'stadium', 'train_station', 'transportation', 'parking', 'garage', 'carport',
    'shed', 'roof', 'service', 'entrance', 'terrace', 'hotel', 'ruins', 'construction'],
  leisure: ['park', 'playground', 'fitness_centre', 'sports_centre', 'stadium', 'track',
    'pitch', 'golf_course', 'swimming_pool', 'water_park', 'garden', 'nature_reserve',
    'common', 'slipway', 'marina', 'boatyard', 'picnic_table', 'firepit', 'summer_camp',
    'amusement_arcade', 'adult_gaming_centre', 'dance_hall', 'escape_game', 'horse_riding',
    'ice_rink', 'miniature_golf', 'sauna', 'tanning_salon', 'beach_resort', 'club',
    'hackerspace', 'outdoor_seating', 'bird_hide', 'fishing', 'swimming_area', 'bathing_place',
    'disc_golf_course', 'sport_centre', 'stables', 'bandstand', 'bleachers', 'stand'],
  tourism: ['hotel', 'motel', 'hostel', 'guest_house', 'apartment', 'camp_site',
    'caravan_site', 'chalet', 'alpine_hut', 'apartment', 'attraction', 'viewpoint',
    'museum', 'gallery', 'artwork', 'information', 'visitor_centre', 'picnic_site',
    'zoo', 'theme_park', 'aquarium', 'winery', 'distillery', 'factory_tour',
    'bed_and_breakfast', 'camp_pitch', 'trail_riding_station', 'aquarium', 'wayside_cross',
    'wayside_shrine', 'artwork', 'holiday_park', 'trail_head', 'wilderness_hut'],
  highway: ['residential', 'primary', 'secondary', 'tertiary', 'unclassified',
    'service', 'footway', 'cycleway', 'path', 'track', 'pedestrian', 'living_street',
    'motorway', 'trunk', 'motorway_link', 'trunk_link', 'primary_link', 'secondary_link',
    'tertiary_link', 'bus_stop', 'crossing', 'speed_camera', 'traffic_signals',
    'mini_roundabout', 'turning_circle', 'turning_loop', 'stop', 'give_way',
    'milestone', 'emergency_access_point', 'escape', 'raceway', 'bridleway',
    'steps', 'corridor', 'elevator', 'construction', 'proposed', 'rest_area',
    'services'],
  natural: ['tree', 'wood', 'forest', 'peak', 'cliff', 'cave_entrance', 'spring',
    'water', 'wetland', 'scrub', 'heath', 'grassland', 'meadow', 'fell', 'bare_rock',
    'scree', 'shingle', 'sand', 'mud', 'waterfall', 'geyser', 'hot_spring',
    'bay', 'beach', 'coastline', 'strait', 'cape', 'peninsula', 'island', 'islet',
    'reef', 'shoal', 'rock', 'stone', 'glacier', 'volcano'],
  historic: ['monument', 'memorial', 'castle', 'fort', 'manor', 'ruins', 'archaeological_site',
    'tomb', 'wayside_cross', 'wayside_shrine', 'boundary_stone', 'milestone', 'city_gate',
    'battlefield', 'bomb_crater', 'building', 'church', 'railway_station', 'tram_stop',
    'cannon', 'lime_kiln', 'mill_stone', 'quarry', 'mine', 'mine_shaft', 'boundary_mark'],
  landuse: ['residential', 'commercial', 'industrial', 'retail', 'farmland', 'farmyard',
    'meadow', 'orchard', 'vineyard', 'forest', 'allotments', 'cemetery', 'grass',
    'greenhouse_horticulture', 'garages', 'meadow', 'military', 'quarry', 'landfill',
    'construction', 'religious', 'recreation_ground', 'village_green', 'education', 'harbour'],
};

function initOsmEditor(map, container, appState) {
  const isEl = getCurrentLang() === 'el';

  osmEditorState.accessToken = sessionStorage.getItem('osm_access_token');

  container.innerHTML = `
    <div class="module-form">
      <div class="login-badge ${osmEditorState.accessToken ? 'active' : ''}" id="loginStatus">
        ${osmEditorState.accessToken
          ? (isEl ? '✅ Συνδεδεμένος ως: ' : '✅ Logged in as: ') + (sessionStorage.getItem('osm_username') || 'OSM User')
          : (isEl ? '❌ Μη συνδεδεμένος' : '❌ Not logged in')}
      </div>

      <button class="btn ${osmEditorState.accessToken ? 'btn-danger' : 'btn-success'}" id="loginBtn">
        ${osmEditorState.accessToken
          ? (isEl ? '🚪 Αποσύνδεση' : '🚪 Logout')
          : (isEl ? '🔐 Σύνδεση OSM' : '🔐 Login to OSM')}
      </button>

      <hr>

      <div class="form-group">
        <label>${isEl ? 'Κύριο Tag (π.χ. amenity, shop)' : 'Primary Tag (e.g. amenity, shop)'}</label>
        <input type="text" id="osmTagKey" list="tagKeyList" placeholder="${isEl ? 'π.χ. amenity' : 'e.g. amenity'}" autocomplete="off">
        <datalist id="tagKeyList">
          ${Object.keys(OSM_TAG_PRESETS).map(k => `<option value="${k}">`).join('')}
        </datalist>
      </div>

      <div class="form-group">
        <label>${isEl ? 'Τιμή (π.χ. supermarket)' : 'Value (e.g. supermarket)'}</label>
        <input type="text" id="osmTagValue" list="tagValueList" placeholder="${isEl ? 'π.χ. supermarket' : 'e.g. supermarket'}" autocomplete="off">
        <datalist id="tagValueList"></datalist>
      </div>

      <div class="form-group">
        <label>${isEl ? 'Όνομα' : 'Name'}</label>
        <input type="text" id="osmTagName" placeholder="${isEl ? 'π.χ. Διάφορα' : 'e.g. Something'}">
      </div>

      <div class="form-group" id="extraTagsContainer">
        <label>${isEl ? 'Επιπλέον Tags' : 'Additional Tags'}</label>
        <div id="extraTagsList"></div>
        <button class="btn btn-sm btn-secondary" id="addTagBtn" style="margin-top: 0.3rem;">+ ${isEl ? 'Προσθήκη Tag' : 'Add Tag'}</button>
      </div>

      <hr>

      <button class="btn" id="fetchExistingBtn">${isEl ? '📥 Φόρτωση POIs περιοχής' : '📥 Load Area POIs'}</button>
      <button class="btn btn-success" id="uploadPoiBtn" ${!osmEditorState.accessToken ? 'disabled' : ''}>
        ${isEl ? '📤 Ανέβασμα POI' : '📤 Upload POI'}
      </button>
    </div>
  `;

  // Store map reference for async calls
  window.appStateRef = window.appStateRef || {};
  window.appStateRef.map = map;

  // Fix #4: Autocomplete - update value datalist when key changes
  document.getElementById('osmTagKey').addEventListener('input', (e) => {
    const key = e.target.value.trim().toLowerCase();
    const valueList = document.getElementById('tagValueList');
    valueList.innerHTML = '';

    if (OSM_TAG_PRESETS[key]) {
      OSM_TAG_PRESETS[key].forEach(v => {
        valueList.innerHTML += `<option value="${v}">`;
      });
    }
  });

  // Add extra tag row
  let extraTagCount = 0;
  document.getElementById('addTagBtn').addEventListener('click', () => {
    const list = document.getElementById('extraTagsList');
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; gap: 0.3rem; margin-bottom: 0.3rem;';
    row.innerHTML = `
      <input type="text" placeholder="key" class="extra-tag-key" style="flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; color: var(--fg); padding: 0.4rem; font-size: 0.8rem;">
      <input type="text" placeholder="value" class="extra-tag-val" style="flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; color: var(--fg); padding: 0.4rem; font-size: 0.8rem;">
      <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()" style="width: auto; padding: 0.3rem 0.5rem;">✕</button>
    `;
    list.appendChild(row);
    extraTagCount++;
  });

  // Login button
  document.getElementById('loginBtn').addEventListener('click', () => {
    if (osmEditorState.accessToken) {
      // Logout
      sessionStorage.removeItem('osm_access_token');
      sessionStorage.removeItem('osm_username');
      osmEditorState.accessToken = null;
      initOsmEditor(map, container, appState);
    } else {
      // Start OAuth flow
      startOAuthFlow();
    }
  });

  // Fetch existing POIs
  document.getElementById('fetchExistingBtn').addEventListener('click', () => {
    fetchExistingPOIs(map, appState);
  });

  // Upload POI
  document.getElementById('uploadPoiBtn').addEventListener('click', () => {
    uploadPOI(map);
  });
}

// =======================================================
// OAuth 2.0 PKCE Flow
// =======================================================

function startOAuthFlow() {
  const cfg = window.WAYMARK_CONFIG;
  const clientId = cfg.OSM_CLIENT_ID;
  const redirectUri = cfg.REDIRECT_URI;
  const scope = cfg.OAUTH_SCOPE;

  // Generate PKCE
  const codeVerifier = generateRandomString(128);
  const codeChallenge = base64URLEncode(sha256(codeVerifier));

  sessionStorage.setItem('pkce_code_verifier', codeVerifier);

  const authUrl = `${cfg.OSM_API_URL}/oauth2/authorize?` +
    `response_type=code&` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `code_challenge=${codeChallenge}&` +
    `code_challenge_method=S256`;

  window.location.href = authUrl;
}

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  for (let i = 0; i < length; i++) {
    result += chars[values[i] % chars.length];
  }
  return result;
}

function base64URLEncode(arrayBuffer) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sha256(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  return await crypto.subtle.digest('SHA-256', data);
}

// Expose for callback.html
window.handleOAuthCallback = async function (code) {
  const cfg = window.WAYMARK_CONFIG;
  const codeVerifier = sessionStorage.getItem('pkce_code_verifier');

  if (!codeVerifier) {
    console.error('PKCE verifier not found');
    return;
  }

  const response = await fetch(cfg.OSM_API_URL + '/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: cfg.REDIRECT_URI,
      client_id: cfg.OSM_CLIENT_ID,
      code_verifier: codeVerifier,
    }),
  });

  const data = await response.json();

  if (data.access_token) {
    sessionStorage.setItem('osm_access_token', data.access_token);

    // Get username
    const userRes = await fetch(cfg.OSM_API_URL + '/api/0.6/user/details.json', {
      headers: { 'Authorization': 'Bearer ' + data.access_token },
    });
    const userData = await userRes.json();
    const username = userData.user?.display_name || 'User';
    sessionStorage.setItem('osm_username', username);

    // Clean up
    sessionStorage.removeItem('pkce_code_verifier');

    // Redirect back to app
    window.location.href = cfg.REDIRECT_URI.replace('/callback.html', '/app.html');
  }
};

// =======================================================
// Fetch Existing POIs (Fix #13: Click to load tags)
// =======================================================

async function fetchExistingPOIs(map, appState) {
  const isEl = getCurrentLang() === 'el';

  // Clear previous markers
  osmEditorState.editingMarkers.forEach(m => map.removeLayer(m));
  osmEditorState.editingMarkers = [];

  const bounds = map.getBounds();
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  const query = `
    [out:json][timeout:25];
    (
      node(${sw.lat},${sw.lon},${ne.lat},${ne.lon});
    );
    out body 50;
  `.trim();

  try {
    const response = await fetch(`${WAYMARK_CONFIG.OVERPASS_URL}?data=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Overpass error');
    const data = await response.json();

    data.elements.forEach(el => {
      if (!el.lat || !el.lon) return;
      if (!el.tags || Object.keys(el.tags).length === 0) return;

      const marker = L.circleMarker([el.lat, el.lon], {
        radius: 8,
        fillColor: '#6d4aff',
        color: 'white',
        weight: 2,
        fillOpacity: 0.8,
      }).addTo(map);

      marker.osmData = el;

      // Fix #13: Load tags into editor when clicked
      marker.on('click', () => {
        loadTagsIntoEditor(el);
      });

      marker.bindPopup(`
        <div style="min-width: 180px;">
          <strong>${el.tags?.name || '(unnamed)'}</strong><br>
          <small style="color: var(--fg-muted)">${el.lat.toFixed(5)}, ${el.lon.toFixed(5)}</small><br>
          <small>${Object.keys(el.tags).length} tags</small>
        </div>
      `);

      osmEditorState.editingMarkers.push(marker);
    });

  } catch (err) {
    console.error('Fetch POIs error:', err);
    alert(isEl ? 'Σφάλμα φόρτωσης POIs.' : 'Error loading POIs.');
  }
}

// Fix #13: Load existing POI tags into the editor form
function loadTagsIntoEditor(el) {
  const isEl = getCurrentLang() === 'el';

  osmEditorState.editingPoi = el;
  osmEditorState.pendingLat = el.lat;
  osmEditorState.pendingLon = el.lon;

  const tags = el.tags || {};

  // Find the "main" tag (first non-name, non-addr tag)
  const skipKeys = ['name', 'source', 'created_by', 'check_date'];
  let mainKey = null;
  let mainVal = null;

  for (const [k, v] of Object.entries(tags)) {
    if (!skipKeys.includes(k)) {
      mainKey = k;
      mainVal = v;
      break;
    }
  }

  // Fill main tag fields
  document.getElementById('osmTagKey').value = mainKey || '';
  document.getElementById('osmTagValue').value = mainVal || '';
  document.getElementById('osmTagName').value = tags.name || '';

  // Update autocomplete for value
  if (mainKey && OSM_TAG_PRESETS[mainKey]) {
    const valueList = document.getElementById('tagValueList');
    valueList.innerHTML = OSM_TAG_PRESETS[mainKey].map(v => `<option value="${v}">`).join('');
  }

  // Fill extra tags
  const extraList = document.getElementById('extraTagsList');
  extraList.innerHTML = '';

  Object.entries(tags).forEach(([k, v]) => {
    if (k === mainKey || k === 'name' || k === 'source' || k === 'created_by') return;

    const row = document.createElement('div');
    row.style.cssText = 'display: flex; gap: 0.3rem; margin-bottom: 0.3rem;';
    row.innerHTML = `
      <input type="text" value="${escapeAttr(k)}" class="extra-tag-key" style="flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; color: var(--fg); padding: 0.4rem; font-size: 0.8rem;">
      <input type="text" value="${escapeAttr(v)}" class="extra-tag-val" style="flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; color: var(--fg); padding: 0.4rem; font-size: 0.8rem;">
      <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()" style="width: auto; padding: 0.3rem 0.5rem;">✕</button>
    `;
    extraList.appendChild(row);
  });

  // Show a notification
  const status = document.getElementById('loginStatus');
  const originalText = status.textContent;
  status.textContent = isEl
    ? `📝 Φορτώθηκε POI #${el.id} — ενημέρωσε και ανέβασε`
    : `📝 Loaded POI #${el.id} — update and upload`;
  setTimeout(() => { status.textContent = originalText; }, 3000);
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// =======================================================
// Upload POI
// =======================================================

async function uploadPOI(map) {
  const isEl = getCurrentLang() === 'el';
  const token = sessionStorage.getItem('osm_access_token');

  if (!token) {
    alert(isEl ? 'Πρέπει να συνδεθείς πρώτα.' : 'You must log in first.');
    return;
  }

  const tagKey = document.getElementById('osmTagKey').value.trim();
  const tagValue = document.getElementById('osmTagValue').value.trim();
  const tagName = document.getElementById('osmTagName').value.trim();

  if (!tagKey || !tagValue) {
    alert(isEl ? 'Συμπλήρωσε τουλάχιστον ένα tag (key + value).' : 'Fill in at least one tag (key + value).');
    return;
  }

  // Collect all tags
  const tags = {};
  tags[tagKey] = tagValue;
  if (tagName) tags.name = tagName;

  document.querySelectorAll('#extraTagsList > div').forEach(row => {
    const k = row.querySelector('.extra-tag-key')?.value.trim();
    const v = row.querySelector('.extra-tag-val')?.value.trim();
    if (k && v) tags[k] = v;
  });

  // Determine coordinates
  let lat, lon;
  let isEdit = !!osmEditorState.editingPoi;

  if (isEdit) {
    lat = osmEditorState.pendingLat;
    lon = osmEditorState.pendingLon;
  } else {
    lat = osmEditorState.pendingLat || map.getCenter().lat;
    lon = osmEditorState.pendingLon || map.getCenter().lng;
  }

  // Build changeset XML
  const changesetTags = Object.entries(tags).map(([k, v]) =>
    `      <tag k="${escapeAttr(k)}" v="${escapeAttr(v)}"/>`
  ).join('\n');

  const elementType = isEdit ? 'modify' : 'create';
  const nodeId = isEdit ? osmEditorState.editingPoi.id : '-1';
  const versionAttr = isEdit ? ` version="${osmEditorState.editingPoi.version || 1}"` : '';

  const oscXml = `<?xml version="1.0" encoding="UTF-8"?>
<osmChange version="0.6" generator="Waymark">
  <${elementType}>
    <node id="${nodeId}" lat="${lat}" lon="${lon}"${versionAttr}>
${changesetTags}
    </node>
  </${elementType}>
</osmChange>`;

  // Upload via proxy
  const proxyUrl = WAYMARK_CONFIG.PROXY_URL;

  try {
    // Step 1: Create changeset
    const changesetXml = `<osm>
  <changeset>
    <tag k="created_by" v="Waymark"/>
    <tag k="comment" v="Waymark ${elementType}"/>
  </changeset>
</osm>`;

    const csResponse = await fetch(proxyUrl + '/changeset/create', {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/xml',
      },
      body: changesetXml,
    });

    if (!csResponse.ok) throw new Error('Changeset creation failed');
    const changesetId = (await csResponse.text()).trim();

    // Step 2: Upload changeset data
    const dataResponse = await fetch(`${proxyUrl}/changeset/${changesetId}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/xml',
      },
      body: oscXml.replace('<osmChange', `<osmChange`),
    });

    if (!dataResponse.ok) throw new Error('Upload failed');

    // Step 3: Close changeset
    await fetch(`${proxyUrl}/changeset/${changesetId}/close`, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + token,
      },
    });

    alert(isEl ? `✅ Επιτυχία! Changeset #${changesetId}` : `✅ Success! Changeset #${changesetId}`);

    // Reset editor
    osmEditorState.editingPoi = null;
    document.getElementById('osmTagKey').value = '';
    document.getElementById('osmTagValue').value = '';
    document.getElementById('osmTagName').value = '';
    document.getElementById('extraTagsList').innerHTML = '';

  } catch (err) {
    console.error('Upload error:', err);
    alert(isEl ? 'Σφάλμα ανεβάσματος.' : 'Upload error.');
  }
}

// Handle map clicks for new POI creation
appState_onMapClick_osmEditor = function (lat, lng) {
  const isEl = getCurrentLang() === 'el';

  osmEditorState.pendingLat = lat;
  osmEditorState.pendingLon = lng;
  osmEditorState.editingPoi = null; // New POI

  const status = document.getElementById('loginStatus');
  if (status) {
    status.textContent = isEl
      ? `📍 Νέο POI: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
      : `📍 New POI: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
};

// Make available globally for app.js click routing
window.appState_onMapClick_osmEditor = appState_onMapClick_osmEditor;

// Cleanup
window._osm_editorCleanup = function () {
  if (window.appStateRef?.map) {
    osmEditorState.editingMarkers.forEach(m => window.appStateRef.map.removeLayer(m));
  }
  osmEditorState.editingMarkers = [];
  osmEditorState.editingPoi = null;
};

window.initOsmEditor = initOsmEditor;