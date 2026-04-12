/* === src/js/analytics/dashboard.js — Analytics page orchestrator === */

import { initDB, queryRows, queryOne } from './db.js';
import { renderLineChart, renderBarChart, renderHeatmap, renderKPIs, renderTable, addFullscreenBtn } from './charts.js';
import { initControls, buildWhere, getGroupFormat, getState } from './controls.js';

var CATEGORY_META = {
  bayanat: { label: '\u0628\u064A\u0627\u0646\u0627\u062A \u0639\u0633\u0643\u0631\u064A\u0629', color: 'var(--green)', hex: '#2ecc71' },
  sirens:  { label: '\u0635\u0641\u0627\u0631\u0627\u062A \u0625\u0646\u0630\u0627\u0631', color: 'var(--red)', hex: '#e74c3c' },
  enemy:   { label: '\u0625\u0639\u0644\u0627\u0645 \u0627\u0644\u0639\u062F\u0648', color: 'var(--orange)', hex: '#e67e22' },
  iran:    { label: '\u0625\u064A\u0631\u0627\u0646', color: 'var(--purple)', hex: '#9b59b6' },
  videos:  { label: '\u0641\u064A\u062F\u064A\u0648\u0647\u0627\u062A', color: 'var(--teal)', hex: '#1abc9c' },
  allies:  { label: '\u062D\u0644\u0641\u0627\u0621', color: 'var(--blue)', hex: '#3498db' }
};

var CATEGORY_ORDER = ['bayanat', 'sirens', 'enemy', 'iran', 'videos', 'allies'];

// ── Table state ──
var _tableSortKey = 'total';
var _tableSortDir = 'desc';
var _tablePage = 1;
var _tablePageSize = 10;
var _tableFullscreen = false;
var _tableFullscreenPageSize = 30;

var TABLE_COLUMNS = [
  { key: 'date', label: '\u0627\u0644\u062A\u0627\u0631\u064A\u062E' },
  { key: 'bayanat', label: '\u0628\u064A\u0627\u0646\u0627\u062A' },
  { key: 'sirens', label: '\u0635\u0641\u0627\u0631\u0627\u062A' },
  { key: 'enemy', label: '\u0639\u062F\u0648' },
  { key: 'iran', label: '\u0625\u064A\u0631\u0627\u0646' },
  { key: 'videos', label: '\u0641\u064A\u062F\u064A\u0648' },
  { key: 'total', label: '\u0625\u062C\u0645\u0627\u0644\u064A' }
];

var TABLE_COLORS = {
  bayanat: 'var(--green)', sirens: 'var(--red)', enemy: 'var(--orange)',
  iran: 'var(--purple)', videos: 'var(--teal)', total: 'var(--accent)'
};

function getTableSQL() {
  var w = buildWhere();
  var pageSize = _tableFullscreen ? _tableFullscreenPageSize : _tablePageSize;
  var offset = (_tablePage - 1) * pageSize;

  var sql = 'SELECT date, ' +
    "SUM(CASE WHEN category='bayanat' THEN 1 ELSE 0 END) as bayanat, " +
    "SUM(CASE WHEN category='sirens' THEN 1 ELSE 0 END) as sirens, " +
    "SUM(CASE WHEN category='enemy' THEN 1 ELSE 0 END) as enemy, " +
    "SUM(CASE WHEN category='iran' THEN 1 ELSE 0 END) as iran, " +
    "SUM(CASE WHEN category='videos' THEN 1 ELSE 0 END) as videos, " +
    'COUNT(*) as total ' +
    'FROM events ' + w.where +
    ' GROUP BY date ORDER BY ' + _tableSortKey + ' ' + _tableSortDir +
    ' LIMIT ' + pageSize + ' OFFSET ' + offset;

  var countSql = 'SELECT COUNT(DISTINCT date) FROM events ' + w.where;

  return { sql: sql, countSql: countSql, params: w.params };
}

function refreshTable() {
  var q = getTableSQL();
  var tableRows = queryRows(q.sql, q.params);
  var totalRows = queryOne(q.countSql, q.params) || 0;
  var pageSize = _tableFullscreen ? _tableFullscreenPageSize : _tablePageSize;
  var totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  renderTable('dataTable', TABLE_COLUMNS, tableRows, TABLE_COLORS, {
    sortKey: _tableSortKey,
    sortDir: _tableSortDir,
    isFullscreen: _tableFullscreen,
    page: _tablePage,
    totalPages: totalPages,
    onSort: function(key) {
      if (_tableSortKey === key) {
        _tableSortDir = _tableSortDir === 'desc' ? 'asc' : 'desc';
      } else {
        _tableSortKey = key;
        _tableSortDir = key === 'date' ? 'asc' : 'desc';
      }
      _tablePage = 1;
      refreshTable();
    },
    onPage: function(page) {
      _tablePage = page;
      refreshTable();
    }
  });
}

