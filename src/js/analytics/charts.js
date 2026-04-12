/* === src/js/analytics/charts.js — SVG chart renderers (safe DOM only) === */

var NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  var el = document.createElementNS(NS, tag);
  if (attrs) {
    var keys = Object.keys(attrs);
    for (var i = 0; i < keys.length; i++) el.setAttribute(keys[i], attrs[keys[i]]);
  }
  return el;
}

function svgText(x, y, text, attrs) {
  var el = svgEl('text', Object.assign({
    x: String(x), y: String(y),
    'font-size': '13', fill: 'var(--text, #dfe6ee)',
    'font-family': 'monospace', 'font-weight': '600'
  }, attrs || {}));
  el.textContent = text;
  return el;
}

var DAY_NAMES = ['\u0627\u0644\u0623\u062D\u062F', '\u0627\u0644\u0625\u062B\u0646\u064A\u0646', '\u0627\u0644\u062B\u0644\u0627\u062B\u0627\u0621', '\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621', '\u0627\u0644\u062E\u0645\u064A\u0633', '\u0627\u0644\u062C\u0645\u0639\u0629', '\u0627\u0644\u0633\u0628\u062A'];

/* ═══════════ FULLSCREEN UTILITY ═══════════ */

export function addFullscreenBtn(panelEl, onEnter, onExit) {
  var btn = document.createElement('button');
  btn.className = 'fs-btn';
  btn.textContent = '\u26F6';
  btn.title = '\u0645\u0644\u0621 \u0627\u0644\u0634\u0627\u0634\u0629';
  var titleEl = panelEl.querySelector('.a-panel-title');
  if (titleEl) titleEl.appendChild(btn);

  btn.addEventListener('click', function() {
    if (panelEl.classList.contains('a-panel-fs')) {
      panelEl.classList.remove('a-panel-fs');
      document.body.style.overflow = '';
      btn.textContent = '\u26F6';
      if (onExit) onExit();
    } else {
      panelEl.classList.add('a-panel-fs');
      document.body.style.overflow = 'hidden';
      btn.textContent = '\u2716';
      if (onEnter) onEnter();
    }
  });
  return btn;
}

/* ═══════════ LINE CHART ═══════════ */

/**
 * Multi-series line chart with axes, legend toggle, tooltip, grouping badge.
 * datasets: [{data: number[], color: string, label: string}]
 * opts.xLabels, opts.grouping
 */
