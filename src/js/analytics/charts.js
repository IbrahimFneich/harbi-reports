/* === src/js/analytics/charts.js — SVG chart renderers (safe DOM only) === */

var NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  var el = document.createElementNS(NS, tag);
  if (attrs) {
    var keys = Object.keys(attrs);
    for (var i = 0; i < keys.length; i++) {
      el.setAttribute(keys[i], attrs[keys[i]]);
    }
  }
  return el;
}

function svgText(x, y, text, attrs) {
  var el = svgEl('text', Object.assign({
    x: String(x), y: String(y),
    'font-size': '9', fill: 'var(--text-dim, #6b7d92)',
    'font-family': 'monospace'
  }, attrs || {}));
  el.textContent = text;
  return el;
}

var DAY_NAMES = ['\u0623\u062D\u062F', '\u0625\u062B\u0646', '\u062B\u0644\u0627', '\u0623\u0631\u0628', '\u062E\u0645\u064A', '\u062C\u0645\u0639', '\u0633\u0628\u062A'];

/**
 * Multi-series line chart with area fills, legend, and axis labels.
 * datasets: [{data: number[], color: string, label: string}]
 * opts.xLabels: string[] — labels for x-axis ticks
 */
export function renderLineChart(containerId, datasets, height, opts) {
  var el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = '';

  var xLabels = (opts && opts.xLabels) || [];

  // Wrapper for SVG + legend
  var wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative';

  var chartW = el.offsetWidth || 600;
  var marginL = 40; // space for Y axis
  var marginB = 24; // space for X axis
  var marginR = 6;
  var marginT = 6;
  var w = chartW;
  var h = (height || 200) + marginB;
  var plotW = w - marginL - marginR;
  var plotH = h - marginT - marginB;

  var allMax = 0;
  datasets.forEach(function(ds) {
    ds.data.forEach(function(v) { if (v > allMax) allMax = v; });
  });
  if (allMax === 0) allMax = 1;

  var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, preserveAspectRatio: 'none', style: 'width:100%;height:' + h + 'px' });

  // Y-axis grid lines + labels (5 ticks)
  for (var yi = 0; yi <= 4; yi++) {
    var yVal = Math.round(allMax * yi / 4);
    var yPos = marginT + plotH - (yi / 4) * plotH;

    // Grid line
    svg.appendChild(svgEl('line', {
      x1: String(marginL), y1: String(yPos),
      x2: String(w - marginR), y2: String(yPos),
      stroke: 'var(--border, #1e2d3d)', 'stroke-width': '0.5', 'stroke-dasharray': yi === 0 ? 'none' : '3,3'
    }));

    // Y label
    svg.appendChild(svgText(marginL - 4, yPos + 3, yVal, { 'text-anchor': 'end', 'font-size': '8' }));
  }

  // X-axis labels
  if (xLabels.length > 0) {
    var maxXLabels = Math.min(xLabels.length, 12);
    var step = Math.max(1, Math.floor(xLabels.length / maxXLabels));
    for (var xi = 0; xi < xLabels.length; xi += step) {
      var xPos = marginL + (xi / Math.max(xLabels.length - 1, 1)) * plotW;
      var label = xLabels[xi];
      // Shorten: '2024-03' → '03/24', '2024-W12' → 'W12', '2024-03-15' → '03/15'
      if (label.length === 7) label = label.substring(5) + '/' + label.substring(2, 4);
      else if (label.length === 10) label = label.substring(5);
      else if (label.indexOf('-W') > 0) label = 'W' + label.split('W')[1];

      svg.appendChild(svgText(xPos, h - 4, label, { 'text-anchor': 'middle', 'font-size': '7.5' }));

      // Tick mark
      svg.appendChild(svgEl('line', {
        x1: String(xPos), y1: String(marginT + plotH),
        x2: String(xPos), y2: String(marginT + plotH + 4),
        stroke: 'var(--border, #1e2d3d)', 'stroke-width': '0.5'
      }));
    }
  }

  // Data lines + collect point positions for tooltips
  var pointPositions = []; // [{x, values: [{label, value, color}]}]
  var nPoints = datasets.length > 0 ? datasets[0].data.length : 0;
  for (var pi = 0; pi < nPoints; pi++) {
    pointPositions.push({
      x: marginL + (pi / Math.max(nPoints - 1, 1)) * plotW,
      period: xLabels[pi] || '',
      values: []
    });
  }

  datasets.forEach(function(ds) {
    var pts = [];
    var n = ds.data.length;
    for (var i = 0; i < n; i++) {
      var x = marginL + (i / Math.max(n - 1, 1)) * plotW;
      var y = marginT + plotH - (ds.data[i] / allMax) * plotH;
      pts.push(x.toFixed(1) + ',' + y.toFixed(1));
      if (pointPositions[i]) {
        pointPositions[i].values.push({ label: ds.label, value: ds.data[i], color: ds.color });
      }
    }

    var areaD = 'M' + pts[0] + ' L' + pts.join(' L') +
      ' L' + (marginL + plotW) + ',' + (marginT + plotH) + ' L' + marginL + ',' + (marginT + plotH) + ' Z';
    svg.appendChild(svgEl('path', { d: areaD, fill: ds.color, opacity: '0.08' }));
    svg.appendChild(svgEl('polyline', {
      points: pts.join(' '), fill: 'none', stroke: ds.color,
      'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    }));
  });

  // Vertical hover line (initially hidden)
  var hoverLine = svgEl('line', {
    x1: '0', y1: String(marginT), x2: '0', y2: String(marginT + plotH),
    stroke: 'var(--accent, #c9a84c)', 'stroke-width': '1', opacity: '0',
    'stroke-dasharray': '3,3'
  });
  svg.appendChild(hoverLine);

  wrapper.appendChild(svg);

  // Tooltip div
  var tooltip = document.createElement('div');
  tooltip.className = 'lc-tooltip';
  tooltip.style.cssText = 'display:none;position:absolute;z-index:10;background:var(--surface,#0f1520);border:1px solid var(--border,#1e2d3d);border-radius:8px;padding:8px 12px;font-size:0.58rem;pointer-events:none;direction:ltr;min-width:120px;box-shadow:0 4px 16px rgba(0,0,0,0.4)';
  wrapper.appendChild(tooltip);

  // Mouse interaction on the SVG
  var svgNode = svg;
  svgNode.style.cursor = 'crosshair';
  svgNode.addEventListener('mousemove', function(e) {
    var rect = svgNode.getBoundingClientRect();
    var mouseX = (e.clientX - rect.left) / rect.width * w;

    // Find nearest point
    var nearest = null;
    var nearestDist = Infinity;
    for (var idx = 0; idx < pointPositions.length; idx++) {
      var dist = Math.abs(pointPositions[idx].x - mouseX);
      if (dist < nearestDist) { nearestDist = dist; nearest = pointPositions[idx]; }
    }

    if (nearest && nearestDist < plotW / nPoints) {
      hoverLine.setAttribute('x1', String(nearest.x));
      hoverLine.setAttribute('x2', String(nearest.x));
      hoverLine.setAttribute('opacity', '0.6');

      // Build tooltip
      tooltip.style.display = 'block';
      tooltip.textContent = '';

      var header = document.createElement('div');
      header.style.cssText = 'font-weight:700;color:var(--accent,#c9a84c);margin-bottom:4px;font-size:0.6rem';
      header.textContent = nearest.period;
      tooltip.appendChild(header);

      nearest.values.forEach(function(v) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:1px 0';

        var dot = document.createElement('span');
        dot.style.cssText = 'width:6px;height:6px;border-radius:50%;flex-shrink:0;background:' + v.color;

        var name = document.createElement('span');
        name.style.cssText = 'flex:1;color:var(--text-dim,#6b7d92)';
        name.textContent = v.label;

        var val = document.createElement('span');
        val.style.cssText = 'font-weight:700;color:var(--text,#dfe6ee)';
        val.textContent = v.value;

        row.appendChild(dot);
        row.appendChild(name);
        row.appendChild(val);
        tooltip.appendChild(row);
      });

      // Position tooltip
      var tipX = e.clientX - rect.left + 14;
      if (tipX + tooltip.offsetWidth > rect.width - 10) {
        tipX = e.clientX - rect.left - tooltip.offsetWidth - 14;
      }
      tooltip.style.left = tipX + 'px';
      tooltip.style.top = '10px';
    }
  });

  svgNode.addEventListener('mouseleave', function() {
    hoverLine.setAttribute('opacity', '0');
    tooltip.style.display = 'none';
  });

  // Legend below chart
  var legend = document.createElement('div');
  legend.style.cssText = 'display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:8px';
  datasets.forEach(function(ds) {
    var item = document.createElement('div');
    item.style.cssText = 'display:flex;align-items:center;gap:5px;font-size:0.54rem;color:var(--text-dim)';

    var dot = document.createElement('div');
    dot.style.cssText = 'width:8px;height:3px;border-radius:2px;background:' + ds.color;

    var txt = document.createElement('span');
    txt.textContent = ds.label || '';

    item.appendChild(dot);
    item.appendChild(txt);
    legend.appendChild(item);
  });
  wrapper.appendChild(legend);

  el.appendChild(wrapper);
}

/**
 * Horizontal bar chart.
 * items: [{name: string, value: number}]
 */
export function renderBarChart(containerId, items, barColor) {
  var el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = '';
  if (items.length === 0) return;

  var maxV = items[0].value;
  for (var i = 1; i < items.length; i++) {
    if (items[i].value > maxV) maxV = items[i].value;
  }
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

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(val);
    el.appendChild(row);
  });
}

