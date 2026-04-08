/* ============================================================
   app.js — Rendering engine for the military news report viewer
   Reads ?date=YYYY-MM-DD, fetches data/{date}.json, renders report
   ============================================================ */

// ── 1. Boot + data loading ──────────────────────────────────

(function boot() {
  var params = new URLSearchParams(window.location.search);
  var date = params.get('date');
  if (!date) {
    document.getElementById('report-root').textContent = 'لا يوجد تقرير لهذا التاريخ';
    return;
  }

  fetch('data/' + date + '.json')
    .then(function(res) {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    })
    .then(function(data) {
      document.title = 'تقرير ' + data.dateAr + ' — الإعلام الحربي';
      renderReport(data);
      // Load enhancements AFTER DOM is fully built
      var enhScript = document.createElement('script');
      enhScript.src = 'report-enhancements.js';
      document.body.appendChild(enhScript);
    })
    .catch(function() {
      document.getElementById('report-root').textContent = 'لا يوجد تقرير لهذا التاريخ';
    });
})();

// ── 2. renderReport — master orchestrator ───────────────────

function renderReport(data) {
  var root = document.getElementById('report-root');
  root.innerHTML = '';

  // Header
  var header = document.createElement('div');
  header.className = 'header';

  var homeBtn = document.createElement('a');
  homeBtn.href = 'index.html';
  homeBtn.className = 'home-btn';
  homeBtn.textContent = 'الرئيسية ';
  var arrow = document.createTextNode('\u2190');
  homeBtn.appendChild(arrow);
  header.appendChild(homeBtn);

  var h1 = document.createElement('h1');
  h1.textContent = 'الإعلام الحربي — التغطية الإخبارية';
  header.appendChild(h1);

  var dateDiv = document.createElement('div');
  dateDiv.className = 'date';
  var dateText = document.createTextNode(data.dayAr + ' ');
  dateDiv.appendChild(dateText);
  var dateSpan = document.createElement('span');
  dateSpan.textContent = data.dateAr;
  dateDiv.appendChild(dateSpan);
  var dateSuffix = document.createTextNode(' — ' + data.hijri);
  dateDiv.appendChild(dateSuffix);
  header.appendChild(dateDiv);

  root.appendChild(header);

  // Stats bar
  var statsConfig = [
    { cls: 's1', label: 'بيان عسكري', key: 'b' },
    { cls: 's2', label: 'صفارة إنذار', key: 's' },
    { cls: 's3', label: 'تقرير إعلام العدو', key: 'e' },
    { cls: 's4', label: 'إيران', key: 'ir' },
    { cls: 's5', label: 'فيديو عمليات', key: 'v' },
    { cls: 's6', label: 'يمن + عراق', key: 'al' }
  ];

  var statsBar = document.createElement('div');
  statsBar.className = 'stats';
  for (var si = 0; si < statsConfig.length; si++) {
    var sc = statsConfig[si];
    var statBox = document.createElement('div');
    statBox.className = 'stat ' + sc.cls;
    var countSpan = document.createElement('span');
    countSpan.className = 'n';
    countSpan.textContent = data.stats[sc.key];
    var labelSpan = document.createElement('span');
    labelSpan.className = 'l';
    labelSpan.textContent = sc.label;
    statBox.appendChild(countSpan);
    statBox.appendChild(labelSpan);
    statsBar.appendChild(statBox);
  }
  root.appendChild(statsBar);

  // Tab bar
  var tabsConfig = [
    { id: 'bayanat', label: 'بيانات المقاومة', count: data.stats.b },
    { id: 'sirens', label: 'صفارات الإنذار', count: data.stats.s },
    { id: 'enemy', label: 'إعلام العدو', count: data.stats.e },
    { id: 'iran', label: 'إيران', count: data.stats.ir },
    { id: 'videos', label: 'فيديوهات', count: data.stats.v },
    { id: 'allies', label: 'اليمن والعراق', count: data.stats.al }
  ];

  var tabsBar = document.createElement('div');
  tabsBar.className = 'tabs';
  for (var ti = 0; ti < tabsConfig.length; ti++) {
    var tc = tabsConfig[ti];
    var tab = document.createElement('div');
    tab.className = 'tab' + (ti === 0 ? ' active' : '');
    tab.setAttribute('onclick', "switchTab('" + tc.id + "',this)");
    tab.textContent = tc.label + ' ';
    var badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = tc.count;
    tab.appendChild(badge);
    tabsBar.appendChild(tab);
  }
  root.appendChild(tabsBar);

  // Search bar
  var searchBar = document.createElement('div');
  searchBar.className = 'search-bar';

  var searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.id = 'searchInput';
  searchInput.placeholder = 'بحث... (مثلاً: ميركافا، كريات شمونة، مسيّرة، تل أبيب)';
  searchInput.setAttribute('autocomplete', 'off');
  searchBar.appendChild(searchInput);

  var searchStats = document.createElement('div');
  searchStats.className = 'search-stats';
  searchStats.id = 'searchStats';
  searchBar.appendChild(searchStats);

  var clearBtn = document.createElement('button');
  clearBtn.className = 'search-clear';
  clearBtn.id = 'searchClear';
  clearBtn.textContent = 'مسح';
  clearBtn.onclick = function() { clearSearch(); };
  searchBar.appendChild(clearBtn);

  root.appendChild(searchBar);

  // Tab content divs
  var tabIds = ['bayanat', 'sirens', 'enemy', 'iran', 'videos', 'allies'];
  for (var ci = 0; ci < tabIds.length; ci++) {
    var tabContent = document.createElement('div');
    tabContent.className = 'tab-content' + (ci === 0 ? ' active' : '');
    tabContent.id = tabIds[ci];
    var container = document.createElement('div');
    container.className = 'container';
    tabContent.appendChild(container);
    root.appendChild(tabContent);
  }

  // Render each section
  renderBayanat(document.querySelector('#bayanat .container'), data.bayanat || []);
  renderSirens(document.querySelector('#sirens .container'), data.sirens || [], data.sirenPoints || []);
  renderEnemy(document.querySelector('#enemy .container'), data.enemy || []);
  renderIran(document.querySelector('#iran .container'), data.iran || []);
  renderVideos(document.querySelector('#videos .container'), data.videos || []);
  renderAllies(document.querySelector('#allies .container'), data.allies || []);

  // Footer
  var footer = document.createElement('div');
  footer.className = 'footer';
  footer.textContent = 'مصدر: قناة الإعلام الحربي — التغطية الإخبارية (Telegram) \u2022 ' + data.dayAr + ' ' + data.dateAr;
  var ver = document.createElement('span');
  ver.className = 'ver-link';
  ver.style.cssText = 'display:inline-block;margin-top:6px;font-size:0.6rem;opacity:0.5;direction:ltr;cursor:pointer;';
  ver.textContent = 'Harbi Reports v1.0.48';
  ver.onclick = function() { showChangelog(); };
  footer.appendChild(ver);
  root.appendChild(footer);

  // Init search and siren map lazy loading
  initSearch();
  window._mapInited = false;
  window._sirenPoints = data.sirenPoints || [];

  // Handle deep-link from search: ?tab=X&idx=N&q=term
  var urlParams = new URLSearchParams(window.location.search);
  var targetTab = urlParams.get('tab');
  var targetIdx = urlParams.get('idx');

  if (targetTab) {
    // Switch to the target tab
    var tabEl = document.querySelector('.tab[onclick*="' + targetTab + '"]');
    if (tabEl) switchTab(targetTab, tabEl);

    // Scroll to the specific card
    if (targetIdx !== null) {
      setTimeout(function() {
        var cards = document.querySelectorAll('#' + targetTab + ' .tl-wrap');
        var idx = parseInt(targetIdx);
        if (cards[idx]) {
          cards[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight effect
          var body = cards[idx].querySelector('.tl-body');
          if (body) {
            body.style.borderColor = 'var(--accent)';
            body.style.boxShadow = '0 0 20px rgba(201,168,76,0.25)';
            setTimeout(function() {
              body.style.borderColor = '';
              body.style.boxShadow = '';
            }, 3000);
          }
        }
      }, 300);
    }
  }
}

function makePhase(text, count) {
  var div = document.createElement('div');
  div.className = 'phase';
  var span = document.createElement('span');
  var label = text;
  if (count !== undefined && count !== null) {
    label = label + ' \u2014 ' + count + ' عملية';
  }
  span.textContent = label;
  div.appendChild(span);
  return div;
}

// ── 3. createTimelineCard helper ────────────────────────────

function createTimelineCard(config) {
  // config: { wrapClass, nodeTime, nodeColor, hasHit, tintColor, title,
  //           chips:[], dots:[], hiddenEls:{}, fullText }
  var wrap = document.createElement('div');
  wrap.className = 'tl-wrap' + (config.wrapClass ? ' ' + config.wrapClass : '');

  // Node
  var node = document.createElement('div');
  node.className = 'tl-node' + (config.nodeColor ? ' ' + config.nodeColor : '') + (config.hasHit ? ' has-hit' : '');
  var nodeTime = document.createElement('span');
  nodeTime.className = 'node-time';
  nodeTime.textContent = config.nodeTime || '';
  node.appendChild(nodeTime);
  wrap.appendChild(node);

  // Line
  var line = document.createElement('div');
  line.className = 'tl-line';
  wrap.appendChild(line);

  // Body
  var body = document.createElement('div');
  body.className = 'tl-body' + (config.tintColor ? ' ' + config.tintColor : '');

  // Hidden elements for compatibility
  if (config.hiddenEls) {
    var keys = Object.keys(config.hiddenEls);
    for (var hi = 0; hi < keys.length; hi++) {
      var hKey = keys[hi];
      var hDiv = document.createElement('div');
      hDiv.className = hKey;
      hDiv.style.display = 'none';
      hDiv.textContent = config.hiddenEls[hKey];
      body.appendChild(hDiv);
    }
  }

  // Title
  var titleEl = document.createElement('div');
  titleEl.className = 'tl-title';
  titleEl.textContent = config.title || '';
  body.appendChild(titleEl);

  // Chips
  if (config.chips && config.chips.length > 0) {
    var chipsWrap = document.createElement('div');
    chipsWrap.className = 'tl-chips';
    for (var ci = 0; ci < config.chips.length; ci++) {
      var chipConf = config.chips[ci];
      var chip = document.createElement('span');
      chip.className = 'tl-chip' + (chipConf.cls ? ' ' + chipConf.cls : '');
      if (chipConf.html) {
        chip.innerHTML = chipConf.html;
      } else {
        chip.textContent = chipConf.text || '';
      }
      chipsWrap.appendChild(chip);
    }
    body.appendChild(chipsWrap);
  }

  // Dots
  if (config.dots && config.dots.length > 0) {
    var dotsWrap = document.createElement('div');
    dotsWrap.className = 'tl-dots';
    for (var di = 0; di < config.dots.length; di++) {
      var dotConf = config.dots[di];
      var dotSpan = document.createElement('span');
      dotSpan.className = 'tl-dot';
      var dotCircle = document.createElement('span');
      dotCircle.className = 'dot';
      dotCircle.style.background = dotConf.color || '#888';
      dotSpan.appendChild(dotCircle);
      dotSpan.appendChild(document.createTextNode(' ' + dotConf.label));
      dotsWrap.appendChild(dotSpan);
    }
    body.appendChild(dotsWrap);
  }

  // Hidden tag spans (for enhancements.js)
  if (config.hiddenTags) {
    for (var ti = 0; ti < config.hiddenTags.length; ti++) {
      var tagSpan = document.createElement('span');
      tagSpan.className = 'bayan-tag';
      tagSpan.style.display = 'none';
      tagSpan.textContent = config.hiddenTags[ti];
      body.appendChild(tagSpan);
    }
  }

  // Optional tl-text for long summaries
  if (config.tlText) {
    var tlTextEl = document.createElement('div');
    tlTextEl.className = 'tl-text';
    tlTextEl.textContent = config.tlText;
    body.appendChild(tlTextEl);
  }

  wrap.appendChild(body);

  // addToggle appends inside tl-body via the updated function
  addToggle(wrap, config.fullText);

  return wrap;
}

// ── 4. renderBayanat ────────────────────────────────────────

function renderBayanat(container, items) {
  var phases = [
    { id: 'fajr', label: 'الفجر — 00:00 – 05:00', min: 0, max: 4 },
    { id: 'sabah', label: 'الصباح — 05:00 – 12:00', min: 5, max: 11 },
    { id: 'zuhr', label: 'الظهر — 12:00 – 16:00', min: 12, max: 15 },
    { id: 'masaa', label: 'المساء — 16:00 – نهاية اليوم', min: 16, max: 23 }
  ];

  var grouped = { fajr: [], sabah: [], zuhr: [], masaa: [] };

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var timeStr = item.opTime || item.postTime || '00:00';
    var hour = parseInt(timeStr.split(':')[0], 10);
    if (hour < 5) grouped.fajr.push(item);
    else if (hour < 12) grouped.sabah.push(item);
    else if (hour < 16) grouped.zuhr.push(item);
    else grouped.masaa.push(item);
  }

  var tagColorMap = {
    'في إطار التحذير': '#a855f7',
    'إصابة مباشرة': '#ef4444',
    'إصابة مؤكّدة': '#ef4444',
    'ضربة عمق': '#3b82f6',
    'ردّاً على': '#f97316'
  };

  var badgeNodeMap = {
    'settlement': 'node-purple',
    'tank': 'node-orange',
    'deep': 'node-blue',
    'multi': 'node-accent'
  };

  var badgeTintMap = {
    'settlement': 'tint-purple',
    'tank': 'tint-orange',
    'deep': 'tint-blue'
  };

  for (var pi = 0; pi < phases.length; pi++) {
    var phase = phases[pi];
    var phaseItems = grouped[phase.id];
    if (phaseItems.length === 0) continue;

    container.appendChild(makePhase(phase.label, phaseItems.length));

    for (var bi = 0; bi < phaseItems.length; bi++) {
      var b = phaseItems[bi];

      // Determine node color and tint
      var nodeColor = 'node-green';
      var tintColor = '';
      if (b.badge && badgeNodeMap[b.badge]) {
        nodeColor = badgeNodeMap[b.badge];
      }
      if (b.badge && badgeTintMap[b.badge]) {
        tintColor = badgeTintMap[b.badge];
      }

      // Build chips
      var chips = [];
      if (b.weapon) {
        chips.push({ cls: 'weapon-chip', text: b.weapon });
      }
      chips.push({ cls: 'ref-chip', text: 'بيان #' + (b.num || '+') });

      // Build dots and determine hasHit
      var dots = [];
      var hasHit = false;
      var hiddenTags = [];
      if (b.tags && b.tags.length > 0) {
        for (var tgi = 0; tgi < b.tags.length; tgi++) {
          var tagText = b.tags[tgi];
          hiddenTags.push(tagText);
          var dotColor = tagColorMap[tagText] || '#888';
          dots.push({ color: dotColor, label: tagText });
          if (tagText === 'إصابة مباشرة' || tagText === 'إصابة مؤكّدة') {
            hasHit = true;
          }
        }
      }

      // Wrap class
      var wrapClass = 'bayan' + (b.badge ? ' ' + b.badge : '');

      var card = createTimelineCard({
        wrapClass: wrapClass,
        nodeTime: b.opTime || b.postTime || '',
        nodeColor: nodeColor,
        hasHit: hasHit,
        tintColor: tintColor,
        title: b.target || '',
        chips: chips,
        dots: dots,
        hiddenEls: {
          'bayan-target': b.target || '',
          'bayan-num': b.num || '+'
        },
        hiddenTags: hiddenTags,
        fullText: b.fullText
      });

      container.appendChild(card);
    }
  }
}

