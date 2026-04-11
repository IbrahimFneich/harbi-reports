/* ============================================================
   spotlight.js — Global Spotlight Search (Ctrl+K or /)
   Uses SQLite FTS5 via sql.js for instant indexed search.
   Falls back to spotlight-index.json if sql.js unavailable.
   Note: All data is locally-generated static content from
   trusted Telegram channel posts. No user input is rendered
   as HTML — text highlighting uses safe DOM methods.
   ============================================================ */

import { initDB, queryRows } from '../analytics/db.js';

// ── Config ─────────────────────────────────────────────────
var SEARCH_ALIASES = {
  'merkava': '\u0645\u064A\u0631\u0643\u0627\u0641\u0627', 'tank': '\u0645\u064A\u0631\u0643\u0627\u0641\u0627', '\u062F\u0628\u0627\u0628\u0629': '\u0645\u064A\u0631\u0643\u0627\u0641\u0627',
  'drone': '\u0645\u0633\u064A\u0651\u0631\u0629', 'uav': '\u0645\u0633\u064A\u0651\u0631\u0629', 'fpv': 'FPV',
  'missile': '\u0635\u0627\u0631\u0648\u062E', 'rocket': '\u0635\u0627\u0631\u0648\u062E',
  'siren': '\u0635\u0641\u0627\u0631\u0627\u062A', '\u0635\u0641\u0627\u0631\u0629': '\u0635\u0641\u0627\u0631\u0627\u062A',
  'haifa': '\u062D\u064A\u0641\u0627', 'tel aviv': '\u062A\u0644 \u0623\u0628\u064A\u0628', 'telaviv': '\u062A\u0644 \u0623\u0628\u064A\u0628',
  'iran': '\u0625\u064A\u0631\u0627\u0646', '\u0627\u064A\u0631\u0627\u0646': '\u0625\u064A\u0631\u0627\u0646',
  'kiryat': '\u0643\u0631\u064A\u0627\u062A', 'kiryat shmona': '\u0643\u0631\u064A\u0627\u062A \u0634\u0645\u0648\u0646\u0629',
  'nahariya': '\u0646\u0647\u0627\u0631\u064A\u0627', 'metula': '\u0627\u0644\u0645\u0637\u0644\u0629',
  'yemen': '\u0627\u0644\u064A\u0645\u0646', 'iraq': '\u0627\u0644\u0639\u0631\u0627\u0642',
  'ambush': '\u0643\u0645\u064A\u0646', 'killed': '\u0642\u062A\u0644\u0649', 'settlement': '\u0645\u0633\u062A\u0648\u0637\u0646\u0629',
  'base': '\u0642\u0627\u0639\u062F\u0629', 'artillery': '\u0645\u062F\u0641\u0639\u064A\u0629',
  'safed': '\u0635\u0641\u062F', 'golan': '\u0627\u0644\u062C\u0648\u0644\u0627\u0646', 'jerusalem': '\u0627\u0644\u0642\u062F\u0633'
};

var CATEGORIES = {
  bayanat: { label: '\u0628\u064A\u0627\u0646\u0627\u062A', color: '#2ecc71' },
  sirens: { label: '\u0635\u0641\u0627\u0631\u0627\u062A', color: '#e74c3c' },
  enemy: { label: '\u0625\u0639\u0644\u0627\u0645 \u0627\u0644\u0639\u062F\u0648', color: '#e67e22' },
  iran: { label: '\u0625\u064A\u0631\u0627\u0646', color: '#9b59b6' },
  videos: { label: '\u0641\u064A\u062F\u064A\u0648', color: '#1abc9c' },
  allies: { label: '\u062D\u0644\u0641\u0627\u0621', color: '#1abc9c' }
};

