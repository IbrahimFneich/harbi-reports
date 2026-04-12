/* ============================================================
   spotlight.js — Global Spotlight Search (Ctrl+K or /)
   Complete rewrite with split-pane detail view, category
   filters, date parsing, transliteration, and FTS5 search.
   Uses SQLite FTS5 via sql.js for instant indexed search.
   All data is locally-generated static content from trusted
   Telegram channel posts. No user input is rendered as HTML —
   text highlighting uses safe DOM methods only.
   ============================================================ */

import { initDB, queryRows } from '../analytics/db.js';
import { SEARCH_ALIASES, ALIAS_KEYS_SORTED, resolveAliases } from './aliases.js';
import { keyboardTransliterate, phoneticTransliterate, hasLatin } from './transliterate.js';
import { parseDate } from './date-parser.js';

// ── Config ─────────────────────────────────────────────────
var CATEGORIES = {
  bayanat: { label: '\u0628\u064A\u0627\u0646\u0627\u062A', color: '#d4a017' },
  sirens:  { label: '\u0635\u0641\u0627\u0631\u0627\u062A', color: '#e74c3c' },
  enemy:   { label: '\u0625\u0639\u0644\u0627\u0645 \u0627\u0644\u0639\u062F\u0648', color: '#3498db' },
  iran:    { label: '\u0625\u064A\u0631\u0627\u0646', color: '#9b59b6' },
  videos:  { label: '\u0641\u064A\u062F\u064A\u0648', color: '#2ecc71' },
  allies:  { label: '\u062D\u0644\u0641\u0627\u0621', color: '#e67e22' }
};

var CAT_KEYS = Object.keys(CATEGORIES);

var MAX_RESULTS = 80;
var MAX_VISIBLE = 40;
var DEBOUNCE_MS = 100;
var SUGGESTION_COUNT = 8;

var MONTH_NAMES = {
  1: '\u0643\u0627\u0646\u0648\u0646 \u0627\u0644\u062B\u0627\u0646\u064A',
  2: '\u0634\u0628\u0627\u0637',
  3: '\u0622\u0630\u0627\u0631',
  4: '\u0646\u064A\u0633\u0627\u0646',
  5: '\u0623\u064A\u0627\u0631',
  6: '\u062D\u0632\u064A\u0631\u0627\u0646',
  7: '\u062A\u0645\u0648\u0632',
  8: '\u0622\u0628',
  9: '\u0623\u064A\u0644\u0648\u0644',
  10: '\u062A\u0634\u0631\u064A\u0646 \u0627\u0644\u0623\u0648\u0644',
  11: '\u062A\u0634\u0631\u064A\u0646 \u0627\u0644\u062B\u0627\u0646\u064A',
  12: '\u0643\u0627\u0646\u0648\u0646 \u0627\u0644\u0623\u0648\u0644'
};

// ── State ──────────────────────────────────────────────────
var _dbReady = false;
var _overlay = null;
var _input = null;
var _resultsList = null;
var _detailPane = null;
var _filtersEl = null;
var _statsBar = null;
var _dateChip = null;
var _langIndicator = null;
var _selIdx = -1;
var _activeFlt = 'all';
var _allResults = [];
var _fltResults = [];
var _debounceTimer = null;
var _backendPromise = null;
var _lastQuery = '';
var _built = false;
var _lastSearchTerms = [];

// ── Mobile detection ──────────────────────────────────────
function isMobileView() {
  return typeof window !== 'undefined' &&
    window.matchMedia && window.matchMedia('(max-width: 680px)').matches;
}

function closeMobileDetail() {
  if (_detailPane) _detailPane.classList.remove('mobile-open');
}

// ── Arabic normalization ──────────────────────────────────
export function normalizeAr(s) {
  if (!s) return '';
  return s
    .replace(/[\u0625\u0623\u0622\u0671]/g, '\u0627')
    .replace(/\u0629/g, '\u0647')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0624/g, '\u0648')
    .replace(/\u0626/g, '\u064A')
    .replace(/\u0651/g, '')
    .replace(/[\u064B-\u065F]/g, '')
    .toLowerCase();
}

// ── Date formatting helper ────────────────────────────────
function fmtDate(d) {
  var p = d.split('-');
  return parseInt(p[2], 10) + ' ' + (MONTH_NAMES[parseInt(p[1], 10)] || '') + ' ' + p[0];
}

// ── Backend loading ───────────────────────────────────────
function loadBackend() {
  if (_backendPromise) return _backendPromise;
  try {
    _backendPromise = initDB().then(function() {
      _dbReady = true;
    }).catch(function(err) {
      console.error('[spotlight] DB init failed:', err);
      _dbReady = false;
    });
  } catch (ex) {
    console.error('[spotlight] initDB threw:', ex);
    _backendPromise = Promise.resolve();
  }
  return _backendPromise;
}

// ── Search pipeline ───────────────────────────────────────

