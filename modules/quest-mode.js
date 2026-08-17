/* =========================================================
   WAYMARK — Quest Mode Module
   Gamified mapping missions with Overpass API queries.
   ========================================================= */

let questModeState = {
  currentQuest: null,
  completedQuests: [],
  activeMarkers: [],
};

const QUEST_TEMPLATES = [
  {
    id: 'missing_name_highway',
    icon: '🛣️',
    title_el: 'Ονόματα Δρόμων',
    title_en: 'Street Names',
    description_el: 'Βρες δρόμους χωρίς όνομα και πρόσθεσε τα ονόματά τους.',
    description_en: 'Find roads without names and add their street names.',
    overpassQuery: (bbox) => `
[out:json][timeout:25];
(
  way["highway"]["name"!~".+"]["name"!~"."](bbox);
);
out body center limit 50;
`.trim(),
    answerLabel_el: 'Όνομα δρόμου:',
    answerLabel_en: 'Street name:',
    tagName: 'name',
    checkTag: 'name',
  },
  {
    id: 'missing_addr',
    icon: '🏠',
    title_el: 'Διευθύνσεις',
    title_en: 'Addresses',
    description_el: 'Βρες κτήρια χωρίς διεύθυνση και πρόσθεσε αριθμούς οδών.',
    description_en: 'Find buildings without addresses and add house numbers.',
    overpassQuery: (bbox) => `
[out:json][timeout:25];
(
  way["building"]["addr:street"!~".+"]["addr:housenumber"!~"."](bbox);
  way["building"]["addr:housenumber"!~"."](bbox);
);
out body center limit 50;
`.trim(),
    answerLabel_el: 'Αριθμός οδού:',
    answerLabel_en: 'House number:',
    tagName: 'addr:housenumber',
    checkTag: 'addr:housenumber',
  },
  {
    id: 'missing_shop_type',
    icon: '🏪',
    title_el: 'Είδη Καταστημάτων',
    title_en: 'Shop Types',
    description_el: 'Βρες καταστήματα χωρίς συγκεκριμένο είδος (shop=*).',
    description_en: 'Find shops without specific shop type.',
    overpassQuery: (bbox) => `
[out:json][timeout:25];
(
  node["shop"!~".+"]["shop"](bbox);
  way["shop"!~".+"]["shop"](bbox);
);
out body center limit 50;
`.trim(),
    answerLabel_el: 'Είδος κατάστημα:',
    answerLabel_en: 'Shop type:',
    tagName: 'shop',
    checkTag: 'shop',
  },
];

function initQuestMode(map, container, appState) {
  renderQuestUI(container);
  startRandomQuest(map, appState);
}

