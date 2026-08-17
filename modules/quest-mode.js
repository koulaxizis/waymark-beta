/* =========================================================
   WAYMARK — Quest Mode Module
   StreetComplete-style quests for missing OSM data.
   Fix #14: Search returns error — fixed Overpass query.
   ========================================================= */

let questState = {
  quests: [],
  currentQuestIdx: 0,
  questMarkers: [],
  activeQuests: [],
};

const QUEST_TYPES = {
  missing_name: {
    icon: '🏷️',
    title: { el: 'Λείπει το όνομα', en: 'Missing name' },
    query: 'nwr[!"name"]["amenity"](bbox);',
    tagKey: 'name',
    tagLabel: { el: 'Όνομα', en: 'Name' },
    inputType: 'text',
  },
  missing_phone: {
    icon: '📞',
    title: { el: 'Λείπει τηλέφωνο', en: 'Missing phone' },
    query: 'nwr["amenity"][!"phone"]["phone"!~"."](bbox);',
    tagKey: 'phone',
    tagLabel: { el: 'Τηλέφωνο', en: 'Phone' },
    inputType: 'tel',
  },
  missing_website: {
    icon: '🌐',
    title: { el: 'Λείπει website', en: 'Missing website' },
    query: 'nwr["amenity"][!"website"]["website"!~"."]["contact:website"!~"."](bbox);',
    tagKey: 'website',
    tagLabel: { el: 'Website', en: 'Website' },
    inputType: 'url',
  },
  missing_opening_hours: {
    icon: '🕐',
    title: { el: 'Λείπει ωράριο', en: 'Missing opening hours' },
    query: 'nwr["amenity"][!"opening_hours"]["opening_hours"!~"."](bbox);',
    tagKey: 'opening_hours',
    tagLabel: { el: 'Ωράριο λειτουργίας', en: 'Opening hours' },
    inputType: 'text',
  },
  missing_wheelchair: {
    icon: '♿',
    title: { el: 'Λείπει προσβασιμότητα', en: 'Missing wheelchair info' },
    query: 'nwr["amenity"][!"wheelchair"](bbox);',
    tagKey: 'wheelchair',
    tagLabel: { el: 'Προσβασιμότητα', en: 'Wheelchair access' },
    inputType: 'select',
    options: ['yes', 'no', 'limited'],
  },
};

function initQuestMode(map, container, appState) {
  const isEl = getCurrentLang() === 'el';

  questState = {
    quests: [],
    currentQuestIdx: 0,
    questMarkers: [],
    activeQuests: [],
  };

  container.innerHTML = `
    <div class="module-form">
      <p style="font-size: 0.82rem; color: var(--fg-muted); margin-bottom: 0.75rem;">
        ${isEl
          ? 'Βρες POIs με ελλιπή δεδομένα και συμπλήρωσε τις ερωτήσεις.streetComplete-style!'
          : 'Find POIs with incomplete data and fill in the gaps. StreetComplete-style!'}
      </p>

      <div class="form-group">
        <label>${isEl ? 'Τύπος Quest' : 'Quest Type'}</label>
        <select id="questTypeSelect">
          ${Object.entries(QUEST_TYPES).map(([key, q]) =>
            `<option value="${key}">${q.icon} ${isEl ? q.title.el : q.title.en}</option>`
          ).join('')}
        </select>
      </div>

      <button class="btn btn-success" id="searchQuestsBtn">${isEl ? '🔍 Αναζήτηση' : '🔍 Search'}</button>

      <div id="questResults" style="margin-top: 0.75rem;"></div>

      <div id="questActiveContainer" style="display: none;"></div>
    </div>
  `;

  window.appStateRef = window.appStateRef || {};
  window.appStateRef.map = map;

  document.getElementById('searchQuestsBtn').addEventListener('click', () => {
    const questType = document.getElementById('questTypeSelect').value;
    searchQuests(map, questType, appState);
  });
}

