/* =========================================================
   WAYMARK — Notes Browser Module
   View, create, and resolve OSM notes.
   Shows note description when clicked (Fix #6).
   ========================================================= */

let notesMarkers = [];

function initNotesBrowser(map, container, appState) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
    <div class="module-form">
      <button class="btn" id="fetchNotesBtn">${isEl ? '🔍 Φόρτωση Σημειώσεων' : '🔍 Load Notes'}</button>
      <button class="btn" id="createNoteBtn">${isEl ? '➕ Νέα Σημείωση' : '➕ New Note'}</button>
    </div>
  `;

  document.getElementById('fetchNotesBtn').addEventListener('click', () => {
    fetchNotesInViewport(map);
  });

  document.getElementById('createNoteBtn').addEventListener('click', () => {
    createNewNote(map, appState);
  });
}

async function fetchNotesInViewport(map) {
  const isEl = getCurrentLang() === 'el';

  // Clear existing markers
  notesMarkers.forEach(m => map.removeLayer(m));
  notesMarkers = [];

  const bounds = map.getBounds();
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();

  // OSM Notes API supports CORS for GET requests
  const url = `${WAYMARK_CONFIG.OSM_API_URL}/api/0.6/notes.json?bbox=${southWest.lon},${southWest.lat},${northEast.lon},${northEast.lat}&limit=100`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Notes API error');
    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      alert(isEl ? 'Δεν βρέθηκαν σημειώσεις στην περιοχή.' : 'No notes found in this area.');
      return;
    }

    data.features.forEach(note => {
      const coords = note.geometry.coordinates;
      const lat = coords[1];
      const lon = coords[0];
      const props = note.properties;

      const marker = L.marker([lat, lon], {
        icon: L.divIcon({
          className: 'note-marker',
          html: '📝',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        })
      }).addTo(map);
      marker.noteData = props;

      // Fix #6: Full description + all comments in popup
      const status = getStatusText(props.status, isEl);
      const date = props.date_created ? new Date(props.date_created).toLocaleDateString() : '';
      
      let commentsHtml = '';
      if (props.comments && props.comments.length > 0) {
        commentsHtml = props.comments.map((c, idx) => {
          const cDate = c.date ? new Date(c.date).toLocaleDateString() : '';
          const author = c.user || (isEl ? 'Ανώνυμος' : 'Anonymous');
          const body = escapeHtml(c.body || c.text || '');
          return `
            <div style="margin-top: 0.3rem; padding: 0.4rem; background: var(--bg); border-radius: 4px; font-size: 0.78rem;">
              <strong>${escapeHtml(author)}</strong> <small style="color: var(--fg-muted)">${cDate}</small><br>
              ${body}
            </div>
          `;
        }).join('');
      }

      const popupContent = `
        <div style="min-width: 260px;">
          <strong>${isEl ? 'Σημείωση' : 'Note'} #${props.id}</strong><br>
          <small style="color: var(--accent); font-weight: 600;">${status}</small><br>
          <small style="color: var(--fg-muted)">${date}</small>
          <hr>
          ${commentsHtml}
        </div>
      `;

      marker.bindPopup(popupContent);
      notesMarkers.push(marker);
    });

  } catch (err) {
    console.error('Fetch notes error:', err);
    alert(isEl ? 'Σφάλμα κατά τη λήψη σημειώσεων.' : 'Error loading notes.');
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getStatusText(status, isEl) {
  switch (status) {
    case 'open': return isEl ? '🟢 Ανοιχτή' : '🟢 Open';
    case 'closed': return isEl ? '🔴 Κλειστή' : '🔴 Closed';
    case 'hidden': return isEl ? '⚫ Κρυμμένη' : '⚫ Hidden';
    default: return status;
  }
}

function createNewNote(map, appState) {
  const isEl = getCurrentLang() === 'el';
  alert(isEl
    ? 'Κάνε κλικ στον χάρτη για να δημιουργήσεις σημείωση.'
    : 'Click on map to create a note.');
  appState.createNotePending = true;
}

// Handle map click for creating note
appState.onMapClick_notesBrowser = function (lat, lng) {
  const isEl = getCurrentLang() === 'el';

  if (appState.createNotePending) {
    const text = prompt(isEl ? 'Περιγραφή προβλήματος:' : 'Problem description:');
    if (!text) {
      delete appState.createNotePending;
      return;
    }

    // Submit note via proxy
    const proxyUrl = `${WAYMARK_CONFIG.PROXY_URL}/notes`;
    const token = sessionStorage.getItem('osm_access_token');

    if (!token) {
      alert(isEl
        ? 'Πρέπει να συνδεθείς πρώτα (OSM Editor → Login).'
        : 'You need to log in first (OSM Editor → Login).');
      delete appState.createNotePending;
      return;
    }

    const formData = new URLSearchParams();
    formData.append('lat', lat);
    formData.append('lon', lng);
    formData.append('text', text);

    fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to create note');
        return res.json();
      })
      .then(data => {
        alert(isEl ? '✅ Η σημείωση δημιουργήθηκε!' : '✅ Note created!');
        fetchNotesInViewport(window.appStateRef?.map || map);
      })
      .catch(err => {
        console.error('Create note error:', err);
        alert(isEl ? 'Σφάλμα δημιουργίας σημείωσης.' : 'Error creating note.');
      })
      .finally(() => {
        delete appState.createNotePending;
      });
  }
};

// Cleanup
window._notes_browserCleanup = function () {
  notesMarkers.forEach(m => {
    if (window.appStateRef?.map) window.appStateRef.map.removeLayer(m);
  });
  notesMarkers = [];
};

window.initNotesBrowser = initNotesBrowser;