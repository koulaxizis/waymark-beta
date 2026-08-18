/* =========================================================
   WAYMARK — Track Recorder Module
   Record GPS tracks from device geolocation and export to GPX.
   ========================================================= */

var trackRecorderState = {
  recording: false,
  trackPoints: [],
  polyline: null,
  watchId: null,
  startTime: null,
  endTime: null,
};

function getTrMap() { return window.appState ? window.appState.map : null; }

function initTrackRecorder(map, container, appState) {
  renderTrackRecorderUI(container);
  window.onMapClick_trackRecorder = function (lat, lng) {};
}

function renderTrackRecorderUI(container) {
  var isEl = getCurrentLang() === 'el';

  container.innerHTML =
    '<div class="track-recorder-ui">' +
    '  <div class="note-description">' + (isEl
      ? 'Καταγράφει ταξίδι με τη χρήση του GPS της συσκευής. Πρέπει να επιτρέψεις πρόσβαση στη γεωτοποθεσία.'
      : 'Records a trip using the device GPS. You must allow geolocation access.') + '</div>' +
    '  <hr>' +
    '  <div id="trStatus" class="note-description" style="text-align:center;font-weight:600;"></div>' +
    '  <div id="trTimer" class="note-description" style="text-align:center;color:var(--accent);"></div>' +
    '  <hr>' +
    '  <button id="trStartBtn" class="btn btn-success">▶️ ' +
    (isEl ? 'Εκκίνηση Καταγραφής' : 'Start Recording') + '</button>' +
    '  <button id="trStopBtn" class="btn btn-danger" style="display:none;">⏹️ ' +
    (isEl ? 'Διακοπή' : 'Stop') + '</button>' +
    '  <button id="trExportBtn" class="btn btn-primary" style="display:none;" disabled>📥 ' +
    (isEl ? 'Εξαγωγή GPX' : 'Export GPX') + '</button>' +
    '  <button id="trClearBtn" class="btn btn-secondary">🗑️ ' +
    (isEl ? 'Καθαρισμός' : 'Clear') + '</button>' +
    '  <hr>' +
    '  <div id="trInfo" class="note-description">' +
    (isEl ? 'Μήκος: 0 m • Σημεία: 0' : 'Length: 0 m • Points: 0') + '</div>' +
    '</div>';

  var startBtn = document.getElementById('trStartBtn');
  var stopBtn = document.getElementById('trStopBtn');
  var exportBtn = document.getElementById('trExportBtn');
  var clearBtn = document.getElementById('trClearBtn');

  if (startBtn) startBtn.addEventListener('click', startRecording);
  if (stopBtn) stopBtn.addEventListener('click', stopRecording);
  if (exportBtn) exportBtn.addEventListener('click', exportGPX);
  if (clearBtn) clearBtn.addEventListener('click', clearTrackRecorder);

  updateTrStatus();
}

function updateTrStatus() {
  var statusEl = document.getElementById('trStatus');
  var isEl = getCurrentLang() === 'el';

  if (trackRecorderState.recording) {
    if (statusEl) statusEl.textContent = isEl ? '🔴 Καταγραφή...' : '🔴 Recording...';
  } else if (trackRecorderState.trackPoints.length > 0) {
    if (statusEl) statusEl.textContent = isEl ? '✅ Καταγεγραμμένο' : '✅ Recorded';
  } else {
    if (statusEl) statusEl.textContent = isEl ? '📍 Έτοιμος' : '📍 Ready';
  }
}

function startRecording() {
  var isEl = getCurrentLang() === 'el';

  if (!navigator.geolocation) {
    alert(isEl ? 'Η γεωτοποθεσία δεν υποστηρίζεται' : 'Geolocation not supported');
    return;
  }

  if (trackRecorderState.recording) return;

  trackRecorderState.recording = true;
  trackRecorderState.startTime = new Date();
  trackRecorderState.trackPoints = [];

  if (trackRecorderState.watchId) {
    navigator.geolocation.clearWatch(trackRecorderState.watchId);
  }

  var options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  };

  trackRecorderState.watchId = navigator.geolocation.watchPosition(
    function (pos) {
      var lat = pos.coords.latitude;
      var lon = pos.coords.longitude;
      var accuracy = pos.coords.accuracy;
      var timestamp = pos.timestamp || Date.now();

      trackRecorderState.trackPoints.push({
        lat: lat,
        lng: lon,
        acc: accuracy,
        time: timestamp,
      });

      updateTrackLine();
      updateTrInfo();
      updateTrTimer();
    },
    function (err) {
      console.error('Geolocation error:', err);
      var msg = isEl ? 'Σφάλμα GPS: ' + err.message : 'GPS Error: ' + err.message;
      showNotification(msg, 'warning');
    },
    options
  );

  updateButtonStates();
  updateTrStatus();
}

