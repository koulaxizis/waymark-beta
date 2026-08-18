/* =========================================================
   WAYMARK — Quality Checker Module
   Run validation checks on OSM data using Overpass API.
   ========================================================= */

var qualityCheckerState = {
  isLoading: false,
  issues: []
};

function initQualityChecker(map, container, appState) {
  renderQualityCheckerUI(container);
  runChecks(map);

  var viewportTimer = null;
  map.on('moveend', function () {
    clearTimeout(viewportTimer);
    viewportTimer = setTimeout(function () {
      runChecks(map);
    }, 500);
  });

  function handleMapClick(lat, lng) {}
  window.onMapClick_qualityChecker = handleMapClick;
}

function renderQualityCheckerUI(container) {
  var isEl = getCurrentLang() === 'el';

  container.innerHTML =
    '<div class="quality-checker-ui">' +
    '  <div class="form-group"><label>' + (isEl ? 'Έλεγχος:' : 'Check:') + '</label>' +
    '    <select id="checkType" class="form-control">' +
    '      <option value="ways_without_names">' + (isEl ? 'Ways χωρίς names' : 'Ways without names') + '</option>' +
    '      <option value="buildings_no_address">' + (isEl ? 'Κτήρια χωρίς διεύθυνση' : 'Buildings without address') + '</option>' +
    '      <option value="highways_no_maxspeed">' + (isEl ? 'Δρόμοι χωρίς maxspeed' : 'Highways without maxspeed') + '</option>' +
    '      <option value="shops_no_opening_hours">' + (isEl ? 'Καταστήματα χωρίς ώρες' : 'Shops without opening hours') + '</option>' +
    '    </select>' +
    '  </div>' +
    '  <button id="runChecksBtn" class="btn btn-primary">🔍 ' + (isEl ? 'Εκτέλεση' : 'Run Checks') + '</button>' +
    '  <div id="issuesStats" class="note-description" style="margin-top:0.5rem;"></div>' +
    '  <div id="issuesList" class="results-list"></div>' +
    '</div>';

  var checkEl = document.getElementById('checkType');
  var runBtn = document.getElementById('runChecksBtn');

  if (checkEl) checkEl.addEventListener('change', function () { runChecks(map); });
  if (runBtn) runBtn.addEventListener('click', function () { runChecks(map); });
}

async function runChecks(map) {
  if (qualityCheckerState.isLoading) return;
  qualityCheckerState.isLoading = true;

  var checkTypeEl = document.getElementById('checkType');
  var checkType = checkTypeEl ? checkTypeEl.value : 'ways_without_names';
  var isEl = getCurrentLang() === 'el';

  showQcSpinner(true);

  try {
    var bounds = map.getBounds();
    var sw = bounds.getSouthWest();
    var ne = bounds.getNorthEast();
    var bboxStr = sw.lat + ',' + sw.lon + ',' + ne.lat + ',' + ne.lon;

    var queries = {
      ways_without_names: '[out:json][timeout:25];(way(' + bboxStr + ')["highway"]["name"!~".+"];);out body center 50;',
      buildings_no_address: '[out:json][timeout:25];(way(' + bboxStr + ')["building"]["addr:housenumber"!~".+"];);out body center 50;',
      highways_no_maxspeed: '[out:json][timeout:25];(way(' + bboxStr + ')["highway"]["maxspeed"!~".+"];);out body center 50;',
      shops_no_opening_hours: '[out:json][timeout:25];(node(' + bboxStr + ')["shop"]["opening_hours"!~".+"];);out body center 50;'
    };

    var query = queries[checkType];
    var result = await safeOverpassFetch(query, isEl);

    qualityCheckerState.issues = result.elements || [];

    var listEl = document.getElementById('issuesList');
    if (!listEl) { qualityCheckerState.isLoading = false; showQcSpinner(false); return; }
    listEl.innerHTML = '';

    if (qualityCheckerState.issues.length === 0) {
      listEl.innerHTML = '<p>' + (isEl ? 'Δεν βρέθηκαν προβλήματα' : 'No issues found') + '</p>';
      var statsEl0 = document.getElementById('issuesStats');
      if (statsEl0) statsEl0.textContent = '';
      qualityCheckerState.isLoading = false;
      showQcSpinner(false);
      return;
    }

    qualityCheckerState.issues.forEach(function (issue) {
      var item = document.createElement('div');
      item.className = 'result-item';

      var summary = '';
      if (issue.tags) {
        summary = Object.keys(issue.tags).map(function (k) { return k + ':' + issue.tags[k]; }).join(', ');
      }

      item.innerHTML =
        '<strong>' + (issue.type === 'node' ? '🔴' : '🟡') + ' ID: ' + issue.id + '</strong>' +
        '<small>' + escapeHtml(summary.substring(0, 60)) + '</small>';

      item.addEventListener('click', function () {
        var lat = issue.lat || (issue.center ? issue.center.lat : bounds.getCenter().lat);
        var lon = issue.lon || (issue.center ? issue.center.lon : bounds.getCenter().lng);
        map.setView([lat, lon], 17);
        showIssueDetails(issue, lat, lon);
      });

      listEl.appendChild(item);
    });

    var statsEl = document.getElementById('issuesStats');
    if (statsEl) {
      statsEl.textContent = isEl ? 'Βρέθηκαν ' + qualityCheckerState.issues.length + ' θέματα' : 'Found ' + qualityCheckerState.issues.length + ' issues';
    }

  } catch (err) {
    console.error('Quality check error:', err);
    alert((isEl ? 'Σφάλμα: ' : 'Error: ') + err.message);
  } finally {
    qualityCheckerState.isLoading = false;
    showQcSpinner(false);
  }
}

