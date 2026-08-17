/* =========================================================
   WAYMARK — Track Recorder Module
   GPS track recording and GPX export/upload.
   ========================================================= */

let trackRecorderState = {
  isRecording: false,
  trackPoints: [],
  watchId: null,
  polyline: null,
  startTime: null,
  totalDistance: 0,
};

function initTrackRecorder(map, container, appState) {
  renderTrackRecorderUI(container);

  function handleMapClick(lat, lng) {
    // Manual point addition when not recording
    if (!trackRecorderState.isRecording) {
      addManualPoint(lat, lng);
    }
  }

  window.onMapClick_trackRecorder = handleMapClick;
}

function renderTrackRecorderUI(container) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
    <div class="track-recorder-ui">
      <div id="trStatus" class="note-description">
        ${isEl ? 'Η εγγραφή είναι σβηστή.' : 'Recording is off.'}
      </div>

      <div id="trStats" style="display:none;">
        <div class="note-description">
          <strong>⏱️ ${isEl ? 'Χρόνος:' : 'Time:'}</strong> <span id="trTime">0:00</span><br/>
          <strong>📍 ${isEl ? 'Σημεία:' : 'Points:'}</strong> <span id="trPoints">0</span><br/>
          <strong>📏 ${isEl ? 'Απόσταση:' : 'Distance:'}</strong> <span id="trDistance">0.00 km</span>
        </div>
      </div>

      <button id="trStartBtn" class="btn btn-success">
        ⏺️ ${isEl ? 'Έναρξη' : 'Start'}
      </button>
      <button id="trStopBtn" class="btn btn-danger" style="display:none;">
        ⏹️ ${isEl ? 'Διακοπή' : 'Stop'}
      </button>

      <button id="trAddManualBtn" class="btn btn-secondary btn-sm">
        📍 ${isEl ? 'Χειροκίνητο σημείο' : 'Manual point'}
      </button>

      <button id="trDownloadBtn" class="btn btn-primary" disabled>
        📥 ${isEl ? 'Κατέβασμα GPX' : 'Download GPX'}
      </button>
      <button id="trUploadBtn" class="btn btn-success" disabled>
        📤 ${isEl ? 'Ανέβασμα στο OSM' : 'Upload to OSM'}
      </button>
      <button id="trClearBtn" class="btn btn-danger">🗑️ ${isEl ? 'Καθαρισμός' : 'Clear'}</button>
    </div>
  `;

  document.getElementById('trStartBtn').addEventListener('click', startRecording);
  document.getElementById('trStopBtn').addEventListener('click', stopRecording);
  document.getElementById('trAddManualBtn').addEventListener('click', () => {
    showNotification(getCurrentLang() === 'el' ? 'Κάνε κλικ στον χάρτη...' : 'Click on map...', 'info');
  });
  document.getElementById('trDownloadBtn').addEventListener('click', downloadGPX);
  document.getElementById('trUploadBtn').addEventListener('click', uploadGPX);
  document.getElementById('trClearBtn').addEventListener('click', clearTrack);
}

function startRecording() {
  if (trackRecorderState.isRecording) return;

  trackRecorderState.isRecording = true;
  trackRecorderState.startTime = Date.now();
  trackRecorderState.trackPoints = [];
  trackRecorderState.totalDistance = 0;

  document.getElementById('trStartBtn').style.display = 'none';
  document.getElementById('trStopBtn').style.display = 'block';
  document.getElementById('trStats').style.display = 'block';
  document.getElementById('trStatus').textContent = getCurrentLang() === 'el' ? '🔴 ΕΓΓΡΑΦΗ...' : '🔴 RECORDING...';

  // Start GPS watching
  if (navigator.geolocation) {
    trackRecorderState.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        addTrackPoint(lat, lon, pos.coords.accuracy, pos.timestamp);
      },
      (err) => {
        console.error('GPS error:', err);
        showNotification(getCurrentLang() === 'el' ? 'Σφάλμα GPS: ' + err.message : 'GPS error: ' + err.message, 'critical');
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
  } else {
    showNotification(getCurrentLang() === 'el' ? 'Δεν υπάρχει GPS' : 'No GPS available', 'critical');
    stopRecording();
  }

  // Update timer
  trackRecorderState.timerInterval = setInterval(updateTimer, 1000);
}

function stopRecording() {
  if (!trackRecorderState.isRecording) return;

  trackRecorderState.isRecording = false;

  if (trackRecorderState.watchId !== null) {
    navigator.geolocation.clearWatch(trackRecorderState.watchId);
    trackRecorderState.watchId = null;
  }

  if (trackRecorderState.timerInterval) {
    clearInterval(trackRecorderState.timerInterval);
    trackRecorderState.timerInterval = null;
  }

  document.getElementById('trStartBtn').style.display = 'block';
  document.getElementById('trStopBtn').style.display = 'none';
  document.getElementById('trStatus').textContent = getCurrentLang() === 'el' ? 'Η εγγραφή σταμάτησε.' : 'Recording stopped.';

  document.getElementById('trDownloadBtn').disabled = trackRecorderState.trackPoints.length === 0;
  document.getElementById('trUploadBtn').disabled = trackRecorderState.trackPoints.length === 0 || !sessionStorage.getItem('osm_access_token');
}

function addTrackPoint(lat, lon, accuracy, timestamp) {
  const point = { lat, lon, accuracy, timestamp };

  if (trackRecorderState.trackPoints.length > 0) {
    const last = trackRecorderState.trackPoints[trackRecorderState.trackPoints.length - 1];
    const dist = calculateDistance(last.lat, last.lon, lat, lon);
    trackRecorderState.totalDistance += dist;
  }

  trackRecorderState.trackPoints.push(point);

  // Update polyline
  if (trackRecorderState.polyline) {
    window.appState.map.removeLayer(trackRecorderState.polyline);
  }

  trackRecorderState.polyline = L.polyline(
    trackRecorderState.trackPoints.map(p => [p.lat, p.lon]),
    {
      color: '#6d4aff',
      weight: 3,
      opacity: 0.8,
    }
  ).addTo(window.appState.map);

  // Update stats
  document.getElementById('trPoints').textContent = trackRecorderState.trackPoints.length;
  document.getElementById('trDistance').textContent = (trackRecorderState.totalDistance / 1000).toFixed(2) + ' km';
}

function addManualPoint(lat, lng) {
  addTrackPoint(lat, lng, 0, Date.now());
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * MathPC / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function updateTimer() {
  if (!trackRecorderState.startTime) return;

  const elapsed = Math.floor((Date.now() - trackRecorderState.startTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  document.getElementById('trTime').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
}

function downloadGPX() {
  if (trackRecorderState.trackPoints.length === 0) return;

  const isEl = getCurrentLang() === 'el';
  const trkpts = trackRecorderState.trackPoints.map(p => {
    const dt = new Date(p.timestamp).toISOString();
    return `      <trkpt lat="${p.lat}" lon="${p.lon}"><ele>0</ele><time>${dt}</time></trkpt>`;
  }).join('\n');

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Waymark" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Waymark Track</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>Waymark Track</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;

  downloadFile(gpx, `waymark-track-${Date.now()}.gpx`, 'application/gpx+xml');
  showNotification(isEl ? 'GPX κατέβηκε!' : 'GPX downloaded!', 'success');
}

async function uploadGPX() {
  const isEl = getCurrentLang() === 'el';
  const token = sessionStorage.getItem('osm_access_token');

  if (!token) {
    alert(isEl ? 'Σύνδεσε πρώτα!' : 'Please login first!');
    return;
  }

  if (trackRecorderState.trackPoints.length === 0) return;

  const description = prompt(isEl ? 'Περιγραφή διαδρομής:' : 'Track description:', 'Waymark track');
  if (!description) return;

  const cfg = window.WAYMARK_CONFIG || {};
  const proxyUrl = cfg.PROXY_URL;

  // Build GPX
  const trkpts = trackRecorderState.trackPoints.map(p => {
    const dt = new Date(p.timestamp).toISOString();
    return `      <trkpt lat="${p.lat}" lon="${p.lon}"><ele>0</ele><time>${dt}</time></trkpt>`;
  }).join('\n');

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Waymark" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>Waymark Track</name><time>${new Date().toISOString()}</time></metadata>
  <trk><name>${escapeXml(description)}</name><trkseg>
${trkpts}
  </trkseg></trk>
</gpx>`;

  try {
    const response = await fetch(proxyUrl + '/api/0.6/gpx/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/xml'
      },
      body: gpx
    });

    if (response.ok) {
      alert(isEl ? '✅ Η διαδρομή ανέβηκε!' : '✅ Track uploaded!');
      clearTrack();
    } else {
      const txt = await response.text();
      alert(isEl ? 'Αποτυχία: ' + txt : 'Failed: ' + txt);
    }
  } catch (err) {
    alert(isEl ? 'Σφάλμα δικτύου: ' + err.message : 'Network error: ' + err.message);
  }
}

