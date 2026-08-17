/* =========================================================
   WAYMARK — Building Editor Module
   Draw building footprints and upload to OSM.
   ========================================================= */

let buildingEditorState = {
  points: [],
  polygon: null,
  markers: [],
  isLoading: false,
};

function initBuildingEditor(map, container, appState) {
  renderBuildingEditorUI(container);
  checkBuildingLoginStatus();

  function handleMapClick(lat, lng) {
    if (!isLoggedInBuilding()) {
      showNotification(getCurrentLang() === 'el' ? 'Σύνδεσε πρώτα!' : 'Please login first!', 'warning');
      return;
    }
    addBuildingPoint(lat, lng);
  }

  window.onMapClick_buildingEditor = handleMapClick;
}

function renderBuildingEditorUI(container) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
    <div class="building-editor-ui">
      <div id="beLoginBadge" class="login-badge">
        ${isEl ? '❌ Όχι συνδεδεμένος' : '❌ Not logged in'}
      </div>

      <button id="beLoginBtn" class="btn btn-success">
        🔑 ${isEl ? 'Σύνδεση με OSM' : 'Login with OSM'}
      </button>

      <hr>

      <h3>${isEl ? 'Σχεδιασμός Κτηρίου' : 'Draw Building'}</h3>
      <div class="form-group">
        <label>${isEl ? 'Τύπος κτηρίου:' : 'Building type:'}</label>
        <select id="beBuildingType" class="form-control">
          <option value="yes">Yes (generic)</option>
          <option value="apartments">Apartments</option>
          <option value="house">House</option>
          <option value="detached">Detached</option>
          <option value="commercial">Commercial</option>
          <option value="industrial">Industrial</option>
          <option value="warehouse">Warehouse</option>
          <option value="garage">Garage</option>
          <option value="shed">Shed</option>
          <option value="roof">Roof</option>
          <option value="construction">Construction</option>
        </select>
      </div>

      <div class="form-group">
        <label>${isEl ? 'Επίπεδα:' : 'Levels:'}</label>
        <input type="number" id="beLevels" class="form-control" min="1" value="1">
      </div>

      <div class="form-group">
        <label>${isEl ? 'Όνομα (προαιρετικό):' : 'Name (optional):'}</label>
        <input type="text" id="beName" class="form-control" placeholder="">
      </div>

      <button id="beUndoPointBtn" class="btn btn-secondary btn-sm">⬅️ ${isEl ? 'Αναίρεση' : 'Undo'}</button>
      <button id="beFinishBtn" class="btn btn-success">✅ ${isEl ? 'Ολοκλήρωση' : 'Finish'}</button>
      <button id="beUploadBtn" class="btn btn-success" disabled>
        📤 ${isEl ? 'Ανέβασμα στο OSM' : 'Upload to OSM'}
      </button>
      <button id="beClearBtn" class="btn btn-danger">🗑️ ${isEl ? 'Καθαρισμός' : 'Clear'}</button>

      <hr>

      <p id="bePointCount" class="note-description">${isEl ? '0 σημεία' : '0 points'}</p>
    </div>
  `;

  document.getElementById('beLoginBtn').addEventListener('click', initiateOAuthLogin);
  document.getElementById('beUndoPointBtn').addEventListener('click', undoLastPoint);
  document.getElementById('beFinishBtn').addEventListener('click', finishBuilding);
  document.getElementById('beUploadBtn').addEventListener('click', uploadBuilding);
  document.getElementById('beClearBtn').addEventListener('click', clearBuilding);
}

function checkBuildingLoginStatus() {
  const badge = document.getElementById('beLoginBadge');
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

function isLoggedInBuilding() {
  return !!sessionStorage.getItem('osm_access_token');
}

function initiateOAuthLogin() {
  if (typeof window.initiateOAuth === 'function') {
    window.initiateOAuth();
  } else {
    alert(getCurrentLang() === 'el' ? 'OSM Editor module required for login' : 'OSM Editor module required for login');
  }
}

function addBuildingPoint(lat, lng) {
  buildingEditorState.points.push([lat, lng]);

  const marker = L.circleMarker([lat, lng], {
    radius: 4,
    fillColor: '#6d4aff',
    color: 'white',
    weight: 1,
    fillOpacity: 0.9,
  }).addTo(window.appState.map);

  buildingEditorState.markers.push(marker);

  updateBuildingPolygon();
  updatePointCount();
}

function undoLastPoint() {
  if (buildingEditorState.points.length === 0) return;

  buildingEditorState.points.pop();
  const lastMarker = buildingEditorState.markers.pop();
  if (lastMarker) window.appState.map.removeLayer(lastMarker);

  updateBuildingPolygon();
  updatePointCount();
}

function updateBuildingPolygon() {
  if (buildingEditorState.polygon) {
    window.appState.map.removeLayer(buildingEditorState.polygon);
    buildingEditorState.polygon = null;
  }

  if (buildingEditorState.points.length >= 2) {
    buildingEditorState.polygon = L.polygon(buildingEditorState.points, {
      color: '#6d4aff',
      weight: 2,
      fillColor: '#6d4aff',
      fillOpacity: 0.2,
    }).addTo(window.appState.map);
  }

  document.getElementById('beFinishBtn').disabled = buildingEditorState.points.length < 3;
  document.getElementById('beUploadBtn').disabled = true;
}

function finishBuilding() {
  if (buildingEditorState.points.length < 3) return;

  if (buildingEditorState.polygon) {
    buildingEditorState.polygon.setStyle({
      color: '#22c55e',
      fillColor: '#22c55e',
    });
  }

  document.getElementById('beUploadBtn').disabled = !isLoggedInBuilding();
}

function updatePointCount() {
  const isEl = getCurrentLang() === 'el';
  const count = buildingEditorState.points.length;
  document.getElementById('bePointCount').textContent =
    isEl ? `${count} σημεία` : `${count} points`;
}

async function uploadBuilding() {
  if (!isLoggedInBuilding()) {
    alert(getCurrentLang() === 'el' ? 'Σύνδεσε πρώτα!' : 'Please login first!');
    return;
  }

  if (buildingEditorState.points.length < 3) return;

  const isEl = getCurrentLang() === 'el';
  const comment = prompt(isEl ? 'Σχόλιο changeset:' : 'Changeset comment:', 'Added building via Waymark');
  if (!comment) return;

  const token = sessionStorage.getItem('osm_access_token');
  const buildingType = document.getElementById('beBuildingType').value;
  const levels = document.getElementById('beLevels').value;
  const name = document.getElementById('beName').value.trim();

  const oscXml = buildBuildingOsc(buildingEditorState.points, buildingType, levels, name);
  const result = await uploadOSC(token, oscXml);

  if (result.success) {
    alert(isEl ? '✅ Το κτήριο ανέβηκε!' : '✅ Building uploaded!');
    clearBuilding();
  } else {
    alert(isEl ? 'Αποτυχία: ' + result.error : 'Failed: ' + result.error);
  }
}

function buildBuildingOsc(points, buildingType, levels, name) {
  const ndRefs = points.map((_, i) => `      <nd ref="-${i + 1}"/>`).join('\n');

  const nodeTags = '';
  const tagLines = [`      <tag k="building" v="${escapeXml(buildingType)}"/>`];
  if (levels && levels > 1) tagLines.push(`      <tag k="building:levels" v="${escapeXml(levels)}"/>`);
  if (name) tagLines.push(`      <tag k="name" v="${escapeXml(name)}"/>`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<osmChange version="0.6" generator="Waymark">
  <create>
${points.map((pt, i) => `    <node id="-${i + 1}" lat="${pt[0]}" lon="${pt[1]}" version="1"/>`).join('\n')}
    <way id="-1" version="1">
${ndRefs}
      <nd ref="-1"/>
${tagLines.join('\n')}
    </way>
  </create>
</osmChange>`;
}

function clearBuilding() {
  buildingEditorState.markers.forEach(m => window.appState.map.removeLayer(m));
  if (buildingEditorState.polygon) window.appState.map.removeLayer(buildingEditorState.polygon);
  buildingEditorState.points = [];
  buildingEditorState.markers = [];
  buildingEditorState.polygon = null;
  updateBuildingPolygon();
  updatePointCount();
  document.getElementById('beUploadBtn').disabled = true;
}

function _buildingEditorCleanup() {
  delete window.onMapClick_buildingEditor;
  if (window.appState?.map) {
    buildingEditorState.markers.forEach(m => window.appState.map.removeLayer(m));
    if (buildingEditorState.polygon) window.appState.map.removeLayer(buildingEditorState.polygon);
  }
  buildingEditorState = { points: [], polygon: null, markers: [], isLoading: false };
}

window._buildingEditorCleanup = _buildingEditorCleanup;