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
  statsBar.className = 'stats-bar';
  for (var si = 0; si < statsConfig.length; si++) {
    var sc = statsConfig[si];
    var statBox = document.createElement('div');
    statBox.className = 'stat ' + sc.cls;
    var countSpan = document.createElement('span');
    countSpan.className = 'stat-count';
    countSpan.textContent = data.stats[sc.key];
    var labelSpan = document.createElement('span');
    labelSpan.className = 'stat-label';
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
    badge.className = 'tab-badge';
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
  root.appendChild(footer);

  // Init search and siren map lazy loading
  initSearch();
  window._mapInited = false;
  window._sirenPoints = data.sirenPoints || [];
}

// ── 3. renderBayanat ────────────────────────────────────────

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

  for (var pi = 0; pi < phases.length; pi++) {
    var phase = phases[pi];
    var phaseItems = grouped[phase.id];
    if (phaseItems.length === 0) continue;

    var divider = document.createElement('div');
    divider.className = 'phase';
    divider.textContent = phase.label;
    container.appendChild(divider);

    for (var bi = 0; bi < phaseItems.length; bi++) {
      var b = phaseItems[bi];
      var card = document.createElement('div');
      card.className = 'bayan' + (b.badge ? ' ' + b.badge : '');

      // Header
      var bHeader = document.createElement('div');
      bHeader.className = 'bayan-header';

      var bNum = document.createElement('div');
      bNum.className = 'bayan-num';
      bNum.textContent = b.num || '+';
      bHeader.appendChild(bNum);

      var bTimes = document.createElement('div');
      bTimes.className = 'bayan-times';

      var postLabel = document.createElement('span');
      postLabel.className = 't-label';
      postLabel.textContent = 'نُشر';
      bTimes.appendChild(postLabel);
      bTimes.appendChild(document.createTextNode(' '));
      var postVal = document.createElement('span');
      postVal.className = 't-val';
      postVal.textContent = b.postTime || '';
      bTimes.appendChild(postVal);
      bTimes.appendChild(document.createTextNode('\u00A0'));
      var opLabel = document.createElement('span');
      opLabel.className = 't-label';
      opLabel.textContent = 'نُفّذ';
      bTimes.appendChild(opLabel);
      bTimes.appendChild(document.createTextNode(' '));
      var opVal = document.createElement('span');
      opVal.className = 't-val';
      opVal.textContent = b.opTime || '';
      bTimes.appendChild(opVal);

      bHeader.appendChild(bTimes);
      card.appendChild(bHeader);

      // Target
      var bTarget = document.createElement('div');
      bTarget.className = 'bayan-target';
      bTarget.textContent = b.target || '';
      card.appendChild(bTarget);

      // Weapon
      if (b.weapon) {
        var bDetails = document.createElement('div');
        bDetails.className = 'bayan-details';
        var detailInner = document.createElement('div');
        var weaponLabel = document.createElement('span');
        weaponLabel.className = 'detail-label';
        weaponLabel.textContent = 'السلاح';
        detailInner.appendChild(weaponLabel);
        detailInner.appendChild(document.createElement('br'));
        var weaponVal = document.createElement('span');
        weaponVal.className = 'detail-val';
        weaponVal.textContent = b.weapon;
        detailInner.appendChild(weaponVal);
        bDetails.appendChild(detailInner);
        card.appendChild(bDetails);
      }

      // Tags
      if (b.tags && b.tags.length > 0) {
        var tagMap = {
          'في إطار التحذير': 'tag-warning',
          'إصابة مباشرة': 'tag-hit',
          'إصابة مؤكّدة': 'tag-hit',
          'ضربة عمق': 'tag-deep',
          'ردّاً على': 'tag-retaliation'
        };
        for (var tgi = 0; tgi < b.tags.length; tgi++) {
          var tagText = b.tags[tgi];
          var tagClass = tagMap[tagText] || '';
          var tagSpan = document.createElement('span');
          tagSpan.className = 'bayan-tag' + (tagClass ? ' ' + tagClass : '');
          tagSpan.textContent = tagText;
          card.appendChild(tagSpan);
        }
      }

      addToggle(card, b.fullText);
      container.appendChild(card);
    }
  }
}

// ── 4. renderSirens ─────────────────────────────────────────

function renderSirens(container, items, sirenPoints) {
  var divider = document.createElement('div');
  divider.className = 'phase';
  divider.textContent = items.length + ' صفارة إنذار عبر فلسطين المحتلة';
  container.appendChild(divider);

  var mapTitle = document.createElement('div');
  mapTitle.className = 'siren-map-title';
  mapTitle.textContent = 'خريطة انتشار صفارات الإنذار';
  container.appendChild(mapTitle);

  var mapDiv = document.createElement('div');
  mapDiv.id = 'sirenMap';
  container.appendChild(mapDiv);

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var row = document.createElement('div');
    row.className = 'siren-row';

    var sTime = document.createElement('span');
    sTime.className = 's-time';
    sTime.textContent = item.time || '';
    row.appendChild(sTime);

    var sLoc = document.createElement('span');
    sLoc.className = 's-loc';
    sLoc.textContent = item.location || '';
    row.appendChild(sLoc);

    addToggle(row, item.fullText);
    container.appendChild(row);
  }

  window._sirenPoints = sirenPoints;
}

