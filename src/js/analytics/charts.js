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

/**
 * Multi-series line chart with area fills.
 * datasets: [{data: number[], color: string, label: string}]
 */
export function renderLineChart(containerId, datasets, height) {
  var el = document.getElementById(containerId);
  if (!el) return;
  var w = el.offsetWidth || 600;
  var h = height || 200;
  var pad = 6;

  var allMax = 0;
  datasets.forEach(function(ds) {
    ds.data.forEach(function(v) { if (v > allMax) allMax = v; });
  });
  if (allMax === 0) allMax = 1;

  var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, preserveAspectRatio: 'none' });

  datasets.forEach(function(ds) {
    var pts = [];
    var n = ds.data.length;
    for (var i = 0; i < n; i++) {
      var x = pad + (i / Math.max(n - 1, 1)) * (w - pad * 2);
      var y = h - pad - (ds.data[i] / allMax) * (h - pad * 2);
      pts.push(x.toFixed(1) + ',' + y.toFixed(1));
    }

    var areaD = 'M' + pts[0] + ' L' + pts.join(' L') +
      ' L' + (w - pad) + ',' + h + ' L' + pad + ',' + h + ' Z';
    svg.appendChild(svgEl('path', { d: areaD, fill: ds.color, opacity: '0.08' }));
    svg.appendChild(svgEl('polyline', {
      points: pts.join(' '), fill: 'none', stroke: ds.color,
      'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    }));
  });

  el.textContent = '';
  el.appendChild(svg);
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
 * Hour-of-day x day-of-week heatmap.
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

  var container = document.createElement('div');
  container.className = 'a-heatmap';

  for (var row = 0; row < 7; row++) {
    for (var col = 0; col < 24; col++) {
      var val = grid[row + '-' + col] || 0;
      var intensity = val / maxVal;
      var cell = document.createElement('div');
      cell.className = 'a-hm-cell';
      cell.style.background = 'rgba(231,76,60,' + (0.03 + intensity * 0.7) + ')';
      cell.title = col + ':00';
      container.appendChild(cell);
    }
  }

  el.appendChild(container);

  var labels = document.createElement('div');
  labels.className = 'a-hm-labels';
  for (var h = 0; h < 24; h++) {
    var lbl = document.createElement('span');
    lbl.textContent = h % 3 === 0 ? h + ':00' : '';
    labels.appendChild(lbl);
  }
  el.appendChild(labels);

  var legend = document.createElement('div');
  legend.style.cssText = 'margin-top:12px;font-size:0.5rem;color:var(--text-muted);display:flex;justify-content:space-between;direction:ltr';
  var lo = document.createElement('span');
  lo.textContent = 'Low';
  var bar = document.createElement('div');
  bar.style.cssText = 'flex:1;height:8px;margin:0 8px;border-radius:4px;background:linear-gradient(90deg,var(--surface2),var(--red))';
  var hi = document.createElement('span');
  hi.textContent = 'High';
  legend.appendChild(lo);
  legend.appendChild(bar);
  legend.appendChild(hi);
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