function doSearch(rawQuery) {
  if (!rawQuery || rawQuery.trim().length < 1) {
    return { results: [], dateInfo: { type: null }, translitMode: false };
  }

  var dateInfo = parseDate(rawQuery);
  var textQuery = (dateInfo.type ? dateInfo.remaining : rawQuery).trim();
  var translitMode = false;
  var results = [];

  // Date-only query: return all events for that date/range
  if (dateInfo.type && !textQuery) {
    var dateFilter = { type: dateInfo.type, start: dateInfo.start, end: dateInfo.end };
    results = queryDB([], dateFilter);
    _lastSearchTerms = [];
    return { results: results, dateInfo: dateInfo, translitMode: false };
  }

  // Resolve aliases on the text portion
  var resolved = resolveAliases(textQuery);
  var words = resolved.trim().split(/\s+/).filter(function(w) { return w.length > 0; });
  var dateFilter2 = dateInfo.type ? { type: dateInfo.type, start: dateInfo.start, end: dateInfo.end } : null;

  if (hasLatin(textQuery)) {
    // Generate keyboard + phonetic transliterations
    translitMode = true;
    var kbTranslit = keyboardTransliterate(textQuery);
    var phTranslit = phoneticTransliterate(textQuery);

    var kbWords = kbTranslit.trim().split(/\s+/).filter(function(w) { return w.length > 0; });
    var phWords = phTranslit.trim().split(/\s+/).filter(function(w) { return w.length > 0; });

    // Search all three candidates
    var r1 = queryDB(words, dateFilter2);
    var r2 = queryDB(kbWords, dateFilter2);
    var r3 = queryDB(phWords, dateFilter2);

    results = dedupeResults(r1.concat(r2).concat(r3));
    _lastSearchTerms = words.concat(kbWords).concat(phWords);
  } else {
    // Pure Arabic
    results = queryDB(words, dateFilter2);
    _lastSearchTerms = words;
  }

  // Sort by date DESC, time DESC
  results.sort(function(a, b) {
    if (a.date > b.date) return -1;
    if (a.date < b.date) return 1;
    if ((a.time || '') > (b.time || '')) return -1;
    if ((a.time || '') < (b.time || '')) return 1;
    return 0;
  });

  return { results: results, dateInfo: dateInfo, translitMode: translitMode };
}