// ── 5. renderEnemy ──────────────────────────────────────────

function renderEnemy(container, items) {
  var divider = document.createElement('div');
  divider.className = 'phase';
  divider.textContent = items.length + ' تقرير إعلام العدو';
  container.appendChild(divider);

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var card = document.createElement('div');
    card.className = 'enemy-row';

    var eTime = document.createElement('span');
    eTime.className = 'e-time';
    eTime.textContent = item.time || '';
    card.appendChild(eTime);

    var eText = document.createElement('span');
    eText.className = 'e-text';
    eText.textContent = item.summary || '';
    card.appendChild(eText);

    addToggle(card, item.fullText);
    container.appendChild(card);
  }
}

// ── 6. renderIran ───────────────────────────────────────────

function renderIran(container, items) {
  var divider = document.createElement('div');
  divider.className = 'phase';
  divider.textContent = 'العمليات الإيرانية — ' + items.length + ' خبراً';
  container.appendChild(divider);

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var card = document.createElement('div');
    card.className = 'iran-card';

    var iTime = document.createElement('span');
    iTime.className = 'i-time';
    iTime.textContent = item.time || '';
    card.appendChild(iTime);

    var iSource = document.createElement('span');
    iSource.className = 'i-source';
    iSource.textContent = item.source || '';
    card.appendChild(iSource);

    var iText = document.createElement('span');
    iText.className = 'i-text';
    iText.textContent = item.summary || '';
    card.appendChild(iText);

    addToggle(card, item.fullText);
    container.appendChild(card);
  }
}

// ── 7. renderVideos ─────────────────────────────────────────

function renderVideos(container, items) {
  var divider = document.createElement('div');
  divider.className = 'phase';
  divider.textContent = items.length + ' عمليات موثّقة بالفيديو';
  container.appendChild(divider);

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var card = document.createElement('div');
    card.className = 'vid-card';

    var vTime = document.createElement('span');
    vTime.className = 'v-time';
    vTime.textContent = (item.time || '') + ' ';
    var vidIcon = document.createElement('span');
    vidIcon.className = 'vid-icon';
    vidIcon.textContent = '\u25B6';
    vTime.appendChild(vidIcon);
    card.appendChild(vTime);

    var vText = document.createElement('span');
    vText.className = 'v-text';
    vText.textContent = item.description || '';
    card.appendChild(vText);

    addToggle(card, item.fullText);
    container.appendChild(card);
  }
}

// ── 8. renderAllies ─────────────────────────────────────────

function renderAllies(container, items) {
  var divider = document.createElement('div');
  divider.className = 'phase';
  divider.textContent = 'اليمن والعراق';
  container.appendChild(divider);

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var card = document.createElement('div');
    card.className = 'ally-card';

    var aFlag = document.createElement('span');
    aFlag.className = 'a-flag';
    aFlag.textContent = item.flag || '';
    card.appendChild(aFlag);

    var aTime = document.createElement('span');
    aTime.className = 'a-time';
    aTime.textContent = item.time || '';
    card.appendChild(aTime);

    var aText = document.createElement('span');
    aText.className = 'a-text';
    aText.textContent = item.summary || '';
    card.appendChild(aText);

    addToggle(card, item.fullText);
    container.appendChild(card);
  }
}

// ── 9. switchTab ────────────────────────────────────────────

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

// ── 10. toggleText + addToggle ──────────────────────────────

function toggleText(btn) {
  var ft = btn.nextElementSibling;
  ft.classList.toggle('show');
  btn.classList.toggle('open');
  btn.textContent = ft.classList.contains('show') ? 'إخفاء النص ▲' : 'النص الكامل ▼';
}

function addToggle(card, text) {
  if (!text) return;
  var btn = document.createElement('span');
  btn.className = 'txt-toggle';
  btn.textContent = 'النص الكامل ▼';
  btn.onclick = function() { toggleText(this); };
  var div = document.createElement('div');
  div.className = 'txt-full';
  div.textContent = text;
  card.appendChild(btn);
  card.appendChild(div);
}

// ── 11. Search engine ───────────────────────────────────────

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

var CARD_SEL = '.bayan, .siren-row, .enemy-row, .iran-card, .vid-card, .ally-card';
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

// ── 12. Siren map (Leaflet) ────────────────────────────────

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