// ── 5. renderSirens ─────────────────────────────────────────

function renderSirens(container, items, sirenPoints) {
  var mapTitle = document.createElement('div');
  mapTitle.className = 'siren-map-title';
  mapTitle.textContent = 'خريطة انتشار صفارات الإنذار';
  container.appendChild(mapTitle);

  var mapDiv = document.createElement('div');
  mapDiv.id = 'sirenMap';
  container.appendChild(mapDiv);

  for (var i = 0; i < items.length; i++) {
    var item = items[i];

    var card = createTimelineCard({
      wrapClass: 'siren-row',
      nodeTime: item.time || '',
      nodeColor: 'node-red',
      hasHit: false,
      tintColor: 'tint-red',
      title: item.location || '',
      chips: [],
      dots: [],
      hiddenEls: {
        's-time': item.time || '',
        's-loc': item.location || ''
      },
      fullText: item.fullText
    });

    container.appendChild(card);
  }

  window._sirenPoints = sirenPoints;
}

// ── 6. renderEnemy ──────────────────────────────────────────

function renderEnemy(container, items) {
  container.appendChild(makePhase(items.length + ' تقرير إعلام العدو'));

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var summary = item.summary || '';
    var shortTitle = summary.length > 80 ? summary.substring(0, 80) + '...' : summary;
    var tlText = summary.length > 80 ? summary : null;

    var card = createTimelineCard({
      wrapClass: 'enemy-row',
      nodeTime: item.time || '',
      nodeColor: 'node-orange',
      hasHit: false,
      tintColor: '',
      title: shortTitle,
      chips: [],
      dots: [],
      hiddenEls: {
        'e-time': item.time || '',
        'e-text': summary
      },
      tlText: tlText,
      fullText: item.fullText
    });

    container.appendChild(card);
  }
}