// Fix #14: Properly formatted Overpass query with bbox expansion
async function searchQuests(map, questType, appState) {
  const isEl = getCurrentLang() === 'el';
  const resultsDiv = document.getElementById('questResults');

  // Show loading
  resultsDiv.innerHTML = `<div class="spinner"></div><p style="text-align:center;margin-top:0.5rem;font-size:0.8rem;color:var(--fg-muted);">${isEl ? 'Αναζήτηση...' : 'Searching...'}</p>`;

  // Clear previous markers
  questState.questMarkers.forEach(m => map.removeLayer(m));
  questState.questMarkers = [];
  questState.activeQuests = [];

  const qTypeDef = QUEST_TYPES[questType];
  if (!qTypeDef) return;

  const bounds = map.getBounds();
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const bbox = `${sw.lat},${sw.lon},${ne.lat},${ne.lon}`;

  // Fix #14: Proper Overpass query format
  const query = `[out:json][timeout:25];
(
  ${qTypeDef.query.replace('bbox', bbox)}
);
out body center 50;`;

  try {
    const response = await fetch(WAYMARK_CONFIG.OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
    });

    if (!response.ok) {
      throw new Error(`Overpass HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.elements || data.elements.length === 0) {
      resultsDiv.innerHTML = `<p style="text-align:center;font-size:0.85rem;color:var(--fg-muted);">${isEl ? '🎉 Δεν βρέθηκαν quests σε αυτή την περιοχή!' : '🎉 No quests found in this area!'}</p>`;
      return;
    }

    // Process results
    data.elements.forEach(el => {
      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      if (!lat || !lon) return;

      const quest = {
        element: el,
        type: questType,
        tagKey: qTypeDef.tagKey,
        tagLabel: isEl ? qTypeDef.tagLabel.el : qTypeDef.tagLabel.en,
        inputType: qTypeDef.inputType,
        options: qTypeDef.options,
      };

      questState.activeQuests.push(quest);

      const marker = L.circleMarker([lat, lon], {
        radius: 10,
        fillColor: '#ffb143',
        color: 'white',
        weight: 2,
        fillOpacity: 0.8,
      }).addTo(map);

      marker.on('click', () => {
        showQuestUI(quest, map, appState);
      });

      const name = el.tags?.name || el.tags?.['addr:street'] || `#${el.id}`;
      const tagInfo = getMainTagInfo(el.tags);

      marker.bindPopup(`
        <div style="min-width: 180px;">
          <strong>${escapeHtml(name)}</strong><br>
          <small style="color: var(--fg-muted)">${tagInfo}</small><br>
          <small>${qTypeDef.icon} ${isEl ? qTypeDef.title.el : qTypeDef.title.en}</small>
        </div>
      `);

      questState.questMarkers.push(marker);
    });

    // Show results list
    resultsDiv.innerHTML = `
      <p style="font-size: 0.82rem; color: var(--success); margin-bottom: 0.5rem;">
        ✅ ${isEl ? `Βρέθηκαν ${questState.activeQuests.length} quests` : `Found ${questState.activeQuests.length} quests`}
      </p>
      <div class="results-list" style="max-height: 250px;">
        ${questState.activeQuests.map((q, idx) => {
          const el = q.element;
          const name = el.tags?.name || el.tags?.['addr:street'] || `#${el.id}`;
          const tagInfo = getMainTagInfo(el.tags);
          return `
            <div class="result-item" onclick="window.selectQuest(${idx})">
              <strong>${qTypeDef.icon} ${escapeHtml(name)}</strong>
              <small>${tagInfo}</small>
            </div>
          `;
        }).join('')}
      </div>
    `;

  } catch (err) {
    console.error('Quest search error:', err);
    resultsDiv.innerHTML = `
      <p style="font-size: 0.82rem; color: var(--danger); text-align: center;">
        ${isEl ? '❌ Σφάλμα αναζήτησης. Δοκίμασε ξανά.' : '❌ Search error. Try again.'}
      </p>
      <p style="font-size: 0.75rem; color: var(--fg-muted); text-align: center;">
        ${escapeHtml(err.message)}
      </p>
    `;
  }
}

function getMainTagInfo(tags) {
  if (!tags) return 'Unknown';
  const priority = ['amenity', 'shop', 'tourism', 'leisure', 'highway', 'building', 'natural'];
  for (const key of priority) {
    if (tags[key]) return `${key}: ${tags[key]}`;
  }
  const firstKey = Object.keys(tags)[0];
  return firstKey ? `${firstKey}: ${tags[firstKey]}` : 'Unknown';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Show quest UI when a quest is selected
function showQuestUI(quest, map, appState) {
  const isEl = getCurrentLang() === 'el';
  const el = quest.element;
  const lat = el.lat || el.center?.lat;
  const lon = el.lon || el.center?.lon;

  // Center map on quest
  map.setView([lat, lon], Math.max(map.getZoom(), 16));

  const name = el.tags?.name || '(unnamed)';
  const tagInfo = getMainTagInfo(el.tags);

  const container = document.getElementById('questActiveContainer');
  container.style.display = 'block';
  container.innerHTML = `
    <div style="background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem;">
      <h3 style="font-size: 0.95rem; margin-bottom: 0.3rem;">${escapeHtml(name)}</h3>
      <small style="color: var(--fg-muted)">${tagInfo}</small>
      <hr>
      <p style="font-size: 0.82rem; margin-bottom: 0.5rem;">
        ${QUEST_TYPES[quest.type].icon} ${isEl ? QUEST_TYPES[quest.type].title.el : QUEST_TYPES[quest.type].title.en}
      </p>
      <div class="form-group">
        <label>${quest.tagLabel}</label>
        ${quest.inputType === 'select'
          ? `<select id="questAnswerInput">${quest.options.map(o => `<option value="${o}">${o}</option>`).join('')}</select>`
          : `<input type="${quest.inputType}" id="questAnswerInput" placeholder="${quest.tagLabel}">`
        }
      </div>
      <button class="btn btn-success" id="submitQuestBtn">${isEl ? '✅ Υποβολή' : '✅ Submit'}</button>
      <button class="btn btn-secondary" id="skipQuestBtn">${isEl ? '⏭️ Παράλειψη' : '⏭️ Skip'}</button>
    </div>
  `;

  document.getElementById('submitQuestBtn').addEventListener('click', () => {
    const answer = document.getElementById('questAnswerInput').value.trim();
    if (!answer) {
      alert(isEl ? 'Συμπλήρωσε την απάντηση.' : 'Please fill in the answer.');
      return;
    }
    submitAnswer(quest, answer, map, appState);
  });

  document.getElementById('skipQuestBtn').addEventListener('click', () => {
    container.innerHTML = '';
    container.style.display = 'none';
  });
}

// Submit quest answer to OSM
async function submitAnswer(quest, answer, map, appState) {
  const isEl = getCurrentLang() === 'el';
  const token = sessionStorage.getItem('osm_access_token');

  if (!token) {
    alert(isEl
      ? 'Πρέπει να συνδεθείς πρώτα (OSM Editor → Login).'
      : 'You need to log in first (OSM Editor → Login).');
    return;
  }

  const el = quest.element;
  const tagKey = quest.tagKey;

  // Build OSC XML
  const oscXml = `<?xml version="1.0" encoding="UTF-8"?>
