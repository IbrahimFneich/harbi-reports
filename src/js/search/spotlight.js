/* ============================================================
   spotlight.js — Global Spotlight Search (Ctrl+K or /)
   ES module version of search.js
   Loads all data/*.json, builds a flat search index,
   searches with Arabic normalization + English aliases.
   Note: All data is locally-generated static content from
   trusted Telegram channel posts. No user input is rendered
   as HTML — text highlighting uses safe DOM methods.
   ============================================================ */

// ── Config ─────────────────────────────────────────────────
var SEARCH_ALIASES = {
  'merkava': 'ميركافا', 'tank': 'ميركافا', 'دبابة': 'ميركافا',
  'drone': 'مسيّرة', 'uav': 'مسيّرة', 'fpv': 'FPV',
  'missile': 'صاروخ', 'rocket': 'صاروخ',
  'siren': 'صفارات', 'صفارة': 'صفارات',
  'haifa': 'حيفا', 'tel aviv': 'تل أبيب', 'telaviv': 'تل أبيب',
  'iran': 'إيران', 'ايران': 'إيران',
  'kiryat': 'كريات', 'kiryat shmona': 'كريات شمونة',
  'nahariya': 'نهاريا', 'metula': 'المطلة',
  'yemen': 'اليمن', 'iraq': 'العراق',
  'ambush': 'كمين', 'killed': 'قتلى', 'settlement': 'مستوطنة',
  'base': 'قاعدة', 'artillery': 'مدفعية',
  'safed': 'صفد', 'golan': 'الجولان', 'jerusalem': 'القدس'
};

var CATEGORIES = {
  bayanat: { label: 'بيانات', color: '#2ecc71' },
  sirens: { label: 'صفارات', color: '#e74c3c' },
  enemy: { label: 'إعلام العدو', color: '#e67e22' },
  iran: { label: 'إيران', color: '#9b59b6' },
  videos: { label: 'فيديو', color: '#1abc9c' },
  allies: { label: 'حلفاء', color: '#1abc9c' }
};

var MONTH_NAMES_S = {1:'كانون الثاني',2:'شباط',3:'آذار',4:'نيسان',5:'أيار',6:'حزيران',7:'تموز',8:'آب',9:'أيلول',10:'تشرين الأول',11:'تشرين الثاني',12:'كانون الأول'};

// ── State ──────────────────────────────────────────────────
var _sIdx = [];
var _sLoaded = false;
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
  return s.replace(/[إأآٱ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي')
    .replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/ّ/g,'')
    .replace(/[\u064B-\u065F\u0670]/g,'').toLowerCase();
}

function fmtDate(d) {
  var p = d.split('-');
  return parseInt(p[2]) + ' ' + (MONTH_NAMES_S[parseInt(p[1])] || '') + ' ' + p[0];
}

// ── Build index from all JSON files ───────────────────────
// ALL_REPORTS global comes from enhancements.js
function loadSIdx(cb) {
  if (_sLoaded) { cb(); return; }
  var dates = [];
  if (typeof ALL_REPORTS !== 'undefined') {
    dates = ALL_REPORTS.slice();
  } else if (typeof reportStats !== 'undefined') {
    dates = Object.keys(reportStats);
  }
  if (dates.length === 0) { cb(); return; }

  var done = 0;
  var total = dates.length;
  for (var i = 0; i < dates.length; i++) {
    (function(date) {
      fetch('data/' + date + '.json?t=' + Date.now())
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(data) {
          if (data) idxDay(data);
          done++;
          if (done === total) { _sLoaded = true; cb(); }
        })
        .catch(function() { done++; if (done === total) { _sLoaded = true; cb(); } });
    })(dates[i]);
  }
}

