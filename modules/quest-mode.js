/* =========================================================
   WAYMARK — Quest Mode Module
   Guided micro-mapping quests using Overpass API.
   Finds POIs missing information and guides user to fix them.
   ========================================================= */

var questModeState = {
  currentQuest: null,
  questIndex: 0,
  quests: [],
  isLoading: false,
  mapMarker: null,
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
      ? 'Το Quest Mode βρίσκει POI που λείπουν πληροφορίες και σε καθοδηγεί να τα συμπληρώσεις μέσω του OSM Editor.'
      : 'Quest Mode finds POIs missing information and guides you to complete them via the OSM Editor.') + '</div>' +

    '  <div class="form-group"><label>' + (isEl ? 'Τύπος Quest:' : 'Quest Type:') + '</label>' +
    '    <select id="questType" class="form-control">' +
    '      <option value="add_name">' + (isEl ? 'Πρόσθεσε όνομα (shops)' : 'Add name (shops)') + '</option>' +
    '      <option value="add_opening_hours">' + (isEl ? 'Πρόσθεσε ώρες λειτουργίας' : 'Add opening hours') + '</option>' +
    '      <option value="add_phone">' + (isEl ? 'Πρόσθεσε τηλέφωνο' : 'Add phone') + '</option>' +
    '      <option value="add_website">' + (isEl ? 'Πρόσθεσε ιστοσελίδα' : 'Add website') + '</option>' +
    '    </select>' +
    '  </div>' +

    '  <button id="startQuestBtn" class="btn btn-success">▶️ ' +
    (isEl ? 'Ξεκίνα Quest' : 'Start Quest') + '</button>' +
    '  <hr>' +

    '  <div id="questProgress" class="note-description" style="display:none;text-align:center;font-weight:600;"></div>' +
    '  <div id="questTarget" class="note-description" style="display:none;"></div>' +

    '  <button id="nextQuestBtn" class="btn btn-primary" style="display:none;">➡️ ' +
    (isEl ? 'Επόμενο' : 'Next') + '</button>' +
    '  <button id="finishQuestBtn" class="btn btn-danger" style="display:none;">✖️ ' +
    (isEl ? 'Τερματισμός' : 'Finish') + '</button>' +
    '</div>';

  var startBtn = document.getElementById('startQuestBtn');
  var nextBtn = document.getElementById('nextQuestBtn');
  var finishBtn = document.getElementById('finishQuestBtn');

  if (startBtn) startBtn.addEventListener('click', startQuest);
  if (nextBtn) nextBtn.addEventListener('click', nextQuest);
  if (finishBtn) finishBtn.addEventListener('click', finishQuest);
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
    var bbox = bounds.getSouth() + ',' + bounds.getWest() + ',' +
               bounds.getNorth() + ',' + bounds.getEast();

    var query = '[out:json][timeout:25];(';

    if (questType === 'add_name') {
      query += 'node["shop"]["name"!~".+"](' + bbox + ');';
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
      alert(isEl
        ? 'Δεν βρέθηκαν στόχοι σε αυτό το πλαίσιο. Δοκίμασε να μετακινηθείς σε άλλη περιοχή.'
        : 'No targets found in this area. Try moving to another area.'
      );
      questModeState.isLoading = false;
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = isEl ? 'Ξεκίνα Quest' : 'Start Quest';
      }
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

    if (startBtn) startBtn.style.display = 'none';

  } catch (err) {
    console.error('Quest start error:', err);
    alert((isEl ? 'Σφάλμα: ' : 'Error: ') + err.message);
    questModeState.isLoading = false;
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = isEl ? 'Ξεκίνα Quest' : 'Start Quest';
    }
  } finally {
    questModeState.isLoading = false;
    if (startBtn) {
      startBtn.disabled = false;
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

  // Remove previous marker
  if (questModeState.mapMarker) {
    map.removeLayer(questModeState.mapMarker);
    questModeState.mapMarker = null;
  }

  // Add new marker
  questModeState.mapMarker = L.circleMarker([lat, lon], {
    radius: 14,
    fillColor: '#ffb143',
    color: '#ffb143',
    weight: 3,
    fillOpacity: 0.8,
  }).addTo(map);

  questModeState.mapMarker.bindPopup(
    isEl ? '🎯 Στόχος Quest' : '🎯 Quest Target'
  );
  questModeState.mapMarker.openPopup();

  // Build target info
  var tags = target.tags || {};
  var typeKey = Object.keys(tags).find(function (k) {
    return ['amenity', 'shop', 'building', 'highway', 'leisure', 'tourism', 'historic'].indexOf(k) >= 0;
  });
  var typeName = typeKey ? (tags[typeKey] || typeKey) : 'Unknown';

  var questActionText = '';
  if (questType === 'add_name') {
    questActionText = isEl ? 'Πρόσθεσε το tag name' : 'Add the name tag';
  } else if (questType === 'add_opening_hours') {
    questActionText = isEl ? 'Πρόσθεσε το tag opening_hours' : 'Add the opening_hours tag';
  } else if (questType === 'add_phone') {
    questActionText = isEl ? 'Πρόσθεσε το tag phone' : 'Add the phone tag';
  } else if (questType === 'add_website') {
    questActionText = isEl ? 'Πρόσθεσε το tag website' : 'Add the website tag';
  }

  var targetEl = document.getElementById('questTarget');
  if (targetEl) {
    targetEl.innerHTML =
      '<div style="text-align:center;">' +
      '  <strong style="color:#6d4aff;font-size:0.9rem;">' +
      (isEl ? 'Στόχος #' : 'Target #') +
      (questModeState.questIndex + 1) + '/' + questModeState.quests.length +
      '</strong>' +
      '</div>' +
      '<div style="margin-top:0.4rem;"><strong>' + (isEl ? 'Τύπος:' : 'Type:') +
      '</strong> ' + escapeHtml(typeName) + '</div>' +
      '<div style="margin-top:0.25rem;"><strong>ID:</strong> ' +
      '<a href="https://openstreetmap.org/node/' + target.id +
      '" target="_blank" style="color:#6d4aff">#' + target.id + ' ↗</a></div>' +
      '<div style="margin-top:0.25rem;"><strong>' + (isEl ? 'Συντεταγμένες:' : 'Coords:') +
      '</strong> ' + lat.toFixed(6) + ', ' + lon.toFixed(6) + '</div>' +
      '<hr>' +
      '<div style="text-align:center;font-size:0.85rem;color:#ffb143;">' +
      '🎯 ' + questActionText +
      '</div>' +
      '<div style="margin-top:0.3rem;font-size:0.75rem;color:var(--fg-muted);text-align:center;">' +
      (isEl
        ? 'Χρησιμοποίησε το OSM Editor για επεξεργασία, μετά πάτα "Επόμενο".'
        : 'Use OSM Editor to edit, then press "Next".') +
      '</div>';
  }

  var progressEl = document.getElementById('questProgress');
  if (progressEl) {
    progressEl.textContent = isEl
      ? 'Πρόοδος: ' + (questModeState.questIndex + 1) + ' / ' + questModeState.quests.length
      : 'Progress: ' + (questModeState.questIndex + 1) + ' / ' + questModeState.quests.length;
  }
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
      : '✅ Quest completed! Congratulations!'
    );
  }

  if (questModeState.mapMarker && map) {
    map.removeLayer(questModeState.mapMarker);
    questModeState.mapMarker = null;
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
  if (startBtn) {
    startBtn.style.display = 'inline-block';
    startBtn.disabled = false;
    startBtn.textContent = isEl ? 'Ξεκίνα Quest' : 'Start Quest';
  }

  if (map) map.closePopup();
}

function _questModeCleanup() {
  delete window.onMapClick_questMode;
  finishQuest();
  questModeState = {
    currentQuest: null,
    questIndex: 0,
    quests: [],
    isLoading: false,
    mapMarker: null,
  };
}

window._questModeCleanup = _questModeCleanup;