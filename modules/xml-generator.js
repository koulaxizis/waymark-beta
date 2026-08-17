/* =========================================================
   WAYMARK — XML Generator Module
   Creates .osc files for OSM uploads.
   ========================================================= */

let uploadedGPXData = null;

function initXmlGenerator(map, container, appState) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
    <div class="module-form">
      <div class="form-group">
        <label>${isEl ? 'Όνομα αρχείου' : 'File name'}</label>
        <input type="text" id="xmlFileName" placeholder="changeset" value="changeset">
      </div>
      <div class="form-group">
        <label>${isEl ? 'Στοιχεία δημιουργού' : 'Creator info'}</label>
        <input type="text" id="xmlCreator" placeholder="Waymark" value="Waymark">
      </div>
      <div class="form-group">
        <label>${isEl ? 'Σχόλιο' : 'Comment'}</label>
        <textarea id="xmlComment" rows="2" placeholder="${isEl ? 'Περιγραφή αλλαγών...' : 'Changes description...'}"></textarea>
      </div>
      <div class="form-group">
        <label>${isEl ? 'Τύπος αλλαγής' : 'Change type'}</label>
        <select id="xmlChangeType">
          <option value="create">${isEl ? 'Δημιουργία (create)' : 'Create'}</option>
          <option value="modify">${isEl ? 'Τροποποίηση (modify)' : 'Modify'}</option>
          <option value="delete">${isEl ? 'Διαγραφή (delete)' : 'Delete'}</option>
        </select>
      </div>
      <div class="form-group">
        <label>${isEl ? 'Nodes' : 'Nodes'}</label>
        <input type="number" id="nodeCount" value="0" readonly>
      </div>
      <div class="form-group">
        <label>${isEl ? 'Ways' : 'Ways'}</label>
        <input type="number" id="wayCount" value="0" readonly>
      </div>
      <div class="form-group">
        <label>${isEl ? 'Relations' : 'Relations'}</label>
        <input type="number" id="relCount" value="0" readonly>
      </div>
      <button class="btn" id="generateXMLBtn">${isEl ? '📄 Δημιουργία XML' : '📄 Generate XML'}</button>
      <a id="downloadLink" class="btn btn-secondary" style="display:none; text-decoration:none;">⬇️ ${isEl ? 'Λήψη' : 'Download'}</a>
    </div>
  `;

  document.getElementById('generateXMLBtn').addEventListener('click', generateOSCFile);
  
  // Initial count update
  updateCount();
}

// Fix #15: Check element exists before updating
function updateCount() {
  const nodeInput = document.getElementById('nodeCount');
  const wayInput = document.getElementById('wayCount');
  const relInput = document.getElementById('relCount');
  
  if (nodeInput) nodeInput.value = uploadedGPXData?.nodes?.length || 0;
  if (wayInput) wayInput.value = uploadedGPXData?.ways?.length || 0;
  if (relInput) relInput.value = uploadedGPXData?.relations?.length || 0;
}

function generateOSCFile() {
  const isEl = getCurrentLang() === 'el';
  
  const fileName = document.getElementById('xmlFileName').value || 'changeset';
  const creator = document.getElementById('xmlCreator').value || 'Waymark';
  const comment = document.getElementById('xmlComment').value || '';
  const changeType = document.getElementById('xmlChangeType').value;

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<osmChange version="0.3" generator="${creator}" comment="${comment}">\n`;
  xml += `  <${changeType}>\n`;
  
  // Add nodes from GPX or sample
  if (uploadedGPXData?.nodes) {
    uploadedGPXData.nodes.forEach(node => {
      xml += `    <node id="${node.id}" lat="${node.lat}" lon="${node.lon}" version="1">\n`;
      if (node.tags) {
        Object.entries(node.tags).forEach(([k, v]) => {
          xml += `      <tag k="${k}" v="${v}" />\n`;
        });
      }
      xml += `    </node>\n`;
    });
  }

  // Add ways from GPX or sample
  if (uploadedGPXData?.ways) {
    uploadedGPXData.ways.forEach(way => {
      xml += `    <way id="${way.id}" version="1">\n`;
      way.nodes.forEach(nid => {
        xml += `      <nd ref="${nid}" />\n`;
      });
      if (way.tags) {
        Object.entries(way.tags).forEach(([k, v]) => {
          xml += `      <tag k="${k}" v="${v}" />\n`;
        });
      }
      xml += `    </way>\n`;
    });
  }

  xml += `  </${changeType}>\n`;
  xml += '</osmChange>';

  // Download
  const blob = new Blob([xml], { type: 'application/osmchang+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.getElementById('downloadLink');
  link.href = url;
  link.download = `${fileName}.osc`;
  link.style.display = 'block';
  link.textContent = `⬇️ ${isEl ? 'Λήψη' : 'Download'}`;

  updateCount();
}

window.initXmlGenerator = initXmlGenerator;