var MONTH_NAMES_S = {1:'\u0643\u0627\u0646\u0648\u0646 \u0627\u0644\u062B\u0627\u0646\u064A',2:'\u0634\u0628\u0627\u0637',3:'\u0622\u0630\u0627\u0631',4:'\u0646\u064A\u0633\u0627\u0646',5:'\u0623\u064A\u0627\u0631',6:'\u062D\u0632\u064A\u0631\u0627\u0646',7:'\u062A\u0645\u0648\u0632',8:'\u0622\u0628',9:'\u0623\u064A\u0644\u0648\u0644',10:'\u062A\u0634\u0631\u064A\u0646 \u0627\u0644\u0623\u0648\u0644',11:'\u062A\u0634\u0631\u064A\u0646 \u0627\u0644\u062B\u0627\u0646\u064A',12:'\u0643\u0627\u0646\u0648\u0646 \u0627\u0644\u0623\u0648\u0644'};

// ── State ──────────────────────────────────────────────────
var _dbReady = false;
var _jsonFallback = false;
var _sIdx = [];  // JSON fallback data
var _sOverlay = null;
var _sInput = null;
var _sResults = null;
var _sFilters = null;
var _selIdx = -1;
var _activeFlt = 'all';
var _fltResults = [];
var _recent = [];

// ── Arabic normalization ──────────────────────────────────
function sNorm(s) {
  return s.replace(/[\u0625\u0623\u0622\u0671]/g,'\u0627').replace(/\u0629/g,'\u0647').replace(/\u0649/g,'\u064A')
    .replace(/\u0624/g,'\u0648').replace(/\u0626/g,'\u064A').replace(/\u0651/g,'')
    .replace(/[\u064B-\u065F\u0670]/g,'').toLowerCase();
}

function fmtDate(d) {
  var p = d.split('-');
  return parseInt(p[2]) + ' ' + (MONTH_NAMES_S[parseInt(p[1])] || '') + ' ' + p[0];
}

// ── Resolve aliases ──────────────────────────────────────
function resolveAliases(q) {
  var terms = q.toLowerCase().trim();
  var ak = Object.keys(SEARCH_ALIASES);
  for (var i = 0; i < ak.length; i++) {
    if (terms.indexOf(ak[i]) !== -1) terms = terms.replace(ak[i], SEARCH_ALIASES[ak[i]]);
  }
  return terms;
}

// ── Init DB (try sql.js, fallback to JSON) ──────────────
var _backendPromise = null;

function loadSearchBackend(cb) {
  if (_dbReady || _jsonFallback) { cb(); return; }
  if (_backendPromise) { _backendPromise.then(cb); return; }

  _backendPromise = initDB().then(function() {
    _dbReady = true;
  }).catch(function() {
    // Fallback: load JSON index
    return fetch('data/spotlight-index.json')
      .then(function(r) { return r.ok ? r.json() : []; })
      .then(function(entries) {
        for (var i = 0; i < entries.length; i++) {
          var e = entries[i];
          _sIdx.push({
            cat: e.c, date: e.d, dateLabel: fmtDate(e.d),
            time: e.t, title: e.tt, subtitle: e.st,
            norm: e.n, tab: e.c, idx: e.i
          });
        }
        _jsonFallback = true;
      })
      .catch(function() { _jsonFallback = true; });
  });

  _backendPromise.then(cb);
}

// ── Search ────────────────────────────────────────────────
function doSrch(q) {
  if (!q || q.trim().length < 2) return [];

  var terms = resolveAliases(q);

  if (_dbReady) {
    return doSrchDB(terms);
  }
  return doSrchJSON(terms);
}

