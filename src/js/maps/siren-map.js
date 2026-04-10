/* === src/js/maps/siren-map.js === */

import { addTrackedTileLayer } from './tiles.js';
import { addFullscreenBtn } from './fullscreen.js';

// ── Siren map (Leaflet) ────────────────────────────────

export function initSirenMap() {
  window._mapInited = true;
  var sirenMap = L.map('sirenMap', {
    center: [32.5, 35.0], zoom: 8, zoomControl: true, attributionControl: false
  });

  if (typeof addTrackedTileLayer === 'function') {
    addTrackedTileLayer(sirenMap);
  } else {
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 15 }).addTo(sirenMap);
  }

  var sirenRows = document.querySelectorAll('#sirens .siren-row');

  window._sirenPoints.forEach(function(pt) {
    var radius = 6 + Math.min(pt.count * 2, 14);
    var opacity = 0.5 + Math.min(pt.count * 0.06, 0.4);

    var marker = L.circleMarker([pt.lat, pt.lng], {
      radius: radius, fillColor: '#e74c3c', fillOpacity: opacity,
      color: '#e74c3c', weight: 2, className: 'siren-pulse'
    }).addTo(sirenMap);

    // Build popup HTML from trusted JSON data
    var popupParts = ['<div style="text-align:right;direction:rtl;min-width:120px;">'];
    popupParts.push('<div style="font-weight:800;font-size:0.9rem;color:#e74c3c;margin-bottom:4px;">');
    popupParts.push(pt.loc);
    popupParts.push('</div>');
    popupParts.push('<div style="font-size:0.72rem;color:#6b7d92;margin-bottom:6px;">');
    popupParts.push(pt.count + ' \u0635\u0641\u0627\u0631\u0629</div>');
    for (var ti = 0; ti < pt.times.length; ti++) {
      popupParts.push('<div style="font-size:0.75rem;padding:2px 0;"><span class="popup-time">');
      popupParts.push(pt.times[ti]);
      popupParts.push('</span></div>');
    }
    popupParts.push('</div>');
    marker.bindPopup(popupParts.join(''), { closeButton: false, offset: [0, -5] });

    marker.on('mouseover', function() {
      this.openPopup();
      this.setStyle({ fillOpacity: 1, weight: 3, radius: radius + 3 });
      sirenRows.forEach(function(row) {
        var loc = row.querySelector('.s-loc');
        if (loc && loc.textContent.indexOf(pt.loc) !== -1) {
          row.classList.add('highlighted');
        }
      });
    });

    marker.on('mouseout', function() {
      this.closePopup();
      this.setStyle({ fillOpacity: opacity, weight: 2, radius: radius });
      sirenRows.forEach(function(row) { row.classList.remove('highlighted'); });
    });

    marker.on('click', function() {
      sirenRows.forEach(function(row) {
        var loc = row.querySelector('.s-loc');
        if (loc && loc.textContent.indexOf(pt.loc) !== -1) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          row.classList.add('highlighted');
          setTimeout(function() { row.classList.remove('highlighted'); }, 2000);
        }
      });
    });
  });

  // Count labels for high-density points
  window._sirenPoints.forEach(function(pt) {
    if (pt.count >= 3) {
      var countEl = document.createElement('div');
      countEl.style.cssText = 'background:rgba(231,76,60,0.85);color:#fff;font-size:0.6rem;font-weight:800;padding:1px 5px;border-radius:6px;font-family:sans-serif;white-space:nowrap;text-align:center;';
      countEl.textContent = pt.count;
      var icon = L.divIcon({ className: '', html: countEl.outerHTML, iconSize: [20, 16], iconAnchor: [10, -8] });
      L.marker([pt.lat, pt.lng], { icon: icon, interactive: false }).addTo(sirenMap);
    }
  });

  setTimeout(function() { sirenMap.invalidateSize(); }, 200);
  if (typeof addFullscreenBtn === 'function') addFullscreenBtn(document.getElementById('sirenMap'), sirenMap);
}