function stopRecording() {
  if (!trackRecorderState.recording) return;

  trackRecorderState.recording = false;
  trackRecorderState.endTime = new Date();

  if (trackRecorderState.watchId) {
    navigator.geolocation.clearWatch(trackRecorderState.watchId);
    trackRecorderState.watchId = null;
  }

  var exportBtn = document.getElementById('trExportBtn');
  if (exportBtn) {
    exportBtn.disabled = trackRecorderState.trackPoints.length === 0;
    exportBtn.style.display = 'inline-block';
  }

  updateButtonStates();
  updateTrStatus();
}

function updateButtonStates() {
  var startBtn = document.getElementById('trStartBtn');
  var stopBtn = document.getElementById('trStopBtn');
  var exportBtn = document.getElementById('trExportBtn');

  if (startBtn) startBtn.style.display = trackRecorderState.recording ? 'none' : 'inline-block';
  if (stopBtn) stopBtn.style.display = trackRecorderState.recording ? 'inline-block' : 'none';
  if (exportBtn) {
    exportBtn.style.display = (!trackRecorderState.recording && trackRecorderState.trackPoints.length > 0)
      ? 'inline-block' : 'none';
    exportBtn.disabled = trackRecorderState.trackPoints.length === 0;
  }
}

function updateTrackLine() {
  var map = getTrMap();
  if (!map) return;

  if (trackRecorderState.polyline) {
    map.removeLayer(trackRecorderState.polyline);
    trackRecorderState.polyline = null;
  }

  if (trackRecorderState.trackPoints.length >= 2) {
    var latlngs = trackRecorderState.trackPoints.map(function (p) {
      return [p.lat, p.lng];
    });
    trackRecorderState.polyline = L.polyline(latlngs, {
      color: '#6d4aff',
      weight: 4,
      opacity: 0.8,
    }).addTo(map);

    // Fit bounds if recording started (first point)
    if (trackRecorderState.trackPoints.length === 2) {
      map.fitBounds(trackRecorderState.polyline.getBounds(), { padding: [50, 50] });
    }
  } else if (trackRecorderState.trackPoints.length === 1) {
    var p = trackRecorderState.trackPoints[0];
    trackRecorderState.polyline = L.circleMarker([p.lat, p.lng], {
      radius: 8,
      fillColor: trackRecorderState.recording ? '#ffb143' : '#6d4aff',
      color: 'white',
      weight: 2,
      fillOpacity: 0.8,
    }).addTo(map);
  }
}

function updateTrInfo() {
  var count = trackRecorderState.trackPoints.length;
  var length = calculateTrackDistance(trackRecorderState.trackPoints);
  var isEl = getCurrentLang() === 'el';

  var infoEl = document.getElementById('trInfo');
  if (!infoEl) return;

  infoEl.textContent = isEl
    ? 'Μήκος: ' + Math.round(length) + ' m • Σημεία: ' + count
    : 'Length: ' + Math.round(length) + ' m • Points: ' + count;
}

function calculateTrackDistance(points) {
  if (points.length < 2) return 0;

  var total = 0;
  for (var i = 1; i < points.length; i++) {
    var p1 = points[i - 1];
    var p2 = points[i];
    total += distanceBetween(p1, p2);
  }
  return total;
}