export function renderLineChart(containerId, datasets, height, opts) {
  var el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = '';

  var xLabels = (opts && opts.xLabels) || [];
  var grouping = (opts && opts.grouping) || '';
  var hiddenSeries = {}; // track toggled-off series by index

  var wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative';

  function draw() {
    // Remove previous SVG/legend but keep wrapper
    var prevSvg = wrapper.querySelector('svg');
    if (prevSvg) prevSvg.remove();
    var prevLeg = wrapper.querySelector('.lc-legend');
    if (prevLeg) prevLeg.remove();
    var prevTip = wrapper.querySelector('.lc-tooltip');
    if (prevTip) prevTip.remove();

    var visibleDS = datasets.filter(function(_, i) { return !hiddenSeries[i]; });

    var chartW = el.offsetWidth || 600;
    var marginL = 56, marginB = 38, marginR = 10, marginT = 10;
    var w = chartW;
    // In fullscreen, stretch the chart to fill the panel; otherwise use the
    // caller-provided fixed height. Detect fullscreen by walking up to the
    // .a-panel ancestor and checking for .a-panel-fs — deterministic and
    // immune to re-draw feedback loops.
    var baseH = height || 200;
    var panelEl = el.closest ? el.closest('.a-panel') : null;
    var isFs = !!(panelEl && panelEl.classList.contains('a-panel-fs'));
    var legendReserve = 48;
    var effectiveH = baseH;
    if (isFs) {
      var containerH = el.clientHeight || 0;
      if (containerH > baseH) effectiveH = containerH - legendReserve;
    }
    var h = effectiveH + marginB;
    var plotW = w - marginL - marginR;
    var plotH = h - marginT - marginB;

    var allMax = 0;
    visibleDS.forEach(function(ds) {
      ds.data.forEach(function(v) { if (v > allMax) allMax = v; });
    });
    if (allMax === 0) allMax = 1;

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + w + ' ' + h,
      style: 'width:100%;height:' + h + 'px;max-height:100%;display:block'
    });

    // Y-axis
    for (var yi = 0; yi <= 4; yi++) {
      var yVal = Math.round(allMax * yi / 4);
      var yPos = marginT + plotH - (yi / 4) * plotH;
      svg.appendChild(svgEl('line', {
        x1: String(marginL), y1: String(yPos), x2: String(w - marginR), y2: String(yPos),
        stroke: 'var(--border, #1e2d3d)', 'stroke-width': '0.5', 'stroke-dasharray': yi === 0 ? 'none' : '3,3'
      }));
      svg.appendChild(svgText(marginL - 8, yPos + 5, yVal, { 'text-anchor': 'end', 'font-size': '14' }));
    }

    // X-axis
    if (xLabels.length > 0) {
      var maxXL = Math.min(xLabels.length, 12);
      var step = Math.max(1, Math.floor(xLabels.length / maxXL));
      for (var xi = 0; xi < xLabels.length; xi += step) {
        var xPos = marginL + (xi / Math.max(xLabels.length - 1, 1)) * plotW;
        var lbl = xLabels[xi];
        if (lbl.length === 7) lbl = lbl.substring(5) + '/' + lbl.substring(2, 4);
        else if (lbl.length === 10) lbl = lbl.substring(5);
        else if (lbl.indexOf('-W') > 0) lbl = 'W' + lbl.split('W')[1];
        svg.appendChild(svgText(xPos, h - 10, lbl, { 'text-anchor': 'middle', 'font-size': '13' }));
        svg.appendChild(svgEl('line', {
          x1: String(xPos), y1: String(marginT + plotH), x2: String(xPos), y2: String(marginT + plotH + 4),
          stroke: 'var(--border, #1e2d3d)', 'stroke-width': '0.5'
        }));
      }
    }

    // Points + lines
    var pointPositions = [];
    var nPoints = visibleDS.length > 0 ? visibleDS[0].data.length : 0;
    for (var pi = 0; pi < nPoints; pi++) {
      pointPositions.push({ x: marginL + (pi / Math.max(nPoints - 1, 1)) * plotW, period: xLabels[pi] || '', values: [] });
    }

    visibleDS.forEach(function(ds) {
      var pts = [];
      for (var i = 0; i < ds.data.length; i++) {
        var x = marginL + (i / Math.max(ds.data.length - 1, 1)) * plotW;
        var y = marginT + plotH - (ds.data[i] / allMax) * plotH;
        pts.push(x.toFixed(1) + ',' + y.toFixed(1));
        if (pointPositions[i]) pointPositions[i].values.push({ label: ds.label, value: ds.data[i], color: ds.color });
      }
      var areaD = 'M' + pts[0] + ' L' + pts.join(' L') + ' L' + (marginL + plotW) + ',' + (marginT + plotH) + ' L' + marginL + ',' + (marginT + plotH) + ' Z';
      svg.appendChild(svgEl('path', { d: areaD, fill: ds.color, opacity: '0.08' }));
      svg.appendChild(svgEl('polyline', {
        points: pts.join(' '), fill: 'none', stroke: ds.color,
        'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
      }));
    });

    // Hover line
    var hoverLine = svgEl('line', {
      x1: '0', y1: String(marginT), x2: '0', y2: String(marginT + plotH),
      stroke: 'var(--accent, #c9a84c)', 'stroke-width': '1', opacity: '0', 'stroke-dasharray': '3,3'
    });
    svg.appendChild(hoverLine);
    wrapper.insertBefore(svg, wrapper.firstChild);

    // Tooltip
    var tooltip = document.createElement('div');
    tooltip.className = 'lc-tooltip';
    tooltip.style.cssText = 'display:none;position:absolute;z-index:10;background:var(--surface,#0f1520);border:1px solid var(--border,#1e2d3d);border-radius:8px;padding:8px 12px;font-size:0.58rem;pointer-events:none;direction:ltr;min-width:120px;box-shadow:0 4px 16px rgba(0,0,0,0.4)';
    wrapper.appendChild(tooltip);

    svg.style.cursor = 'crosshair';
    svg.addEventListener('mousemove', function(e) {
      var rect = svg.getBoundingClientRect();
      var mouseX = (e.clientX - rect.left) / rect.width * w;
      var nearest = null, nearestDist = Infinity;
      for (var idx = 0; idx < pointPositions.length; idx++) {
        var dist = Math.abs(pointPositions[idx].x - mouseX);
        if (dist < nearestDist) { nearestDist = dist; nearest = pointPositions[idx]; }
      }
      if (nearest && nearestDist < plotW / Math.max(nPoints, 1)) {
        hoverLine.setAttribute('x1', String(nearest.x));
        hoverLine.setAttribute('x2', String(nearest.x));
        hoverLine.setAttribute('opacity', '0.6');
        tooltip.style.display = 'block';
        tooltip.textContent = '';
        var hdr = document.createElement('div');
        hdr.style.cssText = 'font-weight:700;color:var(--accent,#c9a84c);margin-bottom:4px;font-size:0.6rem';
        hdr.textContent = nearest.period;
        tooltip.appendChild(hdr);
        nearest.values.forEach(function(v) {
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:1px 0';
          var dot = document.createElement('span');
          dot.style.cssText = 'width:6px;height:6px;border-radius:50%;flex-shrink:0;background:' + v.color;
          var nm = document.createElement('span');
          nm.style.cssText = 'flex:1;color:var(--text-dim,#6b7d92)';
          nm.textContent = v.label;
          var vl = document.createElement('span');
          vl.style.cssText = 'font-weight:700;color:var(--text,#dfe6ee)';
          vl.textContent = v.value;
          row.appendChild(dot); row.appendChild(nm); row.appendChild(vl);
          tooltip.appendChild(row);
        });
        var tipX = e.clientX - rect.left + 14;
        if (tipX + tooltip.offsetWidth > rect.width - 10) tipX = e.clientX - rect.left - tooltip.offsetWidth - 14;
        tooltip.style.left = tipX + 'px';
        tooltip.style.top = '10px';
      }
    });
    svg.addEventListener('mouseleave', function() {
      hoverLine.setAttribute('opacity', '0');
      tooltip.style.display = 'none';
    });

    // Legend (clickable to toggle series)
    var legend = document.createElement('div');
    legend.className = 'lc-legend';
    legend.style.cssText = 'display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:8px';

    // Grouping badge
    if (grouping) {
      var badge = document.createElement('span');
      badge.className = 'lc-group-badge';
      var groupLabels = { daily: '\u064A\u0648\u0645\u064A', weekly: '\u0623\u0633\u0628\u0648\u0639\u064A', monthly: '\u0634\u0647\u0631\u064A' };
      badge.textContent = groupLabels[grouping] || grouping;
      legend.appendChild(badge);
    }

    datasets.forEach(function(ds, idx) {
      var item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;gap:5px;font-size:0.54rem;cursor:pointer;user-select:none;transition:opacity 0.15s;' +
        (hiddenSeries[idx] ? 'opacity:0.3;text-decoration:line-through;' : 'color:var(--text-dim)');
      var dot = document.createElement('div');
      dot.style.cssText = 'width:8px;height:3px;border-radius:2px;background:' + ds.color + (hiddenSeries[idx] ? ';opacity:0.3' : '');
      var txt = document.createElement('span');
      txt.textContent = ds.label || '';
      item.appendChild(dot);
      item.appendChild(txt);
      item.addEventListener('click', function() {
        hiddenSeries[idx] = !hiddenSeries[idx];
        draw();
      });
      legend.appendChild(item);
    });
    wrapper.appendChild(legend);
  }

  draw();
  el.appendChild(wrapper);
}