function renderQuestUI(container) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
    <div class="quest-mode-ui">
      <div id="questProgress" class="note-description">
        ${isEl ? 'Ξεκίνα μια αποστολή!' : 'Start a quest!'}
      </div>

      <h3>${isEl ? 'Διαθέσιμες Αποστολές' : 'Available Quests'}</h3>
      <div id="questList" class="results-list"></div>

      <hr>

      <div id="activeQuest" style="display:none;">
        <h4>${isEl ? 'Ενεργή Αποστολή' : 'Active Quest'}</h4>
        <div id="questInfo" class="note-description"></div>
        <button id="startQuestBtn" class="btn btn-success">${isEl ? 'Έναρξη' : 'Start'}</button>
        <button id="skipQuestBtn" class="btn btn-secondary">${isEl ? 'Παράκαμψη' : 'Skip'}</button>
      </div>

      <div id="answerSection" style="display:none;">
        <h4>${isEl ? 'Απάντηση' : 'Answer'}</h4>
        <div class="form-group">
          <label id="answerQuestionLabel"></label>
          <input type="text" id="questAnswerInput" class="form-control"
                 placeholder="${isEl ? 'Εισάγετε απάντηση...' : 'Enter answer...'}">
        </div>
        <button id="submitAnswerBtn" class="btn btn-success">${isEl ? 'Υποβολή' : 'Submit'}</button>
      </div>
    </div>
  `;

  renderQuestList();

  document.getElementById('startQuestBtn').addEventListener('click', () => {
    const quest = questModeState.currentQuest;
    if (quest) {
      executeQuest(map, quest);
    }
  });

  document.getElementById('skipQuestBtn').addEventListener('click', () => {
    hideActiveQuest();
    startRandomQuest(map, appState);
  });

  document.getElementById('submitAnswerBtn').addEventListener('click', () => {
    submitAnswer(map, appState);
  });
}

function renderQuestList() {
  const list = document.getElementById('questList');
  list.innerHTML = '';

  const isEl = getCurrentLang() === 'el';

  QUEST_TEMPLATES.forEach(template => {
    const item = document.createElement('div');
    item.className = 'result-item';
    item.innerHTML = `
      <strong>${template.icon} ${isEl ? template.title_el : template.title_en}</strong>
      <small>${isEl ? template.description_el : template.description_en}</small>
    `;

    item.addEventListener('click', () => {
      setActiveQuest(template);
    });

    list.appendChild(item);
  });
}

function setActiveQuest(template) {
  questModeState.currentQuest = template;

  const isEl = getCurrentLang() === 'el';
  document.getElementById('activeQuest').style.display = 'block';
  document.getElementById('questInfo').innerHTML = `
    <strong>${template.icon} ${isEl ? template.title_el : template.title_en}</strong><br/>
    ${isEl ? template.description_el : template.description_en}<br/>
    <small style="color:var(--fg-muted)">${isEl ? 'Στον χάρτη θα εμφανιστούν στόχοι για την αποστολή.' : 'Targets will appear on the map.'}</small>
  `;

  document.getElementById('startQuestBtn').disabled = !isLoggedIn();
}

function startRandomQuest(map, appState) {
  const randomIdx = Math.floor(Math.random() * QUEST_TEMPLATES.length);
  setActiveQuest(QUEST_TEMPLATES[randomIdx]);
}

function hideActiveQuest() {
  document.getElementById('activeQuest').style.display = 'none';
  document.getElementById('answerSection').style.display = 'none';
  questModeState.currentQuest = null;
  questModeState.activeMarkers.forEach(m => {
    if (map) map.removeLayer(m);
  });
  questModeState.activeMarkers = [];
}

async function executeQuest(map, quest) {
  const bounds = map.getBounds();
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const bboxStr = `${sw.lat},${sw.lon},${ne.lat},${ne.lon}`;

  const query = quest.overpassQuery(bboxStr);
  const isEl = getCurrentLang() === 'el';

  try {
    const result = await safeOverpassFetch(query, isEl);

    if (!result.elements || result.elements.length === 0) {
      showNotification(isEl ? 'Δεν βρέθηκαν στόχοι σε αυτή την περιοχή.' : 'No targets found in this area.', 'warning');
      return;
    }

    // Clear previous markers
    questModeState.activeMarkers.forEach(m => map.removeLayer(m));
    questModeState.activeMarkers = [];

    // Add markers for each target
    result.elements.forEach(el => {
      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;

      if (lat && lon) {
        const marker = L.marker([lat, lon]).addTo(map);
        const popupContent = buildQuestTargetPopup(el, quest);
        marker.bindPopup(popupContent);
        questModeState.activeMarkers.push(marker);
      }
    });

    document.getElementById('answerSection').style.display = 'block';

    const label = isEl ? quest.answerLabel_el : quest.answerLabel_en;
    document.getElementById('answerQuestionLabel').textContent = label;

  } catch (err) {
    console.error('Overpass error:', err);
    alert(isEl ? 'Σφάλμα στο Overpass API: ' + err.message : 'Overpass API error: ' + err.message);
  }
}

function buildQuestTargetPopup(el, quest) {
  const isEl = getCurrentLang() === 'el';
  let html = `<div style="font-size:0.85rem; max-width:200px;">`;
  html += `<strong>${isEl ? quest.title_el : quest.title_en}</strong><br/>`;
  html += `ID: <a href="https://openstreetmap.org/${el.type}/${el.id}" target="_blank">${el.id} ↗</a><br/>`;
  html += `<small>${Object.entries(el.tags || {}).map(([k,v]) => `${k}:${v}`).join(', ')}</small>`;
  html += '</div>';
  return html;
}

async function submitAnswer(map, appState) {
  const answer = document.getElementById('questAnswerInput').value.trim();
  const quest = questModeState.currentQuest;

  if (!answer) {
    showNotification(getCurrentLang() === 'el' ? 'Πληκτρολόγησε απάντηση!' : 'Enter an answer!', 'warning');
    return;
  }

  // Find the nearest active marker
  if (!questModeState.activeMarkers.length) {
    showNotification(getCurrentLang() === 'el' ? 'Δεν υπάρχουν ενεργοί στόχοι.' : 'No active targets.', 'warning');
    return;
  }

  // Assume user clicked on a marker - find which one they want to answer for
  // For simplicity, use the first one (should be improved with marker selection)
  const targetMarker = questModeState.activeMarkers[0];

  // Find the original element data from markers
  const targetEl = questModeState.activeMarkers.find(m => m === targetMarker);

  const oscXml = buildQuestAnswerOSC(targetEl, quest, answer);

  try {
    const result = await uploadOSC(osmEditorState.accessToken, oscXml);

    if (result.success) {
      showNotification(getCurrentLang() === 'el' ? '✅ Απάντηση αποθηκεύτηκε!' : '✅ Answer saved!', 'success');
      questModeState.completedQuests.push(quest.id);

      // Mark as complete in UI
      document.getElementById('questProgress').textContent =
        getCurrentLang() === 'el'
          ? `🎉 ${questModeState.completedQuests.length} αποστολές ολοκληρώθηκαν!`
          : `🎉 ${questModeState.completedQuests.length} quests completed!`;

      // Hide answer section, show new quest option
      document.getElementById('answerSection').style.display = 'none';
      hideActiveQuest();

      // Start new quest
      setTimeout(() => {
        startRandomQuest(map, appState);
      }, 500);
    } else {
      showNotification(getCurrentLang() === 'el' ? '❌ Απέτυχε η αποθήκευση: ' + result.error : '❌ Save failed: ' + result.error, 'critical');
    }
  } catch (err) {
    showNotification(getCurrentLang() === 'el' ? '❌ Σφάλμα: ' + err.message : '❌ Error: ' + err.message, 'critical');
  }
}

function buildQuestAnswerOSC(el, quest, answer) {
  const elType = el.type;
  const latLonAttrs = el.type === 'node'
    ? `lat="${el.lat || ''}" lon="${el.lon || ''}"`
    : '';

  const tagPairs = Object.entries(el.tags || {}).map(([k, v]) =>
    `      <tag k="${escapeXml(k)}" v="${escapeXml(v)}"/>`
  );

  tagPairs.push(`      <tag k="${escapeXml(quest.tagName)}" v="${escapeXml(answer)}"/>`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<osmChange version="0.6" generator="Waymark">
  <modify>
    <${elType} id="${el.id}" version="${el.version || 1}" ${latLonAttrs}>
${tagPairs.join('\n')}
    </${elType}>
  </modify>
</osmChange>`;
}

function _questModeCleanup() {
  delete window.onMapClick_questMode;
  if (window.appState?.map) {
    questModeState.activeMarkers.forEach(m => window.appState.map.removeLayer(m));
  }
  questModeState = { currentQuest: null, completedQuests: [], activeMarkers: [] };
}

window._questModeCleanup = _questModeCleanup;