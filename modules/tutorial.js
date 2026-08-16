/* =========================================================
   WAYMARK — Tutorial Mode Module
   Bilingual interactive walkthrough.
   15 steps covering all modules including new v2 features.
   Self-contained bilingual strings (no external i18n deps).
   ========================================================= */

const TUTORIAL_STEPS = [
  {
    target: '#map',
    placement: 'center',
    title: { el: '👋 Καλώς ήρθες στο Waymark!', en: '👋 Welcome to Waymark!' },
    body: {
      el: 'Το Waymark είναι ένα privacy-first εργαλείο για εξερεύνηση και συνεισφορά στο OpenStreetMap. Ακολούθησε αυτόν τον οδηγό για να μάθεις τα πάντα σε 15 βήματα!',
      en: 'Waymark is a privacy-first toolkit for exploring and contributing to OpenStreetMap. Follow this guide to learn everything in 15 steps!'
    }
  },
  {
    target: '#map',
    placement: 'center',
    title: { el: '🗺️ Ο Χάρτης', en: '🗺️ The Map' },
    body: {
      el: 'Κάνε ζουμ με δύο δάχτυλα ή το scroll. Σύρε για μετακίνηση. Ο χάρτης φορτώνει αυτόματα την τοποθεσία σου αν το επιτρέπεις.',
      en: 'Pinch to zoom or scroll. Drag to pan. The map auto-detects your location if you allow it.'
    }
  },
  {
    target: '#layerPanel',
    placement: 'left',
    title: { el: '🛰️ Επίπεδα Χάρτη', en: '🛰️ Map Layers' },
    body: {
      el: 'Πάνω δεξιά βρίσκονται τα επίπεδα: Standard, Satellite, Cycle, και Transport. Διάλεξε αυτό που ταιριάζει στην περίπτωση σου.',
      en: 'Top-right are the layers: Standard, Satellite, Cycle, and Transport. Choose what suits your needs.'
    }
  },
  {
    target: '#modulePanel',
    placement: 'right',
    title: { el: '📦 Modules', en: '📦 Modules' },
    body: {
      el: 'Πάνω αριστερά βρίσκονται τα modules. Όλα είναι απενεργοποιημένα από προεπιλογή. Άνοιξε ένα toggle για να ενεργοποιήσεις ένα module — μόνο ένα μπορεί να είναι ενεργό τη φορά.',
      en: 'Top-left are the modules. All are off by default. Toggle one on to activate — only one can be active at a time.'
    }
  },
  {
    target: '#modulePanel',
    placement: 'right',
    title: { el: '🔍 Αναζήτηση Διεύθυνσης', en: '🔍 Address Search' },
    body: {
      el: 'Αναζήτησε οποιαδήποτε τοποθεσία παγκοσμίως. Γράψε μια διεύθυνση ή όνομα τόπου και το Waymark θα τη βρει μέσω Nominatim.',
      en: 'Search any location worldwide. Type an address or place name and Waymark finds it via Nominatim.'
    }
  },
  {
    target: '#modulePanel',
    placement: 'right',
    title: { el: '📍 Προβολή POIs', en: '📍 POI Viewer' },
    body: {
      el: 'Βρες καφέ, φαρμακεία, στάσεις λεωφορείων και άλλα. Επίλεξε κατηγορία και φόρτωσε POIs στην περιοχή που βλέπεις.',
      en: 'Find cafes, pharmacies, bus stops and more. Pick a category and load POIs in your current view.'
    }
  },
  {
    target: '#modulePanel',
    placement: 'right',
    title: { el: '📤 OSM Editor', en: '📤 OSM Editor' },
    body: {
      el: 'Συνδέσου με τον λογαριασμό OSM σου (OAuth 2.0) και πρόσθεσε ή επεξεργάστηκε POIs απευθείας. Φόρτωσε υπάρχοντα POIs, επίλεξε ένα και ενημέρωσε τα tags του. Υπάρχει και γρήγορο κουμπί ✅ για επιβεβαίωση (check_date) — επιβεβαιώνεις ότι το POI υπάρχει ακόμα!',
      en: 'Log in with your OSM account (OAuth 2.0) and add or edit POIs directly. Fetch existing POIs, select one and update its tags. There\'s also a quick ✅ confirm button (check_date) — confirm that a POI still exists!'
    }
  },
  {
    target: '#modulePanel',
    placement: 'right',
    title: { el: '🏃 Καταγραφή Διαδρομής', en: '🏃 Track Recorder' },
    body: {
      el: 'Εγγράψει τη διαδρομή σου με GPS σε πραγματικό χρόνο. Ξεκίνα, περπάτα, στάματα. Εξήγαγε GPX ή ανέβασέ το απευθείας στο OSM. Προσθέθονται waypoints, δείχνεται απόσταση, διάρκεια και ακρίβεια GPS.',
      en: 'Record your route with GPS in real time. Start, walk, stop. Export GPX or upload directly to OSM. Add waypoints, see distance, duration and GPS accuracy.'
    }
  },
  {
    target: '#modulePanel',
    placement: 'right',
    title: { el: '🏠 Σχεδιασμός Κτηρίων', en: '🏠 Building Editor' },
    body: {
      el: 'Σχεδίασε κτήρια πατώντας στον χάρτη κόμβο-κόμβο. Επίλεξε τύπο (πολυκατοικία, σπίτι, σχολείο...), κλείσε το σχήμα και ανέβασέ το στο OSM. Ιδανικό για χαρτογράφηση εν κινήσει.',
      en: 'Draw buildings by tapping vertices on the map. Pick a type (apartments, house, school...), close the shape and upload to OSM. Perfect for mapping on the go.'
    }
  },
  {
    target: '#modulePanel',
    placement: 'right',
    title: { el: '🛣️ Σχεδιασμός Δρόμων', en: '🛣️ Road Editor' },
    body: {
      el: 'Σχεδίασε δρόμους κόμβο-κόμβο. Επίλεξε τύπο (residential, primary, footway, cycleway...) και μονόδρομος αν χρειάζεται. Χρώματα ανά τύπο για εύκολη αναγνώριση.',
      en: 'Draw roads vertex by vertex. Pick type (residential, primary, footway, cycleway...) and one-way if needed. Color-coded by type for easy identification.'
    }
  },
  {
    target: '#modulePanel',
    placement: 'right',
    title: { el: '🏘️ Καταγραφή Διευθύνσεων', en: '🏘️ Address Mapper' },
    body: {
      el: 'Γρήγορη καταγραφή-house numbers. Πάτησε στον χάρτη κοντά σε δρόμο — το όνομα του δρόμου ανιχνεύεται αυτόματα. Εισήγαγε αριθμό, και συνέχισε. Batch mode για πολλές διευθύνσεις γρήγορα.',
      en: 'Quick house number mapping. Tap near a road — street name is auto-detected. Enter number and continue. Batch mode for rapid surveying.'
    }
  },
  {
    target: '#modulePanel',
    placement: 'right',
    title: { el: '🎯 Quest Mode', en: '🎯 Quest Mode' },
    body: {
      el: 'StreetComplete-style quests! Το Waymark βρίσκει POIs με ελλιπή δεδομένα (χωρίς όνομα, ωράριο, τηλέφωνο, website, προσβασιμότητα) και σου κάνει απλές ερωτήσεις. Απάντησε και ανέβασε απευθείας.',
      en: 'StreetComplete-style quests! Waymark finds POIs with missing data (no name, hours, phone, website, wheelchair info) and asks you simple questions. Answer and upload directly.'
    }
  },
  {
    target: '#modulePanel',
    placement: 'right',
    title: { el: '⚠️ Quality Checker & 🌡️ Heatmap', en: '⚠️ Quality Checker & 🌡️ Heatmap' },
    body: {
      el: 'Βρες προβλήματα ποιότητας δεδομένων στην περιοχή σου (duplicate POIs, missing tags) και οπτικοποίησε την πυκνότητα POIs με heatmap.',
      en: 'Find data quality issues in your area (duplicate POIs, missing tags) and visualize POI density with a heatmap.'
    }
  },
  {
    target: '#modulePanel',
    placement: 'right',
    title: { el: '📴 Offline & 🔒 Privacy', en: '📴 Offline & 🔒 Privacy' },
    body: {
      el: 'Η εφαρμογή λειτουργεί offline (cached tiles + app shell). Καθόλου cookies, καθόλου tracking, καθόλου διαφημίσεις. Τα OAuth tokens αποθηκεύονται μόνο στη sessionStorage. Τα δεδομένα σου δεν εγκαταλείπουν τη συσκευή σου εκτός αν ανεβάσεις εσύ στο OSM.',
      en: 'The app works offline (cached tiles + app shell). No cookies, no tracking, no ads. OAuth tokens are stored only in sessionStorage. Your data never leaves your device unless you explicitly upload to OSM.'
    }
  },
  {
    target: null,
    placement: 'center',
    title: { el: '🎉 Έτοιμος!', en: '🎉 You\'re Ready!' },
    body: {
      el: 'Όλα τα modules είναι κλειστά από προεπιλογή — άνοιξε όποιο χρειάζεσαι. Καλή χαρτογράφηση! 🗺️',
      en: 'All modules are off by default — toggle on whichever you need. Happy mapping! 🗺️'
    }
  },
];

