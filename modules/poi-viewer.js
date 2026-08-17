/* =========================================================
   WAYMARK — POI Viewer Module
   Fetch and display POIs via Overpass API.
   Supports: View, Click details, Move, Delete
   ========================================================= */

let poiMarkers = [];
let selectedPoi = null;
let localMap = null;
let localAppState = null;

function initPoiViewer(map, container, appState) {
  const isEl = getCurrentLang() === 'el';

  // Store local references
  localMap = map;
  localAppState = appState;

  // Attach map click handler to appState
  localAppState.onMapClick_poiViewer = function(lat, lng) {
    const isEl = getCurrentLang() === 'el';

    if (this.poiMoveTargetId) {
      const marker = poiMarkers.find(m => m.data?.id === this.poiMoveTargetId);
      if (marker && localMap) {
        marker.setLatLng([lat, lng]);
        alert(isEl ? 'Μετακίνηση: Χρησιμοποίησε τον Editor για αποθήκευση.' : 'Move: Use Editor to save.');
        this.poiMoveTargetId = null;
      }
    } else if (this.poiDeleteTargetId) {
      alert(isEl ? 'Διαγραφή: Χρησιμοποίησε τον Editor για επιβεβαίωση.' : 'Delete: Use Editor to confirm.');
      this.poiDeleteTargetId = null;
    }
  };

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
    fetchPOIsInViewport(category, localMap.getBounds());
  });
}

async function fetchPOIsInViewport(category, bounds) {
  const isEl = getCurrentLang() === 'el';
  
  poiMarkers.forEach(m => {
    if (localMap) localMap.removeLayer(m);
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

      const marker = L.marker([lat, lon]).addTo(localMap);
      marker.data = el;
      
      const typeName = el.tags?.name || el.tags?.['addr:street'] || '';
      const mainTag = getMainTagName(el.tags);
      
      const popupContent = `
        <div style="min-width: 220px;">
          <strong>${typeName || '(Unnamed)'}</strong><br>
          <small>${mainTag}</small><br>
          <small style="color: var(--fg-muted)">${lat.toFixed(5)}, ${lon.toFixed(5)}</small>
          <div class="poi-actions" style="margin-top: 0.5rem;">
            <button class="btn btn-sm" onclick="window.poiViewer_showDetails(${el.id}, '${lat}', '${lon}')">${isEl ? '📋 Λεπτομέρειες' : '📋 Details'}</button>
            <button class="btn btn-sm" onclick="window.poiViewer_prepareMove(${el.id})">${isEl ? '✏️ Μετακίνηση' : '✏️ Move'}</button>
            <button class="btn btn-sm" onclick="window.poiViewer_prepareDelete(${el.id})">${isEl ? '🗑️ Διαγραφή' : '🗑️ Delete'}</button>
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

window.poiViewer_showDetails = function(id, lat, lon) {
  const marker = poiMarkers.find(m => m.data?.id === parseInt(id));
  if (!marker || !localMap) return;

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
        <button class="btn btn-sm" onclick="window.poiViewer_closeDetails()">${isEl ? '❌ Κλείσιμο' : '❌ Close'}</button>
        <button class="btn btn-sm" onclick="window.poiViewer_prepareMove(${id})">${isEl ? '✏️ Μετακίνηση' : '✏️ Move'}</button>
        <button class="btn btn-sm" onclick="window.poiViewer_prepareDelete(${id})">${isEl ? '🗑️ Διαγραφή' : '🗑️ Delete'}</button>
      </div>
    </div>
  `;

  marker.setPopupContent(popupContent);
  marker.openPopup();
};

window.poiViewer_closeDetails = function() {
  if (localMap && localMap._popup) {
    localMap.closePopup();
  }
};

window.poiViewer_prepareMove = function(id) {
  if (!localAppState) return;
  
  const isEl = getCurrentLang() === 'el';
  const msg = isEl 
    ? 'Κάνε κλικ στον χάρτη για νέα θέση.'
    : 'Click on map for new position.';
  
  alert(msg);
  localAppState.poiMoveTargetId = id;
};

window.poiViewer_prepareDelete = function(id) {
  if (!localAppState) return;

  const isEl = getCurrentLang() === 'el';
  const confirmed = confirm(isEl ? 'Επιβεβαίωση διαγραφής;' : 'Confirm deletion?');
  
  if (confirmed) {
    localAppState.poiDeleteTargetId = id;
    alert(isEl ? 'Κάνε κλικ στον χάρτη για επιβεβαίωση.' : 'Click on map to confirm.');
  }
};

window._poi_viewerCleanup = function() {
  if (localMap) {
    poiMarkers.forEach(m => localMap.removeLayer(m));
  }
  poiMarkers = [];
  selectedPoi = null;
  localMap = null;
  localAppState = null;
};

window.initPoiViewer = initPoiViewer;