<osmChange version="0.6" generator="Waymark">
  <modify>
    <node id="${el.id}" lat="${el.lat || el.center?.lat}" lon="${el.lon || el.center?.lon}" version="${el.version || 1}">
${Object.entries(el.tags || {}).map(([k, v]) => `      <tag k="${escapeHtml(k)}" v="${escapeHtml(v)}"/>`).join('\n')}
      <tag k="${escapeHtml(tagKey)}" v="${escapeHtml(answer)}"/>
    </node>
  </modify>
</osmChange>`;

  try {
    const proxyUrl = WAYMARK_CONFIG.PROXY_URL;

    // Create changeset
    const changesetXml = `<osm>
  <changeset>
    <tag k="created_by" v="Waymark Quest"/>
    <tag k="comment" v="Added ${tagKey} via Waymark Quest"/>
  </changeset>
</osm>`;

    const csRes = await fetch(proxyUrl + '/changeset/create', {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/xml',
      },
      body: changesetXml,
    });

    if (!csRes.ok) throw new Error('Changeset creation failed');
    const csId = (await csRes.text()).trim();

    // Upload
    const upRes = await fetch(`${proxyUrl}/changeset/${csId}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/xml',
      },
      body: oscXml,
    });

    if (!upRes.ok) throw new Error('Upload failed');

    // Close
    await fetch(`${proxyUrl}/changeset/${csId}/close`, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token },
    });

    alert(isEl ? `✅ Επιτυχία! ${tagKey}=${answer}` : `✅ Done! ${tagKey}=${answer}`);

    // Remove marker
    const markerIdx = questState.activeQuests.indexOf(quest);
    if (markerIdx >= 0 && questState.questMarkers[markerIdx]) {
      map.removeLayer(questState.questMarkers[markerIdx]);
      questState.questMarkers.splice(markerIdx, 1);
      questState.activeQuests.splice(markerIdx, 1);
    }

    // Hide UI
    const container = document.getElementById('questActiveContainer');
    container.innerHTML = '';
    container.style.display = 'none';

  } catch (err) {
    console.error('Quest submit error:', err);
    alert(isEl ? 'Σφάλμα υποβολής.' : 'Submission error.');
  }
}

// Select quest from list
window.selectQuest = function (idx) {
  const quest = questState.activeQuests[idx];
  if (!quest) return;
  showQuestUI(quest, window.appStateRef?.map, null);
};

// Cleanup
window._quest_modeCleanup = function () {
  if (window.appStateRef?.map) {
    questState.questMarkers.forEach(m => window.appStateRef.map.removeLayer(m));
  }
  questState.questMarkers = [];
  questState.activeQuests = [];
};

window.initQuestMode = initQuestMode;