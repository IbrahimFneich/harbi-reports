/* === src/js/maps/bayanat-map.js === */

import { addTrackedTileLayer } from './tiles.js';
import { addFullscreenBtn } from './fullscreen.js';
import { addSatelliteBtn } from './satellite-toggle.js';
import { createBorderMap } from './border-renderer.js';
import { loadPlaces, lookupPlace } from './place-registry.js';
import { onTabSwitch } from '../ui/tabs.js';

// Operations map. Counts are derived from each statement's targets[] (the
// canonical, multi-target town list produced by the pipeline) resolved through
// the single place registry (data/places.json) — so the map count for a town
// EQUALS the number of statements that targeted it, identical to the list and
// the dashboard. A statement targeting two towns contributes to both. Recap
// (summary) statements are still counted (a named target is a target) and are
// tagged in the list so the unit is never ambiguous.
export function initBayanatMap() {
  if (typeof L === 'undefined') return;
  var bayanatTab = document.getElementById('bayanat');
  if (!bayanatTab) return;
  var container = bayanatTab.querySelector('.container');
  if (!container) return;
  var data = (window._bayanatData) || [];
  if (!data.length) return;
  if (container.querySelector('.auto-bayan-map')) return;

  var titleDiv = document.createElement('div');
  titleDiv.className = 'siren-map-title';
  titleDiv.textContent = 'خريطة العمليات العسكرية';

  var mapDiv = document.createElement('div');
  mapDiv.id = 'autoBayanMap';
  mapDiv.className = 'auto-bayan-map';

  var dash = container.querySelector('.auto-dashboard');
  var ref = dash || container.querySelector('.phase') || container.firstChild;
  container.insertBefore(titleDiv, ref);
  container.insertBefore(mapDiv, titleDiv.nextSibling);

  var mapInited = false;
  onTabSwitch(function(id) {
    if (id === 'bayanat' && !mapInited) initBayanMap();
  });
  if (bayanatTab.classList.contains('active')) setTimeout(initBayanMap, 300);

  function initBayanMap() {
    if (mapInited) return;
    mapInited = true;
    var map = L.map('autoBayanMap', {
      center: [33.1, 35.4], zoom: 10, zoomControl: true, attributionControl: false
    });
    addTrackedTileLayer(map);
    var div = document.getElementById('autoBayanMap');

    loadPlaces().then(function() {
      // Count statements per canonical town via targets[].
      var counts = {};
      for (var i = 0; i < data.length; i++) {
        var tg = data[i].targets || [];
        for (var j = 0; j < tg.length; j++) {
          var e = lookupPlace(tg[j]);
          if (!e || e.lat == null) continue;
          var name = e.display;
          if (!counts[name]) counts[name] = { lat: e.lat, lng: e.lng, count: 0 };
          counts[name].count++;
        }
      }
      var places = Object.keys(counts).map(function(name) {
        return { name: name, lat: counts[name].lat, lng: counts[name].lng, count: counts[name].count };
      }).sort(function(a, b) { return b.count - a.count; });
      if (!places.length) return;

      createBorderMap(map, div, places, { unit: 'استهداف' });
      setTimeout(function() { map.invalidateSize(); }, 200);
      addFullscreenBtn(div, map);
      addSatelliteBtn(div, map);
    });
  }
}
