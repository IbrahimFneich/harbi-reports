// src/js/export/excel-button.js
// Injects the Excel download button on analytics.html.
// Lazy-loads SheetJS on first click, runs the same queries the dashboard uses,
// then builds a workbook via build-workbook.js and triggers download.

import { buildWorkbook } from './build-workbook.js';
import { queryRows } from '../analytics/db.js';
import { buildWhere, getState } from '../analytics/controls.js';

const XLSX_CDN = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
const SVG_NS = 'http://www.w3.org/2000/svg';

function loadXLSX() {
  if (window.XLSX) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = XLSX_CDN;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load SheetJS'));
    document.head.appendChild(s);
  });
}

function makeDownloadIcon() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  const tray = document.createElementNS(SVG_NS, 'path');
  tray.setAttribute('d', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4');
  svg.appendChild(tray);

  const chevron = document.createElementNS(SVG_NS, 'polyline');
  chevron.setAttribute('points', '7 10 12 15 17 10');
  svg.appendChild(chevron);

  const shaft = document.createElementNS(SVG_NS, 'line');
  shaft.setAttribute('x1', '12');
  shaft.setAttribute('y1', '15');
  shaft.setAttribute('x2', '12');
  shaft.setAttribute('y2', '3');
  svg.appendChild(shaft);

  return svg;
}

function createButton() {
  const btn = document.createElement('button');
  btn.className = 'download-btn download-btn-excel';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'تحميل Excel');
  btn.appendChild(makeDownloadIcon());
  const span = document.createElement('span');
  span.textContent = 'تحميل Excel';
  btn.appendChild(span);
  return btn;
}

function runQueries() {
  const w = buildWhere();
  const where = w.where;
  const params = w.params;

  // Top targets reuses the dashboard's approach: bayanat titles only.
  const topWhere = where
    ? where + " AND category = 'bayanat' AND title != ''"
    : "WHERE category = 'bayanat' AND title != ''";

  return {
    kpis: queryRows(
      'SELECT category, COUNT(*) as n FROM events ' + where +
      ' GROUP BY category ORDER BY n DESC',
      params,
    ),
    eventsOverTime: queryRows(
      'SELECT date as period, ' +
      "SUM(CASE WHEN category='bayanat' THEN 1 ELSE 0 END) as bayanat, " +
      "SUM(CASE WHEN category='sirens'  THEN 1 ELSE 0 END) as sirens, " +
      "SUM(CASE WHEN category='enemy'   THEN 1 ELSE 0 END) as enemy, " +
      "SUM(CASE WHEN category='iran'    THEN 1 ELSE 0 END) as iran, " +
      "SUM(CASE WHEN category='videos'  THEN 1 ELSE 0 END) as videos, " +
      "SUM(CASE WHEN category='allies'  THEN 1 ELSE 0 END) as allies " +
      'FROM events ' + where + ' GROUP BY date ORDER BY date',
      params,
    ),
    hourlyDensity: queryRows(
      "SELECT CAST(substr(time, 1, 2) AS INTEGER) as hour, COUNT(*) as count " +
      'FROM events ' + (where ? where + " AND time != '' AND length(time) >= 5 "
                               : "WHERE time != '' AND length(time) >= 5 ") +
      'GROUP BY hour ORDER BY hour',
      params,
    ),
    mostActiveDays: queryRows(
      'SELECT date, COUNT(*) as total FROM events ' + where +
      ' GROUP BY date ORDER BY total DESC LIMIT 20',
      params,
    ),
    topTargets: queryRows(
      'SELECT title as target, COUNT(*) as count FROM events ' + topWhere +
      ' GROUP BY title ORDER BY count DESC LIMIT 30',
      params,
    ),
    rawData: queryRows(
      'SELECT date, time, category, title, subtitle, location, full_text FROM events ' +
      where + ' ORDER BY date, time',
      params,
    ),
  };
}

function downloadWorkbook(wb, filename) {
  window.XLSX.writeFile(wb, filename);
}

export function mountExcelButton(targetSelector) {
  const host = document.querySelector(targetSelector);
  if (!host) {
    console.warn('[excel-button] target not found:', targetSelector);
    return null;
  }
  const btn = createButton();
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      await loadXLSX();
      const state = getState();
      const from = state.dateStart || 'all';
      const to = state.dateEnd || 'all';
      const results = runQueries();
      const wb = buildWorkbook(results, { from, to });
      downloadWorkbook(wb, `harbi-analytics-${from}-to-${to}.xlsx`);
    } catch (err) {
      console.error('[excel-button] export failed', err);
      alert('فشل التصدير: ' + err.message);
    } finally {
      btn.disabled = false;
    }
  });
  host.appendChild(btn);
  return btn;
}
