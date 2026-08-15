/* =========================================================
   WAYMARK — Core Application
   Privacy First • No Tracking • Open Source
   ========================================================= */

const APP_STATE = {
  currentLayer: 'osm',
  activeModules: {},
  mapMarkers: [],
  offlineMode: false
};

const MODULES = [
  { id: 'nominatim',        name_key: 'module.nominatim',        icon: '🔍' },
  { id: 'poi-viewer',        name_key: 'module.poi_viewer',        icon: '📍' },
  { id: 'gpx-editor',        name_key: 'module.gpx_editor',        icon: '📡' },
  { id: 'xml-generator',     name_key: 'module.xml_generator',     icon: '📝' },
  { id: 'osm-editor',        name_key: 'module.osm_editor',        icon: '📤' },
  { id: 'quality-checker',   name_key: 'module.quality_checker',   icon: '⚠️' },
  { id: 'heatmap',            name_key: 'module.heatmap',            icon: '🌡️' },
  { id: 'tags-lookup',       name_key: 'module.tags_lookup',       icon: '🏷️' },
  { id: 'notes-browser',     name_key: 'module.notes_browser',     icon: '📋' },
  { id: 'tutorial',          name_key: 'module.tutorial',          icon: '📖' },
];

let map;
const LAYERS = {};

function initMap() {
  map = L.map('map', { zoomControl: false }).setView([39.0742, 21.8243], 7);
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  LAYERS.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© OpenStreetMap contributors', crossOrigin: true
  });
  LAYERS.dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, attribution: '© OSM © CARTO', subdomains: 'abcd', crossOrigin: true
  });
  LAYERS.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 17, attribution: '© Esri', crossOrigin: true
  });
  LAYERS.topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17, attribution: '© OpenTopoMap', crossOrigin: true
  });

  LAYERS.osm.addTo(map);
  map.on('click', handleMapClick);

  // Ask for user location on load
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 14);
      },
      (err) => {
        console.log('Geolocation denied or unavailable, using default location.');
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }
}

function updateLayerButtons(layerName) {
  document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`[data-layer=${layerName}]`);
  if (btn) btn.classList.add('active');
}

function switchLayer(name) {
  Object.values(LAYERS).forEach(l => map.removeLayer(l));
  LAYERS[name].addTo(map);
  APP_STATE.currentLayer = name;
}

function handleMapClick(e) {
  const { lat, lng } = e.latlng;
  APP_STATE.mapMarkers.forEach(m => map.removeLayer(m));
  APP_STATE.mapMarkers = [];

  const marker = L.marker([lat, lng]).addTo(map);
  APP_STATE.mapMarkers.push(marker);
  marker.bindPopup(`<b>${lat.toFixed(6)}, ${lng.toFixed(6)}</b>`).openPopup();

  Object.keys(APP_STATE.activeModules).forEach(id => {
    const fn = window[`onMapClick_${id}`];
    if (fn) fn(lat, lng, map);
  });
}

function initModuleToggles() {
  const list = document.getElementById('toggleList');
  
  // Add minimize button to panel header
  const panelHeader = document.querySelector('.toggle-header');
  if (panelHeader) {
    const minBtn = document.createElement('button');
    minBtn.className = 'toggle-minimize-btn';
    minBtn.innerHTML = '−';
    minBtn.title = getCurrentLang() === 'el' ? 'Ελαχιστοποίηση' : 'Minimize';
    minBtn.addEventListener('click', () => {
      const panel = document.querySelector('.module-toggle-panel');
      panel.classList.toggle('minimized');
      minBtn.innerHTML = panel.classList.contains('minimized') ? '+' : '−';
      minBtn.title = getCurrentLang() === 'el' ? 'Μεγιστοποίηση' : 'Maximize';
    });
    panelHeader.appendChild(minBtn);
  }

  MODULES.forEach(mod => {
    const item = document.createElement('div');
    item.className = 'toggle-item';
    item.innerHTML = `
      <span class="toggle-label">${mod.icon} <span data-i18n="${mod.name_key}">${t(mod.name_key)}</span></span>
      <label class="toggle-switch">
        <input type="checkbox" data-module="${mod.id}">
        <span class="slider"></span>
      </label>`;
    list.appendChild(item);

    item.querySelector('input').addEventListener('change', (ev) => {
      toggleModule(mod, ev.target.checked);
    });
  });
}

async function toggleModule(mod, enabled) {
  const panel = document.getElementById('modulePanel');
  const content = document.getElementById('moduleContent');

  if (enabled) {
    // Disable other modules
    MODULES.forEach(m => {
      if (m.id !== mod.id && APP_STATE.activeModules[m.id]) {
        APP_STATE.activeModules[m.id] = false;
        const cb = document.querySelector(`input[data-module=${m.id}]`);
        if (cb) cb.checked = false;
      }
    });

    APP_STATE.activeModules[mod.id] = true;
    panel.classList.remove('hidden');
    content.innerHTML = '';

    const initFn = 'init' + mod.id.replace(/-./g, x => x[1].toUpperCase()).replace(/^./, c => c.toUpperCase());
    if (typeof window[initFn] === 'function') {
      window[initFn](map, content, APP_STATE);
    } else {
      content.innerHTML = `<p style="color: var(--fg-muted);">${t('common.loading')}</p>`;
    }
  } else {
    APP_STATE.activeModules[mod.id] = false;
    panel.classList.add('hidden');
    content.innerHTML = '';
  }
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

function updateStatus() {
  const dot = document.getElementById('onlineStatus');
  const txt = document.getElementById('connectionStatus');
  if (navigator.onLine) {
    dot.classList.remove('offline');
    txt.textContent = t('status.online');
  } else {
    dot.classList.add('offline');
    txt.textContent = t('status.offline');
  }
}

window.addEventListener('online', updateStatus);
window.addEventListener('offline', updateStatus);

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initModuleToggles();
  registerSW();
  updateStatus();
  applyTranslations();

  document.getElementById('layerSelector').addEventListener('click', (e) => {
    if (!e.target.classList.contains('layer-btn')) return;
    updateLayerButtons(e.target.dataset.layer);
    switchLayer(e.target.dataset.layer);
  });
});

window.APP_STATE = APP_STATE;
window.MODULES = MODULES;