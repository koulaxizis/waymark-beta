/* =========================================================
   WAYMARK — OSM Editor Module
   - Create new POIs from map markers
   - Edit existing POIs fetched from Overpass
   - Default tags: name + type (amenity/shop/tourism)
   - Autocomplete for type field
   Uses OAuth 2.0 PKCE + Cloudflare Worker proxy.
   ========================================================= */

function initOsmEditor(map, container, appState) {
  const isEl = getCurrentLang() === 'el';
  const token = sessionStorage.getItem('osm_access_token');
  const loggedIn = !!token;

  let tagRows = [];
  let editingNode = null;
  let poiLayer = null;

  // Common POI types with Greek translations
  const COMMON_TYPES = {
    amenity: ['cafe', 'restaurant', 'bar', 'pub', 'fast_food', 'pharmacy', 'hospital', 'bank', 'atm', 'fuel', 'parking', 'school', 'library'],
    shop: ['supermarket', 'convenience', 'bakery', 'butcher', 'clothes', 'electronics', 'books', 'jewelry', 'hardware'],
    tourism: ['hotel', 'motel', 'hostel', 'guest_house', 'museum', 'attraction', 'camp_site', 'caravan_site']
  };

  container.innerHTML = `
    <style>
      .tag-row {
        display: flex;
        gap: 0.3rem;
        margin-bottom: 0.3rem;
        align-items: center;
        position: relative;
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
      .tag-row input.key-input {
        background: var(--bg-tertiary);
        font-weight: 600;
        width: 120px !important;
        max-width: 120px;
        flex: none;
      }
      .tag-row input.value-input {
        flex: 1;
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
      .autocomplete-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 120px;
        max-height: 200px;
        overflow-y: auto;
        background: var(--bg-secondary);
        border: 1px solid var(--accent);
        border-radius: 4px;
        z-index: 100;
        box-shadow: 0 4px 12px var(--shadow);
        display: none;
      }
      .autocomplete-dropdown.visible {
        display: block;
      }
      .autocomplete-item {
        padding: 0.4rem 0.6rem;
        cursor: pointer;
        font-size: 0.8rem;
        transition: var(--transition);
      }
      .autocomplete-item:hover {
        background: var(--accent);
        color: white;
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
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
      }
      .editing-badge.visible { display: flex; }
      .editing-badge .cancel-edit {
        background: transparent;
        border: 1px solid var(--border);
        color: var(--fg-muted);
        font-size: 0.7rem;
        padding: 0.2rem 0.5rem;
        border-radius: 3px;
        cursor: pointer;
        flex-shrink: 0;
      }
      .editing-badge .cancel-edit:hover {
        border-color: var(--danger);
        color: var(--danger);
      }
      .poi-select-help {
        font-size: 0.75rem;
        color: var(--fg-muted);
        margin-top: 0.3rem;
        background: var(--bg-tertiary);
        padding: 0.3rem 0.5rem;
        border-radius: 4px;
        border-left: 2px solid var(--accent);
      }
    </style>

    <h2>📤 ${t('module.osm_editor')}</h2>
    <div class="module-form">
      <div class="login-badge ${loggedIn ? 'active' : ''}">
        ${loggedIn ? '✅ ' + t('osm.logged_in_as') : '🔒 ' + t('osm.not_logged_in')}
      </div>

      ${!loggedIn ? `<button class="btn btn-success" id="osmLoginBtn">${t('osm.login')}</button>` : ''}

      <div class="editing-badge" id="editingBadge">
        <span>✏️ ${isEl ? 'Επεξεργασία POI #' : 'Editing POI #'}<strong id="editingNodeId"></strong> <span id="editingNodeName"></span></span>
        <button class="cancel-edit" id="cancelEditBtn">${isEl ? 'Ακύρωση' : 'Cancel'}</button>
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
        <div class="poi-select-help" id="poiSelectHelp">
          ${isEl ? '👆 Πάτησε σε ένα POI παρακάτω για να το επεξεργαστείς. Τα tags θα εμφανιστούν παραπάνω.' : '👆 Click a POI below to edit. Tags will appear above.'}
        </div>
        <div class="results-list" id="osmPOIList" style="max-height: 250px;"></div>
      </div>

      <div class="results-list" id="osmStatus">
        <div class="result-item" style="cursor: default; opacity: 0.6;">
          ${isEl ? 'Σημεία στον χάρτη:' : 'Points on map:'} <span id="osmPointCount">0</span>
        </div>
      </div>
    </div>
  `;

  // Initialize with default tags (name + type)
  resetDefaultTags();

  function resetDefaultTags() {
    tagRows = [{ key: 'name', value: '' }, { key: 'type', value: '' }];
    renderTagRows();
  }

  function renderTagRows() {
    const div = document.getElementById('osmTagRows');
    div.innerHTML = '';
    
    tagRows.forEach((row, idx) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'tag-row';
      
      const autoCompleteId = 'autocomplete-' + idx;
      const isTypeField = row.key === 'type' || row.key === 'amenity' || row.key === 'shop' || row.key === 'tourism';
      
      rowEl.innerHTML = `
        <input type="text" class="key-input" placeholder="key" value="${escapeHtml(row.key)}" data-tag-key="${idx}">
        <div style="flex:1; position:relative;">
          <input type="text" class="value-input" placeholder="value" value="${escapeHtml(row.value)}" data-tag-val="${idx}" ${isTypeField ? 'id="' + autoCompleteId + '"' : ''}>
          <div class="autocomplete-dropdown" id="${autoCompleteId}-dropdown"></div>
        </div>
        <button class="tag-del" data-tag-del="${idx}">×</button>
      `;
      div.appendChild(rowEl);
      
      // Key input handler
      const keyInput = rowEl.querySelector(`[data-tag-key="${idx}"]`);
      keyInput.addEventListener('input', (e) => {
        const newVal = e.target.value.trim();
        const oldVal = tagRows[idx].key;
        tagRows[idx].key = newVal;
        
        // If changed to type/amenity/shop/tourism, populate autocomplete
        if (newVal === 'type' && row.value && !tagRows.find(t => t.key === 'amenity' || t.key === 'shop' || t.key === 'tourism')) {
          // Convert type=value to proper amenity/shop/tourism=value
          const typeValue = row.value;
          if (COMMON_TYPES.amenity.includes(typeValue)) {
            tagRows[idx] = { key: 'amenity', value: typeValue };
            keyInput.value = 'amenity';
            row.value = typeValue;
          } else if (COMMON_TYPES.shop.includes(typeValue)) {
            tagRows[idx] = { key: 'shop', value: typeValue };
            keyInput.value = 'shop';
            row.value = typeValue;
          } else if (COMMON_TYPES.tourism.includes(typeValue)) {
            tagRows[idx] = { key: 'tourism', value: typeValue };
            keyInput.value = 'tourism';
            row.value = typeValue;
          }
        }
      });
      
      // Value input handler
      const valInput = rowEl.querySelector(`[data-tag-val="${idx}"]`);
      valInput.addEventListener('input', (e) => {
        tagRows[idx].value = e.target.value;
        if (isTypeField) {
          showAutocomplete(e.target.value, autoCompleteId);
        }
      });
      
      valInput.addEventListener('focus', (e) => {
        if (isTypeField) {
          showAutocomplete(e.target.value, autoCompleteId);
        }
      });
      
      valInput.addEventListener('blur', (e) => {
        setTimeout(() => {
          document.getElementById(autoCompleteId + '-dropdown').classList.remove('visible');
        }, 150);
      });
      
      // Delete button handler
      rowEl.querySelector(`[data-tag-del="${idx}"]`).addEventListener('click', () => {
        tagRows.splice(idx, 1);
        renderTagRows();
      });
    });
  }

  function showAutocomplete(query, dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    // Find the row with this autocomplete ID
    const rowIdx = parseInt(dropdownId.replace('autocomplete-', '').replace('-dropdown', ''));
    if (isNaN(rowIdx)) return;
    
    const keyRow = tagRows[rowIdx];
    let suggestions = [];
    
    // Parse the key to determine which categories to search
    const searchKey = keyRow.key.toLowerCase();
    if (searchKey.includes('amenity') || searchKey === 'type') {
      suggestions = suggestions.concat(COMMON_TYPES.amenity);
    }
    if (searchKey.includes('shop') || searchKey === 'type') {
      suggestions = suggestions.concat(COMMON_TYPES.shop);
    }
    if (searchKey.includes('tourism') || searchKey === 'type') {
      suggestions = suggestions.concat(COMMON_TYPES.tourism);
    }
    
    // Filter by query
    if (query.trim()) {
      suggestions = suggestions.filter(s => s.toLowerCase().includes(query.toLowerCase()));
    }
    
    // Remove duplicates and limit
    suggestions = [...new Set(suggestions)].slice(0, 15);
    
    if (suggestions.length === 0) {
      dropdown.classList.remove('visible');
      return;
    }
    
    dropdown.innerHTML = suggestions
      .map(s => `<div class="autocomplete-item" data-value="${escapeHtml(s)}">${escapeHtml(s)}</div>`)
      .join('');
    
    // Add click handlers
    dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        valInput.value = item.dataset.value;
        tagRows[rowIdx].value = item.dataset.value;
        dropdown.classList.remove('visible');
      });
    });
    
    dropdown.classList.add('visible');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
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

  // Cancel edit button
  document.getElementById('cancelEditBtn').addEventListener('click', () => {
    cancelEditMode();
  });

  function cancelEditMode() {
    editingNode = null;
    document.getElementById('editingBadge').classList.remove('visible');
    resetDefaultTags();
    const upBtn = document.getElementById('osmUploadBtn');
    if (upBtn) upBtn.textContent = t('osm.upload');
    
    // Deselect all markers
    if (poiLayer) {
      poiLayer.eachLayer(l => {
        l.setStyle({ fillColor: '#6d4aff', fillOpacity: 0.5, radius: 6 });
      });
    }
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

    // Show editing badge
    const badge = document.getElementById('editingBadge');
    const badgeId = document.getElementById('editingNodeId');
    const badgeName = document.getElementById('editingNodeName');
    badge.classList.add('visible');
    badgeId.textContent = node.id;
    badgeName.textContent = ' — ' + (node.tags?.name || '');

    // Load tags from the node into tagRows
    tagRows = Object.entries(node.tags || {}).map(([k, v]) => ({ key: k, value: v }));
    // Ensure we always have name + type first
    if (!tagRows.find(r => r.key === 'name')) {
      tagRows.unshift({ key: 'name', value: '' });
    }
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
      statusDiv.innerHTML = '<div class="result-item"><div class="spinner"></div></div>';

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

        let oscXml;

        if (editingNode) {
          // --- EDIT MODE ---
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
          // --- CREATE MODE ---
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
          cancelEditMode();
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
// Helper Functions
// =========================================================

async function safeOverpassFetch(query, isEl) {
  const servers = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  for (let i = 0; i < servers.length; i++) {
    try {
      const response = await fetch(servers[i], {
        method: 'POST',
        body: query
      });

      if (!response.ok) {
        if (i < servers.length - 1) continue;
        const text = await response.text();
        throw new Error(text.substring(0, 150));
      }

      const ct = response.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        if (i < servers.length - 1) continue;
        const text = await response.text();
        throw new Error(text.substring(0, 150));
      }

      return await response.json();
    } catch (err) {
      if (err.message === 'Failed to fetch' && i < servers.length - 1) continue;
      if (i < servers.length - 1) continue;
      throw err;
    }
  }

  throw new Error(isEl ? 'Αδυναμία σύνδεσης με Overpass API' : 'Cannot connect to Overpass API');
}

function escapeXml(str) {
  if (!str) return '';
  return str.replace(/[<>&'"]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;',"":"'&quot;",'"':"&#39;" }[c]));
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function startOAuthLogin() {
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
  crypto.subtle.digest('SHA-256', data).then(hash => {
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
  });
}

window.initOsmEditor = initOsmEditor;
window.safeOverpassFetch = safeOverpassFetch;
window.escapeXml = escapeXml;
window.downloadFile = downloadFile;