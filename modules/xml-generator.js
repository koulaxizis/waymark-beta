/* =========================================================
   WAYMARK — XML Generator Module
   Generate OSM XML / OSC / GPX from manual input.
   ========================================================= */

var xmlGeneratorState = {
  generatedXml: '',
  nodeCount: 0,
  wayCount: 0
};

var xmlNodes = [];
var xmlWays = [];

function initXmlGenerator(map, container, appState) {
  renderXmlGeneratorUI(container);

  function handleMapClick(lat, lng) {
    addXmlNode(lat, lng);
  }

  window.onMapClick_xmlGenerator = handleMapClick;
}

function renderXmlGeneratorUI(container) {
  var isEl = getCurrentLang() === 'el';

  container.innerHTML =
    '<div class="xml-generator-ui">' +
    '  <h3>' + (isEl ? 'Δημιουργία XML' : 'Generate XML') + '</h3>' +
    '  <div class="form-group"><label>' + (isEl ? 'Τύπος:' : 'Type:') + '</label>' +
    '    <select id="xgType" class="form-control">' +
    '      <option value="osm">OSM XML</option>' +
    '      <option value="osc">OSC (Changeset)</option>' +
    '      <option value="gpx">GPX</option>' +
    '    </select>' +
    '  </div>' +
    '  <div class="form-group"><label>' + (isEl ? 'Σχόλιο (για OSC):' : 'Comment (for OSC):') + '</label>' +
    '    <input type="text" id="xgComment" class="form-control" placeholder="' + (isEl ? 'π.χ. add nodes' : 'e.g. add nodes') + '">' +
    '  </div>' +
    '  <button id="xgGenerateBtn" class="btn btn-success">📄 ' + (isEl ? 'Δημιουργία XML' : 'Generate XML') + '</button>' +
    '  <button id="xgDownloadBtn" class="btn btn-primary" disabled>📥 ' + (isEl ? 'Κατέβασμα' : 'Download') + '</button>' +
    '  <button id="xgClearBtn" class="btn btn-danger">🗑️ ' + (isEl ? 'Καθαρισμός' : 'Clear') + '</button>' +
    '  <hr>' +
    '  <div id="xgStats" class="note-description">' + (isEl ? '0 nodes, 0 ways' : '0 nodes, 0 ways') + '</div>' +
    '  <div id="xgPreview" style="background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:0.5rem;font-family:monospace;font-size:0.75rem;max-height:200px;overflow:auto;margin-top:0.5rem;white-space:pre-wrap;"></div>' +
    '</div>';

  document.getElementById('xgGenerateBtn').addEventListener('click', generateXml);
  document.getElementById('xgDownloadBtn').addEventListener('click', downloadXml);
  document.getElementById('xgClearBtn').addEventListener('click', clearXmlGenerator);
}

function addXmlNode(lat, lng) {
  var id = -1 - xmlNodes.length;
  xmlNodes.push({ id: id, lat: lat, lon: lng, tags: {} });
  xmlGeneratorState.nodeCount = xmlNodes.length;
  updateXmlStats();
  showNotification(getCurrentLang() === 'el' ? 'Node προστέθηκε (' + xmlNodes.length + ')' : 'Node added (' + xmlNodes.length + ')', 'info');
}

function generateXml() {
  var type = document.getElementById('xgType').value;
  var isEl = getCurrentLang() === 'el';

  if (xmlNodes.length === 0 && xmlWays.length === 0) {
    alert(isEl ? 'Πρόσθεσε nodes (κλικ στο χάρτη)' : 'Add nodes first (click on map)');
    return;
  }

  var xml = '';

  if (type === 'osm') {
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<osm version="0.6" generator="Waymark">\n';
    xmlNodes.forEach(function (n) {
      xml += '  <node id="' + n.id + '" lat="' + n.lat + '" lon="' + n.lon + '" version="1">\n';
      Object.keys(n.tags).forEach(function (k) {
        xml += '    <tag k="' + escapeXml(k) + '" v="' + escapeXml(n.tags[k]) + '"/>\n';
      });
      xml += '  </node>\n';
    });
    xmlWays.forEach(function (w) {
      xml += '  <way id="' + w.id + '" version="1">\n';
      w.nodes.forEach(function (ref) {
        xml += '    <nd ref="' + ref + '"/>\n';
      });
      Object.keys(w.tags).forEach(function (k) {
        xml += '    <tag k="' + escapeXml(k) + '" v="' + escapeXml(w.tags[k]) + '"/>\n';
      });
      xml += '  </way>\n';
    });
    xml += '</osm>';
  } else if (type === 'osc') {
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<osmChange version="0.6" generator="Waymark">\n  <create>\n';
    xmlNodes.forEach(function (n) {
      xml += '    <node id="' + n.id + '" lat="' + n.lat + '" lon="' + n.lon + '" version="1">\n';
      Object.keys(n.tags).forEach(function (k) {
        xml += '      <tag k="' + escapeXml(k) + '" v="' + escapeXml(n.tags[k]) + '"/>\n';
      });
      xml += '    </node>\n';
    });
    xmlWays.forEach(function (w) {
      xml += '    <way id="' + w.id + '" version="1">\n';
      w.nodes.forEach(function (ref) {
        xml += '      <nd ref="' + ref + '"/>\n';
      });
      Object.keys(w.tags).forEach(function (k) {
        xml += '      <tag k="' + escapeXml(k) + '" v="' + escapeXml(w.tags[k]) + '"/>\n';
      });
      xml += '    </way>\n';
    });
    xml += '  </create>\n</osmChange>';
  } else if (type === 'gpx') {
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Waymark" xmlns="http://www.topografix.com/GPX/1/1">\n  <trk>\n    <name>Waymark Export</name>\n    <trkseg>\n';
    var now = new Date().toISOString();
    xmlNodes.forEach(function (n) {
      xml += '      <trkpt lat="' + n.lat + '" lon="' + n.lon + '"><time>' + now + '</time></trkpt>\n';
    });
    xml += '    </trkseg>\n  </trk>\n</gpx>';
  }

  xmlGeneratorState.generatedXml = xml;
  document.getElementById('xgPreview').textContent = xml;
  document.getElementById('xgDownloadBtn').disabled = false;
}

function downloadXml() {
  var type = document.getElementById('xgType').value;
  var ext = type === 'gpx' ? 'gpx' : (type === 'osc' ? 'osc' : 'xml');
  var mime = type === 'gpx' ? 'application/gpx+xml' : 'application/xml';
  downloadFile(xmlGeneratorState.generatedXml, 'waymark-export.' + ext, mime);
}

function clearXmlGenerator() {
  xmlNodes = [];
  xmlWays = [];
  xmlGeneratorState = { generatedXml: '', nodeCount: 0, wayCount: 0 };
  document.getElementById('xgPreview').textContent = '';
  document.getElementById('xgDownloadBtn').disabled = true;
  updateXmlStats();
}

function updateXmlStats() {
  var isEl = getCurrentLang() === 'el';
  var stats = document.getElementById('xgStats');
  if (!stats) return;
  stats.textContent = (isEl ? xmlNodes.length + ' nodes, ' + xmlWays.length + ' ways' : xmlNodes.length + ' nodes, ' + xmlWays.length + ' ways');
}

function _xmlGeneratorCleanup() {
  delete window.onMapClick_xmlGenerator;
  xmlNodes = [];
  xmlWays = [];
  xmlGeneratorState = { generatedXml: '', nodeCount: 0, wayCount: 0 };
}

window._xmlGeneratorCleanup = _xmlGeneratorCleanup;