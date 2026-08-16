/* =========================================================
   WAYMARK — Road Editor Module
   Draw roads/paths by tapping vertices on the map.
   Highway type presets (residential, primary, footway, etc.)
   Uploads as OSM way with highway=* tags.
   Mobile-first: large touch targets, simple flow.
   ========================================================= */

function initRoadEditor(map, container, appState) {
  const isEl = getCurrentLang() === 'el';
  const token = sessionStorage.getItem('osm_access_token');
  const loggedIn = !!token;

  let vertices = [];
  let vertexMarkers = [];
  let polyline = null;
  let isFinished = false;
  let oneWay = false;

  // Highway type presets
  const HIGHWAY_PRESETS = {
    residential: { icon: '🏘️', label_el: 'Οδός κατοικίας', label_en: 'Residential' },
    primary: { icon: '🛣️', label_el: 'Πρωτεύον', label_en: 'Primary' },
    secondary: { icon: '🛣️', label_el: 'Δευτερεύον', label_en: 'Secondary' },
    tertiary: { icon: '🛣️', label_el: 'Τριτεύον', label_en: 'Tertiary' },
    unclassified: { icon: '🛣️', label_el: 'Αταξινόμητο', label_en: 'Unclassified' },
    service: { icon: '🅿️', label_el: 'Υπηρεσίας', label_en: 'Service' },
    track: { icon: '🚜', label_el: 'Χωματόδρομος', label_en: 'Track' },
    path: { icon: '🚶', label_el: 'Μονοπάτι', label_en: 'Path' },
    footway: { icon: '🚶', label_el: 'Πεζόδρομος', label_en: 'Footway' },
    cycleway: { icon: '🚲', label_el: 'Ποδηλατόδρομος', label_en: 'Cycleway' },
    pedestrian: { icon: '🚶', label_el: 'Πεζόδρομος (πλατεία)', label_en: 'Pedestrian' },
    bridging: { icon: '🌉', label_el: 'Γέφυρα', label_en: 'Bridge' },
  };

  const highwayKeys = Object.keys(HIGHWAY_PRESETS);

  container.innerHTML = `
    <style>
      .re-instructions {
        font-size: 0.8rem;
        color: var(--fg-muted);
        background: var(--bg-tertiary);
        padding: 0.5rem 0.75rem;
        border-radius: 4px;
        border-left: 3px solid var(--accent);
        margin-bottom: 0.75rem;
        line-height: 1.5;
      }
      .re-vertices {
        font-size: 0.78rem;
        color: var(--fg-muted);
        margin-bottom: 0.5rem;
        padding: 0.4rem 0.6rem;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 4px;
      }
      .re-highway-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.35rem;
        margin-bottom: 0.75rem;
      }
      .re-preset {
        background: var(--bg-tertiary);
        border: 1px solid var(--border);
        border-radius: 4px;
        padding: 0.45rem 0.35rem;
        cursor: pointer;
        font-size: 0.72rem;
        text-align: center;
        transition: var(--transition);
        color: var(--fg);
        line-height: 1.3;
      }
      .re-preset:hover, .re-preset.active {
        border-color: var(--accent);
        background: var(--accent);
        color: white;
      }
      .re-preset-icon {
        font-size: 1rem;
        display: block;
        margin-bottom: 0.15rem;
      }
      .re-toggle {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.8rem;
        color: var(--fg);
        margin-bottom: 0.5rem;
        cursor: pointer;
      }
      .re-toggle input[type="checkbox"] {
        width: 18px;
        height: 18px;
        accent-color: var(--accent);
        cursor: pointer;
      }
      .re-tag-row {
        display: flex;
        gap: 0.3rem;
        margin-bottom: 0.3rem;
        align-items: center;
      }
      .re-tag-row input {
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
      .re-tag-row input:focus {
        outline: none;
        border-color: var(--accent);
      }
      .re-tag-row .re-tag-del {
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
      .re-btn-row {
        display: flex;
        gap: 0.4rem;
      }
      .re-btn-row .btn { margin-bottom: 0; }
    </style>

    <h2>🛣️ ${isEl ? 'Σχεδιασμός Δρόμων' : 'Road Editor'}</h2>
    <div class="module-form">

      <div class="re-instructions" id="reInstructions">
        ${isEl
          ? '👆 Πάτησε στον χάρτη για να σχεδιάσεις τον δρόμο κόμβο-κόμβο. Πάτησε "Ολοκλήρωση" όταν τελειώσεις.'
          : '👆 Tap on the map to draw the road vertex by vertex. Press "Finish" when done.'}
      </div>

      <div class="re-vertices" id="reVertexCount">
        ${isEl ? 'Κόμβοι: 0' : 'Vertices: 0'}
      </div>

      <div class="form-group">
        <label>${isEl ? 'Τύπος δρόμου' : 'Road type'}</label>
        <div class="re-highway-grid" id="rePresets">
          ${highwayKeys.map((key, idx) => {
            const p = HIGHWAY_PRESETS[key];
            const label = isEl ? p.label_el : p.label_en;
            return `<div class="re-preset ${idx === 0 ? 'active' : ''}" data-highway="${key}">
              <span class="re-preset-icon">${p.icon}</span>${label}
            </div>`;
          }).join('')}
        </div>
      </div>

      <label class="re-toggle">
        <input type="checkbox" id="reOneWay">
        <span>${isEl ? 'Μονόδρομος (oneway=yes)' : 'One-way (oneway=yes)'}</span>
      </label>

      <div class="form-group">
        <label>${isEl ? 'Επιπλέον tags' : 'Additional tags'}</label>
        <div id="reTagRows"></div>
        <button class="btn btn-secondary" id="reAddTag" style="padding:0.4rem; font-size:0.8rem; margin-bottom:0;">+ ${isEl ? 'Προσθήκη tag' : 'Add tag'}</button>
      </div>

      <div class="re-btn-row" style="margin-bottom: 0.5rem;">
        <button class="btn btn-secondary" id="reUndoBtn" style="margin-bottom:0;">↩ ${isEl ? 'Αναίρεση' : 'Undo'}</button>
        <button class="btn btn-success" id="reFinishBtn" style="margin-bottom:0;" disabled>✓ ${isEl ? 'Ολοκλήρωση' : 'Finish'}</button>
        <button class="btn btn-danger" id="reClearBtn" style="margin-bottom:0;">🗑 ${isEl ? 'Καθαρισμός' : 'Clear'}</button>
      </div>

      ${loggedIn ? `
        <button class="btn btn-success" id="reUploadBtn" disabled>${isEl ? '📤 Ανέβασμα στο OSM' : '📤 Upload to OSM'}</button>
      ` : `
        <div class="login-badge">${isEl ? '🔒 Συνδέσου για ανέβασμα' : '🔒 Log in to upload'}</div>
      `}
      <button class="btn" id="reDownloadBtn" disabled>${t('common.download')} OSC</button>

    </div>
  `;

  let tagRows = [];
  let selectedHighway = 'residential';

  renderTagRows();

  function renderTagRows() {
    const div = document.getElementById('reTagRows');
    div.innerHTML = '';
    tagRows.forEach((row, idx) => {
      const rowEl = document.createElement('div');
      rowEl.className = 're-tag-row';
      rowEl.innerHTML = `
        <input type="text" placeholder="key" value="${escapeHtml(row.key)}" data-re-key="${idx}">
        <input type="text" placeholder="value" value="${escapeHtml(row.value)}" data-re-val="${idx}">
        <button class="re-tag-del" data-re-del="${idx}">×</button>
      `;
      div.appendChild(rowEl);
      rowEl.querySelector(`[data-re-key="${idx}"]`).addEventListener('input', (e) => { tagRows[idx].key = e.target.value; });
      rowEl.querySelector(`[data-re-val="${idx}"]`).addEventListener('input', (e) => { tagRows[idx].value = e.target.value; });
      rowEl.querySelector(`[data-re-del="${idx}"]`).addEventListener('click', () => { tagRows.splice(idx, 1); renderTagRows(); });
    });
  }

  document.getElementById('reAddTag').addEventListener('click', () => {
    tagRows.push({ key: '', value: '' });
    renderTagRows();
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  // Preset selection
  document.querySelectorAll('.re-preset').forEach(p => {
    p.addEventListener('click', () => {
      document.querySelectorAll('.re-preset').forEach(x => x.classList.remove('active'));
      p.classList.add('active');
      selectedHighway = p.dataset.highway;
    });
  });

  document.getElementById('reOneWay').addEventListener('change', (e) => {
    oneWay = e.target.checked;
  });

  function updateVertexCount() {
    const el = document.getElementById('reVertexCount');
    el.textContent = (isEl ? 'Κόμβοι: ' : 'Vertices: ') + vertices.length;
    document.getElementById('reFinishBtn').disabled = vertices.length < 2;
  }

  // Color per highway type
  function getHighwayColor(type) {
    const colors = {
      residential: '#ffaa33',
      primary: '#e84a3a',
      secondary: '#ffa040',
      tertiary: '#ffd070',
      unclassified: '#ffc060',
      service: '#aaaaaa',
      track: '#cc8844',
      path: '#66bb44',
      footway: '#66bb44',
      cycleway: '#3399ff',
      pedestrian: '#88dd66',
      bridging: '#cc5533',
    };
    return colors[type] || '#6d4aff';
  }

  function addVertex(latlng) {
    if (isFinished) return;
    vertices.push(latlng);

    const color = getHighwayColor(selectedHighway);

    const marker = L.circleMarker(latlng, {
      radius: 5,
      fillColor: color,
      color: 'white',
      weight: 2,
      fillOpacity: 1
    }).addTo(map);
    vertexMarkers.push(marker);

    if (polyline) map.removeLayer(polyline);
    if (vertices.length >= 2) {
      polyline = L.polyline(vertices, {
        color: color,
        weight: 5,
        opacity: 0.85
      }).addTo(map);
    }

    updateVertexCount();
  }

  function finishRoad() {
    if (vertices.length < 2) return;
    isFinished = true;

    const color = getHighwayColor(selectedHighway);
    if (polyline) map.removeLayer(polyline);
    polyline = L.polyline(vertices, {
      color: color,
      weight: 6,
      opacity: 1
    }).addTo(map);

    // Add arrows on vertex markers
    vertexMarkers.forEach(m => {
      m.setStyle({ radius: 4, fillColor: color, fillOpacity: 0.6 });
    });

    document.getElementById('reInstructions').innerHTML =
      isEl ? '✅ Δρόμος ολοκληρωμένος. Έλεγξε τα tags και ανέβασε.' : '✅ Road finished. Check tags and upload.';

    const uploadBtn = document.getElementById('reUploadBtn');
    const downloadBtn = document.getElementById('reDownloadBtn');
    if (uploadBtn) uploadBtn.disabled = false;
    downloadBtn.disabled = false;
    document.getElementById('reFinishBtn').disabled = true;
  }

  function undoVertex() {
    if (vertices.length === 0) return;
    vertices.pop();
    const marker = vertexMarkers.pop();
    if (marker) map.removeLayer(marker);

    if (polyline) map.removeLayer(polyline);
    polyline = null;

    if (vertices.length >= 2) {
      const color = getHighwayColor(selectedHighway);
      polyline = L.polyline(vertices, { color: color, weight: 5, opacity: 0.85 }).addTo(map);
    }

    isFinished = false;
    document.getElementById('reInstructions').innerHTML =
      isEl
        ? '👆 Πάτησε στον χάρτη για να σχεδιάσεις τον δρόμο κόμβο-κόμβο. Πάτησε "Ολοκλήρωση" όταν τελειώσεις.'
        : '👆 Tap on the map to draw the road vertex by vertex. Press "Finish" when done.';

    updateVertexCount();
    const uploadBtn = document.getElementById('reUploadBtn');
    const downloadBtn = document.getElementById('reDownloadBtn');
    if (uploadBtn) uploadBtn.disabled = true;
    downloadBtn.disabled = true;
  }

  function clearAll() {
    vertices = [];
    vertexMarkers.forEach(m => map.removeLayer(m));
    vertexMarkers = [];
    if (polyline) { map.removeLayer(polyline); polyline = null; }
    isFinished = false;

    document.getElementById('reInstructions').innerHTML =
      isEl
        ? '👆 Πάτησε στον χάρτη για να σχεδιάσεις τον δρόμο κόμβο-κόμβο. Πάτησε "Ολοκλήρωση" όταν τελειώσεις.'
        : '👆 Tap on the map to draw the road vertex by vertex. Press "Finish" when done.';

    updateVertexCount();
    const uploadBtn = document.getElementById('reUploadBtn');
    const downloadBtn = document.getElementById('reDownloadBtn');
    if (uploadBtn) uploadBtn.disabled = true;
    downloadBtn.disabled = true;
  }

  // Map click handler
  appState.onMapClick_roadEditor = (lat, lng) => {
    if (isFinished) return;
    addVertex([lat, lng]);
  };

  document.getElementById('reUndoBtn').addEventListener('click', undoVertex);
  document.getElementById('reFinishBtn').addEventListener('click', finishRoad);
  document.getElementById('reClearBtn').addEventListener('click', clearAll);

  // Build OSC
  function buildOsc(changesetId) {
    let xml = '<osmChange version="0.6" generator="Waymark">\n  <create>\n';

    const nodeIds = [];
    vertices.forEach((v, i) => {
      const nodeId = -(i + 1);
      nodeIds.push(nodeId);
      xml += '    <node id="' + nodeId + '" version="0" changeset="' + changesetId + '" lat="' + v[0].toFixed(7) + '" lon="' + v[1].toFixed(7) + '"/>\n';
    });

    const wayId = -(vertices.length + 1);
    xml += '    <way id="' + wayId + '" version="0" changeset="' + changesetId + '">\n';
    nodeIds.forEach(id => {
      xml += '      <nd ref="' + id + '"/>\n';
    });

    xml += '      <tag k="highway" v="' + escapeXml(selectedHighway) + '"/>\n';
    if (oneWay) {
      xml += '      <tag k="oneway" v="yes"/>\n';
    }
    tagRows.filter(r => r.key && r.value).forEach(tag => {
      xml += '      <tag k="' + escapeXml(tag.key) + '" v="' + escapeXml(tag.value) + '"/>\n';
    });
    xml += '      <tag k="source" v="Waymark"/>\n';
    xml += '    </way>\n';
    xml += '  </create>\n  <modify/>\n  <delete/>\n</osmChange>';

    return xml;
  }

  // Upload
  const uploadBtn = document.getElementById('reUploadBtn');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
      const cfg = window.WAYMARK_CONFIG;
      const currentToken = sessionStorage.getItem('osm_access_token');
      if (!currentToken) { alert(t('osm.not_logged_in')); return; }
      if (!isFinished || vertices.length < 2) {
        alert(isEl ? 'Ολοκλήρωσε τον δρόμο πρώτα.' : 'Finish the road first.');
        return;
      }

      uploadBtn.disabled = true;
      uploadBtn.textContent = isEl ? '⏳ Ανέβασμα...' : '⏳ Uploading...';

      try {
        const changesetXml = '<osm><changeset><tag k="created_by" v="Waymark"/><tag k="comment" v="Added road via Waymark"/></changeset></osm>';
        const csRes = await fetch(cfg.PROXY_URL + '/api/0.6/changeset/create', {
          method: 'PUT',
          headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/xml' },
          body: changesetXml,
        });
        if (!csRes.ok) throw new Error(await csRes.text());
        const changesetId = (await csRes.text()).trim();

        const osc = buildOsc(changesetId);
        const upRes = await fetch(cfg.PROXY_URL + '/api/0.6/changeset/' + changesetId + '/upload', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/xml' },
          body: osc,
        });
        if (!upRes.ok) throw new Error(await upRes.text());

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
  document.getElementById('reDownloadBtn').addEventListener('click', () => {
    if (!isFinished || vertices.length < 2) return;
    const osc = buildOsc(0);
    downloadFile(osc, 'waymark-road.osc', 'application/xml');
  });

  // Cleanup
  appState._roadEditorCleanup = () => {
    delete appState.onMapClick_roadEditor;
    vertexMarkers.forEach(m => map.removeLayer(m));
    if (polyline) map.removeLayer(polyline);
  };
}

window.initRoadEditor = initRoadEditor;