// ── 7. renderIran ───────────────────────────────────────────

function renderIran(container, items) {
  container.appendChild(makePhase('العمليات الإيرانية — ' + items.length + ' خبراً'));

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var summary = item.summary || '';
    var shortTitle = summary.length > 80 ? summary.substring(0, 80) + '...' : summary;

    var chips = [];
    if (item.source) {
      chips.push({ cls: 'source-chip', text: item.source });
    }

    var card = createTimelineCard({
      wrapClass: 'iran-card',
      nodeTime: item.time || '',
      nodeColor: 'node-purple',
      hasHit: false,
      tintColor: 'tint-purple',
      title: shortTitle,
      chips: chips,
      dots: [],
      hiddenEls: {
        'i-time': item.time || '',
        'i-source': item.source || '',
        'i-text': summary
      },
      fullText: item.fullText
    });

    container.appendChild(card);
  }
}

// ── 8. renderVideos ─────────────────────────────────────────

function renderVideos(container, items) {
  container.appendChild(makePhase(items.length + ' عمليات موثّقة بالفيديو'));

  for (var i = 0; i < items.length; i++) {
    var item = items[i];

    var card = createTimelineCard({
      wrapClass: 'vid-card',
      nodeTime: item.time || '',
      nodeColor: 'node-cyan',
      hasHit: false,
      tintColor: 'tint-cyan',
      title: item.description || '',
      chips: [{ cls: 'play-chip', html: '&#9654; فيديو' }],
      dots: [],
      hiddenEls: {
        'v-time': item.time || '',
        'v-text': item.description || ''
      },
      fullText: item.fullText
    });

    container.appendChild(card);
  }
}

