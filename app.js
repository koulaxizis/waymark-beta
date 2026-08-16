/* =========================================================
   WAYMARK — Main Application
   ========================================================= */

(function () {
  'use strict';

  const isEl = getCurrentLang() === 'el';

  // Shared app state
  const appState = {
    map: null,
    mapMarkers: [],
    activeModule: null,
    activeModuleId: null,
    currentTileLayer: null,
    geolocationWatch: null,
  };

  // Module definitions
  const MODULES = [
    { id: 'nominatim', name_key: 'module.nominatim', icon: '🔍', init: () => window.initNominatim },
    { id: 'poi-viewer', name_key: 'module.poi_viewer', icon: '📍', init: () => window.initPoiViewer },
    { id: 'osm-editor', name_key: 'module.osm_editor', icon: '📤', init: () => window.initOsmEditor },
    { id: 'track-recorder', name_key: 'module.track_recorder', icon: '🏃', init: () => window.initTrackRecorder },
    { id: 'building-editor', name_key: 'module.building_editor', icon: '🏠', init: () => window.initBuildingEditor },
    { id: 'road-editor', name_key: 'module.road_editor', icon: '🛣️', init: () => window.initRoadEditor },
    { id: 'address-mapper', name_key: 'module.address_mapper', icon: '🏘️', init: () => window.initAddressMapper },
    { id: 'quest-mode', name_key: 'module.quest_mode', icon: '🎯', init: () => window.initQuestMode },
    { id: 'gpx-editor', name_key: 'module.gpx_editor', icon: '📐', init: () => window.initGpxEditor },
    { id: 'xml-generator', name_key: 'module.xml_generator', icon: '📄', init: () => window.initXmlGenerator },
    { id: 'quality-checker', name_key: 'module.quality_checker', icon: '✅', init: () => window.initQualityChecker },
    { id: 'heatmap', name_key: 'module.heatmap', icon: '🔥', init: () => window.initHeatmap },
    { id: 'tags-lookup', name_key: 'module.tags_lookup', icon: '🏷️', init: () => window.initTagsLookup },
    { id: 'notes-browser', name_key: 'module.notes_browser', icon: '📝', init: () => window.initNotesBrowser },
    { id: 'tutorial', name_key: 'module.tutorial', icon: '📖', init: () => window.initTutorial },
  ];

  // =======================================================
  // Initialization
  // =======================================================

  function init() {
    initMap();
    initLayers();
    initModuleToggles();
    initLayerControls();
    initMapClickHandler();
    registerServiceWorker();

    // Hide loading overlay
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.style.display = 'none', 300);
    }
  }

  // =======================================================
  // Map Setup
  // =======================================================

  function initMap() {
    const cfg = window.WAYMARK_CONFIG || {};
    const lat = cfg.DEFAULT_LAT || 39.0742;
    const lon = cfg.DEFAULT_LON || 21.8243;
    const zoom = cfg.DEFAULT_ZOOM || 7;

    appState.map = L.map('map', {
      zoomControl: false,
      attributionControl: true,
    }).setView([lat, lon], zoom);

    // Add zoom control to bottom-left
    L.control.zoom({ position: 'bottomleft' }).addTo(appState.map);

    // Add scale
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(appState.map);

    // Default tile layer
    const defaultLayer = cfg.TILE_LAYERS?.standard;
    if (defaultLayer) {
      appState.currentTileLayer = L.tileLayer(defaultLayer.url, {
        attribution: defaultLayer.attribution,
        maxZoom: defaultLayer.maxZoom,
      }).addTo(appState.map);
    }

    appState.map.on('locationfound', (e) => {
      L.circleMarker([e.latitude, e.longitude], {
        radius: 8, fillColor: '#6d4aff', color: 'white', weight: 2, fillOpacity: 1
      }).addTo(appState.map).bindPopup(isEl ? 'Εδώ είσαι!' : 'You are here!').openPopup();
    });

    appState.map.on('locationerror', () => {
      // Silent fail
    });
  }

  // =======================================================
  // Layer Controls
  // =======================================================

  function initLayers() {
    // Nothing special, handled by initLayerControls
  }

  function initLayerControls() {
    const btns = document.querySelectorAll('.layer-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const layerName = btn.dataset.layer;
        const cfg = window.WAYMARK_CONFIG || {};
        const layerDef = cfg.TILE_LAYERS?.[layerName];

        if (!layerDef) return;

        // Remove current layer
        if (appState.currentTileLayer) {
          appState.map.removeLayer(appState.currentTileLayer);
        }

        // Add new layer
        appState.currentTileLayer = L.tileLayer(layerDef.url, {
          attribution: layerDef.attribution,
          maxZoom: layerDef.maxZoom,
        }).addTo(appState.map);

        // Update active button
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  // =======================================================
  // Module Toggles
  // =======================================================

  function initModuleToggles() {
    const container = document.getElementById('moduleToggles');
    container.innerHTML = '';

    MODULES.forEach(mod => {
      const wrapper = document.createElement('div');
      wrapper.className = 'module-toggle-wrapper';

      const toggle = document.createElement('label');
      toggle.className = 'module-toggle';
      toggle.innerHTML = `
        <input type="checkbox" data-module-id="${mod.id}">
        <span class="module-toggle-slider"></span>
        <span class="module-toggle-label">${mod.icon} ${t(mod.name_key)}</span>
      `;

      const checkbox = toggle.querySelector('input');
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          // Uncheck all others (single active module)
          container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            if (cb !== checkbox) cb.checked = false;
          });
          activateModule(mod.id);
        } else {
          deactivateModule(mod.id);
        }
      });

      wrapper.appendChild(toggle);
      container.appendChild(wrapper);
    });
  }

  function activateModule(moduleId) {
    // Deactivate previous module
    if (appState.activeModuleId) {
      deactivateModule(appState.activeModuleId);
    }

    const mod = MODULES.find(m => m.id === moduleId);
    if (!mod) return;

    const initFn = mod.init();
    if (typeof initFn !== 'function') {
      console.error('Module init function not found:', moduleId);
      return;
    }

    appState.activeModuleId = moduleId;
    appState.activeModule = mod;

    // Show module panel
    const panel = document.getElementById('activeModulePanel');
    const title = document.getElementById('activeModuleTitle');
    const content = document.getElementById('moduleContent');

    title.textContent = mod.icon + ' ' + t(mod.name_key);
    panel.classList.add('active');
    content.innerHTML = '';

    // Initialize module
    initFn(appState.map, content, appState);
  }

  function deactivateModule(moduleId) {
    // Run cleanup if exists
    const cleanupKey = '_' + moduleId.replace(/-/g, '_') + 'Cleanup';
    if (typeof appState[cleanupKey] === 'function') {
      appState[cleanupKey]();
      delete appState[cleanupKey];
    }

    if (appState.activeModuleId === moduleId) {
      appState.activeModuleId = null;
      appState.activeModule = null;

      const panel = document.getElementById('activeModulePanel');
      panel.classList.remove('active');
      document.getElementById('moduleContent').innerHTML = '';
    }
  }

  // =======================================================
  // Map Click Handler — Routes to Active Module
  // =======================================================

  function initMapClickHandler() {
    appState.map.on('click', (e) => {
      if (!appState.activeModuleId) return;

      // Convert module ID to the expected handler key format
      // e.g. 'building-editor' -> 'onMapClick_buildingEditor'
      const handlerKey = 'onMapClick_' + appState.activeModuleId
        .split('-')
        .map((part, i) => i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
        .join('');

      if (typeof appState[handlerKey] === 'function') {
        appState[handlerKey](e.latlng.lat, e.latlng.lng);
      }
    });
  }

  // =======================================================
  // Service Worker Registration
  // =======================================================

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('SW registered:', reg.scope))
          .catch(err => console.log('SW registration failed:', err));
      });
    }
  }

  // =======================================================
  // Close Module Button
  // =======================================================

  document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('closeModule');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (appState.activeModuleId) {
          deactivateModule(appState.activeModuleId);
          // Uncheck toggle
          const cb = document.querySelector(`input[data-module-id="${appState.activeModuleId}"]`);
          if (cb) cb.checked = false;
        }
      });
    }

    // Panel collapse buttons
    document.getElementById('toggleModules')?.addEventListener('click', () => {
      const body = document.getElementById('moduleToggles');
      body.style.display = body.style.display === 'none' ? '' : 'none';
    });

    document.getElementById('toggleLayers')?.addEventListener('click', () => {
      const body = document.getElementById('layerControls');
      body.style.display = body.style.display === 'none' ? '' : 'none';
    });

    // Try geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          appState.map.setView([pos.coords.latitude, pos.coords.longitude], 14);
        },
        () => {},
        { timeout: 5000 }
      );
    }

    // Init app
    init();
  });

})();