function refresh() {
  var w = buildWhere();

  // ── KPIs ──
  var kpiRows = queryRows(
    'SELECT category, COUNT(*) as n FROM events ' + w.where + ' GROUP BY category',
    w.params
  );
  var kpiMap = {};
  kpiRows.forEach(function(r) { kpiMap[r.category] = r.n; });

  var kpis = CATEGORY_ORDER.map(function(cat) {
    return { value: kpiMap[cat] || 0, label: CATEGORY_META[cat].label, color: CATEGORY_META[cat].color };
  });
  renderKPIs('kpiStrip', kpis);

  // Update status
  var totalEvents = 0;
  kpis.forEach(function(k) { totalEvents += k.value; });
  var reportCount = queryOne('SELECT COUNT(*) FROM reports', []);
  var statusEl = document.getElementById('statusText');
  if (statusEl) {
    statusEl.textContent = reportCount + ' \u062A\u0642\u0631\u064A\u0631 | ' +
      totalEvents.toLocaleString('en-US') + ' \u062D\u062F\u062B';
  }

  // ── Time series ──
  var groupFmt = getGroupFormat();
  var state = getState();
  var activeCats = state.categories;

  var tsRows = queryRows(
    "SELECT strftime('" + groupFmt + "', date) AS period, category, COUNT(*) as n " +
    'FROM events ' + w.where + ' GROUP BY period, category ORDER BY period',
    w.params
  );

  var periodSet = [];
  var periodMap = {};
  tsRows.forEach(function(r) {
    if (!periodMap[r.period]) { periodMap[r.period] = {}; periodSet.push(r.period); }
    periodMap[r.period][r.category] = r.n;
  });

  var datasets = activeCats
    .filter(function(cat) { return CATEGORY_META[cat]; })
    .map(function(cat) {
      return {
        data: periodSet.map(function(p) { return (periodMap[p] && periodMap[p][cat]) || 0; }),
        color: CATEGORY_META[cat].hex,
        label: CATEGORY_META[cat].label
      };
    });

  renderLineChart('lineChart', datasets, 220, { xLabels: periodSet, grouping: state.grouping });

  // ── Heatmap ──
  var hmRows = queryRows(
    "SELECT CAST(substr(time, 1, 2) AS INTEGER) AS hour, " +
    "CAST(strftime('%w', date) AS INTEGER) AS dow, " +
    'COUNT(*) as count FROM events ' +
    w.where + " AND time != '' AND length(time) >= 5 " +
    'GROUP BY hour, dow',
    w.params
  );
  renderHeatmap('heatmapPanel', hmRows);

  // ── Top locations ──
  var locWhere = buildWhere();
  var locSql = "SELECT title as name, COUNT(*) as value FROM events " +
    (locWhere.where ? locWhere.where + " AND " : "WHERE ") +
    "category = 'bayanat' AND title != '' " +
    "GROUP BY title ORDER BY value DESC LIMIT 10";
  renderBarChart('barChart', queryRows(locSql, locWhere.params), 'var(--accent)');

  // ── Table ──
  _tablePage = 1;
  refreshTable();
}


// ── Init ──
function onReady(fn) {
  if (document.readyState !== 'loading') fn();
  else document.addEventListener('DOMContentLoaded', fn);
}

onReady(function() {
  var loader = document.getElementById('loader');

  initDB().then(function() {
    var minDate = queryOne('SELECT MIN(date) FROM reports', []);
    var maxDate = queryOne('SELECT MAX(date) FROM reports', []);

    // Default view: current month only (not the entire dataset)
    var now = new Date();
    var yy = now.getFullYear();
    var mm = String(now.getMonth() + 1).padStart(2, '0');
    var monthStart = yy + '-' + mm + '-01';
    var monthEnd = yy + '-' + mm + '-' + String(new Date(yy, now.getMonth() + 1, 0).getDate()).padStart(2, '0');
    // Clamp to available data range
    var defaultStart = monthStart < (minDate || monthStart) ? minDate : monthStart;
    var defaultEnd = monthEnd > (maxDate || monthEnd) ? maxDate : monthEnd;

    initControls(function() { refresh(); }, {
      min: minDate || '2023-10-07',
      max: maxDate || '2026-04-10',
      start: defaultStart,
      end: defaultEnd
    });

    if (loader) loader.style.display = 'none';

    // Setup fullscreen buttons on all 4 panels
    var panels = document.querySelectorAll('.a-panel');
    panels.forEach(function(panel) {
      var isTablePanel = panel.querySelector('#dataTable');
      addFullscreenBtn(panel,
        function() { // onEnter
          if (isTablePanel) {
            _tableFullscreen = true;
            _tablePage = 1;
            refreshTable();
          } else {
            // Re-render charts so they remeasure the (now full-viewport) container.
            // requestAnimationFrame ensures the browser has applied the
            // .a-panel-fs layout before we measure clientHeight/Width.
            requestAnimationFrame(function() { refresh(); });
          }
        },
        function() { // onExit
          if (isTablePanel) {
            _tableFullscreen = false;
            _tablePage = 1;
            refreshTable();
          } else {
            requestAnimationFrame(function() { refresh(); });
          }
        }
      );
    });

    refresh();
  }).catch(function(err) {
    if (loader) {
      loader.querySelector('.load-text').textContent = '\u062E\u0637\u0623: ' + err.message;
      loader.querySelector('.spinner').style.display = 'none';
    }
    console.error('DB init failed:', err);
  });
});
