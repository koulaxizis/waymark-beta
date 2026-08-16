/* =========================================================
   WAYMARK — OSM Editor Module
   - Create new POIs from map markers
   - Edit existing POIs fetched from Overpass
   Uses OAuth 2.0 PKCE + Cloudflare Worker proxy.
   ========================================================= */

function initOsmEditor(map, container, appState) {
  const isEl = getCurrentLang() === 'el';
  const token = sessionStorage.getItem('osm_access_token');
  const loggedIn = !!token;

  let tagRows = [{ key: 'name', value: '' }];
  let editingNode = null;
  let poiLayer = null;

  container.innerHTML = `
    <style>
      .tag-row {
        display: flex;
        gap: 0.3rem;
        margin-bottom: 0.3rem;
        align-items: center;
      }
      .tag-row input {
        flex: 1;
        min-width: 0;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 4px;
        color: var(--fg);
        padding: 0.4rem;
        font-size: 0.8rem;
        font-family: inherit;
        transition: var(--transition);
      }
      .tag-row input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 2px rgba(109, 74, 255, 0.15);
      }
      .tag-row .tag-del {
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
        transition: var(--transition);
      }
      .tag-row .tag-del:hover {
        filter: brightness(1.15);
      }
      .section-divider {
        border: none;
        border-top: 1px solid var(--border);
        margin: 0.75rem 0;
      }
      .editing-badge {
        background: rgba(109, 74, 255, 0.15);
        border: 1px solid var(--accent);
        color: var(--accent);
        padding: 0.4rem 0.6rem;
        border-radius: 4px;
        font-size: 0.78rem;
        margin-bottom: 0.5rem;
        display: none;
      }
      .editing-badge.visible { display: block; }
    </style>

    <h2>📤 ${t('module.osm_editor')}</h2>
    <div class="module-form">
      <div class="login-badge ${loggedIn ? 'active' : ''}">
        ${loggedIn ? '✅ ' + t('osm.logged_in_as') : '🔒 ' + t('osm.not_logged_in')}
      </div>

      ${!loggedIn ? `<button class="btn btn-success" id="osmLoginBtn">${t('osm.login')}</button>` : ''}

      <div class="editing-badge" id="editingBadge">
        ✏️ ${isEl ? 'Επεξεργασία Node #' : 'Editing Node #'}<span id="editingNodeId"></span>
      </div>

      <div class="form-group">
        <label for="osmComment">${t('osm.changeset_comment')}</label>
        <input type="text" id="osmComment" value="Added via Waymark" />
      </div>

      <div class="form-group">
        <label>${isEl ? 'Tags' : 'Tags'}</label>
        <div id="osmTagRows"></div>
        <button class="btn btn-secondary" id="osmAddTag" style="padding: 0.4rem; font-size: 0.8rem; margin-bottom: 0;">+ ${isEl ? 'Προσθήκη tag' : 'Add tag'}</button>
      </div>

      ${loggedIn ? `
        <button class="btn btn-success" id="osmUploadBtn">${t('osm.upload')}</button>
      ` : ''}
      <button class="btn" id="osmDownloadBtn">${t('osm.download_osc')}</button>

      <hr class="section-divider">

      <div class="form-group">
        <label>${isEl ? 'Επεξεργασία υπάρχοντος POI' : 'Edit existing POI'}</label>
        <button class="btn btn-secondary" id="osmFetchPOIs" style="margin-bottom: 0.5rem;">${isEl ? 'Φόρτωση POIs στην περιοχή' : 'Fetch POIs in area'}</button>
        <div class="results-list" id="osmPOIList" style="max-height: 200px;"></div>
      </div>

      <div class="results-list" id="osmStatus">
        <div class="result-item" style="cursor: default; opacity: 0.6;">
          ${isEl ? 'Σημεία στον χάρτη:' : 'Points on map:'} <span id="osmPointCount">0</span>
        </div>
      </div>
    </div>
  `;

  renderTagRows();

  function renderTagRows() {
    const div = document.getElementById('osmTagRows');
    div.innerHTML = '';
    tagRows.forEach((row, idx) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'tag-row';
      rowEl.innerHTML = `
        <input type="text" placeholder="key" value="${row.key}" data-tag-key="${idx}">
        <input type="text" placeholder="value" value="${row.value}" data-tag-val="${idx}">
        <button class="tag-del" data-tag-del="${idx}">×</button>
      `;
      div.appendChild(rowEl);
      rowEl.querySelector(`[data-tag-key="${idx}"]`).addEventListener('input', (e) => { tagRows[idx].key = e.target.value; });
      rowEl.querySelector(`[data-tag-val="${idx}"]`).addEventListener('input', (e) => { tagRows[idx].value = e.target.value; });
      rowEl.querySelector(`[data-tag-del="${idx}"]`).addEventListener('click', () => { tagRows.splice(idx, 1); renderTagRows(); });
    });
  }

  document.getElementById('osmAddTag').addEventListener('click', () => {
    tagRows.push({ key: '', value: '' });
    renderTagRows();
  });

  function updateCount() {
    const el = document.getElementById('osmPointCount');
    if (el) el.textContent = appState.mapMarkers.length;
  }
  updateCount();
  setInterval(updateCount, 500);

  const loginBtn = document.getElementById('osmLoginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', startOAuthLogin);
  }

  // --- Fetch POIs for editing ---
  document.getElementById('osmFetchPOIs').addEventListener('click', async () => {
    const listDiv = document.getElementById('osmPOIList');
    listDiv.innerHTML = '<div class="spinner"></div>';

    const bounds = map.getBounds();
    const bbox = bounds.getSouth() + ',' + bounds.getWest() + ',' + bounds.getNorth() + ',' + bounds.getEast();

    const query = '[out:json][timeout:25];(node["amenity"](' + bbox + ');node["shop"](' + bbox + ');node["tourism"](' + bbox + '););out body 50;';

    try {
      const fetchFn = window.safeOverpassFetch || safeOverpassFetch;
      const data = await fetchFn(query, isEl);

      if (poiLayer) { map.removeLayer(poiLayer); poiLayer = null; }
      poiLayer = L.layerGroup();
      appState.mapMarkers.forEach(m => map.removeLayer(m));
      appState.mapMarkers = [];

      const nodes = data.elements.filter(e => e.type === 'node' && e.lat && e.lon);

      if (nodes.length === 0) {
        listDiv.innerHTML = '<div class="result-item">' + t('common.no_results') + '</div>';
        return;
      }

      listDiv.innerHTML = '';
      poiLayer.addTo(map);

      nodes.forEach(node => {
        const tags = node.tags || {};
        const name = tags.name || tags['name:en'] || (isEl ? 'Χωρίς όνομα' : 'Unnamed');
        const category = tags.amenity || tags.shop || tags.tourism || '';

        const marker = L.circleMarker([node.lat, node.lon], {
          radius: 6,
          fillColor: '#6d4aff',
          color: '#6d4aff',
          fillOpacity: 0.5,
          weight: 1
        });
        poiLayer.addLayer(marker);

        const item = document.createElement('div');
        item.className = 'result-item';
        item.innerHTML = '<strong>' + name + '</strong><br><small>' + category + ' · #' + node.id + '</small>';
        item.addEventListener('click', () => selectPOIForEditing(node, marker));
        listDiv.appendChild(item);
      });
    } catch (err) {
      let msg = err.message;
      if (msg === 'Failed to fetch') {
        msg = isEl ? 'Αδυναμία σύνδεσης με Overpass' : 'Cannot connect to Overpass';
      }
      listDiv.innerHTML = '<div class="result-item">' + t('common.error') + ': ' + msg + '</div>';
    }
  });

  function selectPOIForEditing(node, marker) {
    editingNode = node;

    const badge = document.getElementById('editingBadge');
    const badgeId = document.getElementById('editingNodeId');
    badge.classList.add('visible');
    badgeId.textContent = node.id;

    // Load tags from the node into tagRows
    tagRows = Object.entries(node.tags || {}).map(([k, v]) => ({ key: k, value: v }));
    renderTagRows();

    // Update upload button text
    const uploadBtn = document.getElementById('osmUploadBtn');
    if (uploadBtn) {
      uploadBtn.textContent = isEl ? '💾 Αποθήκευση αλλαγών' : '💾 Save changes';
    }

    // Highlight the selected marker
    if (poiLayer) {
      poiLayer.eachLayer(l => {
        l.setStyle({ fillColor: '#6d4aff', fillOpacity: 0.5, radius: 6 });
      });
      marker.setStyle({ fillColor: '#ffb143', fillOpacity: 0.9, radius: 8 });
    }

    map.setView([node.lat, node.lon], 16);
    marker.bindPopup(
      '<b>' + (node.tags?.name || 'Node #' + node.id) + '</b><br>' +
      '<small>Version: ' + node.version + ' · ID: ' + node.id + '</small><br>' +
      '<small>' + node.lat.toFixed(6) + ', ' + node.lon.toFixed(6) + '</small>'
    ).openPopup();
  }

  // --- Upload (Create or Modify) ---
  const uploadBtn = document.getElementById('osmUploadBtn');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
      const cfg = window.WAYMARK_CONFIG;
      if (!cfg || cfg.OSM_CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
        alert(t('osm.config_warning'));
        return;
      }

      const currentToken = sessionStorage.getItem('osm_access_token');
      if (!currentToken) {
        alert(t('osm.not_logged_in'));
        return;
      }

      const statusDiv = document.getElementById('osmStatus');

      const comment = document.getElementById('osmComment').value || (editingNode ? 'Edited via Waymark' : 'Added via Waymark');
      const validTags = tagRows.filter(tr => tr.key && tr.value);

      try {
        // Step 1: Create changeset
        const changesetXml =
          '<osm><changeset>' +
          '<tag k="created_by" v="Waymark"/>' +
          '<tag k="comment" v="' + escapeXml(comment) + '"/>' +
          '</changeset></osm>';

        const csResponse = await fetch(cfg.PROXY_URL + '/api/0.6/changeset/create', {
          method: 'PUT',
          headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/xml' },
          body: changesetXml,
        });

        if (!csResponse.ok) {
          const errText = await csResponse.text();
          throw new Error('Changeset creation failed: ' + csResponse.status + ' ' + errText);
        }

        const changesetId = (await csResponse.text()).trim();
        statusDiv.innerHTML = '<div class="result-item"><div class="spinner"></div></div>';

        let oscXml;

        if (editingNode) {
          // --- EDIT MODE: modify existing node ---
          if (!editingNode.version) {
            throw new Error(isEl ? 'Δεν βρέθηκε version του node.' : 'Node version not found.');
          }

          oscXml = '<osmChange version="0.6" generator="Waymark">\n  <modify>\n';
          oscXml += '    <node id="' + editingNode.id + '" version="' + editingNode.version + '" changeset="' + changesetId + '" lat="' + editingNode.lat.toFixed(7) + '" lon="' + editingNode.lon.toFixed(7) + '">\n';
          validTags.forEach(tag => {
            oscXml += '      <tag k="' + escapeXml(tag.key) + '" v="' + escapeXml(tag.value) + '"/>\n';
          });
          oscXml += '      <tag k="source" v="Waymark"/>\n';
          oscXml += '    </node>\n';
          oscXml += '  </modify>\n</osmChange>';

        } else {
          // --- CREATE MODE: new nodes from map markers ---
          if (appState.mapMarkers.length === 0) {
            alert(t('osm.no_points'));
            return;
          }

          oscXml = '<osmChange version="0.6" generator="Waymark">\n  <create>\n';
          appState.mapMarkers.forEach((marker, idx) => {
            const pos = marker.getLatLng();
            const nodeId = -(idx + 1);
            oscXml += '    <node id="' + nodeId + '" version="0" changeset="' + changesetId + '" lat="' + pos.lat.toFixed(7) + '" lon="' + pos.lng.toFixed(7) + '">\n';
            validTags.forEach(tag => {
              oscXml += '      <tag k="' + escapeXml(tag.key) + '" v="' + escapeXml(tag.value) + '"/>\n';
            });
            oscXml += '      <tag k="source" v="Waymark"/>\n';
            oscXml += '    </node>\n';
          });
          oscXml += '  </create>\n  <modify/>\n  <delete/>\n</osmChange>';
        }

        // Step 2: Upload changes
        const uploadResponse = await fetch(cfg.PROXY_URL + '/api/0.6/changeset/' + changesetId + '/upload', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/xml' },
          body: oscXml,
        });

        if (!uploadResponse.ok) {
          const errText = await uploadResponse.text();
          throw new Error('Upload failed: ' + uploadResponse.status + ' ' + errText);
        }

        // Step 3: Close changeset
        const closeResponse = await fetch(cfg.PROXY_URL + '/api/0.6/changeset/' + changesetId + '/close', {
          method: 'PUT',
          headers: { 'Authorization': 'Bearer ' + currentToken },
        });

        if (!closeResponse.ok) {
          console.warn('Changeset close failed, but data was uploaded.');
        }

        statusDiv.innerHTML =
          '<div class="result-item" style="color: var(--success);">' +
          '✅ ' + t('osm.upload_success') + '<br>' +
          '<small>Changeset #' + changesetId + '</small>' +
          '</div>';

        if (editingNode) {
          const badge = document.getElementById('editingBadge');
          badge.classList.remove('visible');
          editingNode = null;
          const upBtn = document.getElementById('osmUploadBtn');
          if (upBtn) upBtn.textContent = t('osm.upload');
        }

      } catch (err) {
        statusDiv.innerHTML =
          '<div class="result-item" style="color: var(--danger);">' +
          '❌ ' + t('osm.upload_failed') + ': ' + err.message +
          '</div>';
        console.error(err);
      }
    });
  }

  // --- Download .osc button ---
  document.getElementById('osmDownloadBtn').addEventListener('click', () => {
    if (appState.mapMarkers.length === 0 && !editingNode) {
      alert(t('osm.no_points'));
      return;
    }

    const comment = document.getElementById('osmComment').value || 'Added via Waymark';
    const validTags = tagRows.filter(tr => tr.key && tr.value);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<osmChange version="0.6" generator="Waymark">\n';

    if (editingNode) {
      xml += '  <modify>\n';
      xml += '    <node id="' + editingNode.id + '" version="' + editingNode.version + '" lat="' + editingNode.lat.toFixed(7) + '" lon="' + editingNode.lon.toFixed(7) + '">\n';
      validTags.forEach(tag => {
        xml += '      <tag k="' + escapeXml(tag.key) + '" v="' + escapeXml(tag.value) + '"/>\n';
      });
      xml += '      <tag k="source" v="Waymark"/>\n';
      xml += '    </node>\n';
      xml += '  </modify>\n';
    } else {
      xml += '  <create>\n';
      appState.mapMarkers.forEach((marker, idx) => {
        const pos = marker.getLatLng();
        const id = -(idx + 1);
        xml += '    <node id="' + id + '" version="0" lat="' + pos.lat.toFixed(7) + '" lon="' + pos.lng.toFixed(7) + '">\n';
        validTags.forEach(tag => {
          xml += '      <tag k="' + escapeXml(tag.key) + '" v="' + escapeXml(tag.value) + '"/>\n';
        });
        xml += '      <tag k="source" v="Waymark"/>\n';
        xml += '    </node>\n';
      });
      xml += '  </create>\n  <modify/>\n  <delete/>\n';
    }

    xml += '</osmChange>';
    downloadFile(xml, 'waymark-export.osc', 'application/xml');

    document.getElementById('osmStatus').innerHTML =
      '<div class="result-item" style="color: var(--success);">' +
      '✅ <code>waymark-export.osc</code><br>' +
      (isEl
        ? 'Άνοιξέ το στο JOSM (File → Open) ή στο iD editor στο openstreetmap.org.'
        : 'Open in JOSM (File → Open) or in the iD editor at openstreetmap.org.') +
      '</div>';
  });
}

// =========================================================
// OAuth 2.0 PKCE Flow
// =========================================================

async function startOAuthLogin() {
  const cfg = window.WAYMARK_CONFIG;
  if (!cfg || cfg.OSM_CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
    alert(t('osm.config_warning'));
    return;
  }

  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  sessionStorage.setItem('pkce_code_verifier', codeVerifier);

  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const params = new URLSearchParams({
    client_id: cfg.OSM_CLIENT_ID,
    redirect_uri: cfg.REDIRECT_URI,
    response_type: 'code',
    scope: 'read_prefs write_api',
    state: Date.now().toString(),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  window.location.href = 'https://www.openstreetmap.org/oauth2/authorize?' + params.toString();
}

window.initOsmEditor = initOsmEditor;