function doSrchDB(terms) {
  var nq = sNorm(terms);
  var words = nq.split(/\s+/).filter(function(w) { return w.length > 0; });
  if (words.length === 0) return [];

  var results;

  // Try FTS5 MATCH for longer queries
  if (words.every(function(w) { return w.length >= 3; })) {
    var ftsQuery = words.map(function(w) { return '"' + w + '"*'; }).join(' AND ');
    try {
      results = queryRows(
        "SELECT e.category as cat, e.date, e.time, e.title, e.subtitle, e.location, e.id " +
        "FROM events_fts fts JOIN events e ON e.id = fts.rowid " +
        "WHERE events_fts MATCH ? " +
        "ORDER BY e.date DESC, e.time DESC LIMIT 50",
        [ftsQuery]
      );
      if (results.length > 0) return formatDBResults(results);
    } catch (ex) {
      // FTS syntax error — fall through to LIKE
    }
  }

  // Fallback: LIKE search
  var likeClauses = words.map(function() {
    return "(title LIKE ? OR location LIKE ? OR subtitle LIKE ? OR full_text LIKE ?)";
  });
  var params = [];
  words.forEach(function(w) {
    var p = '%' + w + '%';
    params.push(p, p, p, p);
  });

  results = queryRows(
    "SELECT category as cat, date, time, title, subtitle, location, id " +
    "FROM events WHERE " + likeClauses.join(' AND ') +
    " ORDER BY date DESC, time DESC LIMIT 50",
    params
  );
  return formatDBResults(results);
}

function formatDBResults(rows) {
  return rows.map(function(r) {
    var cat = CATEGORIES[r.cat] || { label: '', color: '#6b7d92' };
    return {
      cat: r.cat, date: r.date, dateLabel: fmtDate(r.date),
      time: r.time || '', title: r.title || r.location || '',
      subtitle: cat.label, tab: r.cat, idx: r.id
    };
  });
}

function doSrchJSON(terms) {
  var nq = sNorm(terms);
  var words = nq.split(/\s+/).filter(function(w) { return w.length > 0; });
  if (words.length === 0) return [];
  var res = [];
  for (var i = 0; i < _sIdx.length; i++) {
    var item = _sIdx[i];
    var ok = true;
    for (var wi = 0; wi < words.length; wi++) {
      if (item.norm.indexOf(words[wi]) === -1) { ok = false; break; }
    }
    if (ok) res.push(item);
  }
  res.sort(function(a, b) {
    if (a.date > b.date) return -1;
    if (a.date < b.date) return 1;
    return a.time < b.time ? 1 : -1;
  });
  return res;
}

