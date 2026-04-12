// src/js/export/build-workbook.js
// Pure function: given query results + date range, produce a SheetJS workbook.
// Requires window.XLSX to be loaded (SheetJS global). The caller lazy-loads it.

function sheetFromRows(headers, rows) {
  const aoa = [headers, ...rows];
  return window.XLSX.utils.aoa_to_sheet(aoa);
}

export function buildWorkbook(results, dateRange) {
  if (!window.XLSX) {
    throw new Error('buildWorkbook: window.XLSX not loaded. Lazy-load SheetJS first.');
  }
  const wb = window.XLSX.utils.book_new();
  wb.Props = {
    Title: `Harbi Analytics ${dateRange.from} to ${dateRange.to}`,
    Author: 'Harbi Reports',
    CreatedDate: new Date(),
  };

  wb.SheetNames.push('KPIs');
  wb.Sheets['KPIs'] = sheetFromRows(
    ['Category', 'Count'],
    (results.kpis || []).map((r) => [r.category, r.n]),
  );

  wb.SheetNames.push('Events Over Time');
  wb.Sheets['Events Over Time'] = sheetFromRows(
    ['Period', 'Bayanat', 'Sirens', 'Enemy', 'Iran', 'Videos', 'Allies'],
    (results.eventsOverTime || []).map((r) => [
      r.period, r.bayanat, r.sirens, r.enemy, r.iran, r.videos, r.allies,
    ]),
  );

  wb.SheetNames.push('Hourly Density');
  wb.Sheets['Hourly Density'] = sheetFromRows(
    ['Hour', 'Count'],
    (results.hourlyDensity || []).map((r) => [r.hour, r.count]),
  );

  wb.SheetNames.push('Most Active Days');
  wb.Sheets['Most Active Days'] = sheetFromRows(
    ['Date', 'Total Events'],
    (results.mostActiveDays || []).map((r) => [r.date, r.total]),
  );

  wb.SheetNames.push('Top Targets');
  wb.Sheets['Top Targets'] = sheetFromRows(
    ['Target', 'Count'],
    (results.topTargets || []).map((r) => [r.target, r.count]),
  );

  wb.SheetNames.push('Raw Data');
  const rawRows = results.rawData || [];
  const rawHeaders = rawRows.length > 0 ? Object.keys(rawRows[0]) : ['(empty)'];
  wb.Sheets['Raw Data'] = sheetFromRows(
    rawHeaders,
    rawRows.map((r) => rawHeaders.map((k) => r[k])),
  );

  return wb;
}
