/* =========================================================
   WAYMARK — Main Application Logic
   Privacy-first OSM PWA • July 2024
   ========================================================= */

(function () {
  'use strict';

  // ── Global State ──
  window.appState = {
    map: null,
    activeModule: null,
    baseLayers: {},
    currentBaseLayer: null,
    locationMarker: null,
  };

  // ── Module Registry ──
  var MODULES = [
    { id: 'nominatim',       name: { en: 'Search',         el: 'Αναζήτηση' },      init: 'initNominatim',       cleanup: '_nominatimCleanup' },
    { id: 'poi-viewer',      name: { en: 'POI Viewer',     el: 'POI Προβολή' },     init: 'initPoiViewer',      cleanup: '_poiViewerCleanup' },
    { id: 'gpx-editor',      name: { en: 'GPX Editor',     el: 'GPX Επεξεργασία' },init: 'initGpxEditor',      cleanup: '_gpxEditorCleanup' },
    { id: 'xml-generator',   name: { en: 'XML Generator', el: 'XML Γεννήτρια' },  init: 'initXmlGenerator',   cleanup: '_xmlGeneratorCleanup' },
    { id: 'osm-editor',      name: { en: 'OSM Editor',     el: 'OSM Επεξεργασία' },init: 'initOsmEditor',      cleanup: '_osmEditorCleanup' },
    { id: 'quality-checker', name: { en: 'Quality Checker',el: 'Ποιότητα' },       init: 'initQualityChecker', cleanup: '_qualityCheckerCleanup' },
    { id: 'heatmap',         name: { en: 'Heatmap',         el: 'Heatmap' },        init: 'initHeatmap',        cleanup: '_heatmapCleanup' },
    { id: 'tags-lookup',     name: { en: 'Tags Lookup',    el: 'Tags' },           init: 'initTagsLookup',     cleanup: '_tagsLookupCleanup' },
    { id: 'notes-browser',   name: { en: 'Notes Browser',  el: 'Σημειώσεις' },     init: 'initNotesBrowser',   cleanup: '_notesBrowserCleanup' },
    { id: 'track-recorder',  name: { en: 'Track Recorder', el: 'Καταγραφή' },     init: 'initTrackRecorder',  cleanup: '_trackRecorderCleanup' },
    { id: 'building-editor', name: { en: 'Building Editor',el: 'Κτήρια' },        init: 'initBuildingEditor', cleanup: '_buildingEditorCleanup' },
    { id: 'road-editor',     name: { en: 'Road Editor',    el: 'Δρόμοι' },         init: 'initRoadEditor',     cleanup: '_roadEditorCleanup' },
    { id: 'address-mapper',  name: { en: 'Address Mapper', el: 'Διευθύνσεις' },    init: 'initAddressMapper',  cleanup: '_addressMapperCleanup' },
    { id: 'quest-mode',      name: { en: 'Quest Mode',     el: 'Quests' },         init: 'initQuestMode',      cleanup: '_questModeCleanup' },
  ];

  // ── Wait for Leaflet before initializing ──
  function waitForLeaflet() {
    if (typeof L !== 'undefined') {
      initApp();
    } else {
      setTimeout(waitForLeaflet, 100);
    }
  }

  // ── DOM Ready ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForLeaflet);
  } else {
    waitForLeaflet();
  }

  // ── Initialize App ──
  function initApp() {
    initHeaderButtons();
    initMap();
    initLayers();
    initModuleToggles();
    initLocationButton();
    initGlobalLogin();
    initResizeHandler();
    registerServiceWorker();
    applyTranslations();

    // Hide loading overlay
    var overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(function () { overlay.style.display = 'none'; }, 300);
    }

    // Recalculate map size after overlay removal
    setTimeout(function () {
      if (window.appState.map) window.appState.map.invalidateSize();
    }, 350);
  }

  // ── Header Buttons (Theme, Language, Help/Login) ──
  function initHeaderButtons() {
    var isEl = getCurrentLang() === 'el';

    // Language Button
    var langBtn = document.getElementById('langBtn');
    if (langBtn) {
      langBtn.textContent = isEl ? 'EN' : 'ΕΛ';
      langBtn.addEventListener('click', function () {
        var newLang = isEl ? 'en' : 'el';
        if (typeof setLanguage === 'function') {
          setLanguage(newLang);
        } else {
          localStorage.setItem('waymark_lang', newLang);
          location.reload();
        }
      });
    }

    // Theme Button
    var themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
      updateThemeBtn();
      themeBtn.addEventListener('click', function () {
        var cur = document.documentElement.getAttribute('data-theme') || 'dark';
        var nw = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', nw);
        localStorage.setItem('waymark_theme', nw);

        if (typeof window.setTheme === 'function') {
          window.setTheme(nw);
        }

        updateThemeBtn();
        if (window.appState.map) {
          setTimeout(function () { window.appState.map.invalidateSize(); }, 100);
        }
      });
    }

    // Help/Tutorial Button
    var helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
      helpBtn.addEventListener('click', function () {
        var content = document.getElementById('moduleContent');
        var panel = document.getElementById('activeModulePanel');
        var title = document.getElementById('activeModuleTitle');

        if (panel) panel.classList.add('active');
        if (title) title.textContent = isEl ? ' Βοήθεια' : 'Help';
        if (content) {
          content.innerHTML =
            '<div style="font-size:0.85rem;line-height:1.6;">' +
            '<h3>' + (isEl ? 'Πώς να χρησιμοποιήσεις το Waymark' : 'How to use Waymark') + '</h3>' +
            '<p><strong>1.</strong> ' + (isEl ? 'Ενεργοποίησε μια λειτουργία από το αριστερό πάνελ.' : 'Enable a feature from the left panel.') + '</p>' +
            '<p><strong>2.</strong> ' + (isEl ? 'Κάνε κλικ στον χάρτη για να προσθέσεις σημεία.' : 'Click on the map to add points.') + '</p>' +
            '<p><strong>3.</strong> ' + (isEl ? 'Για επεξεργασία OSM, σύνδεσου πρώτα με τον λογαριασμό σου.' : 'For OSM editing, login first with your account.') + '</p>' +
            '<p><strong>4.</strong> ' + (isEl ? 'Χρησιμοποίησε το 📍 για να βρεις τη θέση σου.' : 'Use 📍 to find your location.') + '</p>' +
            '<hr>' +
            '<p style="color:var(--fg-muted)">' + (isEl ? 'Waymark είναι open-source, privacy-first εργαλείο για το OpenStreetMap.' : 'Waymark is open-source, privacy-first tool for OpenStreetMap.') + '</p>' +
            '</div>';
        }
      });
    }
  }

  // ── Map Initialization ──
  function initMap() {
    var mapEl = document.getElementById('map');
    if (!mapEl) { console.error('Map element not found'); return; }

    window.appState.map = L.map('map', {
      center: [37.9838, 23.7275],
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });

    L.control.scale({ imperial: false, metric: true }).addTo(window.appState.map);

    // Map click handler — dispatch to active modules
    window.appState.map.on('click', function (e) {
      var lat = e.latlng.lat;
      var lng = e.latlng.lng;
      var handlers = [
        window.onMapClick_nominatim,
        window.onMapClick_poiViewer,
        window.onMapClick_gpxEditor,
        window.onMapClick_xmlGenerator,
        window.onMapClick_osmEditor,
        window.onMapClick_qualityChecker,
        window.onMapClick_heatmap,
        window.onMapClick_tagsLookup,
        window.onMapClick_notesBrowser,
        window.onMapClick_trackRecorder,
        window.onMapClick_buildingEditor,
        window.onMapClick_roadEditor,
        window.onMapClick_addressMapper,
        window.onMapClick_questMode,
      ];
      for (var i = 0; i < handlers.length; i++) {
        if (typeof handlers[i] === 'function') {
          try { handlers[i](lat, lng); } catch (err) { console.error('Map click handler error:', err); }
        }
      }
    });
  }

  // ── Layers (with Cycle & Transit restored) ──
  function initLayers() {
    var cfg = window.WAYMARK_CONFIG || {};
    var layers = cfg.LAYERS || [
      { id: 'standard',   name: { en: 'Standard',    el: 'Standard' },    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',                                                              attribution: '© OpenStreetMap', maxZoom: 19 },
      { id: 'satellite',  name: { en: 'Satellite',   el: 'Δορυφορικό' },  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',                attribution: '© Esri', maxZoom: 19 },
      { id: 'dark',       name: { en: 'Dark',        el: 'Σκούρο' },      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',                                               attribution: '© CARTO © OSM', maxZoom: 19, subdomains: 'abcd' },
      { id: 'topographic',name: { en: 'Topographic', el: 'Τοπογραφικό' }, url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                                                            attribution: '© OpenTopoMap © OSM', maxZoom: 17, subdomains: 'abc' },
      { id: 'cycle',      name: { en: 'Cycle',       el: 'Ποδήλατο' },    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',                                            attribution: '© CyclOSM © OSM', maxZoom: 19, subdomains: 'abc' },
      { id: 'transit',    name: { en: 'Transit',     el: 'Μεταφορές' },   url: 'https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=' + (cfg.TF_API_KEY || ''),              attribution: '© Thunderforest © OSM', maxZoom: 19, subdomains: 'abc' },
    ];

    layers.forEach(function (layerCfg) {
      var opts = { attribution: layerCfg.attribution, maxZoom: layerCfg.maxZoom || 19 };
      if (layerCfg.subdomains) opts.subdomains = layerCfg.subdomains;
      var layer = L.tileLayer(layerCfg.url, opts);
      window.appState.baseLayers[layerCfg.id] = layer;
    });

    var firstId = layers[0] ? layers[0].id : 'standard';
    if (window.appState.baseLayers[firstId]) {
      window.appState.baseLayers[firstId].addTo(window.appState.map);
      window.appState.currentBaseLayer = firstId;
    }

    // Render layer buttons
    var container = document.getElementById('layerControls');
    if (!container) return;
    container.innerHTML = '';

    var isEl = getCurrentLang() === 'el';
    layers.forEach(function (layerCfg) {
      var btn = document.createElement('button');
      btn.className = 'layer-btn' + (layerCfg.id === firstId ? ' active' : '');
      btn.textContent = isEl ? layerCfg.name.el : layerCfg.name.en;
      btn.dataset.layerId = layerCfg.id;
      btn.addEventListener('click', function () { switchLayer(layerCfg.id); });
      container.appendChild(btn);
    });
  }

  function switchLayer(layerId) {
    if (!window.appState.baseLayers[layerId]) return;
    if (window.appState.currentBaseLayer && window.appState.baseLayers[window.appState.currentBaseLayer]) {
      window.appState.map.removeLayer(window.appState.baseLayers[window.appState.currentBaseLayer]);
    }
    window.appState.baseLayers[layerId].addTo(window.appState.map);
    window.appState.currentBaseLayer = layerId;

    document.querySelectorAll('.layer-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.layerId === layerId);
    });
  }

  // ── Module Toggles ──
  function initModuleToggles() {
    var container = document.getElementById('moduleToggles');
    if (!container) return;
    container.innerHTML = '';

    var isEl = getCurrentLang() === 'el';
    MODULES.forEach(function (mod) {
      var wrapper = document.createElement('div');
      wrapper.className = 'module-toggle-wrapper';
      wrapper.innerHTML =
        '<label class="module-toggle">' +
        '  <input type="checkbox" data-module-id="' + mod.id + '">' +
        '  <span class="module-toggle-slider"></span>' +
        '  <span class="module-toggle-label">' + (isEl ? mod.name.el : mod.name.en) + '</span>' +
        '</label>';
      container.appendChild(wrapper);

      var checkbox = wrapper.querySelector('input');
      checkbox.addEventListener('change', function () {
        if (this.checked) activateModule(mod.id);
        else deactivateModule(mod.id);
      });
    });
  }

  // ── Activate Module ──
  function activateModule(moduleId) {
    var mod = MODULES.find(function (m) { return m.id === moduleId; });
    if (!mod) return;

    // Deactivate current module if different
    if (window.appState.activeModule && window.appState.activeModule !== moduleId) {
      deactivateModule(window.appState.activeModule);
    }

    window.appState.activeModule = moduleId;

    var panel = document.getElementById('activeModulePanel');
    var titleEl = document.getElementById('activeModuleTitle');
    var content = document.getElementById('moduleContent');
    if (!panel || !content) return;

    var isEl = getCurrentLang() === 'el';
    panel.classList.add('active');
    titleEl.textContent = isEl ? mod.name.el : mod.name.en;
    content.innerHTML = '';

    var initFn = window[mod.init];
    if (typeof initFn !== 'function') {
      console.error('Module init function not found:', mod.init);
      content.innerHTML = '<p style="color:var(--danger)">Module not available: ' + mod.init + '</p>';
      return;
    }

    try {
      initFn(window.appState.map, content, window.appState);
    } catch (err) {
      console.error('Module init error:', mod.id, err);
      content.innerHTML = '<p style="color:var(--danger)">Error: ' + escapeHtml(err.message) + '</p>';
    }
  }

  // ── Deactivate Module ──
  function deactivateModule(moduleId) {
    var mod = MODULES.find(function (m) { return m.id === moduleId; });
    if (!mod) return;

    var cleanupFn = window[mod.cleanup];
    if (typeof cleanupFn === 'function') {
      try { cleanupFn(); } catch (err) { console.error('Cleanup error:', moduleId, err); }
    }

    if (window.appState.activeModule === moduleId) {
      window.appState.activeModule = null;
      var panel = document.getElementById('activeModulePanel');
      if (panel) panel.classList.remove('active');
    }

    var checkbox = document.querySelector('input[data-module-id="' + moduleId + '"]');
    if (checkbox) checkbox.checked = false;
  }

  window.activateModule = activateModule;
  window.deactivateModule = deactivateModule;
  window.closeActivePanel = function () {
    if (window.appState.activeModule) {
      deactivateModule(window.appState.activeModule);
    }
  };

  // ── Location Button ──
  function initLocationButton() {
    var btn = document.getElementById('locationBtn');
    if (!btn) return;

    btn.addEventListener('click', function () {
      if (!navigator.geolocation) {
        showNotification(getCurrentLang() === 'el' ? 'Δεν υποστηρίζεται' : 'Not supported', 'warning');
        return;
      }

      showNotification(getCurrentLang() === 'el' ? 'Εντοπισμός...' : 'Locating...', 'info');

      navigator.geolocation.getCurrentPosition(function (pos) {
        var lat = pos.coords.latitude;
        var lng = pos.coords.longitude;

        if (window.appState.locationMarker) {
          window.appState.map.removeLayer(window.appState.locationMarker);
        }

        window.appState.locationMarker = L.circleMarker([lat, lng], {
          radius: 10, fillColor: '#6d4aff', color: 'white', weight: 3, fillOpacity: 0.8
        }).addTo(window.appState.map);

        window.appState.locationMarker.bindPopup(getCurrentLang() === 'el' ? 'Είσαι εδώ' : 'You are here');
        window.appState.map.setView([lat, lng], 16);
        window.appState.locationMarker.openPopup();
      }, function (err) {
        showNotification(getCurrentLang() === 'el' ? 'Σφάλμα γεωτοποθεσίας' : 'Geolocation error', 'warning');
      }, { enableHighAccuracy: true, timeout: 10000 });
    });
  }

  // ── Global Login Button ──
  function initGlobalLogin() {
    var btn = document.getElementById('globalLoginBtn');
    if (!btn) return;

    updateGlobalLoginBtn();

    btn.addEventListener('click', function () {
      if (isLoggedIn()) {
        localStorage.removeItem('osm_access_token');
        localStorage.removeItem('osm_user_id');
        localStorage.removeItem('osm_user_name');
        localStorage.removeItem('pkce_verifier');
        updateGlobalLoginBtn();
        showNotification(getCurrentLang() === 'el' ? 'Αποσυνδέθηκες' : 'Logged out', 'info');
      } else {
        if (typeof initiateOAuth === 'function') {
          initiateOAuth();
        }
      }
    });

    window.addEventListener('storage', function (e) {
      if (e.key === 'osm_access_token' || e.key === 'osm_user_id' || e.key === 'osm_user_name') {
        updateGlobalLoginBtn();
      }
    });
  }

  function updateGlobalLoginBtn() {
    var btn = document.getElementById('globalLoginBtn');
    if (!btn) return;
    if (isLoggedIn()) {
      var name = localStorage.getItem('osm_user_name') || '✅';
      btn.textContent = '🔓';
      btn.title = name;
      btn.classList.add('logged-in');
    } else {
      btn.textContent = '🔐';
      btn.title = 'Login';
      btn.classList.remove('logged-in');
    }
  }
  window.updateGlobalLoginBtn = updateGlobalLoginBtn;

  function isLoggedIn() {
    return !!localStorage.getItem('osm_access_token');
  }
  window.isLoggedIn = isLoggedIn;

  // ── Theme Button Icon ──
  function updateThemeBtn() {
    var themeBtn = document.getElementById('themeBtn');
    if (!themeBtn) return;
    var theme = document.documentElement.getAttribute('data-theme') || 'dark';
    themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  // ── Apply Translations ──
  function applyTranslations() {
    var isEl = getCurrentLang() === 'el';
    var modulesTitle = document.getElementById('modulesTitle');
    var layersTitle = document.getElementById('layersTitle');

    if (modulesTitle) modulesTitle.textContent = isEl ? 'Λειτουργίες' : 'Modules';
    if (layersTitle) layersTitle.textContent = isEl ? 'Στρώματα' : 'Layers';

    var langBtn = document.getElementById('langBtn');
    if (langBtn) langBtn.textContent = isEl ? 'EN' : 'ΕΛ';

    initModuleToggles();
    initGlobalLogin();
  }
  window.applyTranslations = applyTranslations;

  function getCurrentLang() {
    try {
      if (typeof window.getLanguage === 'function') return window.getLanguage();
      return localStorage.getItem('waymark_lang') || (navigator.language || 'en').startsWith('el') ? 'el' : 'en';
    } catch (e) {
      return 'en';
    }
  }
  window.getCurrentLang = getCurrentLang;

  // ── Resize Handler ──
  function initResizeHandler() {
    var timer = null;
    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (window.appState.map) window.appState.map.invalidateSize();
      }, 200);
    });

    window.addEventListener('orientationchange', function () {
      setTimeout(function () {
        if (window.appState.map) window.appState.map.invalidateSize();
      }, 300);
    });
  }

  // ── Service Worker ──
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        console.log('SW registered:', reg.scope);
      }).catch(function (err) {
        console.error('SW error:', err);
      });
    }
  }

})();