// ── 9. renderAllies ─────────────────────────────────────────

function renderAllies(container, items) {
  container.appendChild(makePhase('اليمن والعراق'));

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var summary = item.summary || '';
    var shortTitle = summary.length > 80 ? summary.substring(0, 80) + '...' : summary;

    var card = createTimelineCard({
      wrapClass: 'ally-card',
      nodeTime: item.time || '',
      nodeColor: 'node-cyan',
      hasHit: false,
      tintColor: 'tint-cyan',
      title: shortTitle,
      chips: [{ cls: 'flag-chip', text: item.flag || '' }],
      dots: [],
      hiddenEls: {
        'a-flag': item.flag || '',
        'a-time': item.time || '',
        'a-text': summary
      },
      fullText: item.fullText
    });

    container.appendChild(card);
  }
}

// ── 10. switchTab ───────────────────────────────────────────

function switchTab(id, el) {
  document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
  document.getElementById(id).classList.add('active');
  el.classList.add('active');
  window.scrollTo({ top: document.querySelector('.tabs').offsetTop, behavior: 'smooth' });
  if (id === 'sirens' && !window._mapInited) {
    initSirenMap();
  }
}

// ── 11. toggleText + addToggle ──────────────────────────────

function toggleText(btn) {
  var ft = btn.nextElementSibling;
  ft.classList.toggle('show');
  btn.classList.toggle('open');
  btn.textContent = ft.classList.contains('show') ? 'إخفاء النص ▲' : 'النص الكامل ▼';
}

