/* === src/js/analytics/dashboard.js — Analytics page orchestrator === */

import { initDB, queryRows, queryOne } from './db.js';
import { renderLineChart, renderBarChart, renderHeatmap, renderKPIs, renderTable } from './charts.js';
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
    return {
      value: kpiMap[cat] || 0,
      label: CATEGORY_META[cat].label,
      color: CATEGORY_META[cat].color
    };
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

  // Pivot into per-category series
  var periodSet = [];
  var periodMap = {};
  tsRows.forEach(function(r) {
    if (!periodMap[r.period]) {
      periodMap[r.period] = {};
      periodSet.push(r.period);
    }
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

  renderLineChart('lineChart', datasets, 220);

  // ── Heatmap (hour x day-of-week) ──
  var hmRows = queryRows(
    "SELECT CAST(substr(time, 1, 2) AS INTEGER) AS hour, " +
    "CAST(strftime('%w', date) AS INTEGER) AS dow, " +
    'COUNT(*) as count FROM events ' +
    w.where + " AND time != '' AND length(time) >= 5 " +
    'GROUP BY hour, dow',
    w.params
  );
  renderHeatmap('heatmapPanel', hmRows);

  // ── Top locations (bayanat targets) ──
  var locWhere = buildWhere();
  var locParams = locWhere.params.slice();
  var locSql = "SELECT title as name, COUNT(*) as value FROM events " +
    (locWhere.where ? locWhere.where + " AND " : "WHERE ") +
    "category = 'bayanat' AND title != '' " +
    "GROUP BY title ORDER BY value DESC LIMIT 10";
  var locRows = queryRows(locSql, locParams);
  renderBarChart('barChart', locRows, 'var(--accent)');

  // ── Top days table ──
  var tableSql = 'SELECT date, ' +
    "SUM(CASE WHEN category='bayanat' THEN 1 ELSE 0 END) as bayanat, " +
    "SUM(CASE WHEN category='sirens' THEN 1 ELSE 0 END) as sirens, " +
    "SUM(CASE WHEN category='enemy' THEN 1 ELSE 0 END) as enemy, " +
    "SUM(CASE WHEN category='iran' THEN 1 ELSE 0 END) as iran, " +
    'COUNT(*) as total ' +
    'FROM events ' + w.where +
    ' GROUP BY date ORDER BY total DESC LIMIT 10';
  var tableRows = queryRows(tableSql, w.params);

  renderTable('dataTable', [
    { key: 'date', label: '\u0627\u0644\u062A\u0627\u0631\u064A\u062E' },
    { key: 'bayanat', label: '\u0628\u064A\u0627\u0646\u0627\u062A' },
    { key: 'sirens', label: '\u0635\u0641\u0627\u0631\u0627\u062A' },
    { key: 'enemy', label: '\u0639\u062F\u0648' },
    { key: 'iran', label: '\u0625\u064A\u0631\u0627\u0646' },
    { key: 'total', label: '\u0625\u062C\u0645\u0627\u0644\u064A' }
  ], tableRows, {
    bayanat: 'var(--green)',
    sirens: 'var(--red)',
    enemy: 'var(--orange)',
    iran: 'var(--purple)',
    total: 'var(--accent)'
  });
}


// ── Init ──
// Modules are deferred, so DOMContentLoaded may have already fired.
// Use a helper that works either way.
function onReady(fn) {
  if (document.readyState !== 'loading') { fn(); }
  else { document.addEventListener('DOMContentLoaded', fn); }
}

onReady(function() {
  var loader = document.getElementById('loader');

  initDB().then(function() {
    var minDate = queryOne('SELECT MIN(date) FROM reports', []);
    var maxDate = queryOne('SELECT MAX(date) FROM reports', []);

    initControls(function() { refresh(); }, {
      start: minDate || '2023-10-07',
      end: maxDate || '2026-04-10'
    });

    if (loader) loader.style.display = 'none';
    refresh();
  }).catch(function(err) {
    if (loader) {
      loader.querySelector('.load-text').textContent =
        '\u062E\u0637\u0623: ' + err.message;
      loader.querySelector('.spinner').style.display = 'none';
    }
    console.error('DB init failed:', err);
  });
});