/* ═══════════ BAR CHART ═══════════ */

export function renderBarChart(containerId, items, barColor) {
  var el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = '';
  if (items.length === 0) return;

  var maxV = items[0].value;
  for (var i = 1; i < items.length; i++) { if (items[i].value > maxV) maxV = items[i].value; }
  if (maxV === 0) maxV = 1;

  items.forEach(function(item) {
    var row = document.createElement('div');
    row.className = 'a-bar-row';
    var label = document.createElement('div');
    label.className = 'a-bar-label';
    label.textContent = item.name;
    var track = document.createElement('div');
    track.className = 'a-bar-track';
    var fill = document.createElement('div');
    fill.className = 'a-bar-fill';
    fill.style.width = (item.value / maxV * 100) + '%';
    fill.style.background = barColor || 'var(--accent)';
    track.appendChild(fill);
    var val = document.createElement('div');
    val.className = 'a-bar-val';
    val.textContent = item.value;
    row.appendChild(label); row.appendChild(track); row.appendChild(val);
    el.appendChild(row);
  });
}

/* ═══════════ HEATMAP ═══════════ */

export function renderHeatmap(containerId, data) {
  var el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = '';

  var grid = {};
  var maxVal = 1;
  var totalAll = 0;
  var dayTotals = [0, 0, 0, 0, 0, 0, 0];
  var hourTotals = {};
  data.forEach(function(d) {
    var key = d.dow + '-' + d.hour;
    grid[key] = (grid[key] || 0) + d.count;
    if (grid[key] > maxVal) maxVal = grid[key];
    totalAll += d.count;
    dayTotals[d.dow] = (dayTotals[d.dow] || 0) + d.count;
    hourTotals[d.hour] = (hourTotals[d.hour] || 0) + d.count;
  });

  var outerWrap = document.createElement('div');
  outerWrap.style.cssText = 'position:relative';

  var wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:grid;grid-template-columns:56px 1fr;gap:0 8px;direction:ltr';

  // Day labels column — 7 rows matching the heatmap grid rows
  var dayCol = document.createElement('div');
  dayCol.style.cssText = 'display:grid;grid-template-rows:repeat(7, 1fr);gap:2px';
  for (var di = 0; di < 7; di++) {
    var dayLabel = document.createElement('div');
    dayLabel.style.cssText = 'font-size:0.48rem;color:var(--text-muted);display:flex;align-items:center;justify-content:flex-end;white-space:nowrap;padding-right:4px';
    dayLabel.textContent = DAY_NAMES[di];
    dayCol.appendChild(dayLabel);
  }
  wrapper.appendChild(dayCol);

  var gridWrap = document.createElement('div');

  var container = document.createElement('div');
  container.className = 'a-heatmap';

  for (var row = 0; row < 7; row++) {
    for (var col = 0; col < 24; col++) {
      var val = grid[row + '-' + col] || 0;
      var intensity = val / maxVal;
      var cell = document.createElement('div');
      cell.className = 'a-hm-cell';
      cell.style.background = 'rgba(231,76,60,' + (0.03 + intensity * 0.7) + ')';
      cell.setAttribute('data-dow', String(row));
      cell.setAttribute('data-hour', String(col));
      cell.setAttribute('data-val', String(val));
      container.appendChild(cell);
    }
  }
  gridWrap.appendChild(container);

  var labels = document.createElement('div');
  labels.className = 'a-hm-labels';
  for (var hh = 0; hh < 24; hh++) {
    var lbl = document.createElement('span');
    lbl.textContent = hh % 3 === 0 ? hh + ':00' : '';
    labels.appendChild(lbl);
  }
  gridWrap.appendChild(labels);

  // Empty cell for the label column, then the grid
  wrapper.appendChild(gridWrap);
  outerWrap.appendChild(wrapper);

  // Tooltip
  var hmTip = document.createElement('div');
  hmTip.className = 'hm-tooltip';
  hmTip.style.cssText = 'display:none;position:absolute;z-index:10;background:var(--surface,#0f1520);border:1px solid var(--border,#1e2d3d);border-radius:8px;padding:8px 12px;font-size:0.54rem;pointer-events:none;direction:rtl;box-shadow:0 4px 16px rgba(0,0,0,0.5);line-height:1.7';
  outerWrap.appendChild(hmTip);

  container.addEventListener('mousemove', function(e) {
    var target = e.target;
    if (!target.classList.contains('a-hm-cell')) return;
    var dow = parseInt(target.getAttribute('data-dow'));
    var hour = parseInt(target.getAttribute('data-hour'));
    var v = parseInt(target.getAttribute('data-val'));
    var nextHour = (hour + 1) % 24;
    var pct = totalAll > 0 ? (v / totalAll * 100).toFixed(1) : '0';
    var pctOfMax = maxVal > 0 ? Math.round(v / maxVal * 100) : 0;
    var dayTotal = dayTotals[dow] || 0;
    var hourTotal = hourTotals[hour] || 0;

    hmTip.textContent = '';
    // Line 1: day + time range
    var line1 = document.createElement('div');
    line1.style.cssText = 'font-weight:600;font-size:0.58rem;margin-bottom:2px';
    line1.textContent = DAY_NAMES[dow] + ' \u2022 ' + String(hour).padStart(2, '0') + ':00 \u2192 ' + String(nextHour).padStart(2, '0') + ':00';
    hmTip.appendChild(line1);
    // Line 2: event count + percentage
    var line2 = document.createElement('div');
    line2.textContent = v + ' \u062D\u062F\u062B (' + pct + '% \u0645\u0646 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A)';
    hmTip.appendChild(line2);
    // Line 3: intensity relative to peak
    var line3 = document.createElement('div');
    line3.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:3px';
    var barLabelPre = document.createElement('span');
    barLabelPre.style.cssText = 'font-size:0.46rem;color:var(--text-muted);white-space:nowrap';
    barLabelPre.textContent = '\u0627\u0644\u062D\u062F\u0651\u0629: ';
    line3.appendChild(barLabelPre);
    var barBg = document.createElement('div');
    barBg.style.cssText = 'flex:1;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;min-width:50px';
    var barFill = document.createElement('div');
    barFill.style.cssText = 'height:100%;border-radius:2px;background:rgba(231,76,60,0.8);width:' + pctOfMax + '%';
    barBg.appendChild(barFill);
    line3.appendChild(barBg);
    var barLabel = document.createElement('span');
    barLabel.style.cssText = 'font-size:0.46rem;opacity:0.6;direction:ltr';
    barLabel.textContent = pctOfMax + '% \u0645\u0646 \u0627\u0644\u0630\u0631\u0648\u0629';
    line3.appendChild(barLabel);
    hmTip.appendChild(line3);
    // Line 4: day total
    var line4 = document.createElement('div');
    line4.style.cssText = 'font-size:0.46rem;color:var(--text-muted);margin-top:3px';
    line4.textContent = '\u0643\u0644 \u0623\u064A\u0627\u0645 ' + DAY_NAMES[dow] + ': ' + dayTotal + ' \u062D\u062F\u062B';
    hmTip.appendChild(line4);
    // Line 5: hour total
    var line5 = document.createElement('div');
    line5.style.cssText = 'font-size:0.46rem;color:var(--text-muted)';
    line5.textContent = '\u0643\u0644 \u0627\u0644\u0623\u064A\u0627\u0645 \u0627\u0644\u0633\u0627\u0639\u0629 ' + String(hour).padStart(2, '0') + ':00: ' + hourTotal + ' \u062D\u062F\u062B';
    hmTip.appendChild(line5);

    hmTip.style.display = 'block';
    var rect = outerWrap.getBoundingClientRect();
    var cx = e.clientX - rect.left;
    var cy = e.clientY - rect.top;
    // Keep tooltip within bounds
    hmTip.style.left = Math.min(cx + 12, rect.width - 220) + 'px';
    hmTip.style.top = (cy - 60) + 'px';
  });
  container.addEventListener('mouseleave', function() { hmTip.style.display = 'none'; });

  // Legend
  var legend = document.createElement('div');
  legend.style.cssText = 'margin-top:10px;font-size:0.5rem;color:var(--text-muted);display:flex;align-items:center;gap:8px;direction:ltr';
  var lo = document.createElement('span'); lo.textContent = '\u0623\u0642\u0644';
  var bar = document.createElement('div');
  bar.style.cssText = 'flex:1;max-width:120px;height:8px;border-radius:4px;background:linear-gradient(90deg,var(--surface2),var(--red))';
  var hi = document.createElement('span'); hi.textContent = '\u0623\u0643\u062B\u0631';
  var countLabel = document.createElement('span');
  countLabel.style.cssText = 'margin-right:auto;font-size:0.46rem;color:var(--text-muted);direction:ltr';
  countLabel.textContent = '\u0627\u0644\u0623\u0639\u0644\u0649: ' + maxVal;
  legend.appendChild(lo); legend.appendChild(bar); legend.appendChild(hi); legend.appendChild(countLabel);
  outerWrap.appendChild(legend);

  el.appendChild(outerWrap);
}

