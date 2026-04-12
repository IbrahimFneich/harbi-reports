/* === src/js/maps/border-renderer.js === */
/**
 * Shared renderer for the siren & bayanat maps.
 *
 * Replaces the legacy circle-marker "dots" with real OSM admin polygons
 * (from data/borders.json, pre-baked by src/python/fetch_borders.py) and
 * a deterministic synthesized fallback for villages that OSM doesn't know
 * about. Also attaches a slide-in drawer panel with legend + location list,
 * and a POLY/DOT mode toggle button so viewers can flip between the two
 * renderings on demand.
 *
 * Public API:
 *   createBorderMap(map, mapDiv, places, opts)
 *     map      — existing L.Map instance
 *     mapDiv   — the map container element (for absolute-positioned UI)
 *     places   — [{ name, lat, lng, count }]
 *     opts     — { unit: 'عملية' | 'إنذار', title: string }
 */

// Shared cache so every map on the page only downloads borders.json once.
var _bordersPromise = null;
function loadBorders() {
  if (_bordersPromise) return _bordersPromise;
  var candidates = ['data/borders.json', '../data/borders.json', './data/borders.json'];
  _bordersPromise = (function tryNext(i) {
    if (i >= candidates.length) return Promise.resolve({});
    return fetch(candidates[i])
      .then(function(r){ return r.ok ? r.json() : tryNext(i + 1); })
      .catch(function(){ return tryNext(i + 1); });
  })(0);
  return _bordersPromise;
}

// ── Color ramp by count ──────────────────────────────────────────────
function colorFor(c) {
  if (c >= 7) return '#e74c3c';
  if (c >= 4) return '#e67e22';
  if (c >= 2) return '#f1c40f';
  return '#2ecc71';
}
function opacityFor(c) {
  return 0.35 + Math.min(c, 10) * 0.04;
}

// ── Synthetic polygon (deterministic from lat/lng) ───────────────────
function synthesizePolygon(lat, lon, count) {
  var baseR = 0.0095 + Math.min(count, 8) * 0.0008;
  var verts = 20;
  var ring = [];
  var seed = Math.abs(Math.sin(lat * 1000 + lon * 1000)) * 1000;
  function rand() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  for (var a = 0; a < verts; a++) {
    var theta = (a / verts) * Math.PI * 2;
    var j = 0.82 + rand() * 0.36;
    ring.push([lon + baseR * j * Math.cos(theta), lat + baseR * 0.88 * j * Math.sin(theta)]);
  }
  ring.push(ring[0]);
  return { type: 'Polygon', coordinates: [ring] };
}

// ── Individual renderers ─────────────────────────────────────────────
function renderPolygon(map, geojson, place, color) {
  var layer = L.geoJSON(geojson, {
    style: {
      color: color,
      weight: 2,
      fillColor: color,
      fillOpacity: opacityFor(place.count),
      opacity: 0.9
    }
  }).addTo(map);
  attachLabel(layer, place, color);
  return layer;
}
function renderDot(map, place, color) {
  var radius = 5 + Math.min(place.count * 3, 16);
  var marker = L.circleMarker([place.lat, place.lng], {
    radius: radius,
    fillColor: color, fillOpacity: 0.65,
    color: color, weight: 2
  }).addTo(map);
  attachLabel(marker, place, color);
  return marker;
}
function attachLabel(layer, place, color) {
  var html = '<div class="poly-label" style="border-color:' + color + '66;">'
           + escapeHtml(place.name)
           + '<span class="c">' + place.count + '</span></div>';
  layer.bindTooltip(html, {
    permanent: true, direction: 'center', className: 'poly-wrap', opacity: 1
  });
  layer.on('mouseover', function() {
    if (this.setStyle) {
      try {
        this.setStyle({
          weight: 3,
          fillOpacity: Math.min(1, opacityFor(place.count) + 0.2)
        });
      } catch (e) { /* markers without style don't care */ }
    }
  });
  layer.on('mouseout', function() {
    if (this.setStyle) {
      try {
        this.setStyle({ weight: 2, fillOpacity: opacityFor(place.count) });
      } catch (e) { /* ignore */ }
    }
  });
}
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Dispatcher: renders one place in the currently active mode.
function renderOne(map, place, mode, borders) {
  var color = colorFor(place.count);
  if (mode === 'dots') return renderDot(map, place, color);
  var entry = borders && borders[place.name];
  if (entry && entry.geojson) {
    return renderPolygon(map, entry.geojson, place, color);
  }
  return renderPolygon(map, synthesizePolygon(place.lat, place.lng, place.count), place, color);
}

