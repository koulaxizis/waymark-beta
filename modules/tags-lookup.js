/* =========================================================
   WAYMARK — Tags Lookup Module
   Search OSM tags via Taginfo API (keys, values, popularity).
   ========================================================= */

var tagsLookupState = {
  results: [],
  isLoading: false,
};

function initTagsLookup(map, container, appState) {
  renderTagsLookupUI(container);
  window.onMapClick_tagsLookup = function (lat, lng) {};
}

function renderTagsLookupUI(container) {
  var isEl = getCurrentLang() === 'el';

  container.innerHTML =
    '<div class="tags-lookup-ui">' +
    '  <div class="note-description">' + (isEl
      ? 'Αναζήτηση OSM tags μέσω Taginfo. Γράψε ένα keyword (π.χ. bench, shop, amenity) για να δεις τα πιο δημοφιλή tags.'
      : 'Search OSM tags via Taginfo. Type a keyword (e.g. bench, shop, amenity) to see the most popular tags.') + '</div>' +

    '  <div class="form-group"><label>' + (isEl ? 'Αναζήτηση:' : 'Search:') + '</label>' +
    '    <input type="text" id="tlSearch" class="form-control" placeholder="' +
    (isEl ? 'π.χ. amenity, shop, bench...' : 'e.g. amenity, shop, bench...') + '" autofocus>' +
    '  </div>' +

    '  <div class="form-group"><label>' + (isEl ? 'Τύπος:' : 'Type:') + '</label>' +
    '    <select id="tlMode" class="form-control">' +
    '      <option value="popular">' + (isEl ? 'Δημοφιλή tags' : 'Popular tags') + '</option>' +
    '      <option value="keys">' + (isEl ? 'Keys μόνο' : 'Keys only') + '</option>' +
    '      <option value="wiki">' + (isEl ? 'Wiki περιγραφές' : 'Wiki descriptions') + '</option>' +
    '    </select>' +
    '  </div>' +

    '  <button id="tlSearchBtn" class="btn btn-primary">🔍 ' + (isEl ? 'Αναζήτηση' : 'Search') + '</button>' +
    '  <hr>' +
    '  <div id="tlStats" class="note-description"></div>' +
    '  <div id="tlResults" class="results-list"></div>' +
    '</div>';

  var searchBtn = document.getElementById('tlSearchBtn');
  var searchInput = document.getElementById('tlSearch');
  var modeSel = document.getElementById('tlMode');

  if (searchBtn) searchBtn.addEventListener('click', searchTags);
  if (searchInput) searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') searchTags();
  });
  if (modeSel) modeSel.addEventListener('change', function () {
    if (tagsLookupState.results.length > 0) searchTags();
  });
}

