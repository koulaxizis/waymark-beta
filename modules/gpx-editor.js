/* =========================================================
   WAYMARK — GPX Editor Module
   Import, edit, simplify, and export GPX tracks.
   ========================================================= */

let gpxEditorState = {
  trackPoints: [],
  polyline: null,
  markers: [],
  fileName: '',
};

function initGpxEditor(map, container, appState) {
  renderGpxEditorUI(container);

  function handleMapClick(lat, lng) {
    addGpxPoint(lat, lng);
  }

  window.onMapClick_gpxEditor = handleMapClick;
}

function renderGpxEditorUI(container) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
    <div class="gpx-editor-ui">
      <div class="form-group">
        <label>${isEl ? 'Εισαγωγή GPX:' : 'Import GPX:'}</label>
        <input type="file" id="geFileInput" accept=".gpx,application/gpx+xml,text/xml" class="form-control">
      </div>

      <button id="geDownloadBtn" class="btn btn-primary" disabled>
        📥 ${isEl ? 'Κατέβασμα GPX' : 'Download GPX'}
      </button>

      <button id="geSimplifyBtn" class="btn btn-secondary btn-sm" disabled>
        ✂️ ${isEl ? 'Απλοποίηση' : 'Simplify'}
      </button>

      <button id="geReverseBtn" class="btn btn-secondary btn-sm" disabled>
        🔄 ${isEl ? 'Αναστροφή' : 'Reverse'}
      </button>

      <button id="geClearBtn" class="btn btn-danger">🗑️ ${isEl ? 'Καθαρισμός' : 'Clear'}</button>

      <hr>

      <p id="geInfo" class="note-description">${isEl ? 'Κανένα αρχείο φορτωμένο' : 'No file loaded'}</p>

      <div id="geManualHint" class="note-description" style="display:none;">
        ${isEl ? 'Κάνε κλικ στον χάρτη για χειροκίνητη προσθήκη σημείων' : 'Click on map to manually add points'}
      </div>
    </div>
  `;

  document.getElementById('geFileInput').addEventListener('change', importGPX);
  document.getElementById('geDownloadBtn').addEventListener('click', downloadGPXFile);
  document.getElementById('geSimplifyBtn').addEventListener('click', simplifyTrack);
  document.getElementById('geReverseBtn').addEventListener('click', reverseTrack);
  document.getElementById('geClearBtn').addEventListener('click', clearGpxEditor);
}

function importGPX(event) {
  const file = event.target.files[0];
  if (!file) return;

  const isEl = getCurrentLang() === 'el';
  gpxEditorState.fileName = file.name.replace(/\.gpx$/i, '');

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target.result;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');

      const trkpts = xmlDoc.querySelectorAll('trkpt');
      const points = [];

      trkpts.forEach(pt => {
        const lat = parseFloat(pt.getAttribute('lat'));
        const lon = parseFloat(pt.getAttribute('lon'));
        if (!isNaN(lat) && !isNaN(lon)) {
          points.push([lat, lon]);
        }
      });

      if (points.length === 0) {
        alert(isEl ? 'Δεν βρέθηκαν σημεία στο GPX' : 'No track points found in GPX');
        return;
      }

      gpxEditorState.trackPoints = points;
      renderPolyline();
      updateInfo(points.length);

      document.getElementById('geDownloadBtn').disabled = false;
      document.getElementById('geSimplifyBtn').disabled = false;
      document.getElementById('geReverseBtn').disabled = false;

      // Fit map to track bounds
      if (window.appState?.map) {
        window.appState.map.fitBounds(points, { padding: [50, 50] });
      }

    } catch (err) {
      alert(isEl ? 'Σφάλμα ανάγνωσης GPX: ' + err.message : 'GPX parse error: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function addGpxPoint(lat, lng) {
  gpxEditorState.trackPoints.push([lat, lng]);
  renderPolyline();
  updateInfo(gpxEditorState.trackPoints.length);

  document.getElementById('geDownloadBtn').disabled = false;
  document.getElementById('geSimplifyBtn').disabled = false;
  document.getElementById('geReverseBtn').disabled = false;
}

function renderPolyline() {
  if (gpxEditorState.polyline) {
    window.appState.map.removeLayer(gpxEditorState.polyline);
  }

  if (gpxEditorState.trackPoints.length >= 2) {
    gpxEditorState.polyline = L.polyline(gpxEditorState.trackPoints, {
      color: '#6d4aff',
      weight: 3,
      opacity: 0.8,
    }).addTo(window.appState.map);
  } else if (gpxEditorState.trackPoints.length === 1) {
    // Single point: show a marker
    gpxEditorState.polyline = L.circleMarker(gpxEditorState.trackPoints[0], {
      radius: 6,
      fillColor: '#6d4aff',
      color: 'white',
      weight: 1,
      fillOpacity: 0.8,
    }).addTo(window.appState.map);
  }

  updateInfo(gpxEditorState.trackPoints.length);
}

function updateInfo(count) {
  const isEl = getCurrentLang() === 'el';
  const info = document.getElementById('geInfo');
  if (count === 0) {
    info.textContent = isEl ? 'Κανένα αρχείο φορτωμένο' : 'No file loaded';
  } else {
    info.textContent = isEl ? `${count} σημεία` : `${count} points`;
  }
}

function downloadGPXFile() {
  if (gpxEditorState.trackPoints.length === 0) return;

  const isEl = getCurrentLang() === 'el';
  const trkpts = gpxEditorState.trackPoints.map(pt => {
    return `      <trkpt lat="${pt[0]}" lon="${pt[1]}"><ele>0</ele><time>${new Date().toISOString()}</time></trkpt>`;
  }).join('\n');

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Waymark" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(gpxEditorState.fileName || 'Waymark Track')}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${escapeXml(gpxEditorState.fileName || 'Waymark Track')}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;

  downloadFile(gpx, `${gpxEditorState.fileName || 'waymark-track'}.gpx`, 'application/gpx+xml');
  showNotification(isEl ? 'GPX κατέβηκε!' : 'GPX downloaded!', 'success');
}

function simplifyTrack() {
  if (gpxEditorState.trackPoints.length < 3) return;

  // Douglas-Peucker simplification
  const tolerance = 0.0001;
  const simplified = douglasPeucker(gpxEditorState.trackPoints, tolerance);

  gpxEditorState.trackPoints = simplified;
  renderPolyline();
}

function douglasPeucker(points, epsilon) {
  if (points.length <= 2) return points;

  let dmax = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    const left = douglasPeucker(points.slice(0, index + 1), epsilon);
    const right = douglasPeucker(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  } else {
    return [points[0], points[end]];
  }
}

function perpendicularDistance(point, lineStart, lineEnd) {
  const dx = lineEnd[0] - lineStart[0];
  const dy =  distance_start[1];
  const numerator = Math.abs(dy * point[0] - dx * point[1] + lineEnd[0] * lineStart[1] - lineEnd[1] * lineStart[0]);
  const denominator = Math.sqrt(dx * dx + dy * dy);
  return denominator === 0 ? 0 : numerator / denominator;
}

function reverseTrack() {
  gpxEditorState.trackPoints.reverse();
  renderPolyline();
}

function clearGpxEditor() {
  if (gpxEditorState.polyline) {
    window.appState.map.removeLayer(gpxEditorState.polyline);
  }
  gpxEditorState.trackPoints = [];
  gpxEditorState.polyline = null;
  gpxEditorState.fileName = '';

  document.getElementById('geFileInput').value = '';
  document.getElementById('geDownloadBtn').disabled = true;
  document.getElementById('geSimplifyBtn').disabled = true;
  document.getElementById('ge interpolatedBtn')?.disabled = true;
  document.getElementById('geReverseBtn').disabled = true;
  updateInfo(0);
}

function _gpxEditorCleanup() {
  delete window.onMapClick_gpxEditor;
  if (window.appState?.map && gpxEditorState.polyline) {
    window.appState.map.removeLayer(gpxEditorState.polyline);
  }
  gpxEditorState = { trackPoints: [], polyline: null, markers: [], fileName: '' };
}

window._gpxEditorCleanup = _gpxEditorCleanup;