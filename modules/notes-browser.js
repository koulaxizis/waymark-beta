/* =========================================================
   WAYMARK — Notes Browser Module
   Browse and interact with OSM Notes.
   ========================================================= */

var notesBrowserState = {
  mapMarkers: [],
  isLoading: false
};

function initNotesBrowser(map, container, appState) {
  renderNotesUI(container);
  loadNotesInViewport(map);

  var viewportTimer = null;
  map.on('moveend', function () {
    clearTimeout(viewportTimer);
    viewportTimer = setTimeout(function () {
      loadNotesInViewport(map);
    }, 500);
  });

  function handleMapClick(lat, lng) {
    var clicked = notesBrowserState.mapMarkers.find(function (m) {
      return m.lat === lat && m.lon === lng;
    });
    if (clicked) showNoteDetails(clicked.data, map);
  }

  window.onMapClick_notesBrowser = handleMapClick;
}

function renderNotesUI(container) {
  var isEl = getCurrentLang() === 'el';

  container.innerHTML =
    '<div class="notes-browser-ui">' +
    '  <div class="form-group"><label>' + (isEl ? 'Φίλτρο:' : 'Filter:') + '</label>' +
    '    <select id="notesFilter" class="form-control">' +
    '      <option value="all">' + (isEl ? 'Όλες' : 'All') + '</option>' +
    '      <option value="open">' + (isEl ? 'Ανοικτές' : 'Open') + '</option>' +
    '      <option value="closed">' + (isEl ? 'Κλειστές' : 'Closed') + '</option>' +
    '    </select>' +
    '  </div>' +
    '  <button id="loadNotesBtn" class="btn btn-primary">🔍 ' + (isEl ? 'Φόρτωση' : 'Load Notes') + '</button>' +
    '  <div id="notesStats" class="note-description" style="margin-top:0.5rem;"></div>' +
    '  <div id="notesList" class="results-list"></div>' +
    '</div>';

  var filterEl = document.getElementById('notesFilter');
  var loadBtn = document.getElementById('loadNotesBtn');

  if (filterEl) filterEl.addEventListener('change', function () { loadNotesInViewport(map); });
  if (loadBtn) loadBtn.addEventListener('click', function () { loadNotesInViewport(map); });
}

async function loadNotesInViewport(map) {
  if (notesBrowserState.isLoading) return;
  notesBrowserState.isLoading = true;

  var bounds = map.getBounds();
  var sw = bounds.getSouthWest();
  var ne = bounds.getNorthEast();
  var bboxStr = sw.lat + ',' + sw.lon + ',' + ne.lat + ',' + ne.lon;

  var filterVal = 'all';
  var filterEl = document.getElementById('notesFilter');
  if (filterEl) filterVal = filterEl.value || 'all';

  var isEl = getCurrentLang() === 'el';
  showNotesSpinner(true);

  try {
    var cfg = window.WAYMARK_CONFIG || {};
    var proxyUrl = cfg.PROXY_URL;

    if (!proxyUrl) {
      throw new Error(isEl ? 'PROXY_URL δεν ρυθμίστηκε' : 'PROXY_URL not configured');
    }

    var onlyOpen = filterVal === 'open' ? '&only_open=true' : '';
    var apiUrl = proxyUrl + '/api/0.6/notes?bbox=' + bboxStr + '&limit=100' + onlyOpen;

    var response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/xml' }
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    var xmlText = await response.text();
    var notes = parseNotesXML(xmlText);

    // Clear existing markers
    notesBrowserState.mapMarkers.forEach(function (m) {
      if (m.leaflet && map) map.removeLayer(m.leaflet);
    });
    notesBrowserState.mapMarkers = [];

    // Filter
    var filtered = notes;
    if (filterVal === 'open') {
      filtered = notes.filter(function (n) { return n.status === 'open'; });
    } else if (filterVal === 'closed') {
      filtered = notes.filter(function (n) { return n.status === 'closed'; });
    }

    var listEl = document.getElementById('notesList');
    if (!listEl) { notesBrowserState.isLoading = false; showNotesSpinner(false); return; }
    listEl.innerHTML = '';

    if (filtered.length === 0) {
      listEl.innerHTML = '<p>' + (isEl ? 'Δεν βρέθηκαν σημειώσεις' : 'No notes found') + '</p>';
      var statsEl0 = document.getElementById('notesStats');
      if (statsEl0) statsEl0.textContent = '';
      notesBrowserState.isLoading = false;
      showNotesSpinner(false);
      return;
    }

    filtered.forEach(function (note) {
      var marker = L.circleMarker([note.lat, note.lon], {
        radius: 8,
        fillColor: note.status === 'open' ? '#6d4aff' : '#22c55e',
        color: note.status === 'open' ? '#6d4aff' : '#22c55e',
        weight: 2,
        fillOpacity: 0.7
      });

      marker.bindPopup(buildNotePopup(note));
      marker.addTo(map);

      notesBrowserState.mapMarkers.push({
        lat: note.lat,
        lon: note.lon,
        data: note,
        leaflet: marker
      });

      var item = document.createElement('div');
      item.className = 'result-item';
      item.innerHTML =
        '<strong>' + (note.status === 'open' ? '🔵' : '✅') + ' ' +
        escapeHtml((note.comment || '').substring(0, 40) || (isEl ? 'Χωρίς περιγραφή' : 'No description')) + '</strong>' +
        '<small>ID: ' + note.id + ' • ' + new Date(note.date).toLocaleDateString() + '</small>' +
        (note.comments && note.comments.length > 0 ? '<small>• ' + note.comments.length + (isEl ? ' σχόλια' : ' comments') + '</small>' : '');

      item.addEventListener('click', function () { showNoteDetails(note, map); });
      listEl.appendChild(item);
    });

    var statsEl = document.getElementById('notesStats');
    if (statsEl) {
      statsEl.textContent = isEl ? 'Βρέθηκαν ' + filtered.length + ' σημειώσεις' : 'Found ' + filtered.length + ' notes';
    }

  } catch (err) {
    console.error('Notes fetch error:', err);
    alert((isEl ? 'Σφάλμα: ' : 'Error: ') + err.message);
  } finally {
    notesBrowserState.isLoading = false;
    showNotesSpinner(false);
  }
}

