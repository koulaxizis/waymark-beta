/* =========================================================
   WAYMARK — Quest Mode Module
   StreetComplete-style quests for missing OSM data.
   Finds POIs with incomplete tags and presents simple questions.
   Mobile-first: large buttons, one question at a time.
   Uploads answers directly to OSM.
   ========================================================= */

function initQuestMode(map, container, appState) {
  const isEl = getCurrentLang() === 'el';
  const token = sessionStorage.getItem('osm_access_token');
  const loggedIn = !!token;

  let quests = [];
  let currentQuestIndex = 0;
  let activeLayers = L.layerGroup();
  let isLoading = false;

  // Quest types with configurations
  const QUEST_TYPES = [
    {
      id: 'missing_name',
      icon: '🏷️',
      color: '#ffaa33',
      el: {
        title: 'Λείπει όνομα',
        desc: 'Αυτό το POI δεν έχει όνομα.',
        question: 'Ποιο είναι το όνομα;',
        placeholder: 'Όνομα',
        tag: 'name'
      },
      en: {
        title: 'Missing name',
        desc: 'This POI has no name.',
        question: 'What is the name?',
        placeholder: 'Name',
        tag: 'name'
      }
    },
    {
      id: 'opening_hours',
      icon: '⏰',
      color: '#6d4aff',
      el: {
        title: 'Ωράριο λειτουργίας',
        desc: 'Δεν αναγράφεται ωράριο.',
        question: 'Πότε ανοιγοκλείνει;',
        placeholder: 'π.χ. Mo-Fr 09:00-18:00',
        tag: 'opening_hours'
      },
      en: {
        title: 'Opening hours',
        desc: 'No opening hours shown.',
        question: 'When is it open?',
        placeholder: 'e.g. Mo-Fr 09:00-18:00',
        tag: 'opening_hours'
      }
    },
    {
      id: 'phone_number',
      icon: '📞',
      color: '#3399ff',
      el: {
        title: 'Τηλέφωνο',
        desc: 'Λείπει ο αριθμός τηλεφώνου.',
        question: 'Τηλέφωνο:',
        placeholder: '+30...',
        tag: 'contact:phone'
      },
      en: {
        title: 'Phone number',
        desc: 'Phone number missing.',
        question: 'Phone:',
        placeholder: '+30...',
        tag: 'contact:phone'
      }
    },
    {
      id: 'website',
      icon: '🌐',
      color: '#66bb44',
      el: {
        title: 'Ιστοσελίδα',
        desc: 'Δεν υπάρχει website.',
        question: 'Website URL:',
        placeholder: 'https://...',
        tag: 'website'
      },
      en: {
        title: 'Website',
        desc: 'No website listed.',
        question: 'Website URL:',
        placeholder: 'https://...',
        tag: 'website'
      }
    },
    {
      id: 'wheelchair',
      icon: '♿',
      color: '#cc5533',
      el: {
        title: 'Προσβασιμότητα',
        desc: 'Δεν αναφέρεται πρόσβαση.',
        question: 'Προσβάσιμο σε αναπηρικά καρότσι;',
        placeholder: 'yes/no/limited',
        tag: 'wheelchair'
      },
      en: {
        title: 'Wheelchair access',
        desc: 'Accessibility not listed.',
        question: 'Wheelchair accessible?',
        placeholder: 'yes/no/limited',
        tag: 'wheelchair'
      }
    },
    {
      id: 'check_date',
      icon: '✅',
      color: '#22c55e',
      el: {
        title: 'Επιβεβαίωση ύπαρξης',
        desc: 'Πότε επιβεβαιώθηκε ότι υπάρχει;',
        question: 'Επιβεβαίωσε σήμερα:',
        placeholder: '2026-08-16',
        tag: 'check_date'
      },
      en: {
        title: 'Confirm existence',
        desc: 'When was it last confirmed?',
        question: 'Confirm today:',
        placeholder: '2026-08-16',
        tag: 'check_date'
      }
    }
  ];

  const langPrefix = isEl ? 'el' : 'en';

  container.innerHTML = `
    <style>
      .qm-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
      }
      .qm-icon {
        font-size: 1.5rem;
        background: var(--bg-tertiary);
        border-radius: 50%;
        width: 56px;
        height: 56px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .qm-info {
        flex: 1;
        min-width: 0;
      }
      .qm-info-title {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--fg);
        margin-bottom: 0.15rem;
      }
      .qm-info-desc {
        font-size: 0.8rem;
        color: var(--fg-muted);
      }
      .qm-counter {
        font-size: 0.78rem;
        color: var(--fg-muted);
        margin-bottom: 0.5rem;
        padding: 0.4rem 0.6rem;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 4px;
        text-align: center;
      }
      .qm-question {
        font-size: 0.95rem;
        color: var(--fg);
        margin-bottom: 0.75rem;
        padding: 0.6rem 0.75rem;
        background: var(--bg-tertiary);
        border-left: 4px solid var(--accent);
        border-radius: 4px;
      }
      .qm-input {
        width: 100%;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 4px;
        color: var(--fg);
        padding: 0.75rem;
        font-size: 0.95rem;
        font-family: inherit;
        margin-bottom: 0.75rem;
        transition: var(--transition);
      }
      .qm-input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 2px rgba(109, 74, 255, 0.15);
      }
      .qm-select-options {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        margin-bottom: 0.75rem;
      }
      .qm-option-btn {
        flex: 1;
        min-width: calc(50% - 0.2rem);
        padding: 0.6rem 0.5rem;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8rem;
        color: var(--fg);
        font-family: inherit;
        transition: var(--transition);
      }
      .qm-option-btn:hover {
        border-color: var(--accent);
      }
      .qm-option-btn.selected {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
      }
      .qm-actions {
        display: flex;
        gap: 0.4rem;
        margin-bottom: 0.5rem;
      }
      .qm-actions .btn {
        margin-bottom: 0;
        flex: 1;
      }
      .qm-progress-bar {
        height: 4px;
        background: var(--bg-tertiary);
        border-radius: 2px;
        margin-bottom: 0.75rem;
        overflow: hidden;
      }
      .qm-progress-fill {
        height: 100%;
        background: var(--accent);
        transition: width 0.3s ease;
      }
      .qm-locations {
        font-size: 0.8rem;
        color: var(--fg-muted);
        margin-bottom: 0.5rem;
        padding: 0.4rem 0.6rem;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 4px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .qm-locations input[type="checkbox"] {
        width: 18px;
        height: 18px;
        accent-color: var(--accent);
        cursor: pointer;
      }
      .qm-loading {
        text-align: center;
        padding: 1.5rem;
        color: var(--fg-muted);
      }
      .qm-empty {
        text-align: center;
        padding: 1.5rem;
        color: var(--fg-muted);
        font-size: 0.9rem;
      }
      .qm-error {
        text-align: center;
        padding: 1.5rem;
        color: var(--danger);
        font-size: 0.9rem;
      }
    </style>

    <h2>🎯 ${isEl ? 'Quest Mode' : 'Quest Mode'}</h2>
    <div class="module-form">

      <div class="qm-locations">
        <span>${isEl ? 'Μόνο στην τρέχουσα περιοχή' : 'Current area only'}</span>
        <input type="checkbox" id="qmFollowLocation" checked>
      </div>

      <div id="qmContent">
        <div class="qm-loading">
          <div class="spinner"></div><br>
          <small>${isEl ? 'Αναζήτηση quests...' : 'Searching for quests...'}</small>
        </div>
      </div>

    </div>
  `;

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  function escapeXml(str) {
    if (!str) return '';
    return str.replace(/[<>&'"]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;',"'":"&apos;",'"':'&quot;' }[c]));
  }

  // Find quests in current view
  async function findQuests(force) {
    if (isLoading && !force) return;
    isLoading = true;
    document.getElementById('qmContent').innerHTML = '<div class="qm-loading"><div class="spinner"></div><br><small>' + (isEl ? 'Αναζήτηση quests...' : 'Searching...') + '</small></div>';

    activeLayers.clearLayers();
    quests = [];
    currentQuestIndex = 0;

    const bounds = map.getBounds();
    const bbox = bounds.getSouth() + ',' + bounds.getWest() + ',' + bounds.getNorth() + ',' + bounds.getEast();

    const queries = [
      { type: 'missing_name', tags: ['amenity', 'shop', 'tourism'], missing: 'name' },
      { type: 'opening_hours', tags: ['amenity'], present: 'name', missing: 'opening_hours' },
      { type: 'phone_number', tags: ['amenity', 'shop'], present: 'name', missing: 'contact:phone' },
      { type: 'website', tags: ['amenity', 'shop'], present: 'name', missing: 'website' },
      { type: 'wheelchair', tags: ['amenity'], present: 'name', missing: 'wheelchair' },
      { type: 'check_date', tags: ['amenity', 'shop'], present: 'name', check_missing: true }
    ];

    try {
      for (const q of queries) {
        const tagsStr = q.tags.map(tag => '[' + tag + ']').join('');
        const query = '[out:json][timeout:25];(node' + tagsStr + '(' + bbox + '););out tags 100;';

        const fetchFn = window.safeOverpassFetch || safeOverpassFetch;
        const data = await fetchFn(query, isEl);

        const nodes = data.elements.filter(e => e.type === 'node' && e.lat && e.lon);

        nodes.forEach(node => {
          const tags = node.tags || {};

          if (q.missing && tags[q.missing]) return;
          if (q.present && !tags[q.present]) return;

          let daysSince = 0;
          if (q.check_missing && tags.check_date) {
            daysSince = Math.floor((Date.now() - new Date(tags.check_date)) / 86400000);
            if (daysSince <= 30) return;
          }

          const quest = {
            node: node,
            type: q.type,
            tagKey: q.missing || 'check_date',
            lat: node.lat,
            lon: node.lon,
            name: tags.name || tags['name:en'] || (isEl ? 'Χωρίς όνομα' : 'Unnamed'),
            category: tags.amenity || tags.shop || tags.tourism || '',
            existingTags: tags
          };

          quests.push(quest);

          const qTypeDef = QUEST_TYPES.find(qt => qt.id === quest.type);
          const markerColor = qTypeDef ? qTypeDef.color : '#6d4aff';

          const marker = L.circleMarker([node.lat, node.lon], {
            radius: 6,
            fillColor: markerColor,
            color: 'white',
            weight: 2,
            fillOpacity: 1
          }).addTo(activeLayers);

          marker.bindPopup('<b>' + escapeHtml(quest.name) + '</b><br><small>' + (quest.category || '') + '</small>');
        });
      }

      const center = map.getCenter();
      quests.sort((a, b) => {
        const distA = center.distanceTo([a.lat, a.lon]);
        const distB = center.distanceTo([b.lat, b.lon]);
        return distA - distB;
      });

      activeLayers.addTo(map);
      renderQuest();

    } catch (err) {
      document.getElementById('qmContent').innerHTML = '<div class="qm-error">' + (isEl ? 'Σφάλμα: ' : 'Error: ') + err.message.substring(0, 100) + '</div>';
    } finally {
      isLoading = false;
    }
  }

  function renderQuest() {
    if (quests.length === 0) {
      document.getElementById('qmContent').innerHTML = '<div class="qm-empty">' + (isEl ? '❌ Δε βρέθηκαν quests σε αυτή την περιοχή.' : '❌ No quests found in this area.') + '<br><small>' + (isEl ? 'Αλλάξε ζώνη ή κάνε refresh.' : 'Move around or refresh.') + '</small></div>';
      return;
    }

    if (currentQuestIndex >= quests.length) {
      document.getElementById('qmContent').innerHTML = '<div class="qm-empty">✅ ' + (isEl ? 'Όλα τα quests ολοκληρώθηκαν!' : 'All quests completed!') + '<br><small>' + (isEl ? 'Κάνε refresh για νέα.' : 'Refresh for more.') + '</small></div>';
      return;
    }

    const quest = quests[currentQuestIndex];
    const qTypeDef = QUEST_TYPES.find(qt => qt.id === quest.type || qt.id === quest.type.replace('_urgent', ''));
    const txt = qTypeDef ? qTypeDef[langPrefix] : { title: '?', desc: '?', question: '?', placeholder: '', tag: quest.tagKey || 'name' };
    const qIcon = qTypeDef ? qTypeDef.icon : '❓';
    const qColor = qTypeDef ? qTypeDef.color : '#6d4aff';

    const progress = ((currentQuestIndex + 1) / quests.length) * 100;

    const isYesNo = txt.tag === 'wheelchair' || txt.tag === 'check_date';

    document.getElementById('qmContent').innerHTML = `
      <div class="qm-progress-bar"><div class="qm-progress-fill" style="width: ${progress}%"></div></div>
      <div class="qm-counter">${isEl ? 'Quest' : 'Quest'} ${currentQuestIndex + 1} / ${quests.length}</div>

      <div class="qm-header">
        <div class="qm-icon" style="background:${qColor}20;color:${qColor};font-size:1.5rem;">${qIcon}</div>
        <div class="qm-info">
          <div class="qm-info-title">${escapeHtml(txt.title)}</div>
          <div class="qm-info-desc">${escapeHtml(quest.name)} • ${escapeHtml(quest.category || '')}</div>
        </div>
      </div>

      <div class="qm-question">${escapeHtml(txt.question)}</div>

      ${isYesNo ? `
        <div class="qm-select-options" id="qmOptions">
          <button class="qm-option-btn" data-val="yes">${isEl ? 'Ναι' : 'Yes'}</button>
          <button class="qm-option-btn" data-val="no">${isEl ? 'Όχι' : 'No'}</button>
          <button class="qm-option-btn" data-val="limited">${isEl ? 'Περιορισμένο' : 'Limited'}</button>
          <button class="qm-option-btn" data-val="unknown">${isEl ? 'Άγνωστο' : 'Unknown'}</button>
        </div>
      ` : `
        <input type="text" class="qm-input" id="qmAnswer" placeholder="${escapeHtml(txt.placeholder)}">
      `}

      <div class="qm-actions">
        <button class="btn" id="qmSkipBtn">${isEl ? 'Παρακάμψη' : 'Skip'}</button>
        <button class="btn btn-success" id="qmSubmitBtn" disabled>${isEl ? '✅ Υποβολή' : '✅ Submit'}</button>
      </div>
    `;

    map.setView([quest.lat, quest.lon], 18);

    activeLayers.eachLayer(layer => {
      layer.setStyle({ fillColor: '#6d4aff', fillOpacity: 1, radius: 6 });
      if (layer.getLatLng && Math.abs(layer.getLatLng().lat - quest.lat) < 0.0001) {
        layer.setStyle({ fillColor: '#ffb143', fillOpacity: 1, radius: 8 });
      }
    });

    const optionsDiv = document.getElementById('qmOptions');
    if (optionsDiv) {
      optionsDiv.querySelectorAll('.qm-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          optionsDiv.querySelectorAll('.qm-option-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          document.getElementById('qmSubmitBtn').disabled = false;
          document.getElementById('qmSubmitBtn').dataset.val = btn.dataset.val;
        });
      });
    }

    const input = document.getElementById('qmAnswer');
    if (input) {
      input.addEventListener('input', () => {
        document.getElementById('qmSubmitBtn').disabled = input.value.trim() === '';
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitAnswer(input.value.trim());
        }
      });
    }

    document.getElementById('qmSkipBtn').addEventListener('click', skipQuest);

    document.getElementById('qmSubmitBtn').addEventListener('click', () => {
      const val = document.getElementById('qmSubmitBtn').dataset.val || (input ? input.value.trim() : '');
      submitAnswer(val);
    });
  }

  function skipQuest() {
    currentQuestIndex++;
    renderQuest();
  }

  async function submitAnswer(value) {
    if (!value) return;

    const cfg = window.WAYMARK_CONFIG;
    const currentToken = sessionStorage.getItem('osm_access_token');
    if (!currentToken) {
      alert(t('osm.not_logged_in'));
      return;
    }

    const quest = quests[currentQuestIndex];
    const btn = document.getElementById('qmSubmitBtn');
    btn.disabled = true;
    btn.textContent = '⏳ ...';

    try {
      const changesetXml = '<osm><changeset>' +
        '<tag k="created_by" v="Waymark"/>' +
        '<tag k="comment" v="Updated ' + quest.name + ' via Waymark Quest Mode"/>' +
        '</changeset></osm>';

      const csRes = await fetch(cfg.PROXY_URL + '/api/0.6/changeset/create', {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/xml' },
        body: changesetXml
      });
      if (!csRes.ok) throw new Error(await csRes.text());
      const changesetId = (await csRes.text()).trim();

      const tags = { ...quest.existingTags };
      tags[quest.tagKey] = value;
      tags.source = 'Waymark';

      let oscXml = '<osmChange version="0.6" generator="Waymark">\n  <modify>\n';
      oscXml += '    <node id="' + quest.node.id + '" version="' + quest.node.version + '" changeset="' + changesetId + '" lat="' + quest.node.lat.toFixed(7) + '" lon="' + quest.node.lon.toFixed(7) + '">\n';
      Object.entries(tags).forEach(([k, v]) => {
        oscXml += '      <tag k="' + escapeXml(k) + '" v="' + escapeXml(v) + '"/>\n';
      });
      oscXml += '    </node>\n';
      oscXml += '  </modify>\n</osmChange>';

      const upRes = await fetch(cfg.PROXY_URL + '/api/0.6/changeset/' + changesetId + '/upload', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/xml' },
        body: oscXml
      });
      if (!upRes.ok) throw new Error(await upRes.text());

      await fetch(cfg.PROXY_URL + '/api/0.6/changeset/' + changesetId + '/close', {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer ' + currentToken }
      });

      btn.textContent = '✅ Done!';
      setTimeout(() => {
        currentQuestIndex++;
        renderQuest();
      }, 1000);

    } catch (err) {
      btn.textContent = '✅ ' + (isEl ? 'Υποβολή' : 'Submit');
      btn.disabled = false;
      alert((isEl ? 'Σφάλμα: ' : 'Error: ') + err.message.substring(0, 150));
    }
  }

  const followCheckbox = document.getElementById('qmFollowLocation');
  followCheckbox.addEventListener('change', () => {
    if (followCheckbox.checked) {
      findQuests(true);
    }
  });

  findQuests();

  map.on('moveend', () => {
    if (document.getElementById('qmFollowLocation').checked && !isLoading) {
      findQuests(true);
    }
  });

  appState._questModeCleanup = () => {
    activeLayers.clearLayers();
  };
}

window.initQuestMode = initQuestMode;