function idxDay(data) {
  var date = data.date;
  var dl = fmtDate(date);
  var cats = [
    { key: 'bayanat', items: data.bayanat || [], fn: function(b) {
      return { title: b.target || '', sub: 'بيان #' + b.num, time: b.opTime || b.postTime || '',
        text: (b.target||'') + ' ' + (b.weapon||'') + ' ' + (b.fullText||''), tab: 'bayanat' };
    }},
    { key: 'sirens', items: data.sirens || [], fn: function(s) {
      return { title: s.location || '', sub: '', time: s.time || '',
        text: (s.location||'') + ' ' + (s.fullText||''), tab: 'sirens' };
    }},
    { key: 'enemy', items: data.enemy || [], fn: function(e) {
      return { title: (e.summary||'').substring(0,80), sub: '', time: e.time || '',
        text: (e.summary||'') + ' ' + (e.fullText||''), tab: 'enemy' };
    }},
    { key: 'iran', items: data.iran || [], fn: function(r) {
      return { title: (r.summary||'').substring(0,80), sub: r.source || '', time: r.time || '',
        text: (r.source||'') + ' ' + (r.summary||'') + ' ' + (r.fullText||''), tab: 'iran' };
    }},
    { key: 'videos', items: data.videos || [], fn: function(v) {
      return { title: (v.description||'').substring(0,80), sub: '', time: v.time || '',
        text: (v.description||'') + ' ' + (v.fullText||''), tab: 'videos' };
    }},
    { key: 'allies', items: data.allies || [], fn: function(a) {
      return { title: (a.summary||'').substring(0,80), sub: a.flag || '', time: a.time || '',
        text: (a.flag||'') + ' ' + (a.summary||'') + ' ' + (a.fullText||''), tab: 'allies' };
    }}
  ];
  for (var ci = 0; ci < cats.length; ci++) {
    var c = cats[ci];
    for (var ii = 0; ii < c.items.length; ii++) {
      var r = c.fn(c.items[ii]);
      _sIdx.push({
        cat: c.key, date: date, dateLabel: dl,
        time: r.time, title: r.title, subtitle: r.sub,
        norm: sNorm(r.text), tab: r.tab, idx: ii
      });
    }
  }
}

// ── Search ────────────────────────────────────────────────
function doSrch(q) {
  if (!q || q.trim().length < 2) return [];
  var terms = q.toLowerCase().trim();
  var ak = Object.keys(SEARCH_ALIASES);
  for (var ai = 0; ai < ak.length; ai++) {
    if (terms.indexOf(ak[ai]) !== -1) terms = terms.replace(ak[ai], SEARCH_ALIASES[ak[ai]]);
  }
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
  inp.placeholder = 'بحث في جميع التقارير...';
  inp.setAttribute('autocomplete', 'off');
  sr.appendChild(inp);
  var esc = document.createElement('span');
  esc.style.cssText = 'font-size:0.58rem;padding:2px 8px;border-radius:4px;background:var(--surface2,#151d2b);border:1px solid var(--border,#1e2d3d);color:var(--text-dim,#6b7d92);font-family:monospace;direction:ltr;';
  esc.textContent = 'ESC';
  sr.appendChild(esc);
  m.appendChild(sr);

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
    deb = setTimeout(function() { renderSR(inp.value); }, 120);
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
    pill.textContent = (fk === 'all' ? 'الكل' : CATEGORIES[fk].label) + ' ' + (counts[fk] || 0);
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
      rl.textContent = 'عمليات بحث سابقة';
      empty.appendChild(rl);
    }
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;justify-content:center;flex-wrap:wrap;';
    var chips = _recent.length > 0 ? _recent : ['ميركافا', 'كمين', 'تل أبيب', 'حيفا', 'إيران', 'كريات شمونة'];
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
      hint.textContent = 'اكتب للبحث في جميع التقارير';
      empty.appendChild(hint);
    }
    _sResults.appendChild(empty);
    return;
  }

  if (show.length === 0) {
    var nr = document.createElement('div');
    nr.style.cssText = 'text-align:center;padding:30px;font-size:0.8rem;color:var(--text-dim,#6b7d92);';
    nr.textContent = 'لا نتائج';
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

    // Title - use textContent (safe), no HTML injection
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
    more.textContent = '+ ' + (_fltResults.length - 30) + ' نتيجة أخرى';
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
  loadSIdx(function() { renderSR(''); _sInput.focus(); });
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
