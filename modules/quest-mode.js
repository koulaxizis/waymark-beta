/* =========================================================
   WAYMARK — Quest Mode Module
   Guided micro-mapping quests.
   ========================================================= */

var questModeState = {
  currentQuest: null,
  questIndex: 0,
  quests: [],
  isLoading: false
};

function getQmMap() { return window.appState ? window.appState.map : null; }

function initQuestMode(map, container, appState) {
  renderQuestUI(container);
  window.onMapClick_questMode = function (lat, lng) {};
}

function renderQuestUI(container) {
  var isEl = getCurrentLang() === 'el';
  container.innerHTML =
    '<div class="quest-mode-ui">' +
    '  <div class="note-description">' + (isEl
      ? 'Το Quest Mode βρίσκει POI που λείπουν πληροφορίες και σε καθοδηγει να τα συμπληρώσεις.'
      : 'Quest Mode finds POIs missing information and guides you to complete them.') + '</div>' +
    '  <div class="form-group"><label>' + (isEl ? 'Τύπος Quest:' : 'Quest Type:') + '</label>' +
    '    <select id="questType" class="form-control">' +
    '      <option value="add_name">' + (isEl ? 'Πρόσθεσε όνομα' : 'Add name') + '</option>' +
    '      <option value="add_opening_hours">' + (isEl ? 'Πρόσθεσε ώρες' : 'Add opening hours') + '</option>' +
    '      <option value="add_phone">' + (isEl ? 'Πρόσθεσε τηλέφωνο' : 'Add phone') + '</option>' +
    '      <option value="add_website">' + (isEl ? 'Πρόσθεσε website' : 'Add website') + '</option>' +
    '    </select>' +
    '  </div>' +
    '  <button id="startQuestBtn" class="btn btn-success">▶️ ' + (isEl ? 'Ξεκίνα Quest' : 'Start Quest') + '</button>' +
    '  <hr>' +
    '  <div id="questProgress" class="note-description" style="display:none;"></div>' +
    '  <div id="questTarget" class="note-description" style="display:none;"></div>' +
    '  <button id="nextQuestBtn" class="btn btn-primary" style="display:none;">➡️ ' + (isEl ? 'Επόμενο' : 'Next') + '</button>' +
    '  <button id="finishQuestBtn" class="btn btn-danger" style="display:none;">✖️ ' + (isEl ? 'Τερματισμός' : 'Finish') + '</button>' +
    '</div>';

  document.getElementById('startQuestBtn').addEventListener('click', startQuest);
  document.getElementById('nextQuestBtn').addEventListener('click', nextQuest);
  document.getElementById('finishQuestBtn').addEventListener('click', finishQuest);
}

async function startQuest() {
  if (questModeState.isLoading) return;

  var map = getQmMap();
  if (!map) return;

  var questTypeEl = document.getElementById('questType');
  var questType = questTypeEl ? questTypeEl.value : 'add_name';
  var isEl = getCurrentLang() === 'el';

  questModeState.isLoading = true;
  var startBtn = document.getElementById('startQuestBtn');
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.textContent = isEl ? 'Φόρτωση...' : 'Loading...';
  }

  try {
    var bounds = map.getBounds();
    var bbox = bounds.getSouth() + ',' + bounds.getWest() + ',' + bounds.getNorth() + ',' + bounds.getEast();

    var query = '[out:json][timeout:25];(';

    if (questType === 'add_name') {
      query += 'node["amenity"]["name"!~".+"](' + bbox + ');';
    } else if (questType === 'add_opening_hours') {
      query += 'node["shop"]["opening_hours"!~".+"](' + bbox + ');';
    } else if (questType === 'add_phone') {
      query += 'node["shop"]["phone"!~".+"](' + bbox + ');';
    } else if (questType === 'add_website') {
      query += 'node["shop"]["website"!~".+"](' + bbox + ');';
    }

    query += ');out 20;';

    var data = await safeOverpassFetch(query, isEl);
    var elements = data.elements || [];

    if (elements.length === 0) {
      alert(isEl ? 'Δεν βρέθηκαν στόχοι σε αυτό το πλαίσιο' : 'No targets found in this area');
      finishQuest();
      return;
    }

    questModeState.quests = elements;
    questModeState.questIndex = 0;
    questModeState.currentQuest = elements[0];

    showQuestTarget(questModeState.currentQuest, questType);

    var progressEl = document.getElementById('questProgress');
    var targetEl = document.getElementById('questTarget');
    var nextBtn = document.getElementById('nextQuestBtn');
    var finishBtn = document.getElementById('finishQuestBtn');

    if (progressEl) progressEl.style.display = 'block';
    if (targetEl) targetEl.style.display = 'block';
    if (nextBtn) nextBtn.style.display = 'inline-block';
    if (finishBtn) finishBtn.style.display = 'inline-block';

    if (startBtn) {
      startBtn.style.display = 'none';
    }

  } catch (err) {
    console.error('Quest start error:', err);
    alert((isEl ? 'Σφάλμα: ' : 'Error: ') + err.message);
  } finally {
    questModeState.isLoading = false;
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = isEl ? 'Ξεκίνα Quest' : 'Start Quest';
    }
  }
}

