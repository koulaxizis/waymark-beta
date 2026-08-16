/* =========================================================
   WAYMARK — Track Recorder Module
   Records GPS tracks using watchPosition().
   Live polyline on map, GPX export, optional OSM upload.
   Mobile-first: large buttons, clear status.
   ========================================================= */

function initTrackRecorder(map, container, appState) {
  const isEl = getCurrentLang() === 'el';
  const token = sessionStorage.getItem('osm_access_token');
  const loggedIn = !!token;

  let watchId = null;
  let isRecording = false;
  let isPaused = false;
  let trackPoints = [];
  let waypoints = [];
  let trackLayer = null;
  let waypointLayer = null;
  let userMarker = null;
  let accuracyCircle = null;
  let startTime = null;
  let totalDistance = 0;
  let lastPoint = null;

  container.innerHTML = `
    <style>
      .tr-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.6rem 0.75rem;
        border-radius: 4px;
        font-size: 0.85rem;
        margin-bottom: 0.75rem;
        background: var(--bg-tertiary);
        border: 1px solid var(--border);
      }
      .tr-status.recording {
        background: rgba(239, 68, 68, 0.1);
        border-color: var(--danger);
        color: var(--danger);
      }
      .tr-status.paused {
        background: rgba(255, 177, 67, 0.1);
        border-color: var(--warning);
        color: var(--warning);
      }
      .tr-status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--fg-muted);
        flex-shrink: 0;
      }
      .tr-status.recording .tr-status-dot {
        background: var(--danger);
        animation: tr-pulse 1s infinite;
      }
      .tr-status.paused .tr-status-dot {
        background: var(--warning);
      }
      @keyframes tr-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      .tr-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
      }
      .tr-stat {
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 4px;
        padding: 0.5rem;
        text-align: center;
      }
      .tr-stat-value {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--accent);
      }
      .tr-stat-label {
        font-size: 0.7rem;
        color: var(--fg-muted);
        margin-top: 0.15rem;
      }
      .tr-btn-row {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }
      .tr-btn-row .btn {
        margin-bottom: 0;
      }
      .tr-waypoint-input {
        display: flex;
        gap: 0.3rem;
        margin-bottom: 0.5rem;
      }
      .tr-waypoint-input input {
        flex: 1;
        min-width: 0;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 4px;
        color: var(--fg);
        padding: 0.5rem;
        font-size: 0.8rem;
        font-family: inherit;
      }
      .tr-visibility {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        font-size: 0.8rem;
        color: var(--fg-muted);
        margin-bottom: 0.5rem;
      }
      .tr-visibility select {
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 4px;
        color: var(--fg);
        padding: 0.3rem;
        font-size: 0.8rem;
        font-family: inherit;
      }
    </style>

    <h2>🏃 ${isEl ? 'Καταγραφή Διαδρομής' : 'Track Recorder'}</h2>
    <div class="module-form">

      <div class="tr-status" id="trStatus">
        <span class="tr-status-dot"></span>
        <span id="trStatusText">${isEl ? 'Δεν καταγράφεται' : 'Not recording'}</span>
      </div>

      <div class="tr-stats">
        <div class="tr-stat">
          <div class="tr-stat-value" id="trDistance">0.00 km</div>
          <div class="tr-stat-label">${isEl ? 'Απόσταση' : 'Distance'}</div>
        </div>
        <div class="tr-stat">
          <div class="tr-stat-value" id="trDuration">00:00</div>
          <div class="tr-stat-label">${isEl ? 'Διάρκεια' : 'Duration'}</div>
        </div>
        <div class="tr-stat">
          <div class="tr-stat-value" id="trPoints">0</div>
          <div class="tr-stat-label">${isEl ? 'Σημεία' : 'Points'}</div>
        </div>
        <div class="tr-stat">
          <div class="tr-stat-value" id="trAccuracy">—</div>
          <div class="tr-stat-label">${isEl ? 'Ακρίβεια GPS' : 'GPS Accuracy'}</div>
        </div>
      </div>

      <div class="tr-btn-row">
        <button class="btn btn-success" id="trStartBtn">${isEl ? '▶ Έναρξη' : '▶ Start'}</button>
        <button class="btn btn-secondary" id="trPauseBtn" style="display:none;">${isEl ? '⏸ Παύση' : '⏸ Pause'}</button>
        <button class="btn btn-danger" id="trStopBtn" style="display:none;">${isEl ? '⏹ Διακοπή' : '⏹ Stop'}</button>
      </div>

      <div class="tr-waypoint-input" id="trWaypointRow" style="display:none;">
        <input type="text" id="trWaypointName" placeholder="${isEl ? 'Όνομα σημείου (waypoint)' : 'Waypoint name'}">
        <button class="btn btn-secondary" id="trAddWaypointBtn" style="margin-bottom:0; width:auto; padding:0 0.75rem; white-space:nowrap;">📍</button>
      </div>

      <hr style="border:none; border-top:1px solid var(--border); margin:0.5rem 0;">

      <div class="form-group">
        <label for="trTrackName">${isEl ? 'Όνομα διαδρομής' : 'Track name'}</label>
        <input type="text" id="trTrackName" value="Waymark Track" />
      </div>

      <div class="tr-visibility">
        <label for="trVisibility">${isEl ? 'Ορατότητα στο OSM' : 'OSM visibility'}:</label>
        <select id="trVisibility">
          <option value="trackable">${isEl ? 'Ίχνος (trackable)' : 'Trackable'}</option>
          <option value="public">${isEl ? 'Δημόσιο' : 'Public'}</option>
          <option value="identifiable">${isEl ? 'Αναγνωρίσιμο' : 'Identifiable'}</option>
          <option value="private">${isEl ? 'Ιδιωτικό' : 'Private'}</option>
        </select>
      </div>

      <button class="btn" id="trDownloadBtn" disabled>${t('common.download')} GPX</button>
      ${loggedIn ? `<button class="btn btn-success" id="trUploadBtn" disabled>${isEl ? '📤 Ανέβασμα στο OSM' : '📤 Upload to OSM'}</button>` : ''}
      <button class="btn btn-secondary" id="trClearBtn" disabled>${t('common.clear')}</button>

    </div>
  `;

  // --- Elements ---
  const statusEl = document.getElementById('trStatus');
  const statusTextEl = document.getElementById('trStatusText');
  const startBtn = document.getElementById('trStartBtn');
  const pauseBtn = document.getElementById('trPauseBtn');
  const stopBtn = document.getElementById('trStopBtn');
  const waypointRow = document.getElementById('trWaypointRow');
  const addWaypointBtn = document.getElementById('trAddWaypointBtn');
  const waypointInput = document.getElementById('trWaypointName');
  const downloadBtn = document.getElementById('trDownloadBtn');
  const uploadBtn = document.getElementById('trUploadBtn');
  const clearBtn = document.getElementById('trClearBtn');

  let durationInterval = null;

  // --- Distance calculation (Haversine) ---
  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000; // meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // --- Format duration ---
  function formatDuration(ms) {
    const sec = Math.floor(ms / 1000);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
    return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }

  // --- Update stats ---
  function updateStats() {
    document.getElementById('trDistance').textContent = (totalDistance / 1000).toFixed(2) + ' km';
    document.getElementById('trPoints').textContent = trackPoints.length;
    if (startTime) {
      document.getElementById('trDuration').textContent = formatDuration(Date.now() - startTime);
    }
  }

  // --- Start recording ---
  startBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert(isEl ? 'Η συσκευή δεν υποστηρίζει GPS.' : 'Device does not support GPS.');
      return;
    }

    isRecording = true;
    isPaused = false;
    trackPoints = [];
    waypoints = [];
    totalDistance = 0;
    lastPoint = null;
    startTime = Date.now();

    startBtn.style.display = 'none';
    pauseBtn.style.display = '';
    stopBtn.style.display = '';
    waypointRow.style.display = '';

    statusEl.className = 'tr-status recording';
    statusTextEl.textContent = isEl ? 'Κατάγραφη σε εξέλιξη...' : 'Recording...';

    // Duration timer
    durationInterval = setInterval(updateStats, 1000);

    // Start watching position
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;

        // Update accuracy display
        document.getElementById('trAccuracy').textContent = Math.round(accuracy) + 'm';

        // Skip low-accuracy points (> 50m) unless first point
        if (trackPoints.length > 0 && accuracy > 50) return;

        // Skip duplicate points (same location within 2m)
        if (lastPoint) {
          const dist = haversine(lastPoint.lat, lastPoint.lon, latitude, longitude);
          if (dist < 2) return;
          totalDistance += dist;
        }

        const point = { lat: latitude, lon: longitude, time: pos.timestamp };
        trackPoints.push(point);
        lastPoint = point;

        // Draw/update polyline
        if (trackLayer) map.removeLayer(trackLayer);
        const latlngs = trackPoints.map(p => [p.lat, p.lon]);
        trackLayer = L.polyline(latlngs, { color: '#6d4aff', weight: 4, opacity: 0.8 }).addTo(map);

        // Update user marker + accuracy circle
        if (userMarker) map.removeLayer(userMarker);
        if (accuracyCircle) map.removeLayer(accuracyCircle);

        userMarker = L.circleMarker([latitude, longitude], {
          radius: 6, fillColor: '#6d4aff', color: 'white', weight: 2, fillOpacity: 1
        }).addTo(map);

        accuracyCircle = L.circle([latitude, longitude], {
          radius: accuracy, color: '#6d4aff', fillColor: '#6d4aff', fillOpacity: 0.1, weight: 1
        }).addTo(map);

        // Pan to follow user
        map.panTo([latitude, longitude]);

        updateStats();
      },
      (err) => {
        statusEl.className = 'tr-status';
        statusTextEl.textContent = isEl ? 'Σφάλμα GPS: ' + err.message : 'GPS Error: ' + err.message;
        stopRecording();
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
  });

  // --- Pause / Resume ---
  pauseBtn.addEventListener('click', () => {
    if (isPaused) {
      // Resume
      isPaused = false;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          document.getElementById('trAccuracy').textContent = Math.round(accuracy) + 'm';
          if (trackPoints.length > 0 && accuracy > 50) return;
          if (lastPoint) {
            const dist = haversine(lastPoint.lat, lastPoint.lon, latitude, longitude);
            if (dist < 2) return;
            totalDistance += dist;
          }
          const point = { lat: latitude, lon: longitude, time: pos.timestamp };
          trackPoints.push(point);
          lastPoint = point;
          if (trackLayer) map.removeLayer(trackLayer);
          trackLayer = L.polyline(trackPoints.map(p => [p.lat, p.lon]), { color: '#6d4aff', weight: 4, opacity: 0.8 }).addTo(map);
          if (userMarker) map.removeLayer(userMarker);
          userMarker = L.circleMarker([latitude, longitude], { radius: 6, fillColor: '#6d4aff', color: 'white', weight: 2, fillOpacity: 1 }).addTo(map);
          map.panTo([latitude, longitude]);
          updateStats();
        },
        (err) => { statusTextEl.textContent = 'GPS Error'; },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
      );
      pauseBtn.textContent = isEl ? '⏸ Παύση' : '⏸ Pause';
      statusEl.className = 'tr-status recording';
      statusTextEl.textContent = isEl ? 'Κατάγραφη σε εξέλιξη...' : 'Recording...';
    } else {
      // Pause
      isPaused = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      watchId = null;
      pauseBtn.textContent = isEl ? '▶ Συνέχεια' : '▶ Resume';
      statusEl.className = 'tr-status paused';
      statusTextEl.textContent = isEl ? 'Παύση' : 'Paused';
    }
  });

  // --- Stop recording ---
  function stopRecording() {
    isRecording = false;
    isPaused = false;
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    clearInterval(durationInterval);

    startBtn.style.display = '';
    pauseBtn.style.display = 'none';
    stopBtn.style.display = 'none';
    waypointRow.style.display = 'none';

    statusEl.className = 'tr-status';
    statusTextEl.textContent = isEl
      ? 'Διακοπή. ' + trackPoints.length + ' σημεία.'
      : 'Stopped. ' + trackPoints.length + ' points.';

    if (trackPoints.length > 0) {
      downloadBtn.disabled = false;
      if (uploadBtn) uploadBtn.disabled = false;
      clearBtn.disabled = false;
    }
  }

  stopBtn.addEventListener('click', stopRecording);

  // --- Add waypoint ---
  addWaypointBtn.addEventListener('click', () => {
    if (!lastPoint) {
      alert(isEl ? 'Καμία τοποθεσία ακόμη.' : 'No location yet.');
      return;
    }
    const name = waypointInput.value.trim() || 'WP' + (waypoints.length + 1);
    waypoints.push({ lat: lastPoint.lat, lon: lastPoint.lon, name: name, time: Date.now() });
    waypointInput.value = '';

    if (waypointLayer) map.removeLayer(waypointLayer);
    waypointLayer = L.layerGroup();
    waypoints.forEach(wp => {
      const m = L.marker([wp.lat, wp.lon]).bindPopup('<b>' + wp.name + '</b>');
      waypointLayer.addLayer(m);
    });
    waypointLayer.addTo(map);
  });

  // --- Generate GPX ---
  function generateGPX(name, visibility) {
    let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n';
    gpx += '<gpx version="1.1" creator="Waymark" xmlns="http://www.topografix.com/GPX/1/1">\n';

    // Metadata
    gpx += '  <metadata>\n';
    gpx += '    <name>' + escapeXml(name) + '</name>\n';
    gpx += '    <time>' + new Date().toISOString() + '</time>\n';
    gpx += '  </metadata>\n';

    // Waypoints
    waypoints.forEach(wp => {
      gpx += '  <wpt lat="' + wp.lat.toFixed(7) + '" lon="' + wp.lon.toFixed(7) + '">\n';
      gpx += '    <name>' + escapeXml(wp.name) + '</name>\n';
      gpx += '    <time>' + new Date(wp.time).toISOString() + '</time>\n';
      gpx += '  </wpt>\n';
    });

    // Track
    gpx += '  <trk>\n';
    gpx += '    <name>' + escapeXml(name) + '</name>\n';
    gpx += '    <trkseg>\n';
    trackPoints.forEach(pt => {
      gpx += '      <trkpt lat="' + pt.lat.toFixed(7) + '" lon="' + pt.lon.toFixed(7) + '">\n';
      if (pt.time) gpx += '        <time>' + new Date(pt.time).toISOString() + '</time>\n';
      gpx += '      </trkpt>\n';
    });
    gpx += '    </trkseg>\n';
    gpx += '  </trk>\n';
    gpx += '</gpx>';
    return gpx;
  }

  // --- Download GPX ---
  downloadBtn.addEventListener('click', () => {
    if (trackPoints.length === 0) return;
    const name = document.getElementById('trTrackName').value || 'Waymark Track';
    const gpx = generateGPX(name);
    downloadFile(gpx, name.replace(/\s+/g, '-').toLowerCase() + '.gpx', 'application/gpx+xml');
  });

  // --- Upload GPX to OSM ---
  if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
      if (trackPoints.length === 0) return;

      const cfg = window.WAYMARK_CONFIG;
      const currentToken = sessionStorage.getItem('osm_access_token');
      if (!currentToken) {
        alert(t('osm.not_logged_in'));
        return;
      }

      const name = document.getElementById('trTrackName').value || 'Waymark Track';
      const visibility = document.getElementById('trVisibility').value || 'trackable';
      const gpx = generateGPX(name, visibility);

      uploadBtn.disabled = true;
      uploadBtn.textContent = isEl ? '⏳ Ανέβασμα...' : '⏳ Uploading...';

      try {
        const formData = new FormData();
        formData.append('file', new Blob([gpx], { type: 'application/gpx+xml' }), name + '.gpx');
        formData.append('description', name);
        formData.append('tags', 'waymark');
        formData.append('visibility', visibility);

        const response = await fetch(cfg.PROXY_URL + '/api/0.6/gpx/create', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + currentToken },
          body: formData,
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText.substring(0, 200));
        }

        const traceId = (await response.text()).trim();
        uploadBtn.textContent = isEl ? '✅ Ανέβηκε! #' + traceId : '✅ Uploaded! #' + traceId;

        setTimeout(() => {
          uploadBtn.textContent = isEl ? '📤 Ανέβασμα στο OSM' : '📤 Upload to OSM';
          uploadBtn.disabled = false;
        }, 3000);

      } catch (err) {
        let msg = err.message;
        if (msg === 'Failed to fetch') {
          msg = isEl ? 'Αδυναμία σύνδεσης' : 'Connection failed';
        }
        uploadBtn.textContent = isEl ? '📤 Ανέβασμα στο OSM' : '📤 Upload to OSM';
        uploadBtn.disabled = false;
        alert(msg);
      }
    });
  }

  // --- Clear ---
  clearBtn.addEventListener('click', () => {
    if (trackLayer) { map.removeLayer(trackLayer); trackLayer = null; }
    if (waypointLayer) { map.removeLayer(waypointLayer); waypointLayer = null; }
    if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
    if (accuracyCircle) { map.removeLayer(accuracyCircle); accuracyCircle = null; }
    trackPoints = [];
    waypoints = [];
    totalDistance = 0;
    lastPoint = null;
    startTime = null;

    document.getElementById('trDistance').textContent = '0.00 km';
    document.getElementById('trDuration').textContent = '00:00';
    document.getElementById('trPoints').textContent = '0';
    document.getElementById('trAccuracy').textContent = '—';

    downloadBtn.disabled = true;
    if (uploadBtn) uploadBtn.disabled = true;
    clearBtn.disabled = true;

    statusEl.className = 'tr-status';
    statusTextEl.textContent = isEl ? 'Δεν καταγράφεται' : 'Not recording';
  });

  // Cleanup on module close
  // Store cleanup function for when module is toggled off
  appState._trackRecorderCleanup = () => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    if (durationInterval) clearInterval(durationInterval);
    if (trackLayer) map.removeLayer(trackLayer);
    if (waypointLayer) map.removeLayer(waypointLayer);
    if (userMarker) map.removeLayer(userMarker);
    if (accuracyCircle) map.removeLayer(accuracyCircle);
  };
}

window.initTrackRecorder = initTrackRecorder;