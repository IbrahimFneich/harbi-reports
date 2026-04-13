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

/* ═══════════ LINE CHART (ECharts — finance-grade: zoom, pan, brush, select) ═══════════ */

/**
 * Stock-terminal UX: wheel=zoom, bottom slider=pan+window,
 * toolbox rect-zoom / brush / restore / save-as-PNG, crosshair tooltip, legend toggle.
 * Contract unchanged: datasets:[{data,color,label}], opts:{xLabels, grouping}.
 */
export function renderLineChart(containerId, datasets, height, opts) {
  var el = document.getElementById(containerId);
  if (!el) return;

  if (typeof echarts === 'undefined') {
    el.textContent = 'ECharts failed to load';
    return;
  }

  var xLabels = (opts && opts.xLabels) || [];
  var grouping = (opts && opts.grouping) || '';

  var prev = echarts.getInstanceByDom(el);
  if (prev) prev.dispose();
  el.textContent = '';

  var panelEl = el.closest ? el.closest('.a-panel') : null;
  var isFs = !!(panelEl && panelEl.classList.contains('a-panel-fs'));
  if (isFs) {
    el.style.removeProperty('height');
  } else {
    el.style.height = Math.max((height || 200) + 120, 340) + 'px';
  }
  el.style.width = '100%';

  var css = getComputedStyle(document.body);
  var cv = function(name, fallback) {
    var v = css.getPropertyValue(name).trim();
    return v || fallback;
  };
  var textColor = cv('--text', '#dfe6ee');
  var textDim = cv('--text-dim', '#6b7d92');
  var borderColor = cv('--border', '#1e2d3d');
  var surfaceColor = cv('--surface', '#0f1520');
  var accentColor = cv('--accent', '#c9a84c');

  var formattedLabels = xLabels.map(function(lbl) {
    if (!lbl) return '';
    if (lbl.length === 7) return lbl.substring(5) + '/' + lbl.substring(2, 4);
    if (lbl.length === 10) return lbl.substring(5);
    if (lbl.indexOf('-W') > 0) return 'W' + lbl.split('-W')[1];
    return lbl;
  });

  var series = datasets.map(function(ds) {
    var hex = ds.color || accentColor;
    return {
      name: ds.label,
      type: 'line',
      smooth: false,
      symbol: 'circle',
      symbolSize: 6,
      showSymbol: false,
      sampling: 'lttb',
      lineStyle: { width: 2, color: hex },
      itemStyle: { color: hex },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: hex + '55' },
          { offset: 1, color: hex + '05' }
        ])
      },
      emphasis: { focus: 'series', lineStyle: { width: 3 } },
      data: ds.data
    };
  });

  var groupLabels = { daily: '\u064A\u0648\u0645\u064A', weekly: '\u0623\u0633\u0628\u0648\u0639\u064A', monthly: '\u0634\u0647\u0631\u064A' };
  var groupBadge = groupLabels[grouping] || grouping;

  var chart = echarts.init(el, null, { renderer: 'canvas' });

  var option = {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: 'Noto Kufi Arabic, monospace', color: textColor },
    color: datasets.map(function(d) { return d.color; }),
    animationDuration: 400,
    grid: { left: 12, right: 20, top: 78, bottom: 72, containLabel: true },
    legend: {
      data: datasets.map(function(d) { return d.label; }),
      top: 38, left: 'center',
      textStyle: { color: textDim, fontSize: 11, fontFamily: 'Noto Kufi Arabic' },
      icon: 'roundRect', itemWidth: 14, itemHeight: 6, itemGap: 14,
      inactiveColor: cv('--text-muted', '#3d5068')
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        crossStyle: { color: accentColor, type: 'dashed', width: 1 },
        lineStyle: { color: accentColor, type: 'dashed', width: 1 },
        label: { backgroundColor: accentColor, color: '#0a0f18', fontWeight: 700 }
      },
      backgroundColor: surfaceColor,
      borderColor: borderColor,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: textColor, fontFamily: 'Noto Kufi Arabic', fontSize: 11 },
      extraCssText: 'box-shadow:0 8px 24px rgba(0,0,0,0.5); border-radius:8px; direction:rtl;'
    },
    toolbox: {
      right: 14, top: 8,
      itemGap: 10, itemSize: 14,
      iconStyle: { borderColor: textDim, borderWidth: 1.5 },
      emphasis: { iconStyle: { borderColor: accentColor } },
      feature: {
        dataZoom: {
          yAxisIndex: 'none',
          title: { zoom: '\u062A\u0643\u0628\u064A\u0631', back: '\u0631\u062C\u0648\u0639' },
          icon: {
            zoom: 'path://M4 11A7 7 0 1 1 18 11A7 7 0 1 1 4 11ZM16 16L21 21M8 11L14 11M11 8L11 14'
          },
          brushStyle: { color: 'rgba(201,168,76,0.15)', borderColor: accentColor }
        },
        brush: {
          type: ['lineX', 'clear'],
          title: { lineX: '\u062A\u062D\u062F\u064A\u062F', clear: '\u0645\u0633\u062D' }
        },
        restore: { title: '\u0627\u0633\u062A\u0639\u0627\u062F\u0629' },
        saveAsImage: {
          title: '\u062D\u0641\u0638',
          name: 'harbi-analytics',
          backgroundColor: surfaceColor,
          pixelRatio: 2
        }
      }
    },
    brush: {
      xAxisIndex: 0,
      throttleType: 'debounce',
      throttleDelay: 100,
      outOfBrush: { colorAlpha: 0.15 },
      brushStyle: {
        borderColor: accentColor,
        borderWidth: 1,
        color: 'rgba(201,168,76,0.12)'
      }
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: formattedLabels,
      axisLine: { lineStyle: { color: borderColor } },
      axisTick: { lineStyle: { color: borderColor } },
      axisLabel: { color: textDim, fontSize: 11, fontFamily: 'monospace', hideOverlap: true },
      axisPointer: { label: { show: true } }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: borderColor, type: 'dashed', opacity: 0.6 } },
      axisLabel: { color: textDim, fontSize: 12, fontFamily: 'monospace' },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        start: 0, end: 100,
        zoomOnMouseWheel: true,
        moveOnMouseMove: false,
        moveOnMouseWheel: false
      },
      {
        type: 'slider',
        xAxisIndex: 0,
        start: 0, end: 100,
        height: 24, bottom: 16,
        borderColor: borderColor,
        backgroundColor: 'rgba(0,0,0,0.15)',
        fillerColor: 'rgba(201,168,76,0.14)',
        handleStyle: { color: accentColor, borderColor: accentColor },
        moveHandleStyle: { color: accentColor, opacity: 0.8 },
        dataBackground: {
          lineStyle: { color: textDim, opacity: 0.5, width: 1 },
          areaStyle: { color: textDim, opacity: 0.08 }
        },
        selectedDataBackground: {
          lineStyle: { color: accentColor, width: 1 },
          areaStyle: { color: accentColor, opacity: 0.18 }
        },
        textStyle: { color: textDim, fontSize: 10, fontFamily: 'monospace' },
        labelFormatter: function(_idx, str) { return str || ''; }
      }
    ],
    series: series,
    graphic: groupBadge ? [{
      type: 'text', left: 14, top: 12, z: 100,
      style: {
        text: groupBadge,
        fontSize: 11,
        fontWeight: 700,
        fill: accentColor,
        fontFamily: 'Noto Kufi Arabic'
      }
    }] : []
  };

  chart.setOption(option);

  if (!el.__harbiResizeBound) {
    el.__harbiResizeBound = true;
    var ro = new ResizeObserver(function() {
      var inst = echarts.getInstanceByDom(el);
      if (inst) inst.resize();
    });
    ro.observe(el);
  }
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
 * columns: [{key, label}], rows, colorMap,
 * opts: { onSort(key), sortKey, sortDir, isFullscreen, page, totalPages, onPage }
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
    th.style.whiteSpace = 'nowrap';

    var label = document.createTextNode(col.label + ' ');
    th.appendChild(label);

    if (opts.sortKey === col.key) {
      var arrow = document.createElement('span');
      arrow.style.cssText = 'font-size:1.2rem;color:var(--accent);margin-right:6px;font-weight:900';
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
