/* =========================================================
   WAYMARK — POI Viewer Module
   Fetch and display POIs via Overpass API.
   Supports: View, Click details, Move, Delete
   ========================================================= */

let poiMarkers = [];
let selectedPoi = null;
let mapRef = null;
let appStateRef = null;

function initPoiViewer(map, container, appState) {
  const isEl = getCurrentLang() === 'el';

  // Store references for async/map click handlers
  mapRef = map;
  appStateRef = appState;

  container.innerHTML = `
    <div class="module-form">
      <div class="form-group">
        <label>${isEl ? 'Κατηγορία' : 'Category'}</label>
        <select id="poiCategory">
          <option value="amenity">${isEl ? 'Amenities' : 'Amenities'}</option>
          <option value="shop">${isEl ? 'Shops' : 'Shops'}</option>
          <option value="leisure">${isEl ? 'Leisure' : 'Leisure'}</option>
          <option value="tourism">${isEl ? 'Tourism' : 'Tourism'}</option>
          <option value="highway">${isEl ? 'Highways' : 'Highways'}</option>
          <option value="building:custom">${isEl ? 'Custom' : 'Custom'}</option>
        </select>
      </div>
      <button class="btn" id="fetchPOIs">${isEl ? '🔍 Αναζήτηση' : '🔍 Search'}</button>
    </div>
  `;

  document.getElementById('fetchPOIs').addEventListener('click', () => {
    const category = document.getElementById('poiCategory').value;
    if (mapRef) {
      fetchPOIsInViewport(category, mapRef.getBounds());
    }
  });
}

async function fetchPOIsInViewport(category, bounds) {
  const isEl = getCurrentLang() === 'el';
  
  // Clear existing markers
  poiMarkers.forEach(m => {
    if (mapRef) mapRef.removeLayer(m);
  });
  poiMarkers = [];

  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();

  const query = `
    [out:json][timeout:30];
    (${category === 'building:custom' 
      ? 'node["name"](bbox);way["name"](bbox);relation["name"](bbox)'
      : `node["${category}"](bbox);way["${category}"](bbox);relation["${category}"](bbox)`
    });
    out body center;
  `.trim();

  try {
    const response = await fetch(`${WAYMARK_CONFIG.OVERPASS_URL}?data=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Overpass API error');
    const data = await response.json();

    data.elements.forEach(el => {
      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      
      if (!lat || !lon) return;

      const marker = L.marker([lat, lon]).addTo(mapRef);
      marker.data = el;
      
      const typeName = el.tags?.name || el.tags?.['addr:street'] || '';
      const mainTag = getMainTagName(el.tags);
      
      const popupContent = `
        <div style="min-width: 220px;">
          <strong>${typeName || '(Unnamed)'}</strong><br>
          <small>${mainTag}</small><br>
          <small style="color: var(--fg-muted)">${lat.toFixed(5)}, ${lon.toFixed(5)}</small>
          <div class="poi-actions" style="margin-top: 0.5rem;">
            <button class="btn btn-sm" onclick="window.showPOIDetails(${el.id}, '${lat}', '${lon}')">${isEl ? '📋 Λεπτομέρειες' : '📋 Details'}</button>
            <button class="btn btn-sm" onclick="window.prepareMovePOI(${el.id})">${isEl ? '✏️ Μετακίνηση' : '✏️ Move'}</button>
            <button class="btn btn-sm" onclick="window.prepareDeletePOI(${el.id})">${isEl ? '🗑️ Διαγραφή' : '🗑️ Delete'}</button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      poiMarkers.push(marker);
    });

  } catch (err) {
    console.error('Fetch POIs error:', err);
    alert(isEl ? 'Σφάλμα κατά την αναζήτηση POIs.' : 'Error fetching POIs.');
  }
}

// Helper: Get readable tag name
function getMainTagName(tags) {
  if (!tags) return 'Unknown';
  if (tags.amenity) return `Amenity: ${tags.amenity}`;
  if (tags.shop) return `Shop: ${tags.shop}`;
  if (tags.leisure) return `Leisure: ${tags.leisure}`;
  if (tags.tourism) return `Tourism: ${tags.tourism}`;
  if (tags.highway) return `Highway: ${tags.highway}`;
  if (tags.building) return `Building: ${tags.building}`;
  if (tags['addr:street']) return `Address: ${tags['addr:street']}`;
  return Object.keys(tags)[0] || 'Unknown';
}

