/* WAYMARK - XML Generator Module */

var xmlGenState = {
  points: [],
  polyline: null
};

var XML_SUBTYPES = {
  highway: ['footway', 'path', 'track', 'residential', 'service', 'pedestrian', 'cycleway', 'steps', 'living_street'],
  amenity: ['bench', 'cafe', 'restaurant', 'parking', 'pharmacy', 'school', 'atm', 'post_box'],
  building: ['yes', 'apartments', 'house', 'detached', 'garage', 'shed', 'commercial', 'industrial'],
  leisure: ['park', 'pitch', 'playground', 'swimming_pool', 'garden', 'sports_centre']
};

function getXgMap() {
  return window.appState ? window.appState.map : null;
}

function initXmlGenerator(map, container, appState) {
  renderXmlGenUI(container);
  window.onMapClick_xmlGenerator = function(lat, lng) {
    addXmlPoint(lat, lng);
  };
}

function renderXmlGenUI(container) {
  var isEl = getCurrentLang() === 'el';

  container.innerHTML =
    '<div class="xml-gen-ui">' +
    '  <div class="form-group"><label>' + (isEl ? 'Όνομα:' : 'Name:') + '</label>' +
    '    <input type="text" id="xgName" class="form-control" placeholder="' +
    (isEl ? 'π.χ. Νέο Μονοπάτι' : 'e.g. New Path') + '">' +
    '  </div>' +
    '  <div class="form-group"><label>' + (isEl ? 'Τύπος:' : 'Type:') + '</label>' +
    '    <select id="xgType" class="form-control">' +
    '      <option value="highway">Highway</option>' +
    '      <option value="amenity">Amenity</option>' +
    '      <option value="building">Building</option>' +
    '      <option value="leisure">Leisure</option>' +
    '    </select>' +
    '  </div>' +
    '  <div class="form-group"><label>' + (isEl ? 'Υποτύπος:' : 'Subtype:') + '</label>' +
    '    <input type="text" id="xgSubtype" list="xgSubtypes" class="form-control" placeholder="' +
    (isEl ? 'π.χ. footway' : 'e.g. footway') + '">' +
    '    <datalist id="xgSubtypes"></datalist>' +
    '  </div>' +
    '  <button id="xgAddBtn" class="btn btn-success">➕ ' +
    (isEl ? 'Προσθήκη (κλικ χάρτη)' : 'Add Point (map click)') + '</button>' +
    '  <button id="xgPreviewBtn" class="btn btn-primary">👁️ ' +
    (isEl ? 'Προεπισκόπηση' : 'Preview') + '</button>' +
    '  <button id="xgDownloadBtn" class="btn btn-primary" disabled>📥 ' +
    (isEl ? 'Κατέβασμα XML' : 'Download XML') + '</button>' +
    '  <button id="xgClearBtn" class="btn btn-danger">🗑️ ' +
    (isEl ? 'Καθαρισμός' : 'Clear') + '</button>' +
    '  <hr>' +
    '  <div id="xgInfo" class="note-description">' + (isEl ? 'Κανένα σημείο' : 'No points') + '</div>' +
    '  <div id="xgOutput" style="display:none;">' +
    '    <textarea id="xgXmlText" rows="10" class="form-control" readonly style="font-family:monospace;font-size:0.8rem;"></textarea>' +
    '  </div>' +
    '</div>';

  var typeSel = document.getElementById('xgType');
  if (typeSel) typeSel.addEventListener('change', updateXgSubtypes);

  var addBtn = document.getElementById('xgAddBtn');
  var previewBtn = document.getElementById('xgPreviewBtn');
  var downloadBtn = document.getElementById('xgDownloadBtn');
  var clearBtn = document.getElementById('xgClearBtn');

  if (addBtn) addBtn.addEventListener('click', function() {
    showNotification(getCurrentLang() === 'el' ? 'Κάνε κλικ στον χάρτη' : 'Click on map', 'info');
  });
  if (previewBtn) previewBtn.addEventListener('click', previewXml);
  if (downloadBtn) downloadBtn.addEventListener('click', downloadXml);
  if (clearBtn) clearBtn.addEventListener('click', clearXmlGen);

  updateXgSubtypes();
}

function updateXgSubtypes() {
  var typeEl = document.getElementById('xgType');
  if (!typeEl) return;
  var type = typeEl.value;
  var datalist = document.getElementById('xgSubtypes');
  if (!datalist) return;

  var subtypes = XML_SUBTYPES[type] || [];
  datalist.innerHTML = '';
  subtypes.forEach(function(sub) {
    var option = document.createElement('option');
    option.value = sub;
    datalist.appendChild(option);
  });
}

function addXmlPoint(lat, lng) {
  xmlGenState.points.push({ lat: lat, lng: lng });
  renderXgPolyline();
  updateXgInfo();
}

