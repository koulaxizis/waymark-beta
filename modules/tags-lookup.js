/* =========================================================
   WAYMARK — Tags Reference Module
   Built-in OSM tag reference. No API calls. Works offline.
   ========================================================= */

const TAGS_DATABASE = {
  amenity: {
    label: 'Amenity',
    description: 'Public facilities and services',
    values: [
      { v: 'cafe', desc: 'Coffee shop / café' },
      { v: 'restaurant', desc: 'Place serving meals' },
      { v: 'bar', desc: 'Bar / pub' },
      { v: 'fast_food', desc: 'Fast food restaurant' },
      { v: 'pharmacy', desc: 'Pharmacy / drugstore' },
      { v: 'hospital', desc: 'Hospital' },
      { v: 'clinic', desc: 'Medical clinic' },
      { v: 'school', desc: 'School / educational institution' },
      { v: 'university', desc: 'University' },
      { v: 'library', desc: 'Library' },
      { v: 'fuel', desc: 'Fuel / petrol station' },
      { v: 'parking', desc: 'Parking lot' },
      { v: 'atm', desc: 'ATM / cash machine' },
      { v: 'bank', desc: 'Bank' },
      { v: 'post_office', desc: 'Post office' },
      { v: 'police', desc: 'Police station' },
      { v: 'fire_station', desc: 'Fire station' },
      { v: 'toilets', desc: 'Public toilets' },
      { v: 'drinking_water', desc: 'Drinking water source' },
      { v: 'bench', desc: 'Public bench' },
      { v: 'waste_basket', desc: 'Trash can' },
      { v: 'place_of_worship', desc: 'Church, mosque, temple, etc.' },
    ]
  },
  shop: {
    label: 'Shop',
    description: 'Retail stores and businesses',
    values: [
      { v: 'supermarket', desc: 'Supermarket / grocery' },
      { v: 'convenience', desc: 'Convenience store' },
      { v: 'bakery', desc: 'Bakery' },
      { v: 'butcher', desc: 'Butcher shop' },
      { v: 'clothes', desc: 'Clothing store' },
      { v: 'electronics', desc: 'Electronics store' },
      { v: 'hardware', desc: 'Hardware / DIY store' },
      { v: 'books', desc: 'Bookstore' },
      { v: 'mobile_phone', desc: 'Mobile phone shop' },
      { v: 'hairdresser', desc: 'Hair salon / barber' },
    ]
  },
  highway: {
    label: 'Highway',
    description: 'Roads and paths',
    values: [
      { v: 'residential', desc: 'Residential road' },
      { v: 'primary', desc: 'Primary road' },
      { v: 'secondary', desc: 'Secondary road' },
      { v: 'tertiary', desc: 'Tertiary road' },
      { v: 'footway', desc: 'Pedestrian path' },
      { v: 'cycleway', desc: 'Cycle path' },
      { v: 'pedestrian', desc: 'Pedestrian zone' },
      { v: 'bus_stop', desc: 'Bus stop' },
      { v: 'crossing', desc: 'Pedestrian crossing' },
    ]
  },
  tourism: {
    label: 'Tourism',
    description: 'Tourism-related features',
    values: [
      { v: 'hotel', desc: 'Hotel' },
      { v: 'motel', desc: 'Motel' },
      { v: 'hostel', desc: 'Hostel' },
      { v: 'museum', desc: 'Museum' },
      { v: 'attraction', desc: 'Tourist attraction' },
      { v: 'viewpoint', desc: 'Scenic viewpoint' },
      { v: 'information', desc: 'Information center' },
      { v: 'picnic_site', desc: 'Picnic area' },
    ]
  },
  leisure: {
    label: 'Leisure',
    description: 'Recreation and leisure facilities',
    values: [
      { v: 'park', desc: 'Public park' },
      { v: 'playground', desc: 'Children playground' },
      { v: 'sports_centre', desc: 'Sports centre' },
      { v: 'swimming_pool', desc: 'Swimming pool' },
      { v: 'pitch', desc: 'Sports pitch / field' },
      { v: 'garden', desc: 'Garden / allotment' },
    ]
  },
  building: {
    label: 'Building',
    description: 'Building structures',
    values: [
      { v: 'yes', desc: 'Generic building' },
      { v: 'apartments', desc: 'Apartment building' },
      { v: 'house', desc: 'Detached house' },
      { v: 'detached', desc: 'Single-family house' },
      { v: 'commercial', desc: 'Commercial building' },
      { v: 'industrial', desc: 'Industrial building' },
      { v: 'school', desc: 'School building' },
      { v: 'church', desc: 'Church building' },
    ]
  },
  natural: {
    label: 'Natural',
    description: 'Natural features',
    values: [
      { v: 'tree', desc: 'Individual tree' },
      { v: 'water', desc: 'Body of water' },
      { v: 'wood', desc: 'Forest / woods' },
      { v: 'peak', desc: 'Mountain peak' },
      { v: 'spring', desc: 'Natural spring' },
      { v: 'cliff', desc: 'Cliff' },
    ]
  },
};

function initTagsLookup(map, container, appState) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
    <h2>🏷️ ${t('module.tags_lookup')}</h2>
    <div class="module-form">
      <div class="form-group">
        <label for="tagSearch">${isEl ? 'Αναζήτηση tag' : 'Search tags'}</label>
        <input type="text" id="tagSearch" placeholder="${isEl ? 'π.χ. cafe, parking...' : 'e.g. cafe, parking...'}" />
      </div>
      <div class="results-list" id="tagResults" style="max-height: 350px;"></div>
    </div>
  `;

  function renderTags(filter) {
    const resultsDiv = document.getElementById('tagResults');
    resultsDiv.innerHTML = '';

    Object.entries(TAGS_DATABASE).forEach(([category, data]) => {
      const matching = filter
        ? data.values.filter(v => v.v.includes(filter) || v.desc.toLowerCase().includes(filter.toLowerCase()))
        : data.values;

      if (matching.length === 0) return;

      const catDiv = document.createElement('div');
      catDiv.className = 'result-item';
      catDiv.style.cssText = 'cursor: default; padding: 0.75rem 0.5rem;';
      catDiv.innerHTML = '<strong style="color: var(--accent);">' + category + '</strong><br><small style="opacity:0.6;">' + data.description + '</small>';
      resultsDiv.appendChild(catDiv);

      matching.forEach(val => {
        const item = document.createElement('div');
        item.className = 'result-item';
        item.style.cursor = 'pointer';
        item.innerHTML = '<code style="color: var(--accent);">' + category + '=' + val.v + '</code><br><small>' + val.desc + '</small>';
        catDiv.appendChild(item);
      });
    });
  }

  renderTags('');

  document.getElementById('tagSearch').addEventListener('input', (e) => {
    renderTags(e.target.value.trim());
  });
}

window.initTagsLookup = initTagsLookup;