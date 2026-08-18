/* =========================================================
   WAYMARK — Quality Checker Module
   Run validation checks on OSM data using Overpass API.
   No auto-run on activation — user must press "Run".
   ========================================================= */

var qualityCheckerState = {
  isLoading: false,
  issues: [],
};

function getQcMap() { return window.appState ? window.appState.map : null; }

function initQualityChecker(map, container, appState) {
  renderQcUI(container);

  var m = getQcMap();
  if (m) {
    var timer = null;
    m.on('moveend', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { runChecks(); }, 600);
    });
  }

  window.onMapClick_qualityChecker = function (lat, lng) {};
}

function renderQcUI(container) {
  var isEl = getCurrentLang() === 'el';

  container.innerHTML =
    '<div class="quality-checker-ui">' +
    '  <div class="form-group"><label>' + (isEl ? 'Έλεγχος:' : 'Check:') + '</label>' +
    '    <select id="checkType" class="form-control">' +
    '      <option value="ways_without_names">' + (isEl ? 'Ways χωρίς όνομα' : 'Ways without names') + '</option>' +
    '      <option value="buildings_no_address">' + (isEl ? 'Κτήρια χωρίς διεύθυνση' : 'Buildings without address') + '</option>' +
    '      <option value="highways_no_maxspeed">' + (isEl ? 'Δρόμοι χωρίς maxspeed' : 'Highways without maxspeed') + '</option>' +
    '      <option value="shops_no_hours">' + (isEl ? 'Καταστήματα χωρίς ώρες' : 'Shops without hours') + '</option>' +
    '    </select>' +
    '  </div>' +
    '  <button id="runChecksBtn" class="btn btn-primary">🔍 ' + (isEl ? 'Εκτέλεση' : 'Run Checks') + '</button>' +
    '  <div id="issuesStats" class="note-description" style="margin-top:0.5rem;"></div>' +
    '  <div id="issuesList" class="results-list"></div>' +
    '</div>';

  var checkEl = document.getElementById('checkType');
  var runBtn = document.getElementById('runChecksBtn');

  if (checkEl) checkEl.addEventListener('change', function () {
    // Only auto-run if we already have results
    if (qualityCheckerState.issues.length > 0) runChecks();
  });
  if (runBtn) runBtn.addEventListener('click', runChecks);
}

async function runChecks() {
  if (qualityCheckerState.isLoading) return;
  qualityCheckerState.isLoading = true;

  var map = getQcMap();
  if (!map) { qualityCheckerState.isLoading = false; return; }

  var checkTypeEl = document.getElementById('checkType');
  var checkType = checkTypeEl ? checkTypeEl.value : 'ways_without_names';
  var isEl = getCurrentLang() === 'el';

  showQcSpinner(true);

  try {
    var bounds = map.getBounds();
    var bbox = bounds.getSouth() + ',' + bounds.getWest() + ',' +
               bounds.getNorth() + ',' + bounds.getEast();

    var queries = {
      ways_without_names: '[out:json][timeout:25];(way(' + bbox + ')["highway"]["name"!~".+"];);out body center 50;',
      buildings_no_address: '[out:json][timeout:25];(way(' + bbox + ')["building"]["addr:housenumber"!~".+"];);out body center 50;',
      highways_no_maxspeed: '[out:json][timeout:25];(way(' + bbox + ')["highway"]["maxspeed"!~".+"];);out body center 50;',
      shops_no_hours: '[out:json][timeout:25];(node(' + bbox + ')["shop"]["opening_hours"!~".+"];);out body center 50;',
    };

    var query = queries[checkType];
    var result = await safeOverpassFetch(query, isEl);

    qualityCheckerState.issues = result.elements || [];

    var listEl = document.getElementById('issuesList');
    if (!listEl) { qualityCheckerState.isLoading = false; showQcSpinner(false); return; }
    listEl.innerHTML = '';

    if (qualityCheckerState.issues.length === 0) {
      listEl.innerHTML = '<p>' + (isEl ? 'Δεν βρέθηκαν προβλήματα ✅' : 'No issues found ✅') + '</p>';
      var s0 = document.getElementById('issuesStats');
      if (s0) s0.textContent = '';
      qualityCheckerState.isLoading = false;
      showQcSpinner(false);
      return;
    }

    qualityCheckerState.issues.forEach(function (issue) {
      var item = document.createElement('div');
      item.className = 'result-item';

      var summary = '';
      if (issue.tags) {
        summary = Object.keys(issue.tags).map(function (k) {
          return k + ':' + issue.tags[k];
        }).join(', ');
      }

      item.innerHTML =
        '<strong>' + (issue.type === 'node' ? '🔴' : '🟡') + ' ID: ' + issue.id + '</strong>' +
        '<small>' + escapeHtml(summary.substring(0, 60)) + '</small>';

      item.addEventListener('click', function () {
        var lat = issue.lat || (issue.center ? issue.center.lat : bounds.getCenter().lat);
        var lng = issue.lon || (issue.center ? issue.center.lon : bounds.getCenter().lng);
        map.setView([lat, lng], 17);
      });

      listEl.appendChild(item);
    });

    var statsEl = document.getElementById('issuesStats');
    if (statsEl) {
      statsEl.textContent = isEl
        ? 'Βρέθηκαν ' + qualityCheckerState.issues.length + ' θέματα'
        : 'Found ' + qualityCheckerState.issues.length + ' issues';
    }

  } catch (err) {
    console.error('Quality check error:', err);
    alert((isEl ? 'Σφάλμα: ' : 'Error: ') + err.message);
  } finally {
    qualityCheckerState.isLoading = false;
    showQcSpinner(false);
  }
}

function showQcSpinner(show) {
  var btn = document.getElementById('runChecksBtn');
  if (!btn) return;
  var isEl = getCurrentLang() === 'el';
  btn.disabled = show;
  btn.textContent = show
    ? (isEl ? 'Έλεγχος...' : 'Checking...')
    : (isEl ? 'Εκτέλεση' : 'Run Checks');
}

function _qualityCheckerCleanup() {
  delete window.onMapClick_qualityChecker;
  qualityCheckerState = { isLoading: false, issues: [] };
}

window._qualityCheckerCleanup = _qualityCheckerCleanup;