function queryDB(words, dateFilter) {
  if (!_dbReady) return [];

  var srcIdxExpr = '(SELECT COUNT(*) FROM events e2 WHERE e2.date = e.date AND e2.category = e.category AND e2.id < e.id)';
  var selectCols = 'e.id, e.category as cat, e.date, e.time, e.op_time, e.title, e.subtitle, e.badge, e.tags, e.location, e.full_text, e.lat, e.lng, ' + srcIdxExpr + ' as src_idx';
  var results = [];

  // Build date clause
  var dateClauses = [];
  var dateParams = [];
  if (dateFilter) {
    if (dateFilter.type === 'single') {
      dateClauses.push('e.date = ?');
      dateParams.push(dateFilter.start);
    } else if (dateFilter.type === 'range') {
      dateClauses.push('e.date >= ? AND e.date <= ?');
      dateParams.push(dateFilter.start, dateFilter.end);
    }
  }

  // No search words — date-only query
  if (words.length === 0) {
    var sql = 'SELECT ' + selectCols + ' FROM events e';
    if (dateClauses.length > 0) {
      sql += ' WHERE ' + dateClauses.join(' AND ');
    }
    sql += ' ORDER BY e.date ASC, e.time ASC LIMIT ' + MAX_RESULTS;
    try {
      results = queryRows(sql, dateParams);
    } catch (ex) {
      console.error('[spotlight] date query error:', ex);
    }
    return results;
  }

  // Try FTS5 MATCH if all words >= 2 chars
  if (words.every(function(w) { return w.length >= 2; })) {
    var parts = words.map(function(w) {
      var clean = w.replace(/["\*\(\)\+\^\:]/g, '').replace(/\b(AND|OR|NOT|NEAR)\b/gi, '');
      return clean.length > 0 ? '"' + clean + '"*' : '';
    }).filter(function(p) { return p.length > 0; });
    if (parts.length === 0) { return results; }
    var ftsQuery = parts.join(' AND ');
    try {
      var ftsSql = 'SELECT ' + selectCols + ' FROM events_fts fts JOIN events e ON e.id = fts.rowid WHERE events_fts MATCH ?';
      var ftsParams = [ftsQuery];
      if (dateClauses.length > 0) {
        ftsSql += ' AND ' + dateClauses.join(' AND ');
        ftsParams = ftsParams.concat(dateParams);
      }
      ftsSql += ' ORDER BY e.date DESC, e.time DESC LIMIT ' + MAX_RESULTS;
      results = queryRows(ftsSql, ftsParams);
      if (results.length > 0) return results;
    } catch (ex) {
      // FTS syntax error — fall through to LIKE
    }
  }

  // Fallback: LIKE search
  var likeClauses = words.map(function() {
    return '(e.title LIKE ? OR e.location LIKE ? OR e.subtitle LIKE ? OR e.full_text LIKE ?)';
  });
  var likeParams = [];
  words.forEach(function(w) {
    var p = '%' + w + '%';
    likeParams.push(p, p, p, p);
  });

  var allClauses = likeClauses.join(' AND ');
  if (dateClauses.length > 0) {
    allClauses += ' AND ' + dateClauses.join(' AND ');
    likeParams = likeParams.concat(dateParams);
  }

  var likeSql = 'SELECT ' + selectCols + ' FROM events e WHERE ' + allClauses + ' ORDER BY e.date DESC, e.time DESC LIMIT ' + MAX_RESULTS;
  try {
    results = queryRows(likeSql, likeParams);
  } catch (ex) {
    console.error('[spotlight] LIKE query error:', ex);
  }
  return results;
}

function dedupeResults(results) {
  var seen = {};
  var out = [];
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    var key = r.date + ':' + r.cat + ':' + r.src_idx;
    if (!seen[key]) {
      seen[key] = true;
      out.push(r);
    }
  }
  return out;
}

// ── DOM building ──────────────────────────────────────────

function buildDOM() {
  if (_built) return;
  _built = true;

  // Overlay
  var overlay = document.createElement('div');
  overlay.id = 'spotlightOverlay';

  // Modal
  var modal = document.createElement('div');
  modal.className = 'sl-modal';

  // ---- Search row ----
  var searchRow = document.createElement('div');
  searchRow.className = 'sl-search-row';

  var searchIcon = document.createElement('span');
  searchIcon.className = 'sl-search-icon';
  searchIcon.textContent = '\uD83D\uDD0D';
  searchRow.appendChild(searchIcon);

  var input = document.createElement('input');
  input.className = 'sl-input';
  input.type = 'text';
  input.dir = 'rtl';
  input.placeholder = '\u0628\u062D\u062B \u0641\u064A \u062C\u0645\u064A\u0639 \u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631...';
  input.setAttribute('autocomplete', 'off');
  searchRow.appendChild(input);

  var dateChip = document.createElement('span');
  dateChip.className = 'sl-date-chip';
  searchRow.appendChild(dateChip);

  var langIndicator = document.createElement('span');
  langIndicator.className = 'sl-lang-indicator';
  searchRow.appendChild(langIndicator);

  var escBadge = document.createElement('span');
  escBadge.className = 'sl-esc-badge';
  escBadge.textContent = 'ESC';
  escBadge.addEventListener('click', closeSL);
  searchRow.appendChild(escBadge);

  modal.appendChild(searchRow);

  // ---- Info bar ----
  var infoBar = document.createElement('div');
  infoBar.className = 'sl-info-bar';

  var backendLabel = document.createElement('span');
  backendLabel.id = 'slBackendLabel';
  backendLabel.textContent = '\u062C\u0627\u0631\u064D \u0627\u0644\u062A\u062D\u0645\u064A\u0644...';
  infoBar.appendChild(backendLabel);

  var statsBar = document.createElement('div');
  statsBar.className = 'sl-stats-bar';
  infoBar.appendChild(statsBar);

  modal.appendChild(infoBar);

  // ---- Filters ----
  var filtersEl = document.createElement('div');
  filtersEl.className = 'sl-filters';
  modal.appendChild(filtersEl);

  // ---- Split pane ----
  var split = document.createElement('div');
  split.className = 'sl-split';

  var resultsList = document.createElement('div');
  resultsList.className = 'sl-results';
  split.appendChild(resultsList);

  var detailPane = document.createElement('div');
  detailPane.className = 'sl-detail';
  split.appendChild(detailPane);

  modal.appendChild(split);

  // ---- Footer ----
  var footer = document.createElement('div');
  footer.className = 'sl-footer';

  var hints = [
    { key: '\u2191\u2193', label: '\u062A\u0646\u0642\u0651\u0644' },
    { key: '\u23CE', label: '\u0641\u062A\u062D' },
    { key: '\u2318\u23CE', label: '\u062A\u0628\u0648\u064A\u0628 \u062C\u062F\u064A\u062F' },
    { key: 'Tab', label: '\u062A\u0635\u0641\u064A\u0629' },
    { key: 'esc', label: '\u0625\u063A\u0644\u0627\u0642' }
  ];

  for (var hi = 0; hi < hints.length; hi++) {
    var hintSpan = document.createElement('span');
    var kbd = document.createElement('kbd');
    kbd.textContent = hints[hi].key;
    hintSpan.appendChild(kbd);
    hintSpan.appendChild(document.createTextNode(' ' + hints[hi].label));
    footer.appendChild(hintSpan);
  }

  modal.appendChild(footer);

  // Assemble
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Store refs
  _overlay = overlay;
  _input = input;
  _resultsList = resultsList;
  _detailPane = detailPane;
  _filtersEl = filtersEl;
  _statsBar = statsBar;
  _dateChip = dateChip;
  _langIndicator = langIndicator;

  bindEvents();
}

// ── Rendering ─────────────────────────────────────────────

function renderResults(searchResult) {
  var results = searchResult.results;
  var dateInfo = searchResult.dateInfo;
  var translitMode = searchResult.translitMode;

  _allResults = results;

  // Compute per-category counts
  var counts = {};
  for (var ci = 0; ci < CAT_KEYS.length; ci++) counts[CAT_KEYS[ci]] = 0;
  for (var ri = 0; ri < _allResults.length; ri++) {
    var cat = _allResults[ri].cat;
    if (counts[cat] !== undefined) counts[cat]++;
  }

  // Render filter pills
  _filtersEl.textContent = '';

  // "All" pill
  var allPill = document.createElement('button');
  allPill.className = 'sl-filter-pill' + (_activeFlt === 'all' ? ' active' : '');
  allPill.textContent = '\u0627\u0644\u0643\u0644';
  var allCount = document.createElement('span');
  allCount.className = 'sl-filter-count';
  allCount.textContent = ' ' + _allResults.length;
  allPill.appendChild(allCount);
  allPill.addEventListener('click', function() { setFilter('all'); });
  _filtersEl.appendChild(allPill);

  // Category pills
  for (var fi = 0; fi < CAT_KEYS.length; fi++) {
    var fk = CAT_KEYS[fi];
    if (counts[fk] === 0) continue;
    var pill = document.createElement('button');
    pill.className = 'sl-filter-pill' + (_activeFlt === fk ? ' active' : '');
    pill.textContent = CATEGORIES[fk].label;
    var countSpan = document.createElement('span');
    countSpan.className = 'sl-filter-count';
    countSpan.textContent = ' ' + counts[fk];
    pill.appendChild(countSpan);
    (function(key) {
      pill.addEventListener('click', function() { setFilter(key); });
    })(fk);
    _filtersEl.appendChild(pill);
  }

  // Update stats bar
  _statsBar.textContent = '';
  for (var si = 0; si < CAT_KEYS.length; si++) {
    var sk = CAT_KEYS[si];
    if (counts[sk] === 0) continue;
    var statItem = document.createElement('span');
    statItem.className = 'sl-stat-item';
    var dot = document.createElement('span');
    dot.className = 'sl-stat-dot';
    dot.style.backgroundColor = CATEGORIES[sk].color;
    statItem.appendChild(dot);
    statItem.appendChild(document.createTextNode(counts[sk]));
    _statsBar.appendChild(statItem);
  }

  // Date chip
  if (dateInfo && dateInfo.type) {
    _dateChip.textContent = dateInfo.label;
    _dateChip.classList.add('visible');
  } else {
    _dateChip.classList.remove('visible');
    _dateChip.textContent = '';
  }

  // Lang indicator
  if (translitMode) {
    _langIndicator.textContent = 'EN \u2192 AR';
    _langIndicator.classList.add('visible');
  } else {
    _langIndicator.classList.remove('visible');
    _langIndicator.textContent = '';
  }

  // Apply filter
  _fltResults = _activeFlt === 'all' ? _allResults : _allResults.filter(function(r) { return r.cat === _activeFlt; });

  // Render items
  _resultsList.textContent = '';
  _selIdx = -1;

  if (_fltResults.length === 0) {
    var noResults = document.createElement('div');
    noResults.className = 'sl-no-results';
    noResults.textContent = '\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u062A\u0627\u0626\u062C';
    _resultsList.appendChild(noResults);
    renderDetailEmpty();
    return;
  }

  var showCount = Math.min(_fltResults.length, MAX_VISIBLE);
  for (var ii = 0; ii < showCount; ii++) {
    _resultsList.appendChild(buildResultItem(_fltResults[ii], ii));
  }

  if (_fltResults.length > MAX_VISIBLE) {
    var moreEl = document.createElement('div');
    moreEl.className = 'sl-no-results';
    moreEl.textContent = '+' + (_fltResults.length - MAX_VISIBLE) + ' \u0646\u062A\u064A\u062C\u0629 \u0623\u062E\u0631\u0649';
    _resultsList.appendChild(moreEl);
  }

  // Select first result
  selectResult(0);

  // Update backend label
  if (_dbReady) {
    var bl = document.getElementById('slBackendLabel');
    if (bl) bl.textContent = 'SQLite FTS5';
  }
}

function buildResultItem(item, idx) {
  var catInfo = CATEGORIES[item.cat] || { label: '', color: '#6b7d92' };

  var row = document.createElement('div');
  row.className = 'sl-result-item';
  row.setAttribute('data-idx', String(idx));

  var resultDot = document.createElement('span');
  resultDot.className = 'sl-result-dot';
  resultDot.style.backgroundColor = catInfo.color;
  row.appendChild(resultDot);

  var body = document.createElement('div');
  body.className = 'sl-result-body';

  var titleEl = document.createElement('div');
  titleEl.className = 'sl-result-title';
  var titleText = item.title || item.location || item.subtitle || '';
  if (titleText.length > 80) titleText = titleText.substring(0, 80) + '...';
  titleEl.textContent = titleText;
  body.appendChild(titleEl);

  var sub = document.createElement('div');
  sub.className = 'sl-result-sub';

  var catBadge = document.createElement('span');
  catBadge.className = 'sl-result-cat';
  catBadge.style.backgroundColor = 'rgba(' + hexToRgb(catInfo.color) + ', 0.15)';
  catBadge.style.color = catInfo.color;
  catBadge.textContent = catInfo.label;
  sub.appendChild(catBadge);

  var dateSpan = document.createElement('span');
  dateSpan.textContent = fmtDate(item.date);
  sub.appendChild(dateSpan);

  if (item.time) {
    var timeSpan = document.createElement('span');
    timeSpan.className = 'sl-result-time';
    timeSpan.textContent = item.time;
    sub.appendChild(timeSpan);
  }

  body.appendChild(sub);
  row.appendChild(body);

  (function(i) {
    row.addEventListener('click', function() {
      selectResult(i);
      if (isMobileView() && _detailPane) _detailPane.classList.add('mobile-open');
    });
  })(idx);

  return row;
}

function renderDetail(item) {
  _detailPane.textContent = '';
  if (!item) { renderDetailEmpty(); return; }

  var catInfo = CATEGORIES[item.cat] || { label: '', color: '#6b7d92' };

  // Mobile back button (only rendered on small screens)
  if (isMobileView()) {
    var backBtn = document.createElement('button');
    backBtn.className = 'sl-detail-back';
    backBtn.type = 'button';
    var backArrow = document.createElement('span');
    backArrow.className = 'sl-detail-back-arrow';
    backArrow.textContent = '\u2192';
    backBtn.appendChild(backArrow);
    backBtn.appendChild(document.createTextNode(' \u0627\u0644\u0646\u062A\u0627\u0626\u062C'));
    backBtn.addEventListener('click', closeMobileDetail);
    _detailPane.appendChild(backBtn);
  }

  // Badge row
  var badgeRow = document.createElement('div');
  badgeRow.className = 'sl-detail-badge-row';

  var catBadge = document.createElement('span');
  catBadge.className = 'sl-detail-category';
  catBadge.style.backgroundColor = 'rgba(' + hexToRgb(catInfo.color) + ', 0.15)';
  catBadge.style.color = catInfo.color;
  catBadge.textContent = catInfo.label;
  badgeRow.appendChild(catBadge);

  var dateEl = document.createElement('span');
  dateEl.className = 'sl-detail-date';
  if (item.time) {
    var timeNode = document.createElement('span');
    timeNode.textContent = item.time;
    dateEl.appendChild(timeNode);
    dateEl.appendChild(document.createTextNode(' \u2022 '));
  }
  // Arabic date: "10 نيسان"
  var dp = item.date.split('-');
  var dayNum = parseInt(dp[2], 10);
  var monthName = MONTH_NAMES[parseInt(dp[1], 10)] || '';
  dateEl.appendChild(document.createTextNode(dayNum + ' ' + monthName));
  // Small styled ISO date: "10/04/2026"
  var isoHint = document.createElement('span');
  isoHint.style.cssText = 'font-size:9px;opacity:0.5;margin-right:6px;margin-left:6px';
  isoHint.textContent = dp[2] + '/' + dp[1] + '/' + dp[0];
  dateEl.appendChild(isoHint);
  badgeRow.appendChild(dateEl);

  _detailPane.appendChild(badgeRow);

  // Title
  var titleEl = document.createElement('div');
  titleEl.className = 'sl-detail-title';
  titleEl.appendChild(highlightText(item.title || item.location || '', _lastSearchTerms));
  _detailPane.appendChild(titleEl);

  // Divider
  var div1 = document.createElement('div');
  div1.className = 'sl-detail-divider';
  _detailPane.appendChild(div1);

  // Category-specific metadata
  var metaGrid = document.createElement('div');
  metaGrid.className = 'sl-detail-meta-grid';

  if (item.cat === 'bayanat') {
    if (item.badge) addMetaRow(metaGrid, '\u0628\u064A\u0627\u0646 #', item.badge);
    if (item.subtitle) addMetaRow(metaGrid, '\u0627\u0644\u0633\u0644\u0627\u062D', item.subtitle);
    if (item.tags) {
      var parts = item.tags.split(',');
      for (var t = 0; t < parts.length; t++) {
        var part = parts[t].trim();
        if (part.indexOf(':') !== -1) {
          var kv = part.split(':');
          addMetaRow(metaGrid, kv[0].trim(), kv[1].trim());
        }
      }
    }
    if (item.title) addMetaRow(metaGrid, '\u0627\u0644\u0647\u062F\u0641', item.title);
  } else if (item.cat === 'sirens') {
    if (item.location) addMetaRow(metaGrid, '\u0627\u0644\u0645\u0648\u0642\u0639', item.location);
  } else if (item.cat === 'enemy' || item.cat === 'iran') {
    if (item.subtitle) addMetaRow(metaGrid, '\u0627\u0644\u0645\u0635\u062F\u0631', item.subtitle);
  } else if (item.cat === 'videos') {
    if (item.title) addMetaRow(metaGrid, '\u0627\u0644\u0648\u0635\u0641', item.title);
  } else if (item.cat === 'allies') {
    if (item.subtitle) addMetaRow(metaGrid, '\u0627\u0644\u0639\u0644\u0645', item.subtitle);
    if (item.title) addMetaRow(metaGrid, '\u0627\u0644\u0645\u0644\u062E\u0635', item.title);
  }

  if (metaGrid.childNodes.length > 0) {
    _detailPane.appendChild(metaGrid);
  }

  // Tags row
  if (item.tags) {
    var tagsContainer = document.createElement('div');
    tagsContainer.className = 'sl-detail-tags';
    var tagParts = item.tags.split(',');
    for (var ti = 0; ti < tagParts.length; ti++) {
      var tagText = tagParts[ti].trim();
      if (!tagText) continue;
      var tagEl = document.createElement('span');
      tagEl.className = 'sl-detail-tag';
      tagEl.textContent = tagText;
      tagsContainer.appendChild(tagEl);
    }
    _detailPane.appendChild(tagsContainer);
  }

  // Divider
  var div2 = document.createElement('div');
  div2.className = 'sl-detail-divider';
  _detailPane.appendChild(div2);

  // Full text
  if (item.full_text) {
    var ftLabel = document.createElement('div');
    ftLabel.className = 'sl-detail-section-label';
    ftLabel.textContent = '\u0627\u0644\u0646\u0635 \u0627\u0644\u0643\u0627\u0645\u0644';
    _detailPane.appendChild(ftLabel);

    var ftEl = document.createElement('div');
    ftEl.className = 'sl-detail-full-text';
    ftEl.appendChild(highlightText(item.full_text, _lastSearchTerms));
    _detailPane.appendChild(ftEl);
  }

  // Open button
  var openBtn = document.createElement('button');
  openBtn.className = 'sl-detail-open-btn';
  openBtn.textContent = '\u0641\u062A\u062D \u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0643\u0627\u0645\u0644 \u2190';
  openBtn.addEventListener('click', function() { navTo(item); });
  _detailPane.appendChild(openBtn);

  // Related events (3 other events from same day)
  renderRelated(item);
}

function renderRelated(item) {
  if (!_dbReady) return;

  var related;
  try {
    related = queryRows(
      'SELECT e.id, e.category as cat, e.date, e.time, e.title, e.location, e.subtitle, ' +
      '(SELECT COUNT(*) FROM events e2 WHERE e2.date = e.date AND e2.category = e.category AND e2.id < e.id) as src_idx ' +
      'FROM events e WHERE e.date = ? AND e.id != ? ORDER BY e.time DESC LIMIT 3',
      [item.date, item.id]
    );
  } catch (ex) {
    return;
  }

  if (!related || related.length === 0) return;

  var relSection = document.createElement('div');
  relSection.className = 'sl-related';

  var relLabel = document.createElement('div');
  relLabel.className = 'sl-related-label';
  relLabel.textContent = '\u0623\u062D\u062F\u0627\u062B \u0645\u0631\u062A\u0628\u0637\u0629';
  relSection.appendChild(relLabel);

  for (var ri = 0; ri < related.length; ri++) {
    var rel = related[ri];
    var relCat = CATEGORIES[rel.cat] || { label: '', color: '#6b7d92' };

    var relItem = document.createElement('div');
    relItem.className = 'sl-related-item';

    var relDot = document.createElement('span');
    relDot.className = 'sl-related-dot';
    relDot.style.backgroundColor = relCat.color;
    relItem.appendChild(relDot);

    relItem.appendChild(document.createTextNode(rel.title || rel.location || rel.subtitle || ''));

    (function(r) {
      relItem.addEventListener('click', function() {
        navTo({ date: r.date, cat: r.cat, src_idx: r.src_idx });
      });
    })(rel);

    relSection.appendChild(relItem);
  }

  _detailPane.appendChild(relSection);
}

function renderDetailEmpty() {
  _detailPane.textContent = '';
  var empty = document.createElement('div');
  empty.className = 'sl-detail-empty';

  var icon = document.createElement('div');
  icon.className = 'sl-detail-empty-icon';
  icon.textContent = '\uD83D\uDD0D';
  empty.appendChild(icon);

  var text = document.createElement('div');
  text.textContent = '\u0627\u062E\u062A\u0631 \u0646\u062A\u064A\u062C\u0629 \u0644\u0639\u0631\u0636 \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644';
  empty.appendChild(text);

  _detailPane.appendChild(empty);
}

function highlightText(text, terms) {
  if (!terms || terms.length === 0 || !text) return document.createTextNode(text || '');

  var normTerms = terms.map(function(t) { return normalizeAr(t); })
    .filter(function(t) { return t.length > 1; });
  if (normTerms.length === 0) return document.createTextNode(text);

  // Build position map: normMap[i] = index in original text for normalized char i
  var normChars = [];
  var normMap = [];
  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    var norm = normalizeAr(ch);
    if (norm.length > 0) {
      normChars.push(norm);
      normMap.push(i);
    }
    // If norm is empty (diacritic removed), skip — no entry in normMap
  }
  var normText = normChars.join('');

  // Build regex
  var escaped = normTerms.map(function(t) {
    return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  var pattern;
  try {
    pattern = new RegExp('(' + escaped.join('|') + ')', 'gi');
  } catch (ex) {
    return document.createTextNode(text);
  }

  // Find matches in normalized text, map back to original positions
  var frag = document.createDocumentFragment();
  var lastOrigIdx = 0;
  var match;
  while ((match = pattern.exec(normText)) !== null) {
    var origStart = normMap[match.index];
    var origEnd = (match.index + match[0].length < normMap.length)
      ? normMap[match.index + match[0].length]
      : text.length;

    // Text before match
    if (origStart > lastOrigIdx) {
      frag.appendChild(document.createTextNode(text.substring(lastOrigIdx, origStart)));
    }
    // Highlighted match
    var hlSpan = document.createElement('span');
    hlSpan.className = 'sl-highlight';
    hlSpan.textContent = text.substring(origStart, origEnd);
    frag.appendChild(hlSpan);
    lastOrigIdx = origEnd;
  }
  // Remaining text
  if (lastOrigIdx < text.length) {
    frag.appendChild(document.createTextNode(text.substring(lastOrigIdx)));
  }

  // If nothing matched, return plain text node
  if (lastOrigIdx === 0) return document.createTextNode(text);

  return frag;
}

// ── Suggestions pool (shuffled on each open) ─────────────
var SUGGESTIONS = [
  { en: 'merkava', ar: '\u0645\u064A\u0631\u0643\u0627\u0641\u0627', icon: '\uD83D\uDEE1' },
  { en: 'drone', ar: '\u0645\u0633\u064A\u0651\u0631\u0629', icon: '\u2708' },
  { en: 'haifa', ar: '\u062D\u064A\u0641\u0627', icon: '\uD83D\uDCCD' },
  { en: 'tel aviv', ar: '\u062A\u0644 \u0623\u0628\u064A\u0628', icon: '\uD83D\uDCCD' },
  { en: 'gaza', ar: '\u063A\u0632\u0629', icon: '\uD83D\uDCCD' },
  { en: 'hezbollah', ar: '\u062D\u0632\u0628 \u0627\u0644\u0644\u0647', icon: '\u2694' },
  { en: 'qassam', ar: '\u0627\u0644\u0642\u0633\u0627\u0645', icon: '\u2694' },
  { en: 'missile', ar: '\u0635\u0627\u0631\u0648\u062E', icon: '\uD83D\uDE80' },
  { en: 'siren', ar: '\u0635\u0641\u0627\u0631\u0627\u062A', icon: '\uD83D\uDD14' },
  { en: 'ambush', ar: '\u0643\u0645\u064A\u0646', icon: '\u2694' },
  { en: 'mortar', ar: '\u0647\u0627\u0648\u0646', icon: '\uD83D\uDCA5' },
  { en: 'killed', ar: '\u0642\u062A\u0644\u0649', icon: '\u26A0' },
  { en: 'netzarim', ar: '\u0646\u062A\u0633\u0627\u0631\u064A\u0645', icon: '\uD83D\uDCCD' },
  { en: 'rafah', ar: '\u0631\u0641\u062D', icon: '\uD83D\uDCCD' },
  { en: 'jenin', ar: '\u062C\u0646\u064A\u0646', icon: '\uD83D\uDCCD' },
  { en: 'airstrike', ar: '\u063A\u0627\u0631\u0629 \u062C\u0648\u064A\u0629', icon: '\uD83D\uDCA5' },
  { en: 'iron dome', ar: '\u0627\u0644\u0642\u0628\u0629 \u0627\u0644\u062D\u062F\u064A\u062F\u064A\u0629', icon: '\uD83D\uDEE1' },
  { en: 'beirut', ar: '\u0628\u064A\u0631\u0648\u062A', icon: '\uD83D\uDCCD' },
  { en: 'sniper', ar: '\u0642\u0646\u0635', icon: '\uD83C\uDFAF' },
  { en: 'ceasefire', ar: '\u0648\u0642\u0641 \u0625\u0637\u0644\u0627\u0642 \u0627\u0644\u0646\u0627\u0631', icon: '\u270B' },
  { en: 'today', ar: '\u0627\u0644\u064A\u0648\u0645', icon: '\uD83D\uDCC5' },
  { en: 'yesterday', ar: '\u0623\u0645\u0633', icon: '\uD83D\uDCC5' },
  { en: 'last week', ar: '\u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0627\u0644\u0645\u0627\u0636\u064A', icon: '\uD83D\uDCC5' },
  { en: 'kornet', ar: '\u0643\u0648\u0631\u0646\u064A\u062A', icon: '\uD83D\uDCA5' },
  { en: 'golan', ar: '\u0627\u0644\u062C\u0648\u0644\u0627\u0646', icon: '\uD83D\uDCCD' },
  { en: 'houthis', ar: '\u0623\u0646\u0635\u0627\u0631 \u0627\u0644\u0644\u0647', icon: '\u2694' },
  { en: 'settlement', ar: '\u0645\u0633\u062A\u0648\u0637\u0646\u0629', icon: '\uD83C\uDFD8' },
  { en: 'artillery', ar: '\u0645\u062F\u0641\u0639\u064A\u0629', icon: '\uD83D\uDCA5' }
];

function shuffleArray(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function renderEmpty() {
  _resultsList.textContent = '';
  _filtersEl.textContent = '';
  _statsBar.textContent = '';
  _dateChip.classList.remove('visible');
  _langIndicator.classList.remove('visible');
  _allResults = [];
  _fltResults = [];
  _selIdx = -1;

  var sugDiv = document.createElement('div');
  sugDiv.className = 'sl-recent';

  var sugLabel = document.createElement('div');
  sugLabel.className = 'sl-recent-label';
  sugLabel.textContent = '\u062C\u0631\u0651\u0628 \u0627\u0644\u0628\u062D\u062B \u0639\u0646';
  sugDiv.appendChild(sugLabel);

  var picked = shuffleArray(SUGGESTIONS).slice(0, SUGGESTION_COUNT);
  for (var si = 0; si < picked.length; si++) {
    var item = picked[si];
    var row = document.createElement('div');
    row.className = 'sl-recent-item';

    var icon = document.createElement('span');
    icon.className = 'sl-recent-icon';
    icon.textContent = item.icon;
    row.appendChild(icon);

    var label = document.createElement('span');
    label.style.cssText = 'flex:1';
    label.textContent = item.ar;
    row.appendChild(label);

    var hint = document.createElement('span');
    hint.style.cssText = 'font-size:10px;color:var(--sl-text-muted);direction:ltr;font-family:monospace';
    hint.textContent = item.en;
    row.appendChild(hint);

    (function(q) {
      row.addEventListener('click', function() {
        _input.value = q;
        _input.dispatchEvent(new Event('input'));
      });
    })(item.en);

    sugDiv.appendChild(row);
  }

  _resultsList.appendChild(sugDiv);
  renderDetailEmpty();
}

// (search history removed — using shuffled suggestions instead)

// ── Keyboard navigation & selection ───────────────────────

function selectResult(idx) {
  if (idx < 0 || idx >= _fltResults.length) return;

  // Remove previous selection
  var prev = _resultsList.querySelector('.sl-result-item.selected');
  if (prev) prev.classList.remove('selected');

  _selIdx = idx;

  var el = _resultsList.querySelector('.sl-result-item[data-idx="' + idx + '"]');
  if (el) {
    el.classList.add('selected');
    el.scrollIntoView({ block: 'nearest' });
  }

  renderDetail(_fltResults[idx]);
}

function moveSel(delta) {
  if (_fltResults.length === 0) return;
  var n = _selIdx + delta;
  var max = Math.min(_fltResults.length, MAX_VISIBLE) - 1;
  if (n < 0) n = max;
  if (n > max) n = 0;
  selectResult(n);
}

function cycleCategoryFilter(direction) {
  var filterKeys = ['all'];
  for (var i = 0; i < CAT_KEYS.length; i++) {
    // Only include categories that have results
    var hasResults = false;
    for (var j = 0; j < _allResults.length; j++) {
      if (_allResults[j].cat === CAT_KEYS[i]) { hasResults = true; break; }
    }
    if (hasResults) filterKeys.push(CAT_KEYS[i]);
  }

  var curIdx = filterKeys.indexOf(_activeFlt);
  if (curIdx === -1) curIdx = 0;

  var nextIdx = curIdx + (direction || 1);
  if (nextIdx >= filterKeys.length) nextIdx = 0;
  if (nextIdx < 0) nextIdx = filterKeys.length - 1;

  setFilter(filterKeys[nextIdx]);
}

function setFilter(cat) {
  _activeFlt = cat;

  // Update pill states
  var pills = _filtersEl.querySelectorAll('.sl-filter-pill');
  for (var i = 0; i < pills.length; i++) {
    pills[i].classList.remove('active');
  }

  // Find the active pill
  if (cat === 'all' && pills.length > 0) {
    pills[0].classList.add('active');
  } else {
    for (var pi = 0; pi < pills.length; pi++) {
      var pillText = pills[pi].textContent;
      var catInfo = CATEGORIES[cat];
      if (catInfo && pillText.indexOf(catInfo.label) === 0) {
        pills[pi].classList.add('active');
        break;
      }
    }
  }

  // Recompute filtered results
  _fltResults = _activeFlt === 'all' ? _allResults : _allResults.filter(function(r) { return r.cat === _activeFlt; });

  // Re-render items
  _resultsList.textContent = '';
  _selIdx = -1;

  if (_fltResults.length === 0) {
    var noResults = document.createElement('div');
    noResults.className = 'sl-no-results';
    noResults.textContent = '\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u062A\u0627\u0626\u062C';
    _resultsList.appendChild(noResults);
    renderDetailEmpty();
    return;
  }

  var showCount = Math.min(_fltResults.length, MAX_VISIBLE);
  for (var ii = 0; ii < showCount; ii++) {
    _resultsList.appendChild(buildResultItem(_fltResults[ii], ii));
  }

  if (_fltResults.length > MAX_VISIBLE) {
    var moreEl = document.createElement('div');
    moreEl.className = 'sl-no-results';
    moreEl.textContent = '+' + (_fltResults.length - MAX_VISIBLE) + ' \u0646\u062A\u064A\u062C\u0629 \u0623\u062E\u0631\u0649';
    _resultsList.appendChild(moreEl);
  }

  selectResult(0);
}

// ── Navigation ────────────────────────────────────────────

function navTo(item) {
  closeSL();

  var params = new URLSearchParams(window.location.search);
  var currentDate = params.get('date');
  var tab = item.cat;
  var srcIdx = item.src_idx;

  // Check if current page is report.html with same date
  if (currentDate === item.date && document.getElementById(tab)) {
    // Same day — switch tab and scroll to card
    if (typeof window.switchTab === 'function') {
      var tabEl = document.querySelector('.tab[onclick*="' + tab + '"]');
      if (tabEl) window.switchTab(tab, tabEl, true);
    }

    setTimeout(function() {
      var card = document.querySelector('#' + tab + ' .tl-wrap[data-src-idx="' + srcIdx + '"]');
      if (!card) return;

      // Remove old highlights
      var old = document.querySelectorAll('.search-target, .search-target-fade');
      for (var i = 0; i < old.length; i++) {
        old[i].classList.remove('search-target');
        old[i].classList.remove('search-target-fade');
      }

      card.classList.add('search-target');
      requestAnimationFrame(function() {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(function() {
          card.classList.remove('search-target');
          card.classList.add('search-target-fade');
          setTimeout(function() { card.classList.remove('search-target-fade'); }, 1000);
        }, 5000);
      });
    }, 150);
    return;
  }

  // Different date or page — navigate
  var url = 'report.html?date=' + item.date + '&tab=' + tab + '&idx=' + srcIdx;
  if (_lastQuery) url += '&q=' + encodeURIComponent(_lastQuery);
  window.location.href = url;
}

// ── Event binding ─────────────────────────────────────────

function bindEvents() {
  // Overlay click to close
  _overlay.addEventListener('click', function(e) {
    if (e.target === _overlay) closeSL();
  });

  // Input with debounce — waits for DB before searching
  _input.addEventListener('input', function() {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(function() {
      var q = _input.value.trim();
      _lastQuery = q;

      if (!q || q.length < 1) {
        renderEmpty();
        return;
      }

      // Wait for DB to be ready before searching
      loadBackend().then(function() {
        var bl = document.getElementById('slBackendLabel');
        if (bl) bl.textContent = _dbReady ? 'SQLite FTS5' : '\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0645\u064A\u0644';

        var searchResult = doSearch(q);
        _activeFlt = 'all';
        renderResults(searchResult);

        // suggestions shown instead of history
      });
    }, DEBOUNCE_MS);
  });

  // Input keydown
  _input.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveSel(1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveSel(-1);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (_selIdx >= 0 && _selIdx < _fltResults.length) {
        if (e.metaKey || e.ctrlKey) {
          // Cmd+Enter or Ctrl+Enter opens in new tab
          var item = _fltResults[_selIdx];
          var url = 'report.html?date=' + item.date + '&tab=' + item.cat + '&idx=' + item.src_idx;
          if (_lastQuery) url += '&q=' + encodeURIComponent(_lastQuery);
          window.open(url, '_blank');
        } else {
          navTo(_fltResults[_selIdx]);
        }
      }
      return;
    }
    if (e.key === 'Escape') {
      closeSL();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      cycleCategoryFilter(e.shiftKey ? -1 : 1);
      return;
    }
  });
}

// ── Public API ────────────────────────────────────────────

export function openSpotlight() {
  if (!_built) buildDOM();

  _overlay.classList.add('open');
  _input.value = '';
  _lastQuery = '';
  _activeFlt = 'all';
  _selIdx = -1;

  document.body.style.overflow = 'hidden';

  // Immediately show loading skeleton while DB loads
  var loadingContainer = document.createElement('div');
  loadingContainer.className = 'sl-loading';
  for (var si = 0; si < 5; si++) {
    var skEl = document.createElement('div');
    skEl.className = 'sl-skeleton';
    loadingContainer.appendChild(skEl);
  }
  _resultsList.textContent = '';
  _resultsList.appendChild(loadingContainer);

  // Set detail pane to empty state immediately
  renderDetailEmpty();

  // Update backend label to loading state
  var bl = document.getElementById('slBackendLabel');
  if (bl) bl.textContent = '\u062C\u0627\u0631\u064D \u0627\u0644\u062A\u062D\u0645\u064A\u0644...';

  // Focus input immediately — don't wait for DB
  _input.focus();

  loadBackend().then(function() {
    if (bl) bl.textContent = _dbReady ? 'SQLite FTS5' : '\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0645\u064A\u0644';
    renderEmpty();
  });
}

export function closeSL() {
  if (_overlay) _overlay.classList.remove('open');
  closeMobileDetail();
  document.body.style.overflow = '';
}

// ── Helpers ───────────────────────────────────────────────

function hexToRgb(hex) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return r + ', ' + g + ', ' + b;
}

function addMetaRow(grid, key, value) {
  var keyEl = document.createElement('span');
  keyEl.className = 'sl-detail-meta-key';
  keyEl.textContent = key;
  grid.appendChild(keyEl);

  var valEl = document.createElement('span');
  valEl.className = 'sl-detail-meta-val';
  valEl.textContent = value;
  grid.appendChild(valEl);
}

// ── Global shortcut ───────────────────────────────────────
document.addEventListener('keydown', function(e) {
  if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    openSpotlight();
    return;
  }
  if (e.key === '/') {
    var tag = document.activeElement ? document.activeElement.tagName : '';
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
      e.preventDefault();
      openSpotlight();
    }
  }
});

// ── Window exports ────────────────────────────────────────
window.openSpotlight = openSpotlight;
window.closeSL = closeSL;
