/* =========================================================
   WAYMARK — Address Mapper Module
   Quick-add house numbers by tapping on the map.
   Auto-detects nearest street name via Overpass.
   Batch mode for rapid surveying.
   Uploads as OSM nodes with addr:housenumber + addr:street.
   Mobile-first: big inputs, queue-style list.
   ========================================================= */

function initAddressMapper(map, container, appState) {
  const isEl = getCurrentLang() === 'el';
  const token = sessionStorage.getItem('osm_access_token');
  const loggedIn = !!token;

  let addresses = [];
  let markers = [];
  let batchMode = true;
  let pendingMarker = null;
  let pendingLatLng = null;

  container.innerHTML = `
    <style>
      .am-instructions {
        font-size: 0.8rem;
        color: var(--fg-muted);
        background: var(--bg-tertiary);
        padding: 0.5rem 0.75rem;
        border-radius: 4px;
        border-left: 3px solid var(--accent);
        margin-bottom: 0.75rem;
        line-height: 1.5;
      }
      .am-pending {
        display: none;
        background: rgba(109, 74, 255, 0.08);
        border: 1px solid var(--accent);
        border-radius: 4px;
        padding: 0.6rem;
        margin-bottom: 0.75rem;
      }
      .am-pending.visible {
        display: block;
      }
      .am-pending-coords {
        font-size: 0.7rem;
        color: var(--fg-muted);
        margin-bottom: 0.4rem;
      }
      .am-pending-row {
        display: flex;
        gap: 0.4rem;
        margin-bottom: 0.4rem;
      }
      .am-pending-row input {
        flex: 1;
        min-width: 0;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 4px;
        color: var(--fg);
        padding: 0.5rem;
        font-size: 0.85rem;
        font-family: inherit;
      }
      .am-pending-row input:focus {
        outline: none;
        border-color: var(--accent);
      }
      .am-pending-row input.short {
        max-width: 80px;
        flex: none;
      }
      .am-pending-actions {
        display: flex;
        gap: 0.4rem;
      }
      .am-pending-actions .btn {
        margin-bottom: 0;
        flex: 1;
      }
      .am-toggle {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.8rem;
        color: var(--fg);
        margin-bottom: 0.5rem;
        cursor: pointer;
      }
      .am-toggle input[type="checkbox"] {
        width: 18px;
        height: 18px;
        accent-color: var(--accent);
        cursor: pointer;
      }
      .am-queue {
        max-height: 220px;
        overflow-y: auto;
        margin-bottom: 0.5rem;
      }
      .am-queue-item {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.4rem 0.6rem;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 4px;
        margin-bottom: 0.25rem;
        font-size: 0.78rem;
      }
      .am-queue-num {
        background: var(--accent);
        color: white;
        font-weight: 700;
        font-size: 0.75rem;
        padding: 0.15rem 0.4rem;
        border-radius: 3px;
        min-width: 28px;
        text-align: center;
        flex-shrink: 0;
      }
      .am-queue-text {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .am-queue-text small {
        color: var(--fg-muted);
      }
      .am-queue-del {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        background: var(--danger);
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .am-queue-empty {
        font-size: 0.78rem;
        color: var(--fg-muted);
        text-align: center;
        padding: 0.75rem;
      }
    </style>

    <h2>🏘️ ${isEl ? 'Καταγραφή Διευθύνσεων' : 'Address Mapper'}</h2>
    <div class="module-form">

      <div class="am-instructions">
        ${isEl
          ? '👆 Πάτησε στον χάρτη κοντά σε έναν δρόμο. Το όνομα του δρόμου θα ανιχνεύεται αυτόματα. Εισάγε τον αριθμό και αποθήκευσε.'
          : '👆 Tap on the map near a road. The street name will be auto-detected. Enter the house number and save.'}
      </div>

      <div class="am-pending" id="amPending">
        <div class="am-pending-coords" id="amPendingCoords"></div>
        <div class="am-pending-row">
          <input type="text" class="short" id="amHouseNumber" placeholder="${isEl ? 'Αριθμός' : 'Number'}" inputmode="numeric">
          <input type="text" id="amStreetName" placeholder="${isEl ? 'Όνομα δρόμου' : 'Street name'}">
        </div>
        <div class="am-pending-row">
          <input type="text" id="amPostcode" placeholder="${isEl ? 'Τ.Κ.' : 'Postcode'}" inputmode="numeric">
          <input type="text" id="amCity" placeholder="${isEl ? 'Πόλη' : 'City'}">
        </div>
        <div class="am-pending-actions">
          <button class="btn btn-success" id="amSaveAddr" style="margin-bottom:0;">+ ${isEl ? 'Προσθήκη' : 'Add'}</button>
          <button class="btn" id="amCancelAddr" style="margin-bottom:0;">${isEl ? 'Άκυρο' : 'Cancel'}</button>
        </div>
      </div>

      <label class="am-toggle">
        <input type="checkbox" id="amBatchToggle" checked>
        <span>${isEl ? 'Batch mode (γρήγορη προσθήκη πολλών)' : 'Batch mode (quick add multiple)'}</span>
      </label>

      <div class="am-queue" id="amQueue"></div>

      ${loggedIn ? `
        <button class="btn btn-success" id="amUploadBtn" disabled>${isEl ? '📤 Ανέβασμα όλων στο OSM' : '📤 Upload all to OSM'}</button>
      ` : `
        <div class="login-badge">${isEl ? '🔒 Συνδέσου για ανέβασμα' : '🔒 Log in to upload'}</div>
      `}
      <button class="btn" id="amDownloadBtn" disabled>${t('common.download')} OSC</button>
      <button class="btn btn-danger" id="amClearBtn" disabled>🗑 ${isEl ? 'Καθαρισμός' : 'Clear all'}</button>

    </div>
  `;

  const pendingBox = document.getElementById('amPending');
  const pendingCoords = document.getElementById('amPendingCoords');
  const houseInput = document.getElementById('amHouseNumber');
  const streetInput = document.getElementById('amStreetName');
  const postcodeInput = document.getElementById('amPostcode');
  const cityInput = document.getElementById('amCity');
  const queueDiv = document.getElementById('amQueue');
  const uploadBtn = document.getElementById('amUploadBtn');
  const downloadBtn = document.getElementById('amDownloadBtn');
  const clearBtn = document.getElementById('amClearBtn');

  document.getElementById('amBatchToggle').addEventListener('change', (e) => {
    batchMode = e.target.checked;
  });

  // Auto-detect nearest street name
  async function detectStreetName(lat, lng) {
    streetInput.placeholder = isEl ? '⏳ Ανίχνευση δρόμου...' : '⏳ Detecting street...';
    streetInput.value = '';

    const radius = 30; // meters
    const query = `[out:json][timeout:10];way(around:${radius},${lat},${lng})["highway"]["name"];out tags 1;`;

    try {
      const fetchFn = window.safeOverpassFetch || safeOverpassFetch;
      const data = await fetchFn(query, isEl);
      const way = data.elements.find(e => e.type === 'way' && e.tags?.name);
      if (way) {
        streetInput.value = way.tags.name;
        streetInput.placeholder = isEl ? 'Όνομα δρόμου' : 'Street name';
        houseInput.focus();
      } else {
        streetInput.placeholder = isEl ? 'Όνομα δρόμου (δεν βρέθηκε)' : 'Street name (not found)';
      }
    } catch (err) {
      streetInput.placeholder = isEl ? 'Όνομα δρόμου (χειροκίνητα)' : 'Street name (manual)';
    }
  }

  function showPending(lat, lng) {
    pendingLatLng = [lat, lng];
    pendingBox.classList.add('visible');
    pendingCoords.textContent = lat.toFixed(6) + ', ' + lng.toFixed(6);
    houseInput.value = '';
    postcodeInput.value = '';
    cityInput.value = '';

    // Add temporary marker
    if (pendingMarker) map.removeLayer(pendingMarker);
    pendingMarker = L.circleMarker([lat, lng], {
      radius: 7,
      fillColor: '#ffb143',
      color: 'white',
      weight: 2,
      fillOpacity: 0.9
    }).addTo(map);

    map.setView([lat, lng], Math.max(map.getZoom(), 17));

    // Auto-detect street
    detectStreetName(lat, lng);
  }

  function hidePending() {
    pendingBox.classList.remove('visible');
    pendingLatLng = null;
    if (pendingMarker) { map.removeLayer(pendingMarker); pendingMarker = null; }
  }

  function saveAddress() {
    const number = houseInput.value.trim();
    const street = streetInput.value.trim();

    if (!number) {
      houseInput.focus();
      alert(isEl ? 'Εισάγε αριθμό.' : 'Enter house number.');
      return;
    }

    const addr = {
      lat: pendingLatLng[0],
      lon: pendingLatLng[1],
      number: number,
      street: street,
      postcode: postcodeInput.value.trim(),
      city: cityInput.value.trim()
    };

    addresses.push(addr);

    // Add permanent marker
    const marker = L.circleMarker([addr.lat, addr.lon], {
      radius: 6,
      fillColor: '#6d4aff',
      color: 'white',
      weight: 2,
      fillOpacity: 0.8
    })
    .bindPopup('<b>' + addr.number + ' ' + (addr.street || '') + '</b>')
    .addTo(map);
    markers.push(marker);

    renderQueue();

    if (batchMode) {
      hidePending();
    } else {
      // Reset for next entry at same location
      houseInput.value = '';
      houseInput.focus();
    }

    // Keep postcode & city for rapid entry (they don't change often)
  }

  function renderQueue() {
    if (addresses.length === 0) {
      queueDiv.innerHTML = '<div class="am-queue-empty">' + (isEl ? 'Καμία διεύθυνση ακόμη.' : 'No addresses yet.') + '</div>';
      uploadBtn.disabled = true;
      downloadBtn.disabled = true;
      clearBtn.disabled = true;
      return;
    }

    queueDiv.innerHTML = addresses.map((a, i) => {
      const streetLabel = a.street || (isEl ? '(χωρίς δρόμο)' : '(no street)');
      const extra = [a.postcode, a.city].filter(Boolean).join(', ');
      return `
        <div class="am-queue-item">
          <span class="am-queue-num">${escapeHtml(a.number)}</span>
          <span class="am-queue-text">
            ${escapeHtml(streetLabel)}
            ${extra ? '<br><small>' + escapeHtml(extra) + '</small>' : ''}
          </span>
          <button class="am-queue-del" data-am-del="${i}">×</button>
        </div>
      `;
    }).join('');

    queueDiv.querySelectorAll('[data-am-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.amDel);
        addresses.splice(idx, 1);
        const m = markers.splice(idx, 1)[0];
        if (m) map.removeLayer(m);
        renderQueue();
      });
    });

    uploadBtn.disabled = false;
    downloadBtn.disabled = false;
    clearBtn.disabled = false;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  document.getElementById('amSaveAddr').addEventListener('click', saveAddress);

  document.getElementById('amCancelAddr').addEventListener('click', hidePending);

  // Enter key to save
  houseInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); streetInput.focus(); } });
  streetInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); saveAddress(); } });

  // Map click handler
  appState.onMapClick_addressMapper = (lat, lng) => {
    if (pendingBox.classList.contains('visible') && !batchMode) return;
    showPending(lat, lng);
  };

  // Clear all
  clearBtn.addEventListener('click', () => {
    addresses = [];
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    hidePending();
    renderQueue();
  });

  // Build OSC
  function buildOsc(changesetId) {
    let xml = '<osmChange version="0.6" generator="Waymark">\n  <create>\n';

    addresses.forEach((a, i) => {
      const nodeId = -(i + 1);
      xml += '    <node id="' + nodeId + '" version="0" changeset="' + changesetId + '" lat="' + a.lat.toFixed(7) + '" lon="' + a.lon.toFixed(7) + '">\n';
      xml += '      <tag k="addr:housenumber" v="' + escapeXml(a.number) + '"/>\n';
      if (a.street) xml += '      <tag k="addr:street" v="' + escapeXml(a.street) + '"/>\n';
      if (a.postcode) xml += '      <tag k="addr:postcode" v="' + escapeXml(a.postcode) + '"/>\n';
      if (a.city) xml += '      <tag k="addr:city" v="' + escapeXml(a.city) + '"/>\n';
      xml += '      <tag k="source" v="Waymark"/>\n';
      xml += '    </node>\n';
    });

    xml += '  </create>\n  <modify/>\n  <delete/>\n</osmChange>';
    return xml;
  }

  // Upload
  if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
      const cfg = window.WAYMARK_CONFIG;
      const currentToken = sessionStorage.getItem('osm_access_token');
      if (!currentToken) { alert(t('osm.not_logged_in')); return; }
      if (addresses.length === 0) return;

      uploadBtn.disabled = true;
      uploadBtn.textContent = isEl ? '⏳ Ανέβασμα...' : '⏳ Uploading...';

      try {
        const changesetXml = '<osm><changeset><tag k="created_by" v="Waymark"/><tag k="comment" v="Added ' + addresses.length + ' addresses via Waymark"/></changeset></osm>';
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

        uploadBtn.textContent = isEl ? '✅ Ανέβηκαν ' + addresses.length + '!' : '✅ Uploaded ' + addresses.length + '!';
        setTimeout(() => {
          uploadBtn.textContent = isEl ? '📤 Ανέβασμα όλων στο OSM' : '📤 Upload all to OSM';
          uploadBtn.disabled = false;
        }, 3000);
      } catch (err) {
        uploadBtn.textContent = isEl ? '📤 Ανέβασμα όλων στο OSM' : '📤 Upload all to OSM';
        uploadBtn.disabled = false;
        alert((isEl ? 'Σφάλμα: ' : 'Error: ') + err.message.substring(0, 150));
      }
    });
  }

  // Download OSC
  downloadBtn.addEventListener('click', () => {
    if (addresses.length === 0) return;
    const osc = buildOsc(0);
    downloadFile(osc, 'waymark-addresses.osc', 'application/xml');
  });

  // Initial render
  renderQueue();

  // Cleanup
  appState._addressMapperCleanup = () => {
    delete appState.onMapClick_addressMapper;
    markers.forEach(m => map.removeLayer(m));
    if (pendingMarker) map.removeLayer(pendingMarker);
  };
}

window.initAddressMapper = initAddressMapper;