function showQuestTarget(target, questType) {
  var map = getQmMap();
  if (!map || !target) return;

  var lat = target.lat;
  var lon = target.lon;
  var isEl = getCurrentLang() === 'el';

  map.setView([lat, lon], 17);

  // Show info
  var targetEl = document.getElementById('questTarget');
  if (targetEl) {
    var tags = target.tags || {};
    var typeKey = Object.keys(tags).find(function (k) { return ['amenity','shop','building','highway'].indexOf(k) >= 0; });
    var typeName = typeKey ? (tags[typeKey] || typeKey) : 'Unknown';

    targetEl.innerHTML =
      '<div style="text-align:center;"><strong style="color:#6d4aff">' + (isEl ? 'Στόχος #' : 'Target #') + (questModeState.questIndex + 1) + '/' + questModeState.quests.length + '</strong></div>' +
      '<div style="margin-top:0.5rem;"><strong>' + (isEl ? 'Τύπος:' : 'Type:') + '</strong> ' + escapeHtml(typeName) + '</div>' +
      '<div style="margin-top:0.25rem;"><strong>ID:</strong> <a href="https://openstreetmap.org/node/' + target.id + '" target="_blank" style="color:#6d4aff">#' + target.id + ' ↗</a></div>' +
      '<div style="margin-top:0.25rem;"><strong>' + (isEl ? 'Συντεταγμένες:' : 'Coords:') + '</strong> ' + lat.toFixed(6) + ', ' + lon.toFixed(6) + '</div>' +
      '<hr>' +
      '<div style="text-align:center;font-size:0.85rem;color:#ffb143">' + (isEl
        ? 'Χρησιμοποίησε το "OSM Editor" για να συμπληρώσεις τα ελλιπή στοιχεία.'
        : 'Use "OSM Editor" to add the missing information.') + '</div>';
  }

  var progressEl = document.getElementById('questProgress');
  if (progressEl) {
    progressEl.textContent = isEl
      ? 'Προσοχή: ' + (questModeState.questIndex + 1) + ' από ' + questModeState.quests.length
      : 'Progress: ' + (questModeState.questIndex + 1) + ' of ' + questModeState.quests.length;
  }

  // Create temporary marker
  var marker = L.circleMarker([lat, lon], {
    radius: 12,
    fillColor: '#ffb143',
    color: '#ffb143',
    weight: 3,
    fillOpacity: 0.8
  }).addTo(map);

  marker.bindPopup(isEl ? 'Στόχος Quest' : 'Quest Target');
  marker.openPopup();
}

function nextQuest() {
  questModeState.questIndex++;

  if (questModeState.questIndex >= questModeState.quests.length) {
    finishQuest();
    return;
  }

  questModeState.currentQuest = questModeState.quests[questModeState.questIndex];

  var questTypeEl = document.getElementById('questType');
  var questType = questTypeEl ? questTypeEl.value : 'add_name';

  showQuestTarget(questModeState.currentQuest, questType);
}

function finishQuest() {
  var map = getQmMap();
  var isEl = getCurrentLang() === 'el';

  if (questModeState.quests.length > 0) {
    alert(isEl
      ? '✅ Quest ολοκληρώθηκε! Συγχαρητήρια!'
      : '✅ Quest completed! Congratulations!');
  }

  questModeState.currentQuest = null;
  questModeState.questIndex = 0;
  questModeState.quests = [];

  var progressEl = document.getElementById('questProgress');
  var targetEl = document.getElementById('questTarget');
  var nextBtn = document.getElementById('nextQuestBtn');
  var finishBtn = document.getElementById('finishQuestBtn');
  var startBtn = document.getElementById('startQuestBtn');

  if (progressEl) progressEl.style.display = 'none';
  if (targetEl) targetEl.style.display = 'none';
  if (nextBtn) nextBtn.style.display = 'none';
  if (finishBtn) finishBtn.style.display = 'none';
  if (startBtn) startBtn.style.display = 'inline-block';

  if (map) map.closePopup();
}

function _questModeCleanup() {
  delete window.onMapClick_questMode;
  finishQuest();
  questModeState = { currentQuest: null, questIndex: 0, quests: [], isLoading: false };
}
window._questModeCleanup = _questModeCleanup;