// ── Build overlay ─────────────────────────────────────────
function buildSO() {
  if (_sOverlay) return;
  var o = document.createElement('div');
  o.id = 'spotlightOverlay';
  o.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.65);z-index:99999;justify-content:center;padding:50px 20px 20px;align-items:flex-start;';
  o.onclick = function(e) { if (e.target === o) closeSL(); };

  var m = document.createElement('div');
  m.style.cssText = 'width:100%;max-width:600px;background:var(--surface,#0f1520);border:1px solid var(--border,#1e2d3d);border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.6);';

  // Search row
  var sr = document.createElement('div');
  sr.style.cssText = 'display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--border,#1e2d3d);';
  var ic = document.createElement('span');
  ic.style.cssText = 'font-size:1.1rem;color:var(--text-dim,#6b7d92);';
  ic.textContent = '\uD83D\uDD0D';
  sr.appendChild(ic);
  var inp = document.createElement('input');
  inp.style.cssText = 'flex:1;background:none;border:none;font-size:0.92rem;font-family:inherit;color:var(--text,#dfe6ee);outline:none;direction:rtl;';
  inp.placeholder = '\u0628\u062D\u062B \u0641\u064A \u062C\u0645\u064A\u0639 \u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631...';
  inp.setAttribute('autocomplete', 'off');
  sr.appendChild(inp);
  var esc = document.createElement('span');
  esc.style.cssText = 'font-size:0.58rem;padding:2px 8px;border-radius:4px;background:var(--surface2,#151d2b);border:1px solid var(--border,#1e2d3d);color:var(--text-dim,#6b7d92);font-family:monospace;direction:ltr;';
  esc.textContent = 'ESC';
  sr.appendChild(esc);
  m.appendChild(sr);

  // Backend indicator
  var backendTag = document.createElement('div');
  backendTag.id = 'spotlightBackend';
  backendTag.style.cssText = 'padding:4px 18px;font-size:0.46rem;color:var(--text-muted,#3d5068);direction:ltr;';
  backendTag.textContent = (_dbReady || _jsonFallback) ? (_dbReady ? 'SQLite FTS5' : 'JSON index') : 'loading...';
  m.appendChild(backendTag);

  var fl = document.createElement('div');
  fl.style.cssText = 'display:flex;gap:6px;padding:8px 18px;border-bottom:1px solid var(--border,#1e2d3d);flex-wrap:wrap;';
  m.appendChild(fl);

  var rs = document.createElement('div');
  rs.style.cssText = 'max-height:380px;overflow-y:auto;';
  m.appendChild(rs);

  var ft = document.createElement('div');
  ft.style.cssText = 'padding:8px 18px;border-top:1px solid var(--border,#1e2d3d);display:flex;gap:16px;font-size:0.58rem;color:var(--text-dim,#6b7d92);direction:ltr;justify-content:center;';
  ft.textContent = '\u2191\u2193 navigate   \u23CE open   esc close';
  m.appendChild(ft);

  o.appendChild(m);
  document.body.appendChild(o);
  _sOverlay = o; _sInput = inp; _sResults = rs; _sFilters = fl;

  var deb = null;
  inp.addEventListener('input', function() {
    clearTimeout(deb);
    deb = setTimeout(function() {
      // Ensure backend is loaded before searching
      loadSearchBackend(function() { renderSR(inp.value); });
    }, 120);
  });
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { closeSL(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSel(1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); moveSel(-1); return; }
    if (e.key === 'Enter') { e.preventDefault(); openSel(); return; }
  });
}

