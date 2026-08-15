/* =========================================================
   WAYMARK — OSM Editor Module (Direct Upload via Proxy)
   Uses OAuth 2.0 PKCE + Cloudflare Worker proxy.
   ========================================================= */

function initOsmEditor(map, container, appState) {
  const isEl = getCurrentLang() === 'el';
  const token = sessionStorage.getItem('osm_access_token');
  const loggedIn = !!token;

  container.innerHTML = `
    <h2>📤 ${t('module.osm_editor')}</h2>
    <div class="module-form">
      <div class="login-badge ${loggedIn ? 'active' : ''}">
        ${loggedIn ? '✅ ' + t('osm.logged_in_as') : '🔒 ' + t('osm.not_logged_in')}
      </div>

      ${!loggedIn ? `
        <button class="btn btn-success" id="osmLoginBtn">${t('osm.login')}</button>
      ` : ''}

      <div class="form-group">
        <label for="osmComment">${t('osm.changeset_comment')}</label>
        <input type="text" id="osmComment" value="Added via Waymark" />
      </div>

      <div class="form-group">
        <label>${isEl ? 'Tags ανά σημείο' : 'Tags per point'}</label>
        <div id="osmTagRows"></div>
        <button class="btn btn-secondary" id="osmAddTag" style="padding: 0.4rem; font-size: 0.8rem;">+ ${isEl ? 'Προσθήκη tag' : 'Add tag'}</button>
      </div>

      ${loggedIn ? `
        <button class="btn btn-success" id="osmUploadBtn">${t('osm.upload')}</button>
      ` : ''}
      <button class="btn" id="osmDownloadBtn">${t('osm.download_osc')}</button>

      <div class="results-list" id="osmStatus">
        <div class="result-item" style="cursor: default; opacity: 0.6;">
          ${isEl ? 'Σημεία στον χάρτη:' : 'Points on map:'} <span id="osmPointCount">0</span>
        </div>
      </div>
    </div>
  `;

  let tagRows = [{ key: 'name', value: '' }];
  renderTagRows();

  function renderTagRows() {
    const div = document.getElementById('osmTagRows');
    div.innerHTML = '';
    tagRows.forEach((row, idx) => {
      const rowEl = document.createElement('div');
      rowEl.style.cssText = 'display: flex; gap: 0.25rem; margin-bottom: 0.25rem;';
      rowEl.innerHTML = `
        <input type="text" placeholder="key" value="${row.key}" style="flex:1; background:var(--bg); border:1px solid var(--border); color:var(--fg); padding:0.3rem; font-size:0.8rem;" data-tag-key="${idx}">
        <input type="text" placeholder="value" value="${row.value}" style="flex:1; background:var(--bg); border:1px solid var(--border); color:var(--fg); padding:0.3rem; font-size:0.8rem;" data-tag-val="${idx}">
        <button class="btn btn-danger" style="padding:0.3rem 0.5rem; font-size:0.8rem;" data-tag-del="${idx}">×</button>
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
  const interval = setInterval(updateCount, 500);

  // Login button
  const loginBtn = document.getElementById('osmLoginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', startOAuthLogin);
  }

  // Upload button
  const uploadBtn = document.getElementById('osmUploadBtn');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
      const cfg = window.WAYMARK_CONFIG;
      if (!cfg || cfg.OSM_CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
        alert(t('osm.config_warning'));
        return;
      }

      if (appState.mapMarkers.length === 0) {
        alert(t('osm.no_points'));
        return;
      }

      const currentToken = sessionStorage.getItem('osm_access_token');
      if (!currentToken) {
        alert(t('osm.not_logged_in'));
        return;
      }

      const statusDiv = document.getElementById('osmStatus');
      statusDiv.innerHTML = '<div class="result-item"><div class="spinner"></div></div>';

      const comment = document.getElementById('osmComment').value || 'Added via Waymark';
      const validTags = tagRows.filter(t => t.key && t.value);

      try {
        // Step 1: Create changeset
        const changesetXml =
          '<osm><changeset>' +
          '<tag k="created_by" v="Waymark"/>' +
          '<tag k="comment" v="' + escapeXml(comment) + '"/>' +
          '</changeset></osm>';

        const csResponse = await fetch(cfg.PROXY_URL + '/api/0.6/changeset/create', {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + currentToken,
            'Content-Type': 'application/xml',
          },
          body: changesetXml,
        });

        if (!csResponse.ok) {
          const errText = await csResponse.text();
          throw new Error('Changeset creation failed: ' + csResponse.status + ' ' + errText);
        }

        const changesetId = (await csResponse.text()).trim();

        // Step 2: Build OSM Change XML with all nodes
        let oscXml = '<osmChange version="0.6" generator="Waymark">\n  <create>\n';

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

        // Step 3: Upload nodes
        const uploadResponse = await fetch(cfg.PROXY_URL + '/api/0.6/changeset/' + changesetId + '/upload', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + currentToken,
            'Content-Type': 'application/xml',
          },
          body: oscXml,
        });

        if (!uploadResponse.ok) {
          const errText = await uploadResponse.text();
          throw new Error('Upload failed: ' + uploadResponse.status + ' ' + errText);
        }

        // Step 4: Close changeset
        const closeResponse = await fetch(cfg.PROXY_URL + '/api/0.6/changeset/' + changesetId + '/close', {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + currentToken,
          },
        });

        if (!closeResponse.ok) {
          // Non-fatal — data is already uploaded
          console.warn('Changeset close failed, but data was uploaded.');
        }

        statusDiv.innerHTML =
          '<div class="result-item" style="color: var(--success);">' +
          '✅ ' + t('osm.upload_success') + '<br>' +
          '<small>Changeset #' + changesetId + '</small>' +
          '</div>';

      } catch (err) {
        statusDiv.innerHTML =
          '<div class="result-item" style="color: var(--danger);">' +
          '❌ ' + t('osm.upload_failed') + ': ' + err.message +
          '</div>';
        console.error(err);
      }
    });
  }

  // Download .osc button
  document.getElementById('osmDownloadBtn').addEventListener('click', () => {
    if (appState.mapMarkers.length === 0) {
      alert(t('osm.no_points'));
      return;
    }

    const comment = document.getElementById('osmComment').value || 'Added via Waymark';
    const validTags = tagRows.filter(t => t.key && t.value);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<osmChange version="0.6" generator="Waymark">\n  <create>\n';

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

    xml += '  </create>\n  <modify/>\n  <delete/>\n</osmChange>';

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

  // Generate PKCE code verifier
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  sessionStorage.setItem('pkce_code_verifier', codeVerifier);

  // Generate code challenge (SHA-256 hash, base64url)
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: cfg.OSM_CLIENT_ID,
    redirect_uri: cfg.REDIRECT_URI,
    response_type: 'code',
    scope: 'read_prefs write_api',
    state: Date.now().toString(),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  // Redirect to OSM authorization page
  window.location.href = 'https://www.openstreetmap.org/oauth2/authorize?' + params.toString();
}

window.initOsmEditor = initOsmEditor;