// ── Drawer + mode button ─────────────────────────────────────────────
function attachDrawer(mapDiv, places, state, redraw, opts) {
  var unit = (opts && opts.unit) || 'عملية';

  // Drawer — floats over the left edge of the map, absolute-positioned
  // inside mapDiv so it's scoped to this map only.
  var drawer = document.createElement('div');
  drawer.className = 'map-drawer';

  var hLegend = document.createElement('h3');
  hLegend.textContent = 'Intensity (\u0639\u062F\u062F \u0627\u0644\u0623\u062D\u062F\u0627\u062B)';
  drawer.appendChild(hLegend);
  [
    ['#2ecc71', '1'],
    ['#f1c40f', '2\u20133'],
    ['#e67e22', '4\u20136'],
    ['#e74c3c', '7+']
  ].forEach(function(row) {
    var r = document.createElement('div');
    r.className = 'legend-row';
    var sw = document.createElement('span');
    sw.className = 'sw';
    sw.style.background = row[0];
    var lbl = document.createElement('span');
    lbl.textContent = row[1] + ' ' + unit;
    r.appendChild(sw); r.appendChild(lbl);
    drawer.appendChild(r);
  });

  var hLocs = document.createElement('h3');
  hLocs.style.marginTop = '12px';
  hLocs.textContent = 'Locations';
  drawer.appendChild(hLocs);

  var list = document.createElement('div');
  list.className = 'map-drawer-list';
  drawer.appendChild(list);

  var sorted = places.slice().sort(function(a, b){ return b.count - a.count; });
  sorted.forEach(function(p, idx) {
    var row = document.createElement('div');
    row.className = 'map-drawer-row';
    var left = document.createElement('span');
    left.textContent = p.name;
    var right = document.createElement('span');
    right.className = 'n';
    right.textContent = p.count;
    row.appendChild(left); row.appendChild(right);
    row.onclick = function() {
      var layer = state.drawn[places.indexOf(p)];
      if (!layer) return;
      if (layer.getBounds) state.map.fitBounds(layer.getBounds(), { maxZoom: 13 });
      else if (layer.getLatLng) state.map.setView(layer.getLatLng(), 12);
    };
    list.appendChild(row);
  });

  mapDiv.appendChild(drawer);

  // ── 4th map button: panel toggle (≡) ────────────────────────────
  var panelBtn = document.createElement('button');
  panelBtn.className = 'map-panel-btn';
  panelBtn.title = 'Toggle info panel';
  panelBtn.textContent = '\u2261';
  mapDiv.appendChild(panelBtn);
  panelBtn.onclick = function(e) {
    e.stopPropagation();
    var opened = drawer.classList.toggle('open');
    panelBtn.classList.toggle('active', opened);
  };

  // ── 5th map button: POLY/DOT mode toggle ────────────────────────
  var modeBtn = document.createElement('button');
  modeBtn.className = 'map-mode-btn';
  modeBtn.title = 'Toggle borders / dots';
  modeBtn.textContent = 'DOT';
  mapDiv.appendChild(modeBtn);
  modeBtn.onclick = function(e) {
    e.stopPropagation();
    state.mode = (state.mode === 'borders') ? 'dots' : 'borders';
    modeBtn.textContent = (state.mode === 'borders') ? 'DOT' : 'POLY';
    modeBtn.classList.toggle('dot-mode', state.mode === 'dots');
    redraw();
  };
}

// ── Public entry point ──────────────────────────────────────────────
export function createBorderMap(map, mapDiv, places, opts) {
  if (!map || !mapDiv || !places || !places.length) return;
  mapDiv.style.position = 'relative';

  var state = { mode: 'borders', drawn: [], map: map };
  var borders = null;

  function redraw() {
    state.drawn.forEach(function(l){ if (l) map.removeLayer(l); });
    state.drawn = [];
    places.forEach(function(p, i) {
      state.drawn[i] = renderOne(map, p, state.mode, borders);
    });
  }

  loadBorders().then(function(b) {
    borders = b || {};
    redraw();
    attachDrawer(mapDiv, places, state, redraw, opts);
  });
}