function renderXgPolyline() {
  var map = getXgMap();
  if (!map) return;

  if (xmlGenState.polyline) {
    map.removeLayer(xmlGenState.polyline);
    xmlGenState.polyline = null;
  }

  if (xmlGenState.points.length >= 2) {
    var latlngs = xmlGenState.points.map(function(p) { return [p.lat, p.lng]; });
    xmlGenState.polyline = L.polyline(latlngs, {
      color: '#6d4aff',
      weight: 3,
      dashArray: '6 4',
      opacity: 0.8
    }).addTo(map);
  } else if (xmlGenState.points.length === 1) {
    xmlGenState.polyline = L.circleMarker([xmlGenState.points[0].lat, xmlGenState.points[0].lng], {
      radius: 6,
      fillColor: '#6d4aff',
      color: 'white',
      weight: 1,
      fillOpacity: 0.8
    }).addTo(map);
  }
}

function updateXgInfo() {
  var isEl = getCurrentLang() === 'el';
  var info = document.getElementById('xgInfo');
  if (!info) return;
  var count = xmlGenState.points.length;
  info.textContent = isEl ? count + ' σημεία' : count + ' points';

  var dlBtn = document.getElementById('xgDownloadBtn');
  var pvBtn = document.getElementById('xgPreviewBtn');
  if (dlBtn) dlBtn.disabled = count === 0;
  if (pvBtn) pvBtn.disabled = count === 0;
}

function buildXml() {
  if (xmlGenState.points.length === 0) return '';

  var nameEl = document.getElementById('xgName');
  var typeEl = document.getElementById('xgType');
  var subEl = document.getElementById('xgSubtype');

  var name = nameEl ? nameEl.value.trim() : '';
  var type = typeEl ? typeEl.value : 'highway';
  var subtype = subEl ? subEl.value.trim() : '';

  var nodesXml = xmlGenState.points.map(function(p, i) {
    var id = -(i + 1);
    return '    <node id="' + id + '" lat="' + p.lat.toFixed(7) + '" lon="' + p.lng.toFixed(7) + '" version="0" />';
  }).join('\n');

  var wayXml = '';
  if (xmlGenState.points.length >= 2) {
    var ndRefs = xmlGenState.points.map(function(p, i) {
      return '      <nd ref="' + (-(i + 1)) + '" />';
    }).join('\n');

    var wayTags = '';
    if (type && subtype) {
      wayTags += '      <tag k="' + escapeXml(type) + '" v="' + escapeXml(subtype) + '" />\n';
    }
    if (name) {
      wayTags += '      <tag k="name" v="' + escapeXml(name) + '" />\n';
    }
    wayTags += '      <tag k="created_by" v="Waymark" />';

    wayXml = '    <way id="-1" version="0">\n' + ndRefs + '\n' + wayTags + '\n    </way>';
  }

  var lats = xmlGenState.points.map(function(p) { return p.lat; });
  var lngs = xmlGenState.points.map(function(p) { return p.lng; });
  var minLat = Math.min.apply(null, lats);
  var maxLat = Math.max.apply(null, lats);
  var minLng = Math.min.apply(null, lngs);
  var maxLng = Math.max.apply(null, lngs);

  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<osm version="0.6" generator="Waymark">\n' +
    '  <bounds minlat="' + minLat + '" minlon="' + minLng + '" maxlat="' + maxLat + '" maxlon="' + maxLng + '" />\n' +
    nodesXml + '\n' +
    wayXml + '\n' +
    '</osm>';
}

function previewXml() {
  var xml = buildXml();
  var output = document.getElementById('xgOutput');
  var textarea = document.getElementById('xgXmlText');
  if (!output || !textarea || !xml) return;
  textarea.value = xml;
  output.style.display = 'block';
}

function downloadXml() {
  var xml = buildXml();
  if (!xml) return;
  var nameEl = document.getElementById('xgName');
  var fileName = (nameEl && nameEl.value.trim()) ? nameEl.value.trim() : 'waymark-export';
  fileName = fileName.replace(/[^a-zA-Z0-9-_]/g, '_');
  downloadFile(xml, fileName + '.osm', 'application/xml');
  showNotification(getCurrentLang() === 'el' ? 'XML κατέβηκε!' : 'XML downloaded!', 'success');
}

function clearXmlGen() {
  var map = getXgMap();
  if (map && xmlGenState.polyline) {
    map.removeLayer(xmlGenState.polyline);
  }
  xmlGenState.points = [];
  xmlGenState.polyline = null;

  var nameEl = document.getElementById('xgName');
  var subEl = document.getElementById('xgSubtype');
  var output = document.getElementById('xgOutput');
  if (nameEl) nameEl.value = '';
  if (subEl) subEl.value = '';
  if (output) output.style.display = 'none';

  updateXgInfo();
}

function _xmlGeneratorCleanup() {
  delete window.onMapClick_xmlGenerator;
  var map = getXgMap();
  if (map && xmlGenState.polyline) {
    map.removeLayer(xmlGenState.polyline);
  }
  xmlGenState = { points: [], polyline: null };
}

window._xmlGeneratorCleanup = _xmlGeneratorCleanup;