function showIssueDetails(issue, lat, lon) {
  var isEl = getCurrentLang() === 'el';
  var panel = document.getElementById('activeModulePanel');
  var content = document.getElementById('moduleContent');
  if (!panel || !content) return;

  panel.classList.add('active');
  document.getElementById('activeModuleTitle').textContent = '⚠️ ' + (isEl ? 'Θέμα' : 'Issue') + ' #' + issue.id;

  var tagsHtml = '';
  if (issue.tags) {
    tagsHtml = '<table class="poi-tags-table"><thead><tr><th>' + (isEl ? 'Κλειδί' : 'Key') + '</th><th>' + (isEl ? 'Τιμή' : 'Value') + '</th></tr></thead><tbody>';
    Object.keys(issue.tags).forEach(function (k) {
      tagsHtml += '<tr><td>' + escapeHtml(k) + '</td><td>' + escapeHtml(issue.tags[k]) + '</td></tr>';
    });
    tagsHtml += '</tbody></table>';
  }

  content.innerHTML =
    '<div class="issue-details">' +
    '  <div style="margin-bottom:0.5rem;"><strong>' + (isEl ? 'Τύπος:' : 'Type:') + '</strong> ' + escapeHtml(issue.type) + '</div>' +
    '  <div style="margin-bottom:0.5rem;"><strong>ID:</strong> ' + issue.id + ' (<a href="https://openstreetmap.org/' + issue.type + '/' + issue.id + '" target="_blank">OSM ↗</a>)</div>' +
    '  <div style="margin-bottom:0.5rem;"><strong>📍 ' + (isEl ? 'Συντεταγμένες:' : 'Coordinates:') + '</strong> ' + lat.toFixed(6) + ', ' + lon.toFixed(6) + '</div>' +
    tagsHtml +
    '  <a href="https://openstreetmap.org/' + issue.type + '/' + issue.id + '" target="_blank" class="btn btn-sm" style="margin-top:0.5rem;">' + (isEl ? 'Επεξεργασία στο OSM' : 'Edit in OSM') + '</a>' +
    '</div>';
}

function showQcSpinner(show) {
  var btn = document.getElementById('runChecksBtn');
  if (!btn) return;
  var isEl = getCurrentLang() === 'el';
  if (show) {
    btn.disabled = true;
    btn.textContent = isEl ? 'Έλεγχος...' : 'Checking...';
  } else {
    btn.disabled = false;
    btn.textContent = isEl ? 'Εκτέλεση' : 'Run Checks';
  }
}

function _qualityCheckerCleanup() {
  delete window.onMapClick_qualityChecker;
  qualityCheckerState = { isLoading: false, issues: [] };
}

window._qualityCheckerCleanup = _qualityCheckerCleanup;