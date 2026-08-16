/* =========================================================
   WAYMARK — Building Editor Module
   Draw building polygons by tapping vertices on the map.
   Mobile-first: tap to add vertex, double-tap or button to close.
   Uploads as OSM way with building=yes + tags.
   ========================================================= */

function initBuildingEditor(map, container, appState) {
  const isEl = getCurrentLang() === 'el';
  const token = sessionStorage.getItem('osm_access_token');
  const loggedIn = !!token;

  let vertices = [];
  let vertexMarkers = [];
  let polyline = null;
  let previewPolygon = null;
  let isClosed = false;

  container.innerHTML = `
    <style>
      .be-instructions {
        font-size: 0.8rem;
        color: var(--fg-muted);
        background: var(--bg-tertiary);
        padding: 0.5rem 0.75rem;
        border-radius: 4px;
        border-left: 3px solid var(--accent);
        margin-bottom: 0.75rem;
        line-height: 1.5;
      }
      .be-vertices {
        font-size: 0.78rem;
        color: var(--fg-muted);
        margin-bottom: 0.5rem;
        padding: 0.4rem 0.6rem;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 4px;
      }
      .be-preset-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.4rem;
        margin-bottom: 0.75rem;
      }
      .be-preset {
        background: var(--bg-tertiary);
        border: 1px solid var(--border);
        border-radius: 4px;
        padding: 0.5rem;
        cursor: pointer;
        font-size: 0.78rem;
        text-align: center;
        transition: var(--transition);
        color: var(--fg);
      }
      .be-preset:hover, .be-preset.active {
        border-color: var(--accent);
        background: var(--accent);
        color: white;
      }
      .be-tag-row {
        display: flex;
        gap: 0.3rem;
        margin-bottom: 0.3rem;
        align-items: center;
      }
      .be-tag-row input {
        flex: 1;
        min-width: 0;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 4px;
        color: var(--fg);
        padding: 0.4rem;
        font-size: 0.8rem;
        font-family: inherit;
      }
      .be-tag-row input:focus {
        outline: none;
        border-color: var(--accent);
      }
      .be-tag-row .be-tag-del {
        flex-shrink: 0;
        width: 28px;
        height: 28px;
        background: var(--danger);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.85rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .be-btn-row {
        display: flex;
        gap: 0.4rem;
      }
      .be-btn-row .btn { margin-bottom: 0; }
    </style>

    <h2>🏠 ${isEl ? 'Σχεδιασμός Κτηρίων' : 'Building Editor'}</h2>
    <div class="module-form">

      <div class="be-instructions" id="beInstructions">
        ${isEl
          ? '👆 Πάτησε στον χάρτη για να προσθέσεις κόμβους. Χρειάζονται τουλάχιστον 3 κόμβοι για κτήριο. Πάτησε "Κλείσιμο" για να ολοκληρώσεις το σχήμα.'
          : '👆 Tap on the map to add vertices. At least 3 vertices needed for a building. Press "Close" to finish the shape.'}
      </div>

      <div class="be-vertices" id="beVertexCount">
        ${isEl ? 'Κόμβοι: 0' : 'Vertices: 0'}
      </div>

      <div class="form-group">
        <label>${isEl ? 'Τύπος κτηρίου' : 'Building type'}</label>
        <div class="be-preset-grid" id="bePresets">
          <div class="be-preset active" data-building="yes" data-name="">🏢 ${isEl ? 'Γενικό' : 'Generic'}</div>
          <div class="be-preset" data-building="apartments" data-name="name">🏢 ${isEl ? 'Πολυκατοικία' : 'Apartments'}</div>
          <div class="be-preset" data-building="house" data-name="name">🏡 ${isEl ? 'Σπίτι' : 'House'}</div>
          <div class="be-preset" data-building="detached" data-name="name">🏡 ${isEl ? 'Μονόخانه' : 'Detached'}</div>
          <div class="be-preset" data-building="commercial" data-name="name">🏬 ${isEl ? 'Εμπορικό' : 'Commercial'}</div>
          <div class="be-preset" data-building="industrial" data-name="">🏭 ${isEl ? 'Βιομηχανικό' : 'Industrial'}</div>
          <div class="be-preset" data-building="school" data-name="name">🏫 ${isEl ? 'Σχολείο' : 'School'}</div>
          <div class="be-preset" data-building="church" data-name="name">⛪ ${isEl ? 'Εκκλησία' : 'Church'}</div>
        </div>
      </div>

      <div class="form-group">
        <label>${isEl ? 'Επιπλέον tags' : 'Additional tags'}</label>
        <div id="beTagRows"></div>
        <button class="btn btn-secondary" id="beAddTag" style="padding:0.4rem; font-size:0.8rem; margin-bottom:0;">+ ${isEl ? 'Προσθήκη tag' : 'Add tag'}</button>
      </div>

      <div class="be-btn-row" style="margin-bottom: 0.5rem;">
        <button class="btn btn-secondary" id="beUndoBtn" style="margin-bottom:0;">↩ ${isEl ? 'Αναίρεση' : 'Undo'}</button>
        <button class="btn btn-secondary" id="beCloseBtn" style="margin-bottom:0;" disabled>⬢ ${isEl ? 'Κλείσιμο' : 'Close'}</button>
        <button class="btn btn-danger" id="beClearBtn" style="margin-bottom:0;">🗑 ${isEl ? 'Καθαρισμό' : 'Clear'}</button>
      </div>

      ${loggedIn ? `
        <button class="btn btn-success" id="beUploadBtn" disabled>${isEl ? '📤 Ανέβασμα στο OSM' : '📤 Upload to OSM'}</button>
      ` : `
        <div class="login-badge">${isEl ? '🔒 Συνδέσου για ανέβασμα' : '🔒 Log in to upload'}</div>
      `}
      <button class="btn" id="beDownloadBtn" disabled>${t('common.download')} OSC</button>

    </div>
  `;

  let tagRows = [];
  let selectedPreset = { building: 'yes', nameKey: '' };

  renderTagRows();

  function renderTagRows() {
    const div = document.getElementById('beTagRows');
    div.innerHTML = '';
    tagRows.forEach((row, idx) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'be-tag-row';
      rowEl.innerHTML = `
        <input type="text" placeholder="key" value="${escapeHtml(row.key)}" data-be-key="${idx}">
        <input type="text" placeholder="value" value="${escapeHtml(row.value)}" data-be-val="${idx}">
        <button class="be-tag-del" data-be-del="${idx}">×</button>
      `;
      div.appendChild(rowEl);
      rowEl.querySelector(`[data-be-key="${idx}"]`).addEventListener('input', (e) => { tagRows[idx].key = e.target.value; });
      rowEl.querySelector(`[data-be-val="${idx}"]`).addEventListener('input', (e) => { tagRows[idx].value = e.target.value; });
      rowEl.querySelector(`[data-be-del="${idx}"]`).addEventListener('click', () => { tagRows.splice(idx, 1); renderTagRows(); });
    });
  }

  document.getElementById('beAddTag').addEventListener('click', () => {
    tagRows.push({ key: '', value: '' });
    renderTagRows();
  });

  // Preset selection
  document.querySelectorAll('.be-preset').forEach(p => {
    p.addEventListener('click', () => {
      document.querySelectorAll('.be-preset').forEach(x => x.classList.remove('active'));
      p.classList.add('active');
      selectedPreset = { building: p.dataset.building, nameKey: p.dataset.name };

      // Auto-add name tag if preset has a name field and it's not already there
      if (selectedPreset.nameKey === 'name' && !tagRows.find(r => r.key === 'name')) {
        tagRows.unshift({ key: 'name', value: '' });
        renderTagRows();
      }
    });
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  function updateVertexCount() {
    const el = document.getElementById('beVertexCount');
    el.textContent = (isEl ? 'Κόμβοι: ' : 'Vertices: ') + vertices.length;

    const closeBtn = document.getElementById('beCloseBtn');
    closeBtn.disabled = vertices.length < 3;
  }

  function addVertex(latlng) {
    if (isClosed) return;

    vertices.push(latlng);

    // Add marker
    const marker = L.circleMarker(latlng, {
      radius: 5,
      fillColor: '#6d4aff',
      color: 'white',
      weight: 2,
      fillOpacity: 1
    }).addTo(map);
    vertexMarkers.push(marker);

    // Update polyline
    if (polyline) map.removeLayer(polyline);
    if (vertices.length >= 2) {
      polyline = L.polyline(vertices, { color: '#6d4aff', weight: 3, opacity: 0.7, dashArray: '5,5' }).addTo(map);
    }

    // Preview polygon if 3+ vertices
    if (previewPolygon) map.removeLayer(previewPolygon);
    if (vertices.length >= 3) {
      previewPolygon = L.polygon(vertices, {
        color: '#6d4aff',
        weight: 2,
        opacity: 0.5,
        fillColor: '#6d4aff',
        fillOpacity: 0.15
      }).addTo(map);
    }

    updateVertexCount();

    // Enable upload if closed and has enough vertices
    const uploadBtn = document.getElementById('beUploadBtn');
    const downloadBtn = document.getElementById('beDownloadBtn');
    if (isClosed && vertices.length >= 3) {
      if (uploadBtn) uploadBtn.disabled = false;
      downloadBtn.disabled = false;
    }
  }

  function closeShape() {
    if (vertices.length < 3) return;
    isClosed = true;

    // Replace polyline with closed polygon
    if (polyline) map.removeLayer(polyline);
    if (previewPolygon) map.removeLayer(previewPolygon);

    polyline = L.polygon(vertices, {
      color: '#6d4aff',
      weight: 3,
      fillColor: '#6d4aff',
      fillOpacity: 0.2
    }).addTo(map);

    document.getElementById('beInstructions').innerHTML =
      isEl ? '✅ Σχήμα κλεισμένο. Επαεξεργάσου τα tags και ανέβασε.' : '✅ Shape closed. Edit tags and upload.';

    const uploadBtn = document.getElementById('beUploadBtn');
    const downloadBtn = document.getElementById('beDownloadBtn');
    if (uploadBtn) uploadBtn.disabled = false;
    downloadBtn.disabled = false;

    document.getElementById('beCloseBtn').disabled = true;
  }

  function undoVertex() {
    if (vertices.length === 0) return;
    vertices.pop();
    const marker = vertexMarkers.pop();
    if (marker) map.removeLayer(marker);

    if (polyline) map.removeLayer(polyline);
    if (previewPolygon) map.removeLayer(previewPolygon);
    polyline = null;
    previewPolygon = null;

    if (vertices.length >= 2) {
      polyline = L.polyline(vertices, { color: '#6d4aff', weight: 3, opacity: 0.7, dashArray: '5,5' }).addTo(map);
    }
    if (vertices.length >= 3) {
      previewPolygon = L.polygon(vertices, { color: '#6d4aff', weight: 2, opacity: 0.5, fillColor: '#6d4aff', fillOpacity: 0.15 }).addTo(map);
    }

    isClosed = false;
    document.getElementById('beInstructions').innerHTML =
      isEl
        ? '👆 Πάτησε στον χάρτη για να προσθέσεις κόμβους. Χρειάζονται τουλάχιστον 3 κόμβοι για κτήριο. Πάτησε "Κλείσιμο" για να ολοκληρώσεις το σχήμα.'
        : '👆 Tap on the map to add vertices. At least 3 vertices needed for a building. Press "Close" to finish the shape.';

    updateVertexCount();
    const uploadBtn = document.getElementById('beUploadBtn');
    const downloadBtn = document.getElementById('beDownloadBtn');
    if (uploadBtn) uploadBtn.disabled = true;
    downloadBtn.disabled = true;
    document.getElementById('beCloseBtn').disabled = vertices.length < 3;
  }

  function clearAll() {
    vertices = [];
    vertexMarkers.forEach(m => map.removeLayer(m));
    vertexMarkers = [];
    if (polyline) { map.removeLayer(polyline); polyline = null; }
    if (previewPolygon) { map.removeLayer(previewPolygon); previewPolygon = null; }
    isClosed = false;

    document.getElementById('beInstructions').innerHTML =
      isEl
        ? '👆 Πάτησε στον χάρτη για να προσθέσεις κόμβους. Χρειάζονται τουλάχιστον 3 κόμβοι για κτήριο. Πάτησε "Κλείσιμο" για να ολοκληρώσεις το σχήμα.'
        : '👆 Tap on the map to add vertices. At least 3 vertices needed for a building. Press "Close" to finish the shape.';

    updateVertexCount();
    const uploadBtn = document.getElementById('beUploadBtn');
    const downloadBtn = document.getElementById('beDownloadBtn');
    if (uploadBtn) uploadBtn.disabled = true;
    downloadBtn.disabled = true;
  }

  // Map click handler
  appState.onMapClick_buildingEditor = (lat, lng) => {
    if (isClosed) return;
    addVertex([lat, lng]);
  };

  document.getElementById('beUndoBtn').addEventListener('click', undoVertex);
  document.getElementById('beCloseBtn').addEventListener('click', closeShape);
  document.getElementById('beClearBtn').addEventListener('click', clearAll);

  // Build OSM XML
  function buildOsc(changesetId) {
    let xml = '<osmChange version="0.6" generator="Waymark">\n  <create>\n';

    // Create nodes for each vertex
    const nodeIds = [];
    vertices.forEach((v, i) => {
      const nodeId = -(i + 1);
      nodeIds.push(nodeId);
      xml += '    <node id="' + nodeId + '" version="0" changeset="' + changesetId + '" lat="' + v[0].toFixed(7) + '" lon="' + v[1].toFixed(7) + '"/>\n';
    });

    // Create way referencing all nodes (closed way = first node repeated)
    const wayId = -(vertices.length + 1);
    xml += '    <way id="' + wayId + '" version="0" changeset="' + changesetId + '">\n';
    nodeIds.forEach(id => {
      xml += '      <nd ref="' + id + '"/>\n';
    });
    // Close the way by repeating first node
    xml += '      <nd ref="' + nodeIds[0] + '"/>\n';

    // Add tags
    xml += '      <tag k="building" v="' + escapeXml(selectedPreset.building) + '"/>\n';
    tagRows.filter(r => r.key && r.value).forEach(tag => {
      xml += '      <tag k="' + escapeXml(tag.key) + '" v="' + escapeXml(tag.value) + '"/>\n';
    });
    xml += '      <tag k="source" v="Waymark"/>\n';
    xml += '    </way>\n';
    xml += '  </create>\n  <modify/>\n  <delete/>\n</osmChange>';

    return xml;
  }

  // Upload
  const uploadBtn = document.getElementById('beUploadBtn');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
      const cfg = window.WAYMARK_CONFIG;
      const currentToken = sessionStorage.getItem('osm_access_token');
      if (!currentToken) { alert(t('osm.not_logged_in')); return; }
      if (!isClosed || vertices.length < 3) {
        alert(isEl ? 'Κλείσε το σχήμα πρώτα.' : 'Close the shape first.');
        return;
      }

      uploadBtn.disabled = true;
      uploadBtn.textContent = isEl ? '⏳ Ανέβασμα...' : '⏳ Uploading...';

      try {
        // Create changeset
        const changesetXml = '<osm><changeset><tag k="created_by" v="Waymark"/><tag k="comment" v="Added building via Waymark"/></changeset></osm>';
        const csRes = await fetch(cfg.PROXY_URL + '/api/0.6/changeset/create', {
          method: 'PUT',
          headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/xml' },
          body: changesetXml,
        });
        if (!csRes.ok) throw new Error(await csRes.text());
        const changesetId = (await csRes.text()).trim();

        // Upload
        const osc = buildOsc(changesetId);
        const upRes = await fetch(cfg.PROXY_URL + '/api/0.6/changeset/' + changesetId + '/upload', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/xml' },
          body: osc,
        });
        if (!upRes.ok) throw new Error(await upRes.text());

        // Close changeset
        await fetch(cfg.PROXY_URL + '/api/0.6/changeset/' + changesetId + '/close', {
          method: 'PUT',
          headers: { 'Authorization': 'Bearer ' + currentToken },
        });

        uploadBtn.textContent = isEl ? '✅ Ανέβηκε! #' + changesetId : '✅ Uploaded! #' + changesetId;
        setTimeout(() => {
          uploadBtn.textContent = isEl ? '📤 Ανέβασμα στο OSM' : '📤 Upload to OSM';
          uploadBtn.disabled = false;
        }, 3000);
      } catch (err) {
        uploadBtn.textContent = isEl ? '📤 Ανέβασμα στο OSM' : '📤 Upload to OSM';
        uploadBtn.disabled = false;
        alert((isEl ? 'Σφάλμα: ' : 'Error: ') + err.message.substring(0, 150));
      }
    });
  }

  // Download OSC
  document.getElementById('beDownloadBtn').addEventListener('click', () => {
    if (!isClosed || vertices.length < 3) return;
    const osc = buildOsc(0);
    downloadFile(osc, 'waymark-building.osc', 'application/xml');
  });

  // Cleanup
  appState._buildingEditorCleanup = () => {
    delete appState.onMapClick_buildingEditor;
    vertexMarkers.forEach(m => map.removeLayer(m));
    if (polyline) map.removeLayer(polyline);
    if (previewPolygon) map.removeLayer(previewPolygon);
  };
}

window.initBuildingEditor = initBuildingEditor;