// ── Render results ────────────────────────────────────────
function renderSR(q) {
  var all = doSrch(q);
  var counts = { all: all.length };
  var ck = Object.keys(CATEGORIES);
  for (var ci = 0; ci < ck.length; ci++) counts[ck[ci]] = 0;
  for (var ri = 0; ri < all.length; ri++) counts[all[ri].cat] = (counts[all[ri].cat] || 0) + 1;

  // Filters
  _sFilters.textContent = '';
  var fkeys = ['all'].concat(ck);
  for (var fi = 0; fi < fkeys.length; fi++) {
    var fk = fkeys[fi];
    if (fk !== 'all' && (counts[fk] || 0) === 0) continue;
    var pill = document.createElement('span');
    var isActive = fk === _activeFlt;
    pill.style.cssText = 'font-size:0.62rem;font-weight:700;padding:4px 12px;border-radius:6px;cursor:pointer;transition:all 0.15s;border:1px solid ' + (isActive ? 'var(--accent,#c9a84c)' : 'var(--border,#1e2d3d)') + ';background:' + (isActive ? 'var(--accent-dim,rgba(201,168,76,0.12))' : 'var(--surface2,#151d2b)') + ';color:' + (isActive ? 'var(--accent,#c9a84c)' : 'var(--text-dim,#6b7d92)') + ';';
    pill.textContent = (fk === 'all' ? '\u0627\u0644\u0643\u0644' : CATEGORIES[fk].label) + ' ' + (counts[fk] || 0);
    (function(key) { pill.onclick = function() { _activeFlt = key; renderSR(_sInput.value); }; })(fk);
    _sFilters.appendChild(pill);
  }

  _fltResults = _activeFlt === 'all' ? all : all.filter(function(r) { return r.cat === _activeFlt; });
  var show = _fltResults.slice(0, 30);

  _sResults.textContent = '';
  _selIdx = -1;

  // Empty / suggestion state
  if (!q || q.trim().length < 2) {
    var empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:30px 18px;';
    if (_recent.length > 0) {
      var rl = document.createElement('div');
      rl.style.cssText = 'font-size:0.68rem;color:var(--text-dim,#6b7d92);margin-bottom:10px;';
      rl.textContent = '\u0639\u0645\u0644\u064A\u0627\u062A \u0628\u062D\u062B \u0633\u0627\u0628\u0642\u0629';
      empty.appendChild(rl);
    }
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;justify-content:center;flex-wrap:wrap;';
    var chips = _recent.length > 0 ? _recent : ['\u0645\u064A\u0631\u0643\u0627\u0641\u0627', '\u0643\u0645\u064A\u0646', '\u062A\u0644 \u0623\u0628\u064A\u0628', '\u062D\u064A\u0641\u0627', '\u0625\u064A\u0631\u0627\u0646', '\u0643\u0631\u064A\u0627\u062A \u0634\u0645\u0648\u0646\u0629'];
    for (var ch = 0; ch < chips.length; ch++) {
      var chip = document.createElement('span');
      chip.style.cssText = 'font-size:0.62rem;padding:3px 10px;border-radius:6px;background:var(--surface2,#151d2b);border:1px solid var(--border,#1e2d3d);color:var(--text-dim,#6b7d92);cursor:pointer;';
      chip.textContent = chips[ch];
      (function(t) { chip.onclick = function() { _sInput.value = t; renderSR(t); }; })(chips[ch]);
      row.appendChild(chip);
    }
    empty.appendChild(row);
    if (_recent.length === 0) {
      var hint = document.createElement('div');
      hint.style.cssText = 'font-size:0.68rem;color:var(--text-dim,#6b7d92);margin-top:10px;';
      hint.textContent = '\u0627\u0643\u062A\u0628 \u0644\u0644\u0628\u062D\u062B \u0641\u064A \u062C\u0645\u064A\u0639 \u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631';
      empty.appendChild(hint);
    }
    _sResults.appendChild(empty);
    return;
  }

  if (show.length === 0) {
    var nr = document.createElement('div');
    nr.style.cssText = 'text-align:center;padding:30px;font-size:0.8rem;color:var(--text-dim,#6b7d92);';
    nr.textContent = '\u0644\u0627 \u0646\u062A\u0627\u0626\u062C';
    _sResults.appendChild(nr);
    return;
  }

  for (var si = 0; si < show.length; si++) {
    var item = show[si];
    var cat = CATEGORIES[item.cat] || { label: '', color: '#6b7d92' };

    var r = document.createElement('div');
    r.style.cssText = 'display:flex;gap:10px;align-items:flex-start;padding:10px 18px;cursor:pointer;transition:background 0.1s;border-bottom:1px solid rgba(30,45,61,0.3);';
    r.setAttribute('data-idx', String(si));
    r.onmouseenter = function() { setSel(parseInt(this.getAttribute('data-idx'))); };
    (function(itm) { r.onclick = function() { navTo(itm); }; })(item);

    var bar = document.createElement('div');
    bar.style.cssText = 'width:4px;border-radius:2px;min-height:36px;flex-shrink:0;background:' + cat.color + ';';
    r.appendChild(bar);

    var cnt = document.createElement('div');
    cnt.style.cssText = 'flex:1;';

    var hd = document.createElement('div');
    hd.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:2px;';
    var cl = document.createElement('span');
    cl.style.cssText = 'font-size:0.58rem;font-weight:700;color:' + cat.color + ';';
    cl.textContent = item.subtitle || cat.label;
    hd.appendChild(cl);
    var dl = document.createElement('span');
    dl.style.cssText = 'font-size:0.56rem;color:var(--text-dim,#6b7d92);direction:ltr;';
    dl.textContent = item.dateLabel;
    hd.appendChild(dl);
    var tl = document.createElement('span');
    tl.style.cssText = 'font-size:0.62rem;font-weight:700;direction:ltr;color:' + cat.color + ';margin-right:auto;';
    tl.textContent = item.time;
    hd.appendChild(tl);
    cnt.appendChild(hd);

    var tt = document.createElement('div');
    tt.style.cssText = 'font-size:0.78rem;line-height:1.5;color:var(--text,#dfe6ee);';
    tt.textContent = item.title;
    cnt.appendChild(tt);

    r.appendChild(cnt);
    _sResults.appendChild(r);
  }

  if (_fltResults.length > 30) {
    var more = document.createElement('div');
    more.style.cssText = 'text-align:center;padding:10px;font-size:0.68rem;color:var(--text-dim,#6b7d92);';
    more.textContent = '+ ' + (_fltResults.length - 30) + ' \u0646\u062A\u064A\u062C\u0629 \u0623\u062E\u0631\u0649';
    _sResults.appendChild(more);
  }

  // Save recent
  var tr = q.trim();
  if (tr.length >= 2 && all.length > 0) {
    var idx = _recent.indexOf(tr);
    if (idx !== -1) _recent.splice(idx, 1);
    _recent.unshift(tr);
    if (_recent.length > 5) _recent.pop();
  }
}