function parseNotesXML(xmlText) {
  var parser = new DOMParser();
  var xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  var noteElems = xmlDoc.querySelectorAll('note');

  var notes = [];
  noteElems.forEach(function (elem) {
    var note = {
      id: elem.getAttribute('id'),
      lat: parseFloat(elem.getAttribute('lat')),
      lon: parseFloat(elem.getAttribute('lon')),
      status: elem.getAttribute('status'),
      date: elem.getAttribute('date_created') || elem.getAttribute('date'),
      comments: [],
      comment: null,
      url: 'https://www.openstreetmap.org/note/' + elem.getAttribute('id')
    };

    var commentElems = elem.querySelectorAll('comment');
    commentElems.forEach(function (c) {
      var textElem = c.querySelector('text');
      var text = textElem ? textElem.textContent : c.textContent;
      note.comments.push({
        text: text,
        date: c.getAttribute('date'),
        action: c.getAttribute('action')
      });
    });

    if (note.comments.length > 0) {
      note.comment = note.comments[note.comments.length - 1].text;
    }

    notes.push(note);
  });

  return notes;
}

function buildNotePopup(note) {
  var isEl = getCurrentLang() === 'el';
  var html = '<div style="font-size:0.85rem;max-width:250px;">';
  html += '<strong>' + (note.status === 'open' ? '🔵' : '✅') + ' ' + (isEl ? 'Σημείωση #' : 'Note #') + note.id + '</strong><br/>';
  html += '<small>📅 ' + new Date(note.date).toLocaleDateString() + '</small><br/>';
  html += '<br/><strong>' + escapeHtml(note.comment || '') + '</strong>';
  html += '<br/><br/><a href="' + note.url + '" target="_blank" style="color:#6d4aff">OSM ↗</a>';
  html += '</div>';
  return html;
}

function showNoteDetails(note, map) {
  var isEl = getCurrentLang() === 'el';

  var panel = document.getElementById('activeModulePanel');
  var content = document.getElementById('moduleContent');

  if (!panel || !content) return;

  panel.classList.add('active');
  document.getElementById('activeModuleTitle').textContent = '📝 #' + note.id;

  var commentsHtml = note.comments.map(function (c) {
    return '<div class="note-description">' +
      '<small>📅 ' + new Date(c.date || '').toLocaleString() + '</small>' +
      (c.action ? '<br/><span style="color:#6d4aff">' + escapeHtml(c.action) + '</span>' : '') +
      '<p>' + escapeHtml(c.text || '') + '</p>' +
      '</div>';
  }).join('');

  content.innerHTML =
    '<div class="note-details">' +
    '  <div style="margin-bottom:0.5rem;"><strong>📍 ' + (isEl ? 'Συντεταγμένες:' : 'Coordinates:') + '</strong> ' + note.lat.toFixed(6) + ', ' + note.lon.toFixed(6) + '</div>' +
    '  <div style="margin-bottom:0.5rem;"><strong>📅 ' + (isEl ? 'Ημερομηνία:' : 'Date:') + '</strong> ' + new Date(note.date).toLocaleString() + '</div>' +
    '  <div style="margin-bottom:0.5rem;"><strong>🔄 ' + (isEl ? 'Κατάσταση:' : 'Status:') + '</strong> ' + (note.status === 'open' ? '🔵 ' + (isEl ? 'Ανοικτή' : 'Open') : '✅ ' + (isEl ? 'Κλειστή' : 'Closed')) + '</div>' +
    '  <h4>💬 ' + (isEl ? 'Σχόλια' : 'Comments') + ' (' + note.comments.length + ')</h4>' +
    commentsHtml +
    '  <a href="' + note.url + '" target="_blank" class="btn btn-sm" style="margin-top:0.5rem;">' + (isEl ? 'Άνοιγμα στο OSM' : 'Open in OSM') + '</a>' +
    '</div>';

  map.setView([note.lat, note.lon], 16);
}

function showNotesSpinner(show) {
  var btn = document.getElementById('loadNotesBtn');
  if (!btn) return;
  var isEl = getCurrentLang() === 'el';
  if (show) {
    btn.disabled = true;
    btn.textContent = isEl ? 'Φόρτωση...' : 'Loading...';
  } else {
    btn.disabled = false;
    btn.textContent = isEl ? 'Φόρτωση' : 'Load Notes';
  }
}

function _notesBrowserCleanup() {
  delete window.onMapClick_notesBrowser;
  if (window.appState && window.appState.map) {
    notesBrowserState.mapMarkers.forEach(function (m) {
      if (m.leaflet) window.appState.map.removeLayer(m.leaflet);
    });
  }
  notesBrowserState = { mapMarkers: [], isLoading: false };
}

window._notesBrowserCleanup = _notesBrowserCleanup;