function initTutorial(map, container, appState) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
    <h2>📖 ${t('module.tutorial')}</h2>
    <div class="module-form">
      <p style="font-size: 0.9rem; color: var(--fg-muted); margin-bottom: 1rem;">
        ${isEl ? 'Ένας γρήγορος διαδραστικός οδηγός 15 βημάτων για όλα τα features του Waymark.' : 'A quick 15-step interactive guide to all Waymark features.'}
      </p>
      <button class="btn" id="tutorialStartBtn">${isEl ? '▶ Έναρξη Tutorial' : '▶ Start Tutorial'}</button>
    </div>
  `;

  document.getElementById('tutorialStartBtn').addEventListener('click', () => {
    startTutorialWalkthrough();
  });
}

function startTutorialWalkthrough() {
  const isEl = getCurrentLang() === 'el';
  let currentStep = 0;

  const overlay = document.createElement('div');
  overlay.id = 'tutorial-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0);transition:background 0.3s;';
  document.body.appendChild(overlay);

  function showStep(idx) {
    if (idx >= TUTORIAL_STEPS.length) {
      overlay.remove();
      return;
    }

    const step = TUTORIAL_STEPS[idx];
    const target = step.target ? document.querySelector(step.target) : null;

    // Remove previous tooltip
    const prevTooltip = document.getElementById('tutorial-tooltip');
    if (prevTooltip) prevTooltip.remove();

    // Reset previous target styles
    document.querySelectorAll('[data-tutorial-highlighted]').forEach(el => {
      el.style.zIndex = '';
      el.style.boxShadow = '';
      el.removeAttribute('data-tutorial-highlighted');
    });

    // Highlight target
    if (target) {
      target.setAttribute('data-tutorial-highlighted', 'true');
      target.style.zIndex = '10001';
      target.style.boxShadow = '0 0 0 9999px rgba(0,0,0,0.7)';
      target.style.borderRadius = '8px';
    }

    const titleText = isEl ? step.title.el : step.title.en;
    const bodyText = isEl ? step.body.el : step.body.en;

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'tutorial-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      background: var(--bg-secondary, #1a1a2e);
      border: 1px solid var(--accent, #6d4aff);
      border-radius: 8px;
      padding: 1.5rem;
      max-width: 380px;
      z-index: 10002;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      transition: opacity 0.3s;
    `;

    tooltip.innerHTML = `
      <h3 style="margin-bottom: 0.75rem; color: var(--accent, #6d4aff); font-size: 1.1rem;">${titleText}</h3>
      <p style="margin-bottom: 1.25rem; font-size: 0.9rem; line-height: 1.6;">${bodyText}</p>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <button id="tutorialSkip" style="background: transparent; border: none; color: var(--fg-muted, #888); cursor: pointer; font-size: 0.85rem;">${isEl ? 'Παράλειψη' : 'Skip'}</button>
        <div style="display: flex; gap: 0.5rem;">
          ${idx > 0 ? '<button id="tutorialPrev" class="btn btn-secondary" style="padding: 0.5rem 1rem;">← ' + (isEl ? 'Προηγούμενο' : 'Previous') + '</button>' : ''}
          <button id="tutorialNext" class="btn" style="padding: 0.5rem 1rem;">
            ${idx === TUTORIAL_STEPS.length - 1 ? (isEl ? 'Τέλος ✓' : 'Finish ✓') : (isEl ? 'Επόμενο →' : 'Next →')}
          </button>
        </div>
      </div>
      <div style="margin-top: 0.75rem; font-size: 0.75rem; color: var(--fg-muted, #888);">${idx + 1} / ${TUTORIAL_STEPS.length}</div>
    `;

    document.body.appendChild(tooltip);
    positionTooltip(tooltip, target, step.placement);

    document.getElementById('tutorialNext').onclick = () => {
      cleanupStep(target);
      showStep(idx + 1);
    };

    const prevBtn = document.getElementById('tutorialPrev');
    if (prevBtn) {
      prevBtn.onclick = () => { cleanupStep(target); showStep(idx - 1); };
    }

    document.getElementById('tutorialSkip').onclick = () => {
      cleanupStep(target);
      overlay.remove();
    };
  }

  function cleanupStep(target) {
    if (target) {
      target.style.zIndex = '';
      target.style.boxShadow = '';
      target.removeAttribute('data-tutorial-highlighted');
    }
    const tooltip = document.getElementById('tutorial-tooltip');
    if (tooltip) tooltip.remove();
  }

  function positionTooltip(tooltip, target, placement) {
    if (!target) {
      tooltip.style.top = '50%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
      return;
    }

    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const margin = 16;

    switch (placement) {
      case 'right':
        tooltip.style.top = (rect.top + rect.height / 2) + 'px';
        tooltip.style.left = (rect.right + margin) + 'px';
        tooltip.style.transform = 'translateY(-50%)';
        break;
      case 'left':
        tooltip.style.top = (rect.top + rect.height / 2) + 'px';
        tooltip.style.left = (rect.left - tooltipRect.width - margin) + 'px';
        tooltip.style.transform = 'translateY(-50%)';
        break;
      case 'bottom':
        tooltip.style.top = (rect.bottom + margin) + 'px';
        tooltip.style.left = (rect.left + rect.width / 2) + 'px';
        tooltip.style.transform = 'translateX(-50%)';
        break;
      case 'top':
        tooltip.style.top = (rect.top - tooltipRect.height - margin) + 'px';
        tooltip.style.left = (rect.left + rect.width / 2) + 'px';
        tooltip.style.transform = 'translateX(-50%)';
        break;
      default:
        tooltip.style.top = '50%';
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';
    }

    // Keep tooltip on screen
    const finalRect = tooltip.getBoundingClientRect();
    if (finalRect.left < 8) { tooltip.style.left = '8px'; tooltip.style.transform = 'translateY(-50%)'; }
    if (finalRect.right > window.innerWidth - 8) { tooltip.style.left = (window.innerWidth - tooltipRect.width - 8) + 'px'; tooltip.style.transform = 'translateY(-50%)'; }
    if (finalRect.top < 8) { tooltip.style.top = '8px'; }
    if (finalRect.bottom > window.innerHeight - 8) { tooltip.style.top = (window.innerHeight - tooltipRect.height - 8) + 'px'; }
  }

  showStep(0);
}

window.initTutorial = initTutorial;