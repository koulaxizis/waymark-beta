/* =========================================================
   WAYMARK — GPX Editor Module
   Import, edit, simplify, and export GPX tracks.
   ========================================================= */

var gpxEditorState = {
  trackPoints: [],
  polyline: null,
  markers: [],
  fileName: '',
};

function getGpxMap() { return window.appState ? window.appState.map : null; }

function initGpxEditor(map, container, appState) {
  renderGpxEditorUI(container);
  window.onMapClick_gpxEditor = function (lat, lng) {
    addGpxPoint(lat, lng);
  };
}

function renderGpxEditorUI(container) {
  var isEl = getCurrentLang() === 'el';

  container.innerHTML =
    '<div class="gpx-editor-ui">' +
    '  <div class="form-group"><label>' + (isEl ? 'Εισαγωγή GPX:' : 'Import GPX:') + '</label>' +
    '    <input type="file" id="geFileInput" accept=".gpx,application/gpx+xml,text/xml" class="form-control">' +
    '  </div>' +
    '  <button id="geDownloadBtn" class="btn btn-primary" disabled>📥 ' + (isEl ? 'Κατέβασμα GPX' : 'Download GPX') + '</button>' +
    '  <button id="geSimplifyBtn" class="btn btn-secondary btn-sm" disabled>✂️ ' + (isEl ? 'Απλοποίηση' : 'Simplify') + '</button>' +
    '  <button id="geReverseBtn" class="btn btn-secondary btn-sm" disabled>🔄 ' + (isEl ? 'Αναστροφή' : 'Reverse') + '</button>' +
    '  <button id="geClearBtn" class="btn btn-danger">🗑️ ' + (isEl ? 'Καθαρισμός' : 'Clear') + '</button>' +
    '  <hr>' +
    '  <div id="geInfo" class="note-description">' + (isEl ? 'Κανένα αρχείο φορτωμένο' : 'No file loaded') + '</div>' +
    '  <div class="note-description">' + (isEl ? 'Κάνε κλικ στον χάρτη για χειροκίνητη προσθήκη σημείων' : 'Click on map to manually add points') + '</div>' +
    '</div>';

  var fileInput = document.getElementById('geFileInput');
  var downloadBtn = document.getElementById('geDownloadBtn');
  var simplifyBtn = document.getElementById('geSimplifyBtn');
  var reverseBtn = document.getElementById('geReverseBtn');
  var clearBtn = document.getElementById('geClearBtn');

  if (fileInput) fileInput.addEventListener('change', importGPX);
  if (downloadBtn) downloadBtn.addEventListener('click', downloadGPXFile);
  if (simplifyBtn) simplifyBtn.addEventListener('click', simplifyTrack);
  if (reverseBtn) reverseBtn.addEventListener('click', reverseTrack);
  if (clearBtn) clearBtn.addEventListener('click', clearGpxEditor);
}

function importGPX(event) {
  var file = event.target.files[0];
  if (!file) return;

  var isEl = getCurrentLang() === 'el';
  gpxEditorState.fileName = file.name.replace(/\.gpx$/i, '');

  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var text = e.target.result;
      var parser = new DOMParser();
      var xmlDoc = parser.parseFromString(text, 'text/xml');

      var trkpts = xmlDoc.querySelectorAll('trkpt');
      var points = [];

      trkpts.forEach(function (pt) {
        var lat = parseFloat(pt.getAttribute('lat'));
        var lon = parseFloat(pt.getAttribute('lon'));
        if (!isNaN(lat) && !isNaN(lon)) {
          points.push([lat, lon]);
        }
      });

      if (points.length === 0) {
        alert(isEl ? 'Δεν βρέθηκαν σημεία στο GPX' : 'No track points found in GPX');
        return;
      }

      gpxEditorState.trackPoints = points;
      renderGpxPolyline();
      updateGpxInfo(points.length);

      var map = getGpxMap();
      if (map) {
        map.fitBounds(points, { padding: [50, 50] });
      }

      var dlBtn = document.getElementById('geDownloadBtn');
      var simpBtn = document.getElementById('geSimplifyBtn');
      var revBtn = document.getElementById('geReverseBtn');
      if (dlBtn) dlBtn.disabled = false;
      if (simpBtn) simpBtn.disabled = false;
      if (revBtn) revBtn.disabled = false;

    } catch (err) {
      alert((isEl ? 'Σφάλμα ανάγνωσης GPX: ' : 'GPX parse error: ') + err.message);
    }
  };
  reader.readAsText(file);
}

function addGpxPoint(lat, lng) {
  gpxEditorState.trackPoints.push([lat, lng]);
  renderGpxPolyline();
  updateGpxInfo(gpxEditorState.trackPoints.length);

  var dlBtn = document.getElementById('geDownloadBtn');
  var simpBtn = document.getElementById('geSimplifyBtn');
  var revBtn = document.getElementById('geReverseBtn');
  if (dlBtn) dlBtn.disabled = false;
  if (simpBtn) simpBtn.disabled = false;
  if (revBtn) revBtn.disabled = false;
}

