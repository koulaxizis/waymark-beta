/* =========================================================
   WAYMARK — Notes Browser Module
   Browse and interact with OSM Notes using Overpass API.
   ========================================================= */

let notesBrowserState = {
  mapMarkers: [],
  isLoading: false,
};

function initNotesBrowser(map, container, appState) {
  renderNotesUI(container);
  loadNotesInViewport(map);

  let viewportTimer = null;
  map.on('moveend', () => {
    clearTimeout(viewportTimer);
    viewportTimer = setTimeout(() => {
      loadNotesInViewport(map);
    }, 500);
  });

  function handleMapClick(lat, lng) {
    const clickedNote = notesBrowserState.mapMarkers.find(n =>
      n.lat == lat && n.lon == lng
    );
    if (clickedNote) {
      showNoteDetails(clickedNote.data, map);
    }
  }

  window.onMapClick_notesBrowser = handleMapClick;
}

function renderNotesUI(container) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
    <div class="notes-browser-ui">
      <div class="form-group">
        <label>${isEl ? 'Φίλτρο:' : 'Filter:'}</label>
        <select id="notesFilter" class="form-control">
          <option value="all">${isEl ? 'Όλες οι σημειώσεις' : 'All notes'}</option>
          <option value="open">${isEl ? 'Ανοικτές' : 'Open'}</option>
          <option value="closed">${isEl ? 'Κλειστές' : 'Closed'}</option>
        </select>
      </div>

      <button id="loadNotesBtn" class="btn btn-primary">
        🔍 ${isEl ? 'Φόρτωση Σημειώσεων' : 'Load Notes'}
      </button>

      <div id="notesStats" class="note-description" style="margin-top:0.5rem;"></div>
      <div id="notesList" class="results-list"></div>
    </div>
  `;

  document.getElementById('notesFilter').addEventListener('change', () => {
    loadNotesInViewport(map);
  });

  document.getElementById('loadNotesBtn').addEventListener('click', () => {
    loadNotesInViewport(map);
  });
}

async function loadNotesInViewport(map) {
  if (notesBrowserState.isLoading) return;
  notesBrowserState.isLoading = true;

  const bounds = map.getBounds();
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const bboxStr = `${sw.lat},${sw.lon},${ne.lat},${ne.lon}`;

  const filter = document.getElementById('notesFilter')?.value || 'all';
  const isEl = getCurrentLang() === 'el';

  showSpinner(true);

  try {
    // Note query using Overpass API
    // Notes are retrieved via the Nominatim/OSM Notes API, not Overpass
    // We'll use the OSM Notes API directly via proxy

    const cfg = window.WAYMARK_CONFIG || {};
    const baseUrl = cfg.PROXY_URL;

    // Fetch notes from OSM API via proxy
    const apiUrl = `${baseUrl}/api/0.6/notes?bbox=${bboxStr}&limit=100&only_open=true`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/xml' }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xmlText = await response.text();
    const notes = parseNotesXML(xmlText);

    // Clear existing markers
    notesBrowserState.mapMarkers.forEach(m => map.removeLayer(m));
    notesBrowserState.mapMarkers = [];

    // Filter notes
    let filteredNotes = notes;
    if (filter === 'open') {
      filteredNotes = notes.filter(n => n.status === 'open');
    } else if (filter === 'closed') {
      filteredNotes = notes.filter(n => n.status === 'closed');
    }

    const listEl = document.getElementById('notesList');
    listEl.innerHTML = '';

    if (filteredNotes.length === 0) {
      listEl.innerHTML = `<p>${isEl ? 'Δεν βρέθηκαν σημειώσεις' : 'No notes found'}</p>`;
      document.getElementById('notesStats').textContent = '';
      showSpinner(false);
      return;
    }

    // Add markers and build list
    filteredNotes.forEach(note => {
      const marker = L.circleMarker([note.lat, note.lon], {
        radius: 8,
        fillColor: note.status === 'open' ? '#6d4aff' : '#22c55e',
        color: note.status === 'open' ? '#6d4aff' : '#22c55e',
        weight: 2,
        fillOpacity: 0.7,
      });

      const popupContent = buildNotePopup(note);
      marker.bindPopup(popupContent);
      marker.addTo(map);

      notesBrowserState.mapMarkers.push({
        lat: note.lat,
        lon: note.lon,
        data: note,
        leaflet: marker
      });

      const item = document.createElement('div');
      item.className = 'result-item';
      item.innerHTML = `
        <strong>${note.status === 'open' ? '🔵' : '✅'} ${escapeHtml(note.comment?.substring(0, 40) || 'No description')}</strong>
        <small>ID: ${note.id} • ${new Date(note.date).toLocaleDateString()}</small>
        ${note.comments?.length > 0 ? `<small>• ${note.comments.length} ${isEl ? 'σχόλια' : 'comments'}</small>` : ''}
      `;

      item.addEventListener('click', () => showNoteDetails(note, map));
      listEl.appendChild(item);
    });

    document.getElementById('notesStats').textContent =
      isEl ? `Βρέθηκαν ${filteredNotes.length} σημειώσεις` : `Found ${filteredNotes.length} notes`;

  } catch (err) {
    console.error('Notes fetch error:', err);
    alert(isEl ? 'Σφάλμα κατά τη φόρτωση σημειώσεων: ' + err.message : 'Error loading notes: ' + err.message);
  } finally {
    notesBrowserState.isLoading = false;
    showSpinner(false);
  }
}

function parseNotesXML(xmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  const noteElements = xmlDoc.querySelectorAll('note');

  const notes = [];
  noteElements.forEach(elem => {
    const note = {
      id: elem.getAttribute('id'),
      lat: parseFloat(elem.getAttribute('lat')),
      lon: parseFloat(elem.getAttribute('lon')),
      status: elem.getAttribute('status'),
      date: elem.getAttribute('date'),
      comments: [],
      comment: null,
      url: null,
    };

    const comments = elem.querySelectorAll('comment');
    if (comments.length > 0) {
      const lastComment = comments[comments.length - 1];
      note.comment = lastComment.textContent;
    }

    comments.forEach(c => {
      note.comments.push({
        text: c.textContent,
        date: c.getAttribute('date'),
        action: c.getAttribute('action'),
      });
    });

    note.url = elem.getAttribute('url');

    notes.push(note);
  });

  return notes;
}

function buildNotePopup(note) {
  const isEl = getCurrentLang() === 'el';
  let html = `<div style="font-size:0.85rem; max-width:250px;">`;
  html += `<strong>${note.status === 'open' ? '🔵' : '✅'} ${isEl ? 'Σημείωση #' : 'Note #'}</strong> ${note.id}<br/>`;
  html += `<strong>📅 ${new Date(note.date).toLocaleDateString()}</strong><br/>`;
  html += `<br/><strong>${note.comment || ''}</strong>`;
  html += `<br/><br/><a href="${note.url}" target="_blank" style="color:var(--accent)">OSM ↗</a>`;
  html += '</div>';
  return html;
}

function showNoteDetails(note, map) {
  const isEl = getCurrentLang() === 'el';

  const panel = document.getElementById('activeModulePanel');
  const content = document.getElementById('moduleContent');

  panel.classList.add('active');
  document.getElementById('activeModuleTitle').textContent = '📝 ' + `#${note.id}`;

  content.innerHTML = `
    <div class="note-details">
      <div style="margin-bottom:0.5rem;">
        <strong>📍 ${isEl ? 'Συντεταγμένες:' : 'Coordinates:'}</strong> ${note.lat.toFixed(6)}, ${note.lon.toFixed(6)}
      </div>
      <div style="margin-bottom:0.5rem;">
        <strong>📅 ${isEl ? 'Ημερομηνία:' : 'Date:'}</strong> ${new Date(note.date).toLocaleString()}
      </div>
      <div style="margin-bottom:0.5rem;">
        <strong>🔄 ${isEl ? 'Κατάσταση:' : 'Status:'}</strong> ${note.status === 'open' ? '🔵 ' + (isEl ? 'Ανοικτή' : 'Open') : '✅ ' + (isEl ? 'Κλειστή' : 'Closed')}
      </div>

      <h4 style="margin:0.5rem 0;">💬 ${isEl ? 'Σχόλια' : 'Comments'} (${note.comments.length})</h4>
      <div class="note-comments">
        ${note.comments.map(c => `
          <div class="note-comment">
            <small>${new Date(c.date).toLocaleString()}</small>
            ${c.action ? `<span style="color:var(--accent)">${c.action}</span>` : ''}
            <p>${escapeHtml(c.text || '')}</p>
          </div>
        `).join('')}
      </div>

      <div class="poi-actions" style="margin-top:0.5rem;">
        <a href="${note.url}" target="_blank" class="btn btn-sm">${isEl ? 'Ανοίξτε στο OSM' : 'Open in OSM'}</a>
      </div>
    </div>
  `;

  // Center map on note
  map.setView([note.lat, note.lon], 16);
}

function showSpinner(show) {
  const btn = document.getElementById('loadNotesBtn');
  if (show) {
    btn.disabled = true;
    btn.textContent = getCurrentLang() === 'el' ? 'Φόρτωση...' : 'Loading...';
  } else {
    btn.disabled = false;
    btn.textContent = getCurrentLang() === 'el' ? 'Φόρτωση Σημειώσεων' : 'Load Notes';
  }
}

function _notesBrowserCleanup() {
  delete window.onMapClick_notesBrowser;
  if (window.appState?.map) {
    notesBrowserState.mapMarkers.forEach(m => window.appState.map.removeLayer(m));
  }
  notesBrowserState = { mapMarkers: [], isLoading: false };
}

window._notesBrowserCleanup = _notesBrowserCleanup;