/* =========================================================
   WAYMARK — GPX Editor Module
   Upload, view, and download GPX files.
   All client-side. No data leaves the browser.
   ========================================================= */

function initGpxEditor(map, container, appState) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
    <h2>📡 ${t('module.gpx_editor')}</h2>
    <div class="module-form">
      <div class="form-group">
        <label for="gpxUpload">${isEl ? 'Αρχείο GPX' : 'GPX File'}</label>
        <input type="file" id="gpxUpload" accept=".gpx,.xml" />
      </div>
      <div class="form-group">
        <label for="gpxName">${isEl ? 'Όνομα διαδρομής' : 'Track name'}</label>
        <input type="text" id="gpxName" value="My Track" />
      </div>
      <button class="btn" id="gpxDownloadBtn">${t('common.download')} GPX</button>
      <button class="btn btn-secondary" id="gpxClearBtn">${t('common.clear')}</button>
      <div class="results-list" id="gpxInfo">
        <div class="result-item" style="cursor: default; opacity: 0.6;">
          ${isEl
            ? 'Ανέβασε αρχείο GPX για προβολή στο χάρτη ή πάτησε λήψη για να εξάγεις τα τρέχοντα σημεία.'
            : 'Upload a GPX file to view on map or click download to export current points.'}
        </div>
      </div>
    </div>
  `;

  let trackPoints = [];
  let trackLayer = null;

  document.getElementById('gpxUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const gpxData = event.target.result;
      trackPoints = parseGPX(gpxData);
      renderTrack(trackPoints, map, appState);

      document.getElementById('gpxInfo').innerHTML =
        '<div class="result-item">' +
        '<strong>' + (isEl ? 'Σημεία διαδρομής:' : 'Track points:') + '</strong> ' + trackPoints.length + '<br>' +
        '<small>' + (trackPoints[0] ? 'Start: ' + trackPoints[0].lat.toFixed(4) + ', ' + trackPoints[0].lon.toFixed(4) : '') + '</small>' +
        '</div>';
    };
    reader.readAsText(file);
  });

  document.getElementById('gpxDownloadBtn').addEventListener('click', () => {
    const markers = appState.mapMarkers;
    const points = markers.length > 0 ? markers.map(m => m.getLatLng()) : trackPoints.map(p => ({ lat: p.lat, lng: p.lon }));

    if (points.length === 0) {
      alert(t('osm.no_points'));
      return;
    }

    const name = document.getElementById('gpxName').value || 'Waymark Track';
    const gpxString = generateGPX(points, name);
    downloadFile(gpxString, name.replace(/\s+/g, '-').toLowerCase() + '.gpx', 'application/gpx+xml');
  });

  document.getElementById('gpxClearBtn').addEventListener('click', () => {
    appState.mapMarkers.forEach(m => map.removeLayer(m));
    appState.mapMarkers = [];
    trackPoints = [];
    if (trackLayer) { map.removeLayer(trackLayer); trackLayer = null; }
    document.getElementById('gpxInfo').innerHTML =
      '<div class="result-item" style="opacity: 0.6;">' + (isEl ? 'Καθαρίστηκε.' : 'Cleared.') + '</div>';
  });

  function parseGPX(gpxContent) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxContent, 'text/xml');
    const trkpts = xmlDoc.getElementsByTagName('trkpt');
    const wpts = xmlDoc.getElementsByTagName('wpt');
    const points = [];

    for (let i = 0; i < trkpts.length; i++) {
      points.push({
        lat: parseFloat(trkpts[i].getAttribute('lat')),
        lon: parseFloat(trkpts[i].getAttribute('lon'))
      });
    }
    for (let i = 0; i < wpts.length; i++) {
      points.push({
        lat: parseFloat(wpts[i].getAttribute('lat')),
        lon: parseFloat(wpts[i].getAttribute('lon')),
        name: wpts[i].getElementsByTagName('name')[0]?.textContent || ''
      });
    }
    return points;
  }

  function renderTrack(points, map, appState) {
    appState.mapMarkers.forEach(m => map.removeLayer(m));
    appState.mapMarkers = [];

    if (points.length > 1) {
      const latlngs = points.map(p => [p.lat, p.lon]);
      trackLayer = L.polyline(latlngs, { color: '#6d4aff', weight: 4 }).addTo(map);
    }

    points.forEach(pt => {
      const marker = L.marker([pt.lat, pt.lon]).addTo(map);
      appState.mapMarkers.push(marker);
      marker.bindPopup(pt.name || (pt.lat.toFixed(4) + ', ' + pt.lon.toFixed(4)));
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lon]));
      map.fitBounds(bounds);
    }
  }

  function generateGPX(points, name) {
    let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n';
    gpx += '<gpx version="1.1" creator="Waymark" xmlns="http://www.topografix.com/GPX/1/1">\n';
    gpx += '  <trk>\n    <name>' + escapeXml(name) + '</name>\n    <trkseg>\n';
    points.forEach(p => {
      gpx += '      <trkpt lat="' + p.lat.toFixed(7) + '" lon="' + (p.lng || p.lon).toFixed(7) + '"></trkpt>\n';
    });
    gpx += '    </trkseg>\n  </trk>\n</gpx>';
    return gpx;
  }
}

function escapeXml(str) {
  return str.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

window.initGpxEditor = initGpxEditor;
window.downloadFile = downloadFile;
window.escapeXml = escapeXml;