/* ═══════════ KPIs ═══════════ */

export function renderKPIs(containerId, kpis) {
  var el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = '';
  kpis.forEach(function(kpi) {
    var cell = document.createElement('div');
    cell.className = 'a-kpi';
    var num = document.createElement('div');
    num.className = 'num';
    num.textContent = kpi.value.toLocaleString('en-US');
    var label = document.createElement('div');
    label.className = 'label';
    label.textContent = kpi.label;
    var barEl = document.createElement('div');
    barEl.className = 'bar';
    barEl.style.background = kpi.color;
    cell.appendChild(num); cell.appendChild(label);
    if (kpi.trend) {
      var trend = document.createElement('div');
      trend.className = 'trend ' + (kpi.trend.indexOf('+') === 0 ? 'up' : 'down');
      trend.textContent = kpi.trend;
      cell.appendChild(trend);
    }
    cell.appendChild(barEl);
    el.appendChild(cell);
  });
}

/* ═══════════ DATA TABLE (sortable, fullscreen-paginated) ═══════════ */

/**
 * columns: [{key, label}], rows, colorMap, opts: {onSort, sortKey, sortDir, isFullscreen, page, totalPages, onPage}
 */
export function renderTable(containerId, columns, rows, colorMap, opts) {
  var el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = '';
  opts = opts || {};

  var table = document.createElement('table');
  table.className = 'a-table';

  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  columns.forEach(function(col) {
    var th = document.createElement('th');
    th.style.cursor = 'pointer';
    th.style.userSelect = 'none';

    var label = document.createTextNode(col.label + ' ');
    th.appendChild(label);

    if (opts.sortKey === col.key) {
      var arrow = document.createElement('span');
      arrow.style.cssText = 'font-size:1rem;color:var(--accent);margin-right:6px';
      arrow.textContent = opts.sortDir === 'asc' ? '\u25B2' : '\u25BC';
      th.appendChild(arrow);
    }

    th.addEventListener('click', function() {
      if (opts.onSort) opts.onSort(col.key);
    });
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  rows.forEach(function(row) {
    var tr = document.createElement('tr');
    columns.forEach(function(col) {
      var td = document.createElement('td');
      td.textContent = row[col.key] != null ? row[col.key] : '';
      if (col.key === 'date') {
        td.style.cssText = 'direction:ltr;font-family:monospace';
      } else if (colorMap && colorMap[col.key]) {
        td.className = 'num-cell';
        td.style.color = colorMap[col.key];
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  el.appendChild(table);

  // Pagination controls (fullscreen mode)
  if (opts.isFullscreen && opts.totalPages > 1) {
    var pager = document.createElement('div');
    pager.className = 'a-pager';

    var prevBtn = document.createElement('button');
    prevBtn.className = 'a-pager-btn';
    prevBtn.textContent = '\u2190 \u0627\u0644\u0633\u0627\u0628\u0642';
    prevBtn.disabled = opts.page <= 1;
    prevBtn.addEventListener('click', function() { if (opts.onPage) opts.onPage(opts.page - 1); });

    var info = document.createElement('span');
    info.className = 'a-pager-info';
    info.textContent = opts.page + ' / ' + opts.totalPages;

    var nextBtn = document.createElement('button');
    nextBtn.className = 'a-pager-btn';
    nextBtn.textContent = '\u0627\u0644\u062A\u0627\u0644\u064A \u2192';
    nextBtn.disabled = opts.page >= opts.totalPages;
    nextBtn.addEventListener('click', function() { if (opts.onPage) opts.onPage(opts.page + 1); });

    pager.appendChild(prevBtn); pager.appendChild(info); pager.appendChild(nextBtn);
    el.appendChild(pager);
  }
}
