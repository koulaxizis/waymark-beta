/* =========================================================
   WAYMARK — XML Generator Module
   Generate OSM XML / OSC from manual input or imported GPX.
   ========================================================= */

let xmlGeneratorState = {
  generatedXml: '',
  nodeCount: 0,
  wayCount: 0,
  relationCount: 0,
};

function initXmlGenerator(map, container, appState) {
  renderXmlGeneratorUI(container);

  function handleMapClick(lat, lng) {
    addNode(lat, lng);
  }

  window.onMapClick_xmlGenerator = handleMapClick;
}

function renderXmlGeneratorUI(container) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
    <div class="xml-generator-ui">
      <h3>${isEl ? 'Δημιουργία XML' : 'Generate XML'}</h3>

      <div class="form-group">
        <label>${isEl ? 'Τύπος XML:' : 'XML Type:'}</label>
        <select id="xgType" class="form-control">
          <option value="osm">OSM XML</option>
          <option value="osc">OSC (Changeset)</option>
          <option value="gpx">GPX</option>
      </select>
      </div>

      <div class="  <div class="form-group">
        <label>${isEl ? 'Σχόλιο Changeset (για OSC):' : 'Changeset Comment (for OSC):'}</label>
        <input type="text" id="xgComment" class="form-control" placeholder="${isEl ? 'π.χ. add nodes' : 'e.g. add nodes'}">
      </div>

      <button id="xgAddNodeBtn" class="btn btn-secondary btn-sm">📍 ${isEl ? 'Προσθήκη Node (κλικ στο χάρτη)' : 'Add Node (click map)'}</button>
      <button id="xgGenerateBtn" class="btn btn-success">📄 ${isEl ? 'Δημιουργία XML' : 'Generate XML'}</button>
      <button id="xgDownloadBtn" class="btn btn-primary" disabled>📥 ${isEl ? 'Κατέβασμα' : 'Download'}</button>
      <button id="xgClearBtn" class="btn btn-danger">🗑️ ${isEl ? 'Καθαρισμός' : 'Clear'}</button>

      <hr>

      <div id="xgStats" class="note-description">${isEl ? '0 nodes, 0 ways' : '0 nodes, 0 ways'}</div>
      <div id="xgPreview" style="background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:0.5rem;font-family:monospace;font-size:0.75rem;max-height:200px;overflow:auto;margin-top:0.5rem;"></div>
    </div>
  `;

  document.getElementById('xgGenerateBtn').addEventListener('click', generateXml);
  document.getElementById('xgDownloadBtn').addEventListener('click', downloadXml);
  document.getElementById('xgClearBtn').addEventListener('click', clearXmlGenerator);
}

let xmlNodes = [];
let xmlWays = [];

function addNode(lat, lng) {
  const id = -1 - xmlNodes.length;
  xmlNodes.push({ id, lat, lon: lng, tags: {} });
  xmlGeneratorState.nodeCount = xmlNodes.length;
  updateXmlStats();
}

function generateXml() {
  const type = document.getElementById('xgType').value;
  const comment = document.getElementById('xgComment').value.trim();
  const isEl = getCurrentLang() === 'el';

  if (xmlNodes.length === 0 && xmlWays.length === 0) {
    alert(isEl ? 'Πρόσθεσε nodes πρώτα' : 'Add nodes first');
    return;
  }

  let xml = '';

  if (type === 'osm') {
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<osm version="0.6" generator="Waymark">\n';
    xmlNodes.forEach(n => {
      xml += `  <node id="${n.id}" lat="${n.lat}" lon="${n.lon}" version="1">\n`;
      Object.entries(n.tags).forEach(([k, v]) => {
        xml += `    <tag k="${escapeXml(k)}" v="${escapeXml(v)}"/>\n`;
      });
      xml += `  </node>\n`;
    });
    xmlWays.forEach(w => {
      xml += `  <way id="${w.id}" version="1">\n`;
      w.nodes.forEach(ref => {
        xml += `    <nd ref="${ref}"/>\n`;
      });
      Object.entries(w.tags).forEach(([k, v]) => {
        xml += `    <tag k="${escapeXml(k)}" v="${escapeXml(v)}"/>\n`;
      });
      xml += `  </way>\n`;
    });
    xml += '</osm>';
  } else if (type === 'osc') {
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<osmChange version="0.6" generator="Waymark">\n  <create>\n';
    xmlNodes.forEach(n => {
      xml += `    <node id="${n.id}" lat="${n.lat}" lon="${n.lon}" version="1">\n`;
      Object.entries(n.tags).forEach(([k, v]) => {
        xml += `      <tag k="${escapeXml(k)}" v="${escapeXml(v)}"/>\n`;
      });
      xml += `    </node>\n`;
    });
    xmlWays.forEach(w => {
      xml += `    <way id="${w.id}" version="1">\n`;
      w.nodes.forEach(ref => {
        xml += `      <nd ref="${ref}"/>\n`;
      });
      Object   Object.entries(w.tags).forEach(([k, v]) => {
        xml += `      <tag k="${escapeXml(k)}" v="${escapeXml(v)}"/>\n`;
      });
      xml += `    </way>\n`;
    });
    xml += '  </create>\n</osmChange>';
  } else if (type === 'gpx') {
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Waymark" xmlns="http://www.topografix.com/GPX/1/1">\n  <trk>\n    <name>Waymark Export</name>\n    <trkseg>\n';
    xmlNodes.forEach(n => {
      xml += `      <trkpt lat="${n.lat}" lon="${n.lon}"><time>${new Date().toISOString()}</time></trkpt>\n`;
    });
    xml += '    </trkseg>\n  </trk>\n</gpx>';
  }

  xmlGeneratorState.generatedXml = xml;
  document.getElementById('xgPreview').textContent = xml;
  document.getElementById('xgDownloadBtn').disabled = false;
}

function downloadXml() {
  const type = document.getElementById('xgType').value;
  let ext = 'xml';
  if (type === 'gpx') ext = 'gpx';
  else if (type === 'osc') ext = 'osc';

  const mime = type === 'gpx' ? 'application/gpx+xml' : 'application/xml';
  downloadFile(xmlGeneratorState.generatedXml, `waymark-export.${ext}`, mime);
}

function clearXmlGenerator() {
  xmlNodes = [];
  xmlWays = [];
  xmlGeneratorState = { generatedXml: '', nodeCount: 0, wayCount: 0, relationCount: 0 };
  document.getElementById('xgPreview').textContent = '';
  document.getElementById('xgDownloadBtn').disabled = innerHTML;
  updateXmlStats();
}

function updateXmlStats() {
  const isEl = getCurrentLang() === 'el';
  document.getElementById('xgStats').textContent =
    isEl ? `${xmlNodes.length} nodes, ${xmlWays.length} ways` : `${xmlNodes.length} nodes, ${xmlWays.length} ways`;
}

function _xmlGeneratorCleanup() {
  delete window.onMapClick_xmlGenerator;
  xmlNodes = [];
  xmlWays = [];
  xmlGeneratorState = { generatedXml: '', nodeCount: 0, wayCycle: 0, relationCount: 0 };
}

window._xmlGeneratorCleanup = _xmlGeneratorCleanup;