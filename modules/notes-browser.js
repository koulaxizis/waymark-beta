/* =========================================================
   WAYMARK — Notes Browser Module (OSM API)
   - View open notes
   - Create new notes
   - Comment on / close (resolve) existing notes
   Auth via OAuth token for write operations.
   ========================================================= */

function initNotesBrowser(map, container, appState) {
  const isEl = getCurrentLang() === 'el';
  const token = sessionStorage.getItem('osm_access_token');
  const loggedIn = !!token;

  container.innerHTML = `
    <h2>📋 ${t('module.notes_browser')}</h2>
    <div class="module-form">

      <div class="form-group">
        <label>${isEl ? 'Νέα σημείωση' : 'New note'}</label>
        <input type="text" id="newNoteText" placeholder="${isEl ? 'Τι λείπει/δεν είναι σωστό εδώ;' : 'What is missing or wrong here?'}" />
        <button class="btn ${loggedIn ? '' : 'btn-secondary'}" id="createNoteBtn" style="margin-top: 0.4rem; margin-bottom: 0.75rem;">${isEl ? '➕ Δημιουργία σημείωσης στο κέντρο χάρτη' : '➕ Create note at map center'}</button>
      </div>

      <hr style="border: none; border-top: 1px solid var(--border); margin: 0.5rem 0;">

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

  // --- Create note ---
  document.getElementById('createNoteBtn').addEventListener('click', async () => {
    if (!loggedIn) {
      alert(isEl ? 'Πρέπει να συνδεθείς πρώτα στο OSM (OSM Editor module).' : 'Please log in to OSM first (OSM Editor module).');
      return;
    }

    const text = document.getElementById('newNoteText').value.trim();
    if (!text) {
      alert(isEl ? 'Γράψε κάτι πρώτα.' : 'Write something first.');
      return;
    }

    const center = map.getCenter();
    const cfg = window.WAYMARK_CONFIG;
    const btn = document.getElementById('createNoteBtn');

    btn.disabled = true;
    btn.textContent = isEl ? '⏳ Δημιουργία...' : '⏳ Creating...';

    try {
      const response = await fetch(cfg.PROXY_URL + '/api/0.6/notes.json?lat=' + center.lat + '&lon=' + center.lng + '&text=' + encodeURIComponent(text), {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText.substring(0, 150));
      }

      const data = await response.json();
      const noteId = data.properties.id;

      btn.textContent = isEl ? '✅ Δημιουργήθηκε!' : '✅ Created!';
      document.getElementById('newNoteText').value = '';

      setTimeout(() => {
        btn.textContent = isEl ? '➕ Δημιουργία σημείωσης στο κέντρο χάρτη' : '➕ Create note at map center';
        btn.disabled = false;
      }, 2000);

      // Reload notes to show the new one
      document.getElementById('notesLoadBtn').click();
    } catch (err) {
      let msg = err.message;
      if (msg === 'Failed to fetch') {
        msg = isEl ? 'Αδυναμία σύνδεσης με OSM API' : 'Cannot connect to OSM API';
      }
      alert(msg);
      btn.textContent = isEl ? '➕ Δημιουργία σημείωσης στο κέντρο χάρτη' : '➕ Create note at map center';
      btn.disabled = false;
    }
  });

  // --- Load notes ---
  document.getElementById('notesLoadBtn').addEventListener('click', async () => {
    const resultsDiv = document.getElementById('notesResults');
    resultsDiv.innerHTML = '<div class="spinner"></div>';

    const bounds = map.getBounds();
    const left = bounds.getWest();
    const bottom = bounds.getSouth();
    const right = bounds.getEast();
    const top = bounds.getNorth();

    // Fetch both open and closed notes to see resolution status
    const url = 'https://api.openstreetmap.org/api/0.6/notes.json?bbox=' +
      left + ',' + bottom + ',' + right + ',' + top + '&limit=50&closed=0';

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text.substring(0, 150));
      }

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
            html: '<div style="background:' + (status === 'closed' ? '#4caf50' : '#ffd43b') + ';color:#1a1a1a;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:bold;border:2px solid #1a1a1a;">!</div>',
            iconSize: [24, 24], iconAnchor: [12, 12]
          })
        });

        const firstComment = note.properties.comments && note.properties.comments[0];
        const body = firstComment ? firstComment.body : '';
        const date = firstComment ? firstComment.date : '';

        const popupContent = document.createElement('div');
        popupContent.innerHTML =
          '<b>' + (isEl ? 'Σημείωση' : 'Note') + ' #' + id + '</b><br>' +
          '<small>' + status + ' — ' + date + '</small><br>' +
          '<p style="margin:0.5rem 0;">' + (body ? body.substring(0, 200) : '') + '</p>';

        if (loggedIn && status === 'open') {
          const commentInput = document.createElement('input');
          commentInput.type = 'text';
          commentInput.placeholder = isEl ? 'Σχόλιο...' : 'Comment...';
          commentInput.style.cssText = 'width:100%;padding:0.3rem;margin-bottom:0.3rem;border:1px solid #ccc;border-radius:3px;';
          popupContent.appendChild(commentInput);

          const actionsRow = document.createElement('div');
          actionsRow.style.cssText = 'display:flex;gap:0.3rem;';

          const commentBtn = document.createElement('button');
          commentBtn.textContent = isEl ? '💬 Σχόλιο' : '💬 Comment';
          commentBtn.style.cssText = 'flex:1;padding:0.3rem;background:#6d4aff;color:white;border:none;border-radius:3px;cursor:pointer;font-size:0.75rem;';
          commentBtn.addEventListener('click', () => interactWithNote(id, 'comment', commentInput.value, marker));

          const resolveBtn = document.createElement('button');
          resolveBtn.textContent = isEl ? '✅ Λύση' : '✅ Resolve';
          resolveBtn.style.cssText = 'flex:1;padding:0.3rem;background:#4caf50;color:white;border:none;border-radius:3px;cursor:pointer;font-size:0.75rem;';
          resolveBtn.addEventListener('click', () => interactWithNote(id, 'close', commentInput.value, marker));

          actionsRow.appendChild(commentBtn);
          actionsRow.appendChild(resolveBtn);
          popupContent.appendChild(actionsRow);
        }

        marker.bindPopup(popupContent);
        notesLayer.addLayer(marker);
      });

      notesLayer.addTo(map);

      resultsDiv.innerHTML = '';
      notes.forEach(note => {
        const coords = note.geometry.coordinates;
        const firstComment = note.properties.comments && note.properties.comments[0];
        const body = firstComment ? firstComment.body : '';
        const status = note.properties.status;

        const item = document.createElement('div');
        item.className = 'result-item';
        const statusIcon = status === 'closed' ? '✅' : '⚠️';
        item.innerHTML = statusIcon + ' <strong>#' + note.properties.id + '</strong><br><small>' + (body ? body.substring(0, 80) : '') + '...</small>';
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

  async function interactWithNote(noteId, action, text, marker) {
    const cfg = window.WAYMARK_CONFIG;
    const currentToken = sessionStorage.getItem('osm_access_token');

    if (!currentToken) {
      alert(isEl ? 'Συνδέσου πρώτα στο OSM.' : 'Log in to OSM first.');
      return;
    }

    let url = cfg.PROXY_URL + '/api/0.6/notes/' + noteId;
    if (action === 'comment') {
      url += '/comment.json?text=' + encodeURIComponent(text || 'OK');
    } else if (action === 'close') {
      url += '/close.json?text=' + encodeURIComponent(text || 'Resolved via Waymark');
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + currentToken },
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText.substring(0, 150));
      }

      // Refresh notes
      document.getElementById('notesLoadBtn').click();
    } catch (err) {
      let msg = err.message;
      if (msg === 'Failed to fetch') {
        msg = isEl ? 'Αδυναμία σύνδεσης' : 'Connection failed';
      }
      alert(msg);
    }
  }

  document.getElementById('notesClearBtn').addEventListener('click', () => {
    if (notesLayer) { map.removeLayer(notesLayer); notesLayer = null; }
    appState.mapMarkers.forEach(m => map.removeLayer(m));
    appState.mapMarkers = [];
    document.getElementById('notesResults').innerHTML =
      '<div class="result-item" style="opacity:0.6;">' + (isEl ? 'Καθαρίστηκε.' : 'Cleared.') + '</div>';
  });
}

window.initNotesBrowser = initNotesBrowser;