/**
 * Hour-of-day x day-of-week heatmap with row/column labels.
 * data: [{hour: 0-23, dow: 0-6, count: number}]
 */
export function renderHeatmap(containerId, data) {
  var el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = '';

  var grid = {};
  var maxVal = 1;
  data.forEach(function(d) {
    var key = d.dow + '-' + d.hour;
    grid[key] = (grid[key] || 0) + d.count;
    if (grid[key] > maxVal) maxVal = grid[key];
  });

  // Wrapper with day labels on the left
  var wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;gap:6px;direction:ltr';

  // Day-of-week labels (Y axis)
  var dayCol = document.createElement('div');
  dayCol.style.cssText = 'display:flex;flex-direction:column;gap:2px;justify-content:center';
  for (var di = 0; di < 7; di++) {
    var dayLabel = document.createElement('div');
    dayLabel.style.cssText = 'font-size:0.44rem;color:var(--text-muted);text-align:right;height:100%;display:flex;align-items:center;min-height:14px;white-space:nowrap';
    dayLabel.textContent = DAY_NAMES[di];
    dayCol.appendChild(dayLabel);
  }
  wrapper.appendChild(dayCol);

  // Grid
  var gridWrap = document.createElement('div');
  gridWrap.style.cssText = 'flex:1';

  var container = document.createElement('div');
  container.className = 'a-heatmap';

  for (var row = 0; row < 7; row++) {
    for (var col = 0; col < 24; col++) {
      var val = grid[row + '-' + col] || 0;
      var intensity = val / maxVal;
      var cell = document.createElement('div');
      cell.className = 'a-hm-cell';
      cell.style.background = 'rgba(231,76,60,' + (0.03 + intensity * 0.7) + ')';
      cell.title = DAY_NAMES[row] + ' ' + col + ':00 \u2014 ' + val + ' \u062D\u062F\u062B';
      container.appendChild(cell);
    }
  }
  gridWrap.appendChild(container);

  // Hour labels (X axis)
  var labels = document.createElement('div');
  labels.className = 'a-hm-labels';
  for (var h = 0; h < 24; h++) {
    var lbl = document.createElement('span');
    lbl.textContent = h % 3 === 0 ? h + ':00' : '';
    labels.appendChild(lbl);
  }
  gridWrap.appendChild(labels);

  wrapper.appendChild(gridWrap);
  el.appendChild(wrapper);

  // Legend
  var legend = document.createElement('div');
  legend.style.cssText = 'margin-top:10px;font-size:0.5rem;color:var(--text-muted);display:flex;align-items:center;gap:8px;direction:ltr';

  var lo = document.createElement('span');
  lo.textContent = '\u0623\u0642\u0644';
  var bar = document.createElement('div');
  bar.style.cssText = 'flex:1;max-width:120px;height:8px;border-radius:4px;background:linear-gradient(90deg,var(--surface2),var(--red))';
  var hi = document.createElement('span');
  hi.textContent = '\u0623\u0643\u062B\u0631';

  var countLabel = document.createElement('span');
  countLabel.style.cssText = 'margin-right:auto;font-size:0.46rem;color:var(--text-muted);direction:ltr';
  countLabel.textContent = '\u0627\u0644\u0623\u0639\u0644\u0649: ' + maxVal;

  legend.appendChild(lo);
  legend.appendChild(bar);
  legend.appendChild(hi);
  legend.appendChild(countLabel);
  el.appendChild(legend);
}

/**
 * Render KPI strip.
 * kpis: [{value: number, label: string, color: string, trend: string|null}]
 */
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

    cell.appendChild(num);
    cell.appendChild(label);

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

/**
 * Render data table.
 * columns: [{key, label}], rows: [{key: value, ...}], colorMap: {key: color}
 */
export function renderTable(containerId, columns, rows, colorMap) {
  var el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = '';

  var table = document.createElement('table');
  table.className = 'a-table';

  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  columns.forEach(function(col) {
    var th = document.createElement('th');
    th.textContent = col.label;
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
        td.style.cssText = 'direction:ltr;font-family:monospace;font-size:0.6rem';
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
}