async function searchTags() {
  if (tagsLookupState.isLoading) return;

  var searchEl = document.getElementById('tlSearch');
  var modeEl = document.getElementById('tlMode');
  var query = searchEl ? searchEl.value.trim().toLowerCase() : '';
  var mode = modeEl ? modeEl.value : 'popular';
  var isEl = getCurrentLang() === 'el';

  if (!query) {
    showNotification(isEl ? 'Γράψε κάτι για αναζήτηση' : 'Type something to search', 'warning');
    return;
  }

  tagsLookupState.isLoading = true;
  showTlSpinner(true);

  try {
    var url;
    var resultsEl = document.getElementById('tlResults');
    var statsEl = document.getElementById('tlStats');

    if (resultsEl) resultsEl.innerHTML = '';
    if (statsEl) statsEl.textContent = isEl ? 'Αναζήτηση...' : 'Searching...';

    if (mode === 'popular') {
      // Search for popular key=value combinations matching the query
      url = 'https://taginfo.openstreetmap.org/api/4/tags/popular' +
        '?page=1&rp=25&sortname=count_all&sortorder=desc' +
        '&query=' + encodeURIComponent(query);
    } else if (mode === 'keys') {
      // Search for keys matching the query
      url = 'https://taginfo.openstreetmap.org/api/4/keys/all' +
        '?page=1&rp=25&sortname=count_all&sortorder=desc' +
        '&query=' + encodeURIComponent(query);
    } else {
      // Wiki: search for keys with wiki pages
      url = 'https://taginfo.openstreetmap.org/api/4/keys/wiki_pages' +
        '?page=1&rp=25' +
        '&query=' + encodeURIComponent(query);
    }

    var response = await fetch(url);

    if (!response.ok) throw new Error('HTTP ' + response.status);

    var data = await response.json();
    var items = data.data || [];

    tagsLookupState.results = items;

    if (!resultsEl) return;

    if (items.length === 0) {
      resultsEl.innerHTML = '<p>' + (isEl ? 'Δεν βρέθηκαν tags' : 'No tags found') + '</p>';
      if (statsEl) statsEl.textContent = '';
      return;
    }

    if (statsEl) {
      statsEl.textContent = isEl
        ? 'Βρέθηκαν ' + items.length + ' αποτελέσματα'
        : 'Found ' + items.length + ' results';
    }

    items.forEach(function (item) {
      var div = document.createElement('div');
      div.className = 'result-item';

      var label = '';
      var count = '';
      var description = '';

      if (mode === 'popular') {
        var key = item.key || '';
        var value = item.value || '';
        label = key + '=' + value;
        count = (item.count_all || 0).toString();

        // Format count nicely
        if (parseInt(count, 10) > 1000000) {
          count = (parseInt(count, 10) / 1000000).toFixed(1) + 'M';
        } else if (parseInt(count, 10) > 1000) {
          count = (parseInt(count, 10) / 1000).toFixed(1) + 'k';
        }

        count += (isEl ? ' χρήσεις' : ' uses');
        description = key + '=' + value;
      } else if (mode === 'keys') {
        label = item.key || '';
        count = (item.count_all || 0).toString();
        if (parseInt(count, 10) > 1000000) {
          count = (parseInt(count, 10) / 1000000).toFixed(1) + 'M';
        } else if (parseInt(count, 10) > 1000) {
          count = (parseInt(count, 10) / 1000).toFixed(1) + 'k';
        }
        count += (isEl ? ' χρήσεις' : ' uses');
        description = item.in_wiki ? '📖 ' + (isEl ? 'Υπάρχει στο Wiki' : 'In Wiki') : '';
      } else {
        // Wiki mode
        label = item.key || '';
        description = item.description || '';
        count = item.lang || '';
      }

      div.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:start;">' +
        '  <div>' +
        '    <strong style="color:#6d4aff;font-family:monospace;">' + escapeHtml(label) + '</strong>' +
        '    <br><small>' + escapeHtml(description) + '</small>' +
        '  </div>' +
        '  <div style="text-align:right;flex-shrink:0;margin-left:0.5rem;">' +
        '    <small style="color:var(--accent);">' + escapeHtml(count) + '</small>' +
        '  </div>' +
        '</div>' +
        '<div style="margin-top:0.25rem;">' +
        '  <button class="btn btn-sm btn-copy" data-tag="' + escapeHtml(label) + '">📋 Copy</button>' +
        '  <a href="https://wiki.openstreetmap.org/wiki/Tag:' + encodeURIComponent(label) +
        '" target="_blank" class="btn btn-sm">📖 Wiki</a>' +
        '</div>';

      // Attach copy handler
      var copyBtn = div.querySelector('.btn-copy');
      if (copyBtn) {
        copyBtn.addEventListener('click', function () {
          var tag = this.getAttribute('data-tag');
          if (navigator.clipboard) {
            navigator.clipboard.writeText(tag).then(function () {
              showNotification(isEl ? 'Αντιγράφηκε: ' + tag : 'Copied: ' + tag, 'success');
            });
          } else {
            // Fallback
            var tempInput = document.createElement('input');
            tempInput.value = tag;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            showNotification(isEl ? 'Αντιγράφηκε: ' + tag : 'Copied: ' + tag, 'success');
          }
        });
      }

      resultsEl.appendChild(div);
    });

  } catch (err) {
    console.error('Tags lookup error:', err);
    alert((isEl ? 'Σφάλμα: ' : 'Error: ') + err.message);
  } finally {
    tagsLookupState.isLoading = false;
    showTlSpinner(false);
  }
}

function showTlSpinner(show) {
  var btn = document.getElementById('tlSearchBtn');
  if (!btn) return;
  var isEl = getCurrentLang() === 'el';
  btn.disabled = show;
  btn.textContent = show
    ? (isEl ? 'Αναζήτηση...' : 'Searching...')
    : (isEl ? 'Αναζήτηση' : 'Search');
}

function _tagsLookupCleanup() {
  delete window.onMapClick_tagsLookup;
  tagsLookupState = { results: [], isLoading: false };
}

window._tagsLookupCleanup = _tagsLookupCleanup;