function addToggle(card, text) {
  if (!text) return;
  var target = card.querySelector('.tl-body') || card;
  var btn = document.createElement('span');
  btn.className = 'txt-toggle';
  btn.textContent = 'النص الكامل ▼';
  btn.onclick = function() { toggleText(this); };
  var div = document.createElement('div');
  div.className = 'txt-full';
  div.textContent = text;
  target.appendChild(btn);
  target.appendChild(div);
}

// ── 12. Search engine ───────────────────────────────────────

var aliases = {
  'merkava': 'ميركافا', 'tank': 'ميركافا', 'دبابة': 'ميركافا', 'دبابه': 'ميركافا',
  'drone': 'مسيّرة', 'uav': 'مسيّرة', 'fpv': 'FPV',
  'missile': 'صاروخ', 'rocket': 'صاروخ',
  'siren': 'صفارات', 'صفارة': 'صفارات', 'انذار': 'إنذار',
  'haifa': 'حيفا', 'tel aviv': 'تل أبيب', 'telaviv': 'تل أبيب',
  'iran': 'إيران', 'ايران': 'إيران',
  'kiryat': 'كريات', 'kiryat shmona': 'كريات شمونة',
  'nahariya': 'نهاريا', 'metula': 'المطلة',
  'bint jbeil': 'بنت جبيل', 'maroun': 'مارون',
  'litani': 'الليطاني', 'ليطاني': 'الليطاني',
  'yemen': 'اليمن', 'يمن': 'اليمن',
  'iraq': 'العراق', 'عراق': 'العراق',
  'ambush': 'كمين',
  'killed': 'قتلى', 'قتيل': 'قتلى', 'مقتل': 'قتلى',
  'injured': 'جرحى', 'جريح': 'جرحى', 'إصابة': 'إصاب',
  'settlement': 'مستوطنة', 'مستوطنه': 'مستوطنة',
  'base': 'قاعدة', 'قاعده': 'قاعدة',
  'artillery': 'مدفعية', 'مدفعيه': 'مدفعية',
  'safed': 'صفد', 'acre': 'عكا', 'akka': 'عكا',
  'golan': 'الجولان', 'جولان': 'الجولان',
  'jerusalem': 'القدس', 'قدس': 'القدس',
  'warning': 'التحذير', 'تحذير': 'التحذير',
  'khiam': 'الخيام', 'خيام': 'الخيام'
};

