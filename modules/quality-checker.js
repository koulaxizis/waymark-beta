/* =========================================================
   WAYMARK — Quality Checker Module
   Run validation checks on OSM data using Overpass API.
   ========================================================= */

let qualityCheckerState = {
  isLoading: false,
  issues: [],
};

function initQualityChecker(map, container, appState) {
  renderQualityCheckerUI(container);
  runChecks(map);

  let viewportTimer = null;
  map.on('moveend', () => {
    clearTimeout(viewportTimer);
    viewportTimer = setTimeout(() => {
      runChecks(map);
    }, 500);
  });

  function handleMapClick(lat, lng) {
    // Allow manual inspection of clicked elements
    inspectElementAtLatLon(lat, lng, map);
  }

  window.onMapClick_qualityChecker = handleMapClick;
}

function renderQualityCheckerUI(container) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
    <div class="quality-checker-ui">
      <div class="form-group">
        <label>${isEl ? 'Έλεγχος:' : 'Check:'}</label>
        <select id="checkType" class="form-control">
          <option value="nodes_without_tags">${isEl ? 'Nodes χωρίς tags' : 'Nodes without tags'}</option>
          <option value="ways_without_names">${isEl ? 'Ways χωρίς names' : 'Ways without names'}</option>
          <option value="buildings_no_address">${isEl ? 'Κτήρια χωρίς διεύθυνση' : 'Buildings without address'}</option>
          <option value="highways_no_maxspeed">${isEl ? 'Δρόμοι χωρίς μέγιστη ταχύτητα' : 'Highways without maxspeed'}</option>
          <option value="shops_no_opening_hours">${isEl ? 'Καταστήματα χωρίς ώρες λειτουργίας' : 'Shops without opening hours'}</option>
        </select>
      </div>

      <button id="runChecksBtn" class="btn btn-primary">
        🔍 ${isEl ? 'Εκτέλεση Ελέγχων' : 'Run Checks'}
      </button>

      <div id="issuesStats" class="note-description" style="margin-top:0.5rem;"></div>
      <div id="issuesList" class="results-list"></div>
    </div>
  `;

  document.getElementById('checkType').addEventListener('change', () => {
    runChecks(map);
  });

  document.getElementById('runChecksBtn').addEventListener('click', () => {
    runChecks(map);
  });
}

async function runChecks(map) {
  if (qualityCheckerState.isLoading) return;
  qualityCheckerState.isLoading = true;

  const checkType = document.getElementById('checkType')?.value || 'nodes_without_tags';
  const isEl = getCurrentLang() === 'el';

  showSpinner(true);

  try {
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const bboxStr = `${sw.lat},${sw.lon},${ne.lat},${ne.lon}`;

    const queries = {
      nodes_without_tags: `[out:json][timeout:25];(node(${bboxStr})["!"];);out count;`.trim(),
      ways_without_names: `[out:json][timeout:25];(way(${bboxStr})["highway"]["!name"];);out body center limit 50;`.trim(),
      buildings_no_address: `[out:json][timeout:25];(way(${bboxStr})["building"]["!addr:housenumber"];);out body center limit 50;`.trim(),
      highways_no_maxspeed: `[out:json][timeout:25];(way(${bboxStr})["highway"]["!maxspeed"];);out body center limit 50;`.trim(),
      shops_no_opening_hours: `[out:json][timeout:25];(node(${bboxStr})["shop"]["!opening_hours"];);out body center limit 50;`.trim(),
    };

    const query = queries[checkType];

    // Use safeOverpassFetch for failover
    const result = await safeOverpassFetch(query, isEl);

    qualityCheckerState.issues = [];

    if (result.elements) {
      qualityCheckerState.issues = result.elements;
    }

    const listEl = document.getElementById('issuesList');
    listEl.innerHTML = '';

    if (qualityCheckerState.issues.length === 0) {
      listEl.innerHTML = `<p>${isEl ? 'Δεν βρέθηκαν προβλήματα' : 'No issues found'}</p>`;
      document.getElementById('issuesStats').textContent = '';
      showSpinner(false);
      return;
    }

    // Render issues
    qualityCheckerState.issues.forEach(issue => {
      const item = document.createElement('div');
      item.className = 'result-item';

      let summary = '';
      if (issue.tags) {
        summary = Object.entries(issue.tags)
          .map(([k, v]) => `${k}:${v}`)
          .join(', ');
      }

      item.innerHTML = `
        <strong>${issue.type === 'node' ? '🔴' : issue.type === 'way' ? '🟡' : '🔵'} ID: ${issue.id}</strong>
        <small>${summary.substring(0, 60)}</small>
      `;

      item.addEventListener('click', () => {
        const lat = issue.lat || issue.center?.lat || bounds.getCenter().lat;
        const lon = issue.lon || issue.center?.lon || bounds.getCenter().lng;
        map.setView([lat, lon], 17);
        showIssueDetails(issue, lat, lon);
      });

      listEl.appendChild(item);
    });

    document.getElementById('issuesStats').textContent =
      isEl ? `Βρέθηκαν ${qualityCheckerState.issues.length} θέματα` : `Found ${qualityCheckerState.issues.length} issues`;

  } catch (err) {
    console.error('Quality check error:', err);
    alert(isEl ? 'Σφάλμα ελέγχου ποιότητας: ' + err.message : 'Quality check error: ' + err.message);
  } finally {
    qualityCheckerState.isLoading = false;
    showSpinner(false);
  }
}

function showIssueDetails(issue, lat, lon) {
  const isEl = getCurrentLang() === 'el';

  const panel = document.getElementById('activeModulePanel');
  const content = document.getElementById('moduleContent');

  panel.classList.add('active');
  document.getElementById('activeModuleTitle').textContent = '⚠️ ' + (isEl ? 'Θέμα' : 'Issue') + ` #${issue.id}`;

  let tagsHtml = '';
  if (issue.tags) {
    tagsHtml = `<table class="poi-tags-table">`;
    tagsHtml += `<thead><tr><th>${isEl ? 'Κλειδί' : 'Key'}</th><th>${isEl ? 'Τιμή' : 'Value'}</th></tr></thead>`;
    tagsHtml += `<tbody>`;
    Object.entries(issue.tags).forEach(([k, v]) => {
      tagsHtml += `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`;
    });
    tagsHtml += `</tbody></table>`;
  }

  content.innerHTML = `
    <div class="issue-details">
      <div style="margin-bottom:0.5rem;">
        <strong>${isEl ? 'Τύπος:' : 'Type:'}</strong> ${escapeHtml(issue.type)}
      </div>
      <div style="margin-bottom:0.5rem;">
        <strong>🆔 ${isEl ? 'ID:' : 'ID:'}</strong> ${issue.id} (<a href="https://openstreetmap.org/${issue.type}/${issue.id}" target="_blank">OSM ↗</a>)
      </div>
      <div style="margin-bottom:0.5rem;">
        <strong>🌍 ${isEl ? 'Συντεταγμένες:' : 'Coordinates:'}</strong> ${lat.toFixed(6)}, ${lon.toFixed(6)}
      </div>
      ${tagsHtml}
      <div class="poi-actions" style="margin-top:0.5rem;">
        <a href="https://openstreetmap.org/${issue.type}/${issue.id}" target="_blank" class="btn btn-sm">${isEl ? 'Επεξεργασία στο OSM' : 'Edit in OSM'}</a>
      </div>
    </div>
  `;
}

function showSpinner(show) {
  const btn = document.getElementById('runChecksBtn');
  if (show) {
    btn.disabled = true;
    btn.textContent = getCurrentLang() === 'el' ? 'Έλεγχος...' : 'Checking...';
  } else {
    btn.disabled = false;
    btn.textContent = getCurrentLang() === 'el' ? 'Εκτέλεση Ελέγχων' : 'Run Checks';
  }
}

function _qualityCheckerCleanup() {
  delete window.onMapClick_qualityChecker;
  qualityCheckerState = { isLoading: false, issues: [] };
}

window._qualityCheckerCleanup = _qualityCheckerCleanup;