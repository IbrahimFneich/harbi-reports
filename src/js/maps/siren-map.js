/* === src/js/maps/siren-map.js === */

import { addTrackedTileLayer } from './tiles.js';
import { addFullscreenBtn } from './fullscreen.js';
import { addSatelliteBtn } from './satellite-toggle.js';
import { createBorderMap } from './border-renderer.js';

// ── Siren map (Leaflet) ────────────────────────────────

export function initSirenMap() {
  window._mapInited = true;
  var sirenMap = L.map('sirenMap', {
    center: [32.5, 35.0], zoom: 8, zoomControl: true, attributionControl: false
  });
  addTrackedTileLayer(sirenMap);

  var points = window._sirenPoints || [];
  var places = points.map(function(pt) {
    return { name: pt.loc, lat: pt.lat, lng: pt.lng, count: pt.count };
  });

  var div = document.getElementById('sirenMap');
  createBorderMap(sirenMap, div, places, { unit: '\u0625\u0646\u0630\u0627\u0631' });

  setTimeout(function() { sirenMap.invalidateSize(); }, 200);
  addFullscreenBtn(div, sirenMap);
  addSatelliteBtn(div, sirenMap);
}