function clearTrack() {
  if (trackRecorderState.polyline) {
    window.appState.map.removeLayer(trackRecorderState.polyline);
  }
  trackRecorderState = {
    isRecording: false,
    trackPoints: [],
    watchId: null,
    polyline: null,
    startTime: null,
    totalDistance: 0,
  };

  document.getElementById('trStartBtn').style.display = 'block';
  document.getElementById('trStopBtn').style.display = 'none';
  document.getElementById('trStats').style.display = 'none';
  document.getElementById('trStatus').textContent = getCurrentLang() === 'el' ? 'Η εγγραφή είναι σβηστή.' : 'Recording is off.';
  document.getElementById('trDownloadBtn').disabled = true;
  document.getElementById('trUploadBtn').disabled = true;
}

function _trackRecorderCleanup() {
  delete window.onMapClick_trackRecorder;
  if (trackRecorderState.isRecording) {
    if (trackRecorderState.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(trackRecorderState.watchId);
    }
    if (trackRecorderState.timerInterval) {
      clearInterval(trackRecorderState.timerInterval);
    }
  }
  if (window.appState?.map && trackRecorderState.polyline) {
    window.appState.map.removeLayer(trackRecorderState.polyline);
  }
  trackRecorderState = {
    isRecording: false,
    trackEditorState: [],
    trackPoints: [],
    watchId: null,
    polyline: null,
    startTime: null,
    totalDistance: 0,
  };
}

window._trackRecorderCleanup = _trackRecorderCleanup;