// ── Keyboard nav ──────────────────────────────────────────
function moveSel(d) {
  var items = _sResults.querySelectorAll('[data-idx]');
  if (items.length === 0) return;
  var n = _selIdx + d;
  if (n < 0) n = items.length - 1;
  if (n >= items.length) n = 0;
  setSel(n);
}

function setSel(idx) {
  var items = _sResults.querySelectorAll('[data-idx]');
  for (var i = 0; i < items.length; i++) {
    items[i].style.background = (i === idx) ? 'var(--surface2,#151d2b)' : '';
  }
  _selIdx = idx;
  if (items[idx]) items[idx].scrollIntoView({ block: 'nearest' });
}

function openSel() {
  if (_selIdx >= 0 && _selIdx < _fltResults.length) navTo(_fltResults[_selIdx]);
}

function navTo(item) {
  var params = new URLSearchParams(window.location.search);
  if (params.get('date') === item.date && document.getElementById(item.tab)) {
    closeSL();
    var tabEl = document.querySelector('.tab[onclick*="' + item.tab + '"]');
    if (tabEl) {
      var switchFn = window.switchTab;
      if (typeof switchFn === 'function') switchFn(item.tab, tabEl, true);
      else {
        document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
        document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
        document.getElementById(item.tab).classList.add('active');
        tabEl.classList.add('active');
      }
    }
    setTimeout(function() {
      var card = document.querySelector('#' + item.tab + ' .tl-wrap[data-src-idx="' + item.idx + '"]');
      if (!card) return;
      var old = document.querySelectorAll('.search-target,.search-target-fade');
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
  var url = 'report.html?date=' + item.date + '&tab=' + item.tab + '&idx=' + item.idx;
  if (_sInput && _sInput.value) url += '&q=' + encodeURIComponent(_sInput.value);
  window.location.href = url;
}

// ── Open/Close ────────────────────────────────────────────
export function openSpotlight() {
  buildSO();
  _sOverlay.style.display = 'flex';
  _sInput.value = '';
  _activeFlt = 'all';
  _selIdx = -1;
  loadSearchBackend(function() {
    var tag = document.getElementById('spotlightBackend');
    if (tag) tag.textContent = _dbReady ? 'SQLite FTS5' : 'JSON index';
    renderSR('');
    _sInput.focus();
  });
}

export function closeSL() {
  if (_sOverlay) _sOverlay.style.display = 'none';
}

// ── Global shortcut ───────────────────────────────────────
document.addEventListener('keydown', function(e) {
  var inInput = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
  if ((e.key === '/' && !inInput) || (e.key === 'k' && (e.ctrlKey || e.metaKey))) {
    e.preventDefault();
    openSpotlight();
  }
});

// Attach to window for non-module consumers
window.openSpotlight = openSpotlight;
window.closeSL = closeSL;