function distanceBetween(p1, p2) {
  var R = 6371000;
  var dLat = deg2rad(p2.lat - p1.lat);
  var dLon = deg2rad(p2.lng - p1.lng);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(p1.lat)) * Math.cos(deg2rad(p2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function updateTrTimer() {
  var timerEl = document.getElementById('trTimer');
  if (!timerEl) return;

  if (!trackRecorderState.startTime) {
    timerEl.textContent = '';
    return;
  }

  var now = trackRecorderState.recording ? new Date() : trackRecorderState.endTime;
  var diff = (now - trackRecorderState.startTime) / 1000;

  var seconds = diff % 60;
  var minutes = Math.floor(diff / 60) % 60;
  var hours = Math.floor(diff / 3600);

  var isEl = getCurrentLang() === 'el';
  var label = isEl ? 'Διάρκεια:' : 'Duration:';

  if (hours > 0) {
    timerEl.textContent = label + ' ' + hours + 'h ' + minutes + 'm ' + seconds.toFixed(0) + 's';
  } else if (minutes > 0) {
    timerEl.textContent = label + ' ' + minutes + 'm ' + seconds.toFixed(0) + 's';
  } else {
    timerEl.textContent = label + ' ' + seconds.toFixed(1) + 's';
  }
}

function exportGPX() {
  var isEl = getCurrentLang() === 'el';

  if (trackRecorderState.trackPoints.length === 0) {
    alert(isEl ? 'Κανένα σημείο για εξαγωγή' : 'No points to export');
    return;
  }

  var now = new Date().toISOString();
  var fileName = 'waymark-track-' + Date.now();

  var trkpts = trackRecorderState.trackPoints.map(function (p) {
    return '      <trkpt lat="' + p.lat.toFixed(7) + '" lon="' + p.lng.toFixed(7) + '">' +
      '<ele>0</ele><time>' + new Date(p.time).toISOString() + '</time></trkpt>';
  }).join('\n');

  var gpx = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<gpx version="1.1" creator="Waymark" xmlns="http://www.topografix.com/GPX/1/1">\n' +
    '  <metadata>\n' +
    '    <name>' + escapeXml(fileName) + '</name>\n' +
    '    <desc>Recorded with Waymark</desc>\n' +
    '    <time>' + now + '</time>\n' +
    '  </metadata>\n' +
    '  <trk>\n' +
    '    <name>Recorded Track</name>\n' +
    '    <type>track</type>\n' +
    '    <trkseg>\n' + trkpts + '\n' +
    '    </trkseg>\n' +
    '  </trk>\n' +
    '</gpx>';

  downloadFile(gpx, fileName + '.gpx', 'application/gpx+xml');
  showNotification(isEl ? 'GPX κατέβηκε!' : 'GPX downloaded!', 'success');
}

function clearTrackRecorder() {
  var map = getTrMap();

  if (trackRecorderState.watchId) {
    navigator.geolocation.clearWatch(trackRecorderState.watchId);
    trackRecorderState.watchId = null;
  }

  if (map && trackRecorderState.polyline) {
    map.removeLayer(trackRecorderState.polyline);
    trackRecorderState.polyline = null;
  }

  trackRecorderState.recording = false;
  trackRecorderState.trackPoints = [];
  trackRecorderState.startTime = null;
  trackRecorderState.endTime = null;

  var exportBtn = document.getElementById('trExportBtn');
  var timerEl = document.getElementById('trTimer');
  var infoEl = document.getElementById('trInfo');

  if (exportBtn) exportBtn.style.display = 'none';
  if (timerEl) timerEl.textContent = '';
  if (infoEl) {
    var isEl = getCurrentLang() === 'el';
    infoEl.textContent = isEl ? 'Μήκος: 0 m • Σημεία: 0' : 'Length: 0 m • Points: 0';
  }

  updateTrStatus();
  updateButtonStates();
}

function _trackRecorderCleanup() {
  delete window.onMapClick_trackRecorder;

  if (trackRecorderState.watchId) {
    navigator.geolocation.clearWatch(trackRecorderState.watchId);
  }

  var map = getTrMap();
  if (map && trackRecorderState.polyline) {
    map.removeLayer(trackRecorderState.polyline);
  }

  trackRecorderState = {
    recording: false,
    trackPoints: [],
    polyline: null,
    watchId: null,
    startTime: null,
    endTime: null,
  };
}

window._trackRecorderCleanup = _trackRecorderCleanup;