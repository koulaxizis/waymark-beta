/* =========================================================
   WAYMARK — Notes Browser Module (OSM API)
   Views open OSM notes in the visible area.
   ========================================================= */

function initNotesBrowser(map, container, appState) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
    <h2>📋 ${t('module.notes_browser')}</h2>
    <div class="module-form">
      <button class="btn" id="notesLoadBtn">${isEl ? 'Φόρτωση σημειώσεων' : 'Load notes'}</button>
      <button class="btn btn-secondary" id="notesClearBtn">${t('common.clear')}</button>
      <div class="results-list" id="notesResults">
        <div class="result-item" style="cursor: default; opacity: 0.6;">
          ${isEl ? 'Πάτησε φόρτωση για να δεις ανοιχτές σημειώσεις στην περιοχή.' : 'Click load to see open notes in the area.'}
        </div>
      </div>
    </div>
  `;

  let notesLayer = null;

  document.getElementById('notesLoadBtn').addEventListener('click', async () => {
    const resultsDiv = document.getElementById('notesResults');
    resultsDiv.innerHTML = '<div class="spinner"></div>';

    const bounds = map.getBounds();
    const left = bounds.getWest();
    const bottom = bounds.getSouth();
    const right = bounds.getEast();
    const top = bounds.getNorth();

    const url = 'https://api.openstreetmap.org/api/0.6/notes.json?bbox=' +
      left + ',' + bottom + ',' + right + ',' + top + '&limit=50&closed=0';

    try {
      const response = await fetch(url);

      // Check if response is OK before parsing
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text.substring(0, 150));
      }

      // Verify content-type is JSON
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(text.substring(0, 150));
      }

      const data = await response.json();

      if (notesLayer) { map.removeLayer(notesLayer); notesLayer = null; }
      appState.mapMarkers.forEach(m => map.removeLayer(m));
      appState.mapMarkers = [];

      const notes = data.features || [];

      if (notes.length === 0) {
        resultsDiv.innerHTML = '<div class="result-item">' + t('common.no_results') + '</div>';
        return;
      }

      notesLayer = L.layerGroup();

      notes.forEach(note => {
        const coords = note.geometry.coordinates;
        const [lon, lat] = coords;
        const id = note.properties.id;
        const status = note.properties.status;

        const marker = L.marker([lat, lon], {
          icon: L.divIcon({
            className: 'note-marker',
            html: '<div style="background:#ffd43b;color:#1a1a1a;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:bold;border:2px solid #1a1a1a;">!</div>',
            iconSize: [24, 24], iconAnchor: [12, 12]
          })
        });

        const firstComment = note.properties.comments && note.properties.comments[0];
        const body = firstComment ? firstComment.body : '';
        const date = firstComment ? firstComment.date : '';

        marker.bindPopup(
          '<b>' + (isEl ? 'Σημείωση' : 'Note') + ' #' + id + '</b><br>' +
          '<small>' + status + ' — ' + date + '</small><br>' +
          '<p style="margin-top:0.5rem;">' + (body ? body.substring(0, 200) : '') + '</p>'
        );

        notesLayer.addLayer(marker);
      });

      notesLayer.addTo(map);

      resultsDiv.innerHTML = '';
      notes.forEach(note => {
        const item = document.createElement('div');
        item.className = 'result-item';
        const coords = note.geometry.coordinates;
        const firstComment = note.properties.comments && note.properties.comments[0];
        const body = firstComment ? firstComment.body : '';
        item.innerHTML = '<strong>#' + note.properties.id + '</strong><br><small>' + (body ? body.substring(0, 80) : '') + '...</small>';
        item.addEventListener('click', () => {
          map.setView([coords[1], coords[0]], 16);
        });
        resultsDiv.appendChild(item);
      });
    } catch (err) {
      let msg = err.message;
      if (msg === 'Failed to fetch') {
        msg = isEl
          ? 'Αδυναμία σύνδεσης με τον server. Έλεγξε τη σύνδεσή σου.'
          : 'Cannot connect to server. Check your connection.';
      }
      resultsDiv.innerHTML = '<div class="result-item">' + t('common.error') + ': ' + msg + '</div>';
    }
  });

  document.getElementById('notesClearBtn').addEventListener('click', () => {
    if (notesLayer) { map.removeLayer(notesLayer); notesLayer = null; }
    appState.mapMarkers.forEach(m => map.removeLayer(m));
    appState.mapMarkers = [];
    document.getElementById('notesResults').innerHTML =
      '<div class="result-item" style="opacity:0.6;">' + (isEl ? 'Καθαρίστηκε.' : 'Cleared.') + '</div>';
  });
}

window.initNotesBrowser = initNotesBrowser;