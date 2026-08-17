/* =========================================================
   WAYMARK — Tags Lookup Module
   Search OSM tags from the wiki/taginfo database.
   ========================================================= */

let tagsLookupState = {
  recentSearches: [],
};

function initTagsLookup(map, container, appState) {
  renderTagsLookupUI(container);
  loadPopularTags();

  function handleMapClick(lat, lng) {}
  window.onMapClick_tagsLookup = handleMapClick;
}

function renderTagsLookupUI(container) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
    <div class="tags-lookup-ui">
      <div class="form-group">
        <label>${isEl ? 'Αναζήτηση tag:' : 'Search tag:'}</label>
        <input type="text" id="tlSearch" class="form-control"
               placeholder="${isEl ? 'π.χ. amenity, shop...' : 'e.g. amenity, shop...'}"
               autofocus>
      </div>

      <button id="tlSearchBtn" class="btn btn-primary">
        🔍 ${isEl ? 'Αναζήτηση' : 'Search'}
      </button>

      <hr>

      <div id="tlResults" class="results-list"></div>
    </div>
  `;

  document.getElementById('tlSearchBtn').addEventListener('click', searchTags);
  document.getElementById('tlSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchTags();
  });
}

async function searchTags() {
  const query = document.getElementById('tlSearch').value.trim().toLowerCase();
  const isEl = getCurrentLang() === 'el';

  if (!query) return;

  try {
    const response = await fetch(`https://taginfo.openstreetmap.org/api/4/tags/popular?key=${encodeURIComponent(query)}&page=1&rp=20&sortname=count_all&sortorder=desc`);
    const data = await response.json();

    const resultsEl = document.getElementById('tlResults');
    resultsEl.innerHTML = '';

    if (!data.data || data.data.length === 0) {
      resultsEl.innerHTML = `<p>${isEl ? 'Δεν βρέθηκαν tags' : 'No tags found'}</p>`;
      return;
    }

    data.data.forEach(item => {
      const div = document.createElement('div');
      div.className = 'result-item';
      div.innerHTML = `
        <strong>${escapeHtml(item.key)}=${escapeHtml(item.value)}</strong>
        <small>Used ${item.count_all} times</small>
      `;
      div.addEventListener('click', () => {
        navigator.clipboard.writeText(`${item.key}=${item.value}`).then(() => {
          showNotification(isEl ? 'Αντιγράφηκε!' : 'Copied!', 'success');
        });
      });
      resultsEl.appendChild(div);
    });

    tagsLookupState.recentSearches.push(query);

  } lookup catch (err) {
    console.error('Tag lookup error:', err);
    alert(isEl ? 'Σφάλμα αναζήτησης: ' + err.message : 'Lookup error: ' + err.message);
  }
}

async function loadPopularTags() {
  const isEl = getCurrentLang() === 'el';

  try {
    const response = await fetch('https://taginfo.openstreetmap.org/api/4/tags/popular?page=1&rp=15&sortname=count_all&sortorder=desc');
    const data = await response.json();

    const resultsEl = document.getElementById('tlResults');
    resultsEl.innerHTML = '';

    if (!data.data || data.data.length === 0) return;

    data.data.forEach(item => {
      const div = document.createElement('div');
      div.className = 'result-item';
      div.innerHTML = `
        <strong>${escapeHtml(item.key)}=${escapeHtml(item.value)}</strong>
        <small>Used ${item.count_all} times</small>
      `;
      div.addEventListener('click', () => {
        navigator.clipboard.writeText(`${item.key}=${item.value}`).then(() => {
          showNotification(isEl ? 'Αντιγράφηκε!' : 'Copied!', 'success');
        });
      });
      resultsEl.appendChild(div);
    });
  } catch (err) {
    console.error('Popular tags error:', err);
  }
}

function _tagsLookupCleanup() {
  delete window.onMapClick_tagsLookup;
  tagsLookupState = { recentSearches: [] };
}

window._tagsLookupCleanup = _tagsLookupCleanup;