function normalizeAr(s) {
  return s.replace(/[إأآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ّ/g, '')
    .replace(/[\u064B-\u065F\u0670]/g, '').toLowerCase();
}

var CARD_SEL = '.tl-wrap';
var tabNames = { bayanat: 'بيانات', sirens: 'صفارات', enemy: 'إعلام', iran: 'إيران', videos: 'فيديو', allies: 'حلفاء' };
var _searchTimer = null;

function initSearch() {
  var input = document.getElementById('searchInput');
  input.addEventListener('input', function() {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(function() {
      performSearch(input.value.trim());
    }, 150);
  });
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      clearSearch();
    }
  });
}

function clearSearch() {
  var input = document.getElementById('searchInput');
  input.value = '';
  document.getElementById('searchStats').textContent = '';

  var cards = document.querySelectorAll(CARD_SEL);
  for (var i = 0; i < cards.length; i++) {
    cards[i].style.display = '';
  }

  var phases = document.querySelectorAll('.phase');
  for (var p = 0; p < phases.length; p++) {
    phases[p].style.display = '';
  }

  var noRes = document.querySelectorAll('.no-results');
  for (var n = 0; n < noRes.length; n++) {
    noRes[n].remove();
  }
}

function performSearch(query) {
  if (!query) {
    clearSearch();
    return;
  }

  // Resolve full-query alias first
  var resolved = aliases[query.toLowerCase()];
  var words = (resolved || query).split(/\s+/);
  var normalizedWords = [];
  for (var wi = 0; wi < words.length; wi++) {
    var w = words[wi].toLowerCase();
    var aliased = aliases[w];
    normalizedWords.push(normalizeAr(aliased || w));
  }

  var cards = document.querySelectorAll(CARD_SEL);
  var tabCounts = { bayanat: 0, sirens: 0, enemy: 0, iran: 0, videos: 0, allies: 0 };
  var totalMatches = 0;

  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    var text = normalizeAr(card.textContent);
    var matchAll = true;

    for (var nw = 0; nw < normalizedWords.length; nw++) {
      if (text.indexOf(normalizedWords[nw]) === -1) {
        matchAll = false;
        break;
      }
    }

    if (matchAll) {
      card.style.display = '';
      totalMatches++;
      var tabContent = card.closest('.tab-content');
      if (tabContent) {
        tabCounts[tabContent.id] = (tabCounts[tabContent.id] || 0) + 1;
      }
    } else {
      card.style.display = 'none';
    }
  }

  // Hide empty phases
  var phases = document.querySelectorAll('.phase');
  for (var p = 0; p < phases.length; p++) {
    var phaseEl = phases[p];
    var nextEl = phaseEl.nextElementSibling;
    var hasVisible = false;
    while (nextEl && !nextEl.classList.contains('phase') && !nextEl.classList.contains('siren-map-title') && nextEl.id !== 'sirenMap') {
      if (nextEl.matches && nextEl.matches(CARD_SEL) && nextEl.style.display !== 'none') {
        hasVisible = true;
        break;
      }
      nextEl = nextEl.nextElementSibling;
    }
    phaseEl.style.display = hasVisible ? '' : 'none';
  }

  // Remove old no-results messages
  var oldNoRes = document.querySelectorAll('.no-results');
  for (var on = 0; on < oldNoRes.length; on++) {
    oldNoRes[on].remove();
  }

  // Add no-results per empty tab
  var tabIds = Object.keys(tabCounts);
  for (var ti = 0; ti < tabIds.length; ti++) {
    var tid = tabIds[ti];
    if (tabCounts[tid] === 0) {
      var tabContainer = document.querySelector('#' + tid + ' .container');
      if (tabContainer) {
        var noMsg = document.createElement('div');
        noMsg.className = 'no-results';
        noMsg.textContent = 'لا نتائج';
        tabContainer.appendChild(noMsg);
      }
    }
  }

  // Stats display
  var statParts = [];
  for (var sti = 0; sti < tabIds.length; sti++) {
    var stid = tabIds[sti];
    if (tabCounts[stid] > 0) {
      statParts.push(tabNames[stid] + ': ' + tabCounts[stid]);
    }
  }
  document.getElementById('searchStats').textContent = totalMatches + ' نتيجة — ' + statParts.join(' | ');

  // Auto-switch to first tab with results
  var firstTabWithResults = null;
  for (var fi = 0; fi < tabIds.length; fi++) {
    if (tabCounts[tabIds[fi]] > 0) {
      firstTabWithResults = tabIds[fi];
      break;
    }
  }
  if (firstTabWithResults) {
    var allTabs = document.querySelectorAll('.tab');
    var tabIndex = tabIds.indexOf(firstTabWithResults);
    if (tabIndex >= 0 && allTabs[tabIndex]) {
      switchTab(firstTabWithResults, allTabs[tabIndex]);
    }
  }
}

