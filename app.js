/* =========================================================
   WAYMARK — Main Application
   ========================================================= */

(function () {
  'use strict';

  let isEl = getCurrentLang() === 'el';

  const appState = {
    map: null,
    mapMarkers: [],
    activeModule: null,
    activeModuleId: null,
    currentTileLayer: null,
    geolocationWatch: null,
    locationMarker: null,
  };

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
    initLayerControls();
    initModuleToggles();
    initMapClickHandler();
    initLocationButton();
    initThemeToggle();
    initHelpButton();
    registerServiceWorker();
    applyAppTranslations();

    // Force Leaflet to recalculate size — multiple strategies
    requestAnimationFrame(() => {
      if (appState.map) appState.map.invalidateSize();
    });

    setTimeout(() => { if (appState.map) appState.map.invalidateSize(); }, 100);
    setTimeout(() => { if (appState.map) appState.map.invalidateSize(); }, 500);
    setTimeout(() => { if (appState.map) appState.map.invalidateSize(); }, 1000);

    // Invalidate on window resize
    window.addEventListener('resize', () => {
      if (appState.map) appState.map.invalidateSize();
    });

    // Invalidate on orientation change (mobile)
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        if (appState.map) appState.map.invalidateSize();
      }, 300);
    });

    // Remove loading overlay then invalidate
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
        if (appState.map) appState.map.invalidateSize();
        // One more after the overlay is fully gone
        requestAnimationFrame(() => {
          if (appState.map) appState.map.invalidateSize();
        });
      }, 300);
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

    const mapEl = document.getElementById('map');

    appState.map = L.map(mapEl, {
      zoomControl: false,
      attributionControl: true,
      fadeAnimation: true,
      zoomAnimation: true,
    }).setView([lat, lon], zoom);

    L.control.zoom({ position: 'bottomleft' }).addTo(appState.map);
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(appState.map);

    // Add default tile layer
    const defaultLayer = cfg.TILE_LAYERS?.standard;
    if (defaultLayer) {
      appState.currentTileLayer = L.tileLayer(defaultLayer.url, {
        attribution: defaultLayer.attribution,
        maxZoom: defaultLayer.maxZoom,
        crossOrigin: true,
      }).addTo(appState.map);
    }

    appState.map.on('locationfound', (e) => {
      if (appState.locationMarker) {
        appState.map.removeLayer(appState.locationMarker);
      }
      appState.locationMarker = L.circleMarker([e.latitude, e.longitude], {
        radius: 10,
        fillColor: '#6d4aff',
        color: 'white',
        weight: 2,
        fillOpacity: 0.8,
      }).addTo(appState.map).bindPopup(
        isEl ? '📍 Εδώ είσαι!' : '📍 You are here!'
      ).openPopup();
    });

    appState.map.on('locationerror', () => {});
  }

  // =======================================================
  // Location Button
  // =======================================================

  function initLocationButton() {
    const locateBtn = document.createElement('button');
    locateBtn.className = 'location-button';
    locateBtn.innerHTML = '📍';
    locateBtn.title = isEl ? 'Τρέχουσα θέση' : 'Current location';
    locateBtn.type = 'button';
    document.getElementById('map').parentElement.appendChild(locateBtn);

    locateBtn.addEventListener('click', () => {
      if (navigator.geolocation) {
        locateBtn.style.background = 'var(--accent)';
        locateBtn.style.color = 'white';

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            appState.map.setView([lat, lon], 15);

            if (appState.locationMarker) {
              appState.map.removeLayer(appState.locationMarker);
            }
            appState.locationMarker = L.circleMarker([lat, lon], {
              radius: 10,
              fillColor: '#6d4aff',
              color: 'white',
              weight: 2,
              fillOpacity: 0.8,
            }).addTo(appState.map).bindPopup(
              isEl ? '📍 Εδώ είσαι!' : '📍 You are here!'
            ).openPopup();

            locateBtn.style.background = '';
            locateBtn.style.color = '';
          },
          (err) => {
            console.error('Geolocation error:', err);
            alert(isEl
              ? 'Δεν ήταν δυνατός ο εντοπισμός της θέσης σου.'
              : 'Could not determine your location.');
            locateBtn.style.background = '';
            locateBtn.style.color = '';
          },
          { timeout: 10000, enableHighAccuracy: true }
        );
      }
    });
  }

  // =======================================================
  // Theme Toggle
  // =======================================================

  function initThemeToggle() {
    const themeBtn = document.getElementById('themeToggle');
    if (!themeBtn) return;

    function updateIcon() {
      const current = (typeof getCurrentTheme === 'function')
        ? getCurrentTheme()
        : 'dark';
      // Show the icon for what you'll switch TO
      themeBtn.textContent = current === 'dark' ? '☀️' : '🌙';
      themeBtn.title = current === 'dark'
        ? (isEl ? 'Εναλλαγή σε φωτεινό' : 'Switch to light')
        : (isEl ? 'Εναλλαγή σε σκοτεινό' : 'Switch to dark');
    }

    updateIcon();

    themeBtn.addEventListener('click', () => {
      if (typeof toggleTheme === 'function') {
        toggleTheme();
      }
      updateIcon();

      // Invalidate map size after theme change (layout may shift)
      if (appState.map) {
        requestAnimationFrame(() => {
          appState.map.invalidateSize();
        });
        setTimeout(() => {
          if (appState.map) appState.map.invalidateSize();
        }, 200);
      }
    });
  }

  // =======================================================
  // Help Button (? → Tutorial)
  // =======================================================

  function initHelpButton() {
    const helpBtn = document.getElementById('helpBtn');
    if (!helpBtn) return;

    helpBtn.addEventListener('click', () => {
      const cb = document.querySelector('input[data-module-id="tutorial"]');
      if (cb) {
        if (appState.activeModuleId) {
          deactivateModule(appState.activeModuleId);
          const prevCb = document.querySelector(`input[data-module-id="${appState.activeModuleId}"]`);
          if (prevCb) prevCb.checked = false;
        }

        cb.checked = true;
        activateModule('tutorial');

        setTimeout(() => {
          if (typeof window.startTutorialWalkthrough === 'function') {
            window.startTutorialWalkthrough();
          }
        }, 300);
      }
    });
  }

  // =======================================================
  // Layer Controls
  // =======================================================

  function initLayerControls() {
    const btns = document.querySelectorAll('.layer-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const layerName = btn.dataset.layer;
        const cfg = window.WAYMARK_CONFIG || {};
        const layerDef = cfg.TILE_LAYERS?.[layerName];

        if (!layerDef) {
          console.warn('Layer not found in config:', layerName);
          return;
        }

        if (appState.currentTileLayer) {
          appState.map.removeLayer(appState.currentTileLayer);
        }

        appState.currentTileLayer = L.tileLayer(layerDef.url, {
          attribution: layerDef.attribution,
          maxZoom: layerDef.maxZoom,
          crossOrigin: true,
        }).addTo(appState.map);

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

    document.getElementById('modulesTitle').textContent = isEl ? 'Μονάδες' : 'Modules';
    document.getElementById('layersTitle').textContent = isEl ? 'Επίπεδα' : 'Layers';
  }

  function activateModule(moduleId) {
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

    const panel = document.getElementById('activeModulePanel');
    const title = document.getElementById('activeModuleTitle');
    const content = document.getElementById('moduleContent');

    title.textContent = mod.icon + ' ' + t(mod.name_key);
    panel.classList.add('active');
    content.innerHTML = '';

    initFn(appState.map, content, appState);

    // Invalidate after panel appears (layout shift)
    setTimeout(() => {
      if (appState.map) appState.map.invalidateSize();
    }, 100);
  }

  function deactivateModule(moduleId) {
    const cleanupKey = '_' + moduleId.replace(/-/g, '_') + 'Cleanup';
    if (typeof window[cleanupKey] === 'function') {
      window[cleanupKey]();
    }
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
  // Map Click Handler
  // =======================================================

  function initMapClickHandler() {
    appState.map.on('click', (e) => {
      if (!appState.activeModuleId) return;

      const handlerKey = 'onMapClick_' + appState.activeModuleId
        .split('-')
        .map((part, i) => i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
        .join('');

      if (typeof appState[handlerKey] === 'function') {
        appState[handlerKey](e.latlng.lat, e.latlng.lng);
      } else if (typeof window[handlerKey] === 'function') {
        window[handlerKey](e.latlng.lat, e.latlng.lng, appState.map, appState);
      }
    });
  }

  // =======================================================
  // Translations
  // =======================================================

  function applyAppTranslations() {
    const loadingText = document.getElementById('loadingText');
    if (loadingText) {
      loadingText.textContent = isEl ? 'Φόρτωση Waymark...' : 'Loading Waymark...';
    }
  }

  // =======================================================
  // Service Worker
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
  // Bootstrap
  // =======================================================

  document.addEventListener('DOMContentLoaded', () => {
    const isMobile = window.innerWidth <= 768;
    const moduleBody = document.getElementById('moduleToggles');
    if (isMobile && moduleBody) {
      moduleBody.style.display = 'none';
    }

    const closeBtn = document.getElementById('closeModule');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (appState.activeModuleId) {
          const prevId = appState.activeModuleId;
          deactivateModule(prevId);
          const cb = document.querySelector(`input[data-module-id="${prevId}"]`);
          if (cb) cb.checked = false;
        }
      });
    }

    document.getElementById('toggleModules')?.addEventListener('click', () => {
      const body = document.getElementById('moduleToggles');
      body.style.display = body.style.display === 'none' ? '' : 'none';
    });

    document.getElementById('toggleLayers')?.addEventListener('click', () => {
      const body = document.getElementById('layerControls');
      body.style.display = body.style.display === 'none' ? '' : 'none';
    });

    document.getElementById('langToggle')?.addEventListener('click', () => {
      const current = getCurrentLang();
      const newLang = current === 'en' ? 'el' : 'en';
      if (typeof setLanguage === 'function') {
        setLanguage(newLang);
      } else {
        localStorage.setItem('waymark_lang', newLang);
      }
      location.reload();
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (appState.map) {
            appState.map.setView([pos.coords.latitude, pos.coords.longitude], 14);
          }
        },
        () => {},
        { timeout: 5000 }
      );
    }

    init();
  });

})();