function renderGpxPolyline() {
  var map = getGpxMap();
  if (!map) return;

  if (gpxEditorState.polyline) {
    map.removeLayer(gpxEditorState.polyline);
    gpxEditorState.polyline = null;
  }

  if (gpxEditorState.trackPoints.length >= 2) {
    gpxEditorState.polyline = L.polyline(gpxEditorState.trackPoints, {
      color: '#6d4aff',
      weight: 3,
      opacity: 0.8,
    }).addTo(map);
  } else if (gpxEditorState.trackPoints.length === 1) {
    gpxEditorState.polyline = L.circleMarker(gpxEditorState.trackPoints[0], {
      radius: 6,
      fillColor: '#6d4aff',
      color: 'white',
      weight: 1,
      fillOpacity: 0.8,
    }).addTo(map);
  }
}

function updateGpxInfo(count) {
  var isEl = getCurrentLang() === 'el';
  var info = document.getElementById('geInfo');
  if (!info) return;
  if (count === 0) {
    info.textContent = isEl ? 'Κανένα αρχείο φορτωμένο' : 'No file loaded';
  } else {
    info.textContent = isEl ? count + ' σημεία' : count + ' points';
  }
}

function downloadGPXFile() {
  if (gpxEditorState.trackPoints.length === 0) return;

  var isEl = getCurrentLang() === 'el';
  var now = new Date().toISOString();

  var trkpts = gpxEditorState.trackPoints.map(function (pt) {
    return '      <trkpt lat="' + pt[0] + '" lon="' + pt[1] + '"><ele>0</ele><time>' + now + '</time></trkpt>';
  }).join('\n');

  var gpx = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<gpx version="1.1" creator="Waymark" xmlns="http://www.topografix.com/GPX/1/1">\n' +
    '  <metadata><name>' + escapeXml(gpxEditorState.fileName || 'Waymark Track') + '</name><time>' + now + '</time></metadata>\n' +
    '  <trk><name>' + escapeXml(gpxEditorState.fileName || 'Waymark Track') + '</name>\n' +
    '    <trkseg>\n' + trkpts + '\n    </trkseg>\n  </trk>\n</gpx>';

  downloadFile(gpx, (gpxEditorState.fileName || 'waymark-track') + '.gpx', 'application/gpx+xml');
  showNotification(isEl ? 'GPX κατέβηκε!' : 'GPX downloaded!', 'success');
}

function simplifyTrack() {
  if (gpxEditorState.trackPoints.length < 3) return;

  var tolerance = 0.0001;
  var simplified = douglasPeucker(gpxEditorState.trackPoints, tolerance);

  gpxEditorState.trackPoints = simplified;
  renderGpxPolyline();
  updateGpxInfo(gpxEditorState.trackPoints.length);
}

function douglasPeucker(points, epsilon) {
  if (points.length <= 2) return points;

  var dmax = 0;
  var index = 0;
  var end = points.length - 1;

  for (var i = 1; i < end; i++) {
    var d = perpDist(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    var left = douglasPeucker(points.slice(0, index + 1), epsilon);
    var right = douglasPeucker(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  } else {
    return [points[0], points[end]];
  }
}

function perpDist(point, lineStart, lineEnd) {
  var dx = lineEnd[0] - lineStart[0];
  var dy = lineEnd[1] - lineStart[1];
  var numerator = Math.abs(
    dy * point[0] - dx * point[1] + lineEnd[0] * lineStart[1] - lineEnd[1] * lineStart[0]
  );
  var denominator = Math.sqrt(dx * dx + dy * dy);
  return denominator === 0 ? 0 : numerator / denominator;
}

function reverseTrack() {
  gpxEditorState.trackPoints.reverse();
  renderGpxPolyline();
}

function clearGpxEditor() {
  var map = getGpxMap();

  if (gpxEditorState.polyline && map) {
    map.removeLayer(gpxEditorState.polyline);
  }
  gpxEditorState.trackPoints = [];
  gpxEditorState.polyline = null;
  gpxEditorState.fileName = '';

  var fileInput = document.getElementById('geFileInput');
  var dlBtn = document.getElementById('geDownloadBtn');
  var simpBtn = document.getElementById('geSimplifyBtn');
  var revBtn = document.getElementById('geReverseBtn');

  if (fileInput) fileInput.value = '';
  if (dlBtn) dlBtn.disabled = true;
  if (simpBtn) simpBtn.disabled = true;
  if (revBtn) revBtn.disabled = true;
  updateGpxInfo(0);
}

function _gpxEditorCleanup() {
  delete window.onMapClick_gpxEditor;
  var map = getGpxMap();
  if (map && gpxEditorState.polyline) {
    map.removeLayer(gpxEditorState.polyline);
  }
  gpxEditorState = { trackPoints: [], polyline: null, markers: [], fileName: '' };
}

window._gpxEditorCleanup = _gpxEditorCleanup;