// ── 13. Siren map (Leaflet) ────────────────────────────────

window._mapInited = false;
window._sirenPoints = [];

function initSirenMap() {
  window._mapInited = true;
  var sirenMap = L.map('sirenMap', {
    center: [32.5, 35.0], zoom: 8, zoomControl: true, attributionControl: false
  });

  if (typeof addTrackedTileLayer === 'function') {
    addTrackedTileLayer(sirenMap);
  } else {
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 15 }).addTo(sirenMap);
  }

  var sirenRows = document.querySelectorAll('#sirens .siren-row');

  window._sirenPoints.forEach(function(pt) {
    var radius = 6 + Math.min(pt.count * 2, 14);
    var opacity = 0.5 + Math.min(pt.count * 0.06, 0.4);

    var marker = L.circleMarker([pt.lat, pt.lng], {
      radius: radius, fillColor: '#e74c3c', fillOpacity: opacity,
      color: '#e74c3c', weight: 2, className: 'siren-pulse'
    }).addTo(sirenMap);

    // Build popup HTML from trusted JSON data
    var popupParts = ['<div style="text-align:right;direction:rtl;min-width:120px;">'];
    popupParts.push('<div style="font-weight:800;font-size:0.9rem;color:#e74c3c;margin-bottom:4px;">');
    popupParts.push(pt.loc);
    popupParts.push('</div>');
    popupParts.push('<div style="font-size:0.72rem;color:#6b7d92;margin-bottom:6px;">');
    popupParts.push(pt.count + ' صفارة</div>');
    for (var ti = 0; ti < pt.times.length; ti++) {
      popupParts.push('<div style="font-size:0.75rem;padding:2px 0;"><span class="popup-time">');
      popupParts.push(pt.times[ti]);
      popupParts.push('</span></div>');
    }
    popupParts.push('</div>');
    marker.bindPopup(popupParts.join(''), { closeButton: false, offset: [0, -5] });

    marker.on('mouseover', function() {
      this.openPopup();
      this.setStyle({ fillOpacity: 1, weight: 3, radius: radius + 3 });
      sirenRows.forEach(function(row) {
        var loc = row.querySelector('.s-loc');
        if (loc && loc.textContent.indexOf(pt.loc) !== -1) {
          row.classList.add('highlighted');
        }
      });
    });

    marker.on('mouseout', function() {
      this.closePopup();
      this.setStyle({ fillOpacity: opacity, weight: 2, radius: radius });
      sirenRows.forEach(function(row) { row.classList.remove('highlighted'); });
    });

    marker.on('click', function() {
      sirenRows.forEach(function(row) {
        var loc = row.querySelector('.s-loc');
        if (loc && loc.textContent.indexOf(pt.loc) !== -1) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          row.classList.add('highlighted');
          setTimeout(function() { row.classList.remove('highlighted'); }, 2000);
        }
      });
    });
  });

  // Count labels for high-density points
  window._sirenPoints.forEach(function(pt) {
    if (pt.count >= 3) {
      var countEl = document.createElement('div');
      countEl.style.cssText = 'background:rgba(231,76,60,0.85);color:#fff;font-size:0.6rem;font-weight:800;padding:1px 5px;border-radius:6px;font-family:sans-serif;white-space:nowrap;text-align:center;';
      countEl.textContent = pt.count;
      var icon = L.divIcon({ className: '', html: countEl.outerHTML, iconSize: [20, 16], iconAnchor: [10, -8] });
      L.marker([pt.lat, pt.lng], { icon: icon, interactive: false }).addTo(sirenMap);
    }
  });

  setTimeout(function() { sirenMap.invalidateSize(); }, 200);
  if (typeof addFullscreenBtn === 'function') addFullscreenBtn(document.getElementById('sirenMap'), sirenMap);
}

