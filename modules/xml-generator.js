/* =========================================================
   WAYMARK — XML Generator Module
   Creates .osc (OSM Change) files from map markers.
   Client-side only. Output uploaded manually to OSM.
   ========================================================= */

function initXmlGenerator(map, container, appState) {
  const isEl = getCurrentLang() === 'el';

  container.innerHTML = `
    <h2>📝 ${t('module.xml_generator')}</h2>
    <div class="module-form">
      <div class="form-group">
        <label for="xmlComment">${t('osm.changeset_comment')}</label>
        <input type="text" id="xmlComment" value="Added via Waymark" />
      </div>
      <div class="form-group">
        <label>${isEl ? 'Tags ανά σημείο' : 'Tags per point'}</label>
        <div id="xmlTagRows"></div>
        <button class="btn btn-secondary" id="xmlAddTag" style="padding: 0.4rem; font-size: 0.8rem;">+ ${isEl ? 'Προσθήκη tag' : 'Add tag'}</button>
      </div>
      <button class="btn" id="xmlDownloadBtn">${t('osm.download_osc')}</button>
      <div class="results-list" id="xmlInfo">
        <div class="result-item" style="cursor: default; opacity: 0.6;">
          ${isEl ? 'Σημεία στον χάρτη:' : 'Points on map:'} <span id="xmlPointCount">0</span>
        </div>
      </div>
    </div>
  `;

  let tagRows = [{ key: 'name', value: '' }];
  renderTagRows();

  function renderTagRows() {
    const div = document.getElementById('xmlTagRows');
    div.innerHTML = '';
    tagRows.forEach((row, idx) => {
      const rowEl = document.createElement('div');
      rowEl.style.cssText = 'display: flex; gap: 0.25rem; margin-bottom: 0.25rem;';
      rowEl.innerHTML = `
        <input type="text" placeholder="key" value="${row.key}" style="flex:1; background:var(--bg); border:1px solid var(--border); color:var(--fg); padding:0.3rem; font-size:0.8rem;" data-tag-key="${idx}">
        <input type="text" placeholder="value" value="${row.value}" style="flex:1; background:var(--bg); border:1px solid var(--border); color:var(--fg); padding:0.3rem; font-size:0.8rem;" data-tag-val="${idx}">
        <button class="btn btn-danger" style="padding:0.3rem 0.5rem; font-size:0.8rem;" data-tag-del="${idx}">×</button>
      `;
      div.appendChild(rowEl);

      rowEl.querySelector(`[data-tag-key="${idx}"]`).addEventListener('input', (e) => { tagRows[idx].key = e.target.value; });
      rowEl.querySelector(`[data-tag-val="${idx}"]`).addEventListener('input', (e) => { tagRows[idx].value = e.target.value; });
      rowEl.querySelector(`[data-tag-del="${idx}"]`).addEventListener('click', () => {
        tagRows.splice(idx, 1);
        renderTagRows();
      });
    });
  }

  document.getElementById('xmlAddTag').addEventListener('click', () => {
    tagRows.push({ key: '', value: '' });
    renderTagRows();
  });

  function updateCount() {
    document.getElementById('xmlPointCount').textContent = appState.mapMarkers.length;
  }
  updateCount();
  const interval = setInterval(updateCount, 500);

  document.getElementById('xmlDownloadBtn').addEventListener('click', () => {
    if (appState.mapMarkers.length === 0) {
      alert(t('osm.no_points'));
      return;
    }

    const comment = document.getElementById('xmlComment').value || 'Added via Waymark';
    const xml = generateOsc(appState.mapMarkers, comment, tagRows);

    downloadFile(xml, 'waymark-export.osc', 'application/xml');

    document.getElementById('xmlInfo').innerHTML =
      '<div class="result-item" style="color: var(--success);">' +
      '✅ <code>waymark-export.osc</code><br>' +
      (isEl ? 'Άνοιξέ το στο JOSM (File → Open) ή σύρε στο παράθυρο, έπειτα Upload.' : 'Open in JOSM (File → Open) or drag into window, then Upload.') +
      '</div>';
  });

  function generateOsc(markers, comment, tags) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<osmChange version="0.6" generator="Waymark">\n';
    xml += '  <create>\n';

    markers.forEach((marker, idx) => {
      const pos = marker.getLatLng();
      const id = -(idx + 1);

      xml += '    <node id="' + id + '" version="0" lat="' + pos.lat.toFixed(7) + '" lon="' + pos.lng.toFixed(7) + '">\n';

      tags.forEach(tag => {
        if (tag.key && tag.value) {
          xml += '      <tag k="' + escapeXml(tag.key) + '" v="' + escapeXml(tag.value) + '"/>\n';
        }
      });

      xml += '      <tag k="source" v="Waymark"/>\n';
      xml += '    </node>\n';
    });

    xml += '  </create>\n  <modify/>\n  <delete/>\n</osmChange>';
    return xml;
  }
}

window.initXmlGenerator = initXmlGenerator;