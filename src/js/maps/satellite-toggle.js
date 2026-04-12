/* === src/js/maps/satellite-toggle.js === */

import { toggleSatellite } from './tiles.js';

export function addSatelliteBtn(mapDiv, mapInstance) {
  if (!mapDiv || !mapInstance) return;
  mapDiv.style.position = 'relative';

  var btn = document.createElement('button');
  btn.className = 'map-sat-btn';
  btn.title = 'Toggle satellite view';
  btn.textContent = 'SAT';
  mapDiv.appendChild(btn);

  btn.onclick = function(e) {
    e.stopPropagation();
    var isSat = toggleSatellite(mapInstance);
    btn.classList.toggle('sat-active', isSat);
    btn.textContent = isSat ? 'MAP' : 'SAT';
  };
}