// ── 14. Changelog modal ────────────────────────────────────────

function showChangelog() {
  var existing = document.querySelector('.changelog-overlay');
  if (existing) { existing.classList.add('show'); return; }

  fetch('changelog.json?t=' + Date.now())
    .then(function(r) { return r.json(); })
    .then(function(releases) {
      var overlay = document.createElement('div');
      overlay.className = 'changelog-overlay show';
      overlay.onclick = function(e) { if (e.target === overlay) overlay.classList.remove('show'); };

      var modal = document.createElement('div');
      modal.className = 'changelog-modal';

      var header = document.createElement('div');
      header.className = 'changelog-header';
      var h2 = document.createElement('h2');
      h2.textContent = 'Changelog';
      header.appendChild(h2);
      var closeBtn = document.createElement('button');
      closeBtn.className = 'changelog-close';
      closeBtn.textContent = '\u2715';
      closeBtn.onclick = function() { overlay.classList.remove('show'); };
      header.appendChild(closeBtn);
      modal.appendChild(header);

      var body = document.createElement('div');
      body.className = 'changelog-body';

      for (var i = 0; i < releases.length; i++) {
        var rel = releases[i];
        var release = document.createElement('div');
        release.className = 'changelog-release';

        var verRow = document.createElement('div');
        verRow.className = 'changelog-ver';

        var badge = document.createElement('span');
        badge.className = 'ver-badge';
        badge.textContent = 'v' + rel.version;
        verRow.appendChild(badge);

        var title = document.createElement('span');
        title.className = 'ver-title';
        title.textContent = rel.title;
        verRow.appendChild(title);

        var date = document.createElement('span');
        date.className = 'ver-date';
        date.textContent = rel.date;
        verRow.appendChild(date);

        release.appendChild(verRow);

        var list = document.createElement('ul');
        list.className = 'changelog-list';
        for (var j = 0; j < rel.changes.length; j++) {
          var li = document.createElement('li');
          li.textContent = rel.changes[j];
          list.appendChild(li);
        }
        release.appendChild(list);
        body.appendChild(release);
      }

      modal.appendChild(body);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
    });
}