// Helper: Pretty tag names
function getPrettiedTagName(rawKey) {
  const pretties = {
    'amenity': 'Amenity',
    'shop': 'Shop',
    'leisure': 'Leisure',
    'tourism': 'Tourism',
    'highway': 'Highway',
    'building': 'Building',
    'addr:housenumber': 'House number',
    'addr:street': 'Street',
    'addr:postcode': 'Post code',
    'addr:city': 'City',
    'name': 'Name',
    'phone': 'Phone',
    'website': 'Website',
    'email': 'Email',
    'opening_hours': 'Opening hours',
    'wheelchair': 'Wheelchair access',
    'source': 'Source',
    'created_by': 'Created by',
    'operator': 'Operator',
    'brand': 'Brand',
    'network': 'Network',
  };
  return pretties[rawKey] || rawKey.replace(':', ': ').replace(/\b\w/g, l => l.toUpperCase());
}

// Global functions for onclick handlers (Fix: Use window prefix)
window.showPOIDetails = function(id, lat, lon) {
  const marker = poiMarkers.find(m => m.data?.id === parseInt(id));
  if (!marker || !mapRef) return;

  const tags = marker.data.tags || {};
  const tagRows = Object.entries(tags)
    .map(([k, v]) => `<tr><td><strong>${getPrettiedTagName(k)}</strong></td><td>${v}</td></tr>`)
    .join('');

  const isEl = getCurrentLang() === 'el';
  const popupContent = `
    <div style="min-width: 240px;">
      <strong>${tags.name || '(Unnamed)'}</strong><br>
      <small>${lat}, ${lon}</small>
      <table class="poi-tags-table">
        <thead><tr><th>Tag</th><th>Value</th></tr></thead>
        <tbody>${tagRows}</tbody>
      </table>
      <div class="poi-actions" style="margin-top: 0.5rem;">
        <button class="btn btn-sm" onclick="window.closeDetails()">${isEl ? '❌ Κλείσιμο' : '❌ Close'}</button>
        <button class="btn btn-sm" onclick="window.prepareMovePOI(${id})">${isEl ? '✏️ Μετακίνηση' : '✏️ Move'}</button>
        <button class="btn btn-sm" onclick="window.prepareDeletePOI(${id})">${isEl ? '🗑️ Διαγραφή' : '🗑️ Delete'}</button>
      </div>
    </div>
  `;

  marker.setPopupContent(popupContent);
  marker.openPopup();
};

window.closeDetails = function() {
  // Just close any open popups
  if (mapRef && mapRef._popup) {
    mapRef.closePopup();
  }
};

// Prepare move POI (sets flag in appState for next click)
window.prepareMovePOI = function(id) {
  if (!appStateRef) return;
  
  const marker = poiMarkers.find(m => m.data?.id === parseInt(id));
  if (!marker) return;

  const isEl = getCurrentLang() === 'el';
  const msg = isEl 
    ? 'Κάνε κλικ στον χάρτη για νέα θέση. Πάτα ESC για ακύρωση.'
    : 'Click on map for new position. Press ESC to cancel.';
  
  alert(msg);
  appStateRef.poiMoveTargetId = id;
};

// Prepare delete POI
window.prepareDeletePOI = function(id) {
  if (!appStateRef) return;

  const marker = poiMarkers.find(m => m.data?.id === parseInt(id));
  if (!marker) return;

  const isEl = getCurrentLang() === 'el';
  const confirmed = confirm(isEl 
    ? 'Επιβεβαίωση διαγραφής;'
    : 'Confirm deletion?');
  
  if (confirmed) {
    appStateRef.poiDeleteTargetId = id;
    alert(isEl ? 'Κάνε κλικ στον χάρτη για επιβεβαίωση διαγραφής.' : 'Click on map to confirm deletion.');
  }
};

// Fix: Define handler AFTER appStateRef is set (inside initPoiViewer callback)
appState.onMapClick_poiViewer = function(lat, lng) {
  const isEl = getCurrentLang() === 'el';

  if (this.poiMoveTargetId) {
    const marker = poiMarkers.find(m => m.data?.id === this.poiMoveTargetId);
    if (marker && mapRef) {
      marker.setLatLng([lat, lng]);
      alert(isEl ? 'Μετακίνηση: Χρησιμοποίησε τον Editor για αποθήκευση αλλαγών.' : 'Move: Use Editor to save changes.');
      this.poiMoveTargetId = null;
    }
  } else if (this.poiDeleteTargetId) {
    alert(isEl ? 'Διαγραφή: Χρησιμοποίησε τον Editor για επιβεβαίωση.' : 'Delete: Use Editor to confirm deletion.');
    this.poiDeleteTargetId = null;
  }
};

// Cleanup function
window._poi_viewerCleanup = function() {
  if (mapRef) {
    poiMarkers.forEach(m => mapRef.removeLayer(m));
  }
  poiMarkers = [];
  selectedPoi = null;
  mapRef = null;
  appStateRef = null;
};

window.initPoiViewer = initPoiViewer;