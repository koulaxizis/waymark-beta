/* =========================================================
   WAYMARK — Road Editor Module
   Draw road polylines and upload to OSM.
   ========================================================= */

let roadEditorState = {
  points: [],
  polyline: null,
  markers: [],
  isLoading: false,
};

function initRoadEditor(map, container, appState) {
  renderRoadEditorUI(container);
  checkRoadLoginStatus();

  function handleMapClick(lat, lng) {
    if (!isLoggedInRoad()) {
      showNotification(getCurrentLang() === 'el' ? 'Σύνδεσε πρώτα!' : 'Please login first!', 'warning');
      return;
    }
    addRoadPoint(lat, lng);
  }

  window.onMapClick_roadEditor = handleMapClick;
}

function renderRoadEditorUI(container) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
    <div class="road-editor-ui">
      <div id="reLoginBadge" class="login-badge">
        ${isEl ? '❌ Όχι συνδεδεμένος' : '❌ Not logged in'}
      </div>

      <button id="reLoginBtn" class="btn btn-success">
        🔑 ${isEl ? 'Σύνδεση με OSM' : 'Login with OSM'}
      </button>

      <hr>

      <h3>${isEl ? 'Σχεδιασμός Δρόμου' : 'Draw Road'}</h3>
      <div class="form-group">
        <label>${isEl ? 'Τύπος δρόμου:' : 'Road type:'}</label>
        <select id="reRoadType" class="form-control">
          <option value="residential">Residential</option>
          <option value="living_street">Living Street</option>
          <option value="service">Service</option>
          <option value="pedestrian">Pedestrian</option>
          <option value="track">Track</option>
          <option value="unclassified">Unclassified</option>
          <option value="tertiary">Tertiary</option>
          <option value="secondary">Secondary</option>
          <option value="primary">Primary</option>
          <option value="footway">Footway</option>
          <option value="path">Path</option>
          <option value="cycleway">Cycleway</option>
          <option value="steps">Steps</option>
        </select>
      </div>

      <div class="form-group">
        <label>${isEl ? 'Όνομα (προαιρετικό):' : 'Name (optional):'}</label>
        <input type="text" id="reRoadName" class="form-control" placeholder="">
      </div>

      <div class="form-group">
        <label>${isEl ? 'Surface:' : 'Surface:'}</label>
        <select id="reSurface" class="form-control">
          <option value="">${isEl ? '— Μη καθορισμένο —' : '— Unspecified —'}</option>
          <option value="asphalt">Asphalt</option>
          <option value="paved">Paved</option>
          <option value="unpaved">Unpaved</option>
          <option value="gravel">Gravel</option>
          <option value="ground">Ground</option>
          <option value="sand">Sand</option>
          <option value="cobblestone">Cobblestone</option>
          <option value="concrete">Concrete</option>
          <option value="dirt">Dirt</option>
        </select>
      </div>

      <button id="reUndoPointBtn" class="btn btn-secondary btn-sm">⬅️ ${isEl ? 'Αναίρεση' : 'Undo'}</button>
      <button id="reFinishBtn" class="btn btn-success">✅ ${isEl ? 'Ολοκλήρωση' : 'Finish'}</button>
      <button id="reUploadBtn" class="btn btn-success" disabled>
        📤 ${isEl ? 'Ανέβασμα στο OSM' : 'Upload to OSM'}
      </button>
      <button id="reClearBtn" class="btn btn-danger">🗑️ ${isEl ? 'Καθαρισμός' : 'Clear'}</button>

      <hr>

      <p id="rePointCount" class="note-description">${isEl ? '0 σημεία' : '0 points'}</p>
    </div>
  `;

  document.getElementById('reLoginBtn').addEventListener('click', initiateOAuthLogin);
  document.getElementById('reUndoPointBtn').addEventListener('click', undoLastRoadPoint);
  document.getElementById('reFinishBtn').addEventListener('click', finishRoad);
  document.getElementById('reUploadBtn').addEventListener('click', uploadRoad);
  document.getElementById('reClearBtn').addEventListener('click', clearRoad);
}

function checkRoadLoginStatus() {
  const badge = document.getElementById('reLoginBadge');
  if (!badge) return;

  const token = sessionStorage.getItem('osm_access_token');
  if (token) {
    badge.classList.add('active');
    badge.textContent = getCurrentLang() === 'el' ? '✅ Συνδεδεμένος' : '✅ Logged in';
  } else {
    badge.classList.remove('active');
    badge.textContent = getCurrentLang() === 'el' ? '❌ Όχι συνδεδεμένος' : '❌ Not logged in';
  }
}

function isLoggedInRoad() {
  return !!sessionStorage.getItem('osm_access_token');
}

function initiateOAuthLogin() {
  if (typeof window.initiateOAuth === 'function') {
    window.initiateOAuth();
  } else {
    alert(getCurrentLang() === 'el' ? 'OSM Editor module required for login' : 'OSM Editor module required for login');
  }
}

function addRoadPoint(lat, lng) {
  roadEditorState.points.push([lat, lng]);

  const marker = L.circleMarker([lat, lng], {
    radius: 4,
    fillColor: '#6d4aff',
    color: 'white',
    weight: 1,
    fillOpacity: 0.9,
  }).addTo(window.appState.map);

  roadEditorState.markers.push(marker);

  updateRoadPolyline();
  updateRoadPointCount();
}

function undoLastRoadPoint() {
  if (roadEditorState.points.length === 0) return;

  roadEditorState.points.pop();
  const lastMarker = roadEditorState.markers.pop();
  if (lastMarker) window.appState.map.removeLayer(lastMarker);

  updateRoadPolyline();
  updateRoadPointCount();
}

function updateRoadPolyline() {
  if (roadEditorState.polyline) {
    window.appState.map.removeLayer(roadEditorState.polyline);
    roadEditorState.polyline = null;
  }

  if (roadEditorState.points.length >= 2) {
    roadEditorState.polyline = L.polyline(roadEditorState.points, {
      color: '#6d4aff',
      weight: 4,
      opacity: 0.7,
    }).addTo(window.appState.map);
  }

  document.getElementById('reFinishBtn').disabled = roadEditorState.points.length < 2;
  document.getElementById('reUploadBtn').disabled = true;
}

function finishRoad() {
  if (roadEditorState.points.length < 2) return;

  if (roadEditorState.polyline) {
    roadEditorState.polyline.setStyle({
      color: '#22c55e',
    });
  }

  document.getElementById('reUploadBtn').disabled = !isLoggedInRoad();
}

function updateRoadPointCount() {
  const isEl = getCurrentLang() === 'el';
  const count = roadEditorState.points.length;
  document.getElementById('rePointCount').textContent =
    isEl ? `${count} σημεία` : `${count} points`;
}

async function uploadRoad() {
  if (!isLoggedInRoad()) {
    alert(getCurrentLang() === 'el' ? 'Σύνδεσε πρώτα!' : 'Please login first!');
    return;
  }

  if (roadEditorState.points.length < 2) return;

  const isEl = getCurrentLang() === 'el';
  const comment = prompt(isEl ? 'Σχόλιο changeset:' : 'Changeset comment:', 'Added road via Waymark');
  if (!comment) return;

  const token = sessionStorage.getItem('osm_access_token');
  const roadType = document.getElementById('reRoadType').value;
  const roadName = document.getElementById('reRoadName').value.trim();
  const surface = document.getElementById('reSurface').value;

  const oscXml = buildRoadOsc(roadEditorState.points, roadType, roadName, surface);
  const result = await uploadOSC(token, oscXml);

  if (result.success) {
    alert(isEl ? '✅ Ο δρόμος ανέβηκε!' : '✅ Road uploaded!');
    clearRoad();
  } else {
    alert(isEl ? 'Αποτυχία: ' + result.error : 'Failed: ' + result.error);
  }
}

function buildRoadOsc(points, roadType, roadName, surface) {
  const tagLines = [`      <tag k="highway" v="${escapeXml(roadType)}"/>`];
  if (roadName) tagLines.push(`      <tag k="name" v="${escapeXml(roadName)}"/>`);
  if (surface) tagLines.push(`      <tag k="surface" v="${escapeXml(surface)}"/>`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<osmChange version="0.6" generator="Waymark">
  <create>
${points.map((pt, i) => `    <node id="-${i + 1}" lat="${pt[0]}" lon="${pt[1]}" version="1"/>`).join('\n')}
    <way id="-1" version="1">
${points.map((_, i) => `      <nd ref="-${i + 1}"/>`).join('\n')}
${tagLines.join('\n')}
    </way>
  </create>
</osmChange>`;
}

function clearRoad() {
  roadEditorState.markers.forEach(m => window.appState.map.removeLayer(m));
  if (roadEditorState.polyline) window.appState.map.removeLayer(roadEditorState.polyline);
  roadEditorState.points = [];
  roadEditorState.markers = [];
  roadEditorState.polyline = null;
  updateRoadPolyline();
  updateRoadPointCount();
  document.getElementById('reUploadBtn').disabled = true;
}

function _roadEditorCleanup() {
  delete window.onMapClick_roadEditor;
  if (window.appState?.map) {
    roadEditorState.markers.forEach(m => window.appState.map.removeLayer(m));
    if (roadEditorState.polyline) window.appState.map.removeLayer(roadEditorState.polyline);
  }
  roadEditorState = { points: [], polyline: null, markers: [], isLoading: false };
}

window._roadEditorCleanup = _roadEditorCleanup;