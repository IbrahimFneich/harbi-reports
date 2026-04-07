// ═══════════════════════════════════════════════════════════
// Report Enhancements — shared across all daily reports
// Auto-generates: categorization dashboards + theme toggle
// Note: innerHTML used only with locally-generated static strings
// (no user input), safe for this static site context.
// ═══════════════════════════════════════════════════════════

// Reports list for navigation
var ALL_REPORTS = ['2026-04-01','2026-04-02','2026-04-03','2026-04-04','2026-04-05','2026-04-06','2026-04-07'];
var arabicMonthNames = {1:'كانون الثاني',2:'شباط',3:'آذار',4:'نيسان',5:'أيار',6:'حزيران',7:'تموز',8:'آب',9:'أيلول',10:'تشرين الأول',11:'تشرين الثاني',12:'كانون الأول'};
var arabicDayNames = {0:'الأحد',1:'الإثنين',2:'الثلاثاء',3:'الأربعاء',4:'الخميس',5:'الجمعة',6:'السبت'};

function getCurrentReportDate() {
  var match = window.location.pathname.match(/report-(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  var titleMatch = document.title.match(/(\d{4})/);
  return null;
}

function formatDateAr(dateStr) {
  var p = dateStr.split('-');
  var d = parseInt(p[2]);
  var m = parseInt(p[1]);
  return d + ' ' + (arabicMonthNames[m] || '');
}

// ═══════════════ 1. DAY SUMMARY HERO ═══════════════
(function() {
  var statsBar = document.querySelector('.stats');
  if (!statsBar) return;
  var bayanat = document.querySelectorAll('#bayanat .bayan').length;
  if (bayanat === 0) return;

  var tanks = 0, hits = 0, aircraft = 0, settlements = 0, bases = 0;
  document.querySelectorAll('#bayanat .bayan').forEach(function(c) {
    var cls = c.className || '';
    var tt = (c.querySelector('.bayan-target') || {}).textContent || '';
    var tg = ''; c.querySelectorAll('.bayan-tag').forEach(function(t) { tg += t.textContent; });
    if (cls.indexOf('tank') !== -1 || tt.indexOf('ميركافا') !== -1) tanks++;
    if (tg.indexOf('إصابة') !== -1) hits++;
    if (tt.indexOf('طائرة') !== -1 || tt.indexOf('مروحيّة') !== -1) aircraft++;
    if (cls.indexOf('settlement') !== -1) settlements++;
    if (cls.indexOf('deep') !== -1 || tt.indexOf('قاعدة') !== -1) bases++;
  });

  var hero = document.createElement('div');
  hero.className = 'day-hero';

  var chips = [
    [bayanat + ' عملية', 'rgba(46,204,113,0.12)', '#2ecc71'],
    [hits + ' إصابة مؤكّدة', 'rgba(231,76,60,0.12)', '#e74c3c']
  ];
  if (tanks > 0) chips.push([tanks + ' ميركافا', 'rgba(230,126,34,0.12)', '#e67e22']);
  if (aircraft > 0) chips.push([aircraft + ' طائرة', 'rgba(52,152,219,0.12)', '#3498db']);
  if (settlements > 0) chips.push([settlements + ' مستوطنة', 'rgba(155,89,182,0.12)', '#9b59b6']);
  if (bases > 0) chips.push([bases + ' قاعدة/بنى تحتية', 'rgba(201,168,76,0.12)', '#c9a84c']);

  var sirens = document.querySelectorAll('#sirens .siren-row').length;
  if (sirens > 0) chips.push([sirens + ' صفارة إنذار', 'rgba(231,76,60,0.08)', '#e74c3c']);

  chips.forEach(function(ch) {
    var chip = document.createElement('span');
    chip.className = 'hero-chip';
    chip.style.background = ch[1];
    chip.style.color = ch[2];
    chip.textContent = ch[0];
    hero.appendChild(chip);
  });

  statsBar.parentNode.insertBefore(hero, statsBar.nextSibling);
})();

// ═══════════════ 2. PREV/NEXT NAVIGATION ═══════════════
(function() {
  var currentDate = getCurrentReportDate();
  if (!currentDate) return;

  var idx = ALL_REPORTS.indexOf(currentDate);
  if (idx === -1) return;

  var nav = document.createElement('div');
  nav.className = 'day-nav';

  var prevBtn = document.createElement('a');
  prevBtn.className = 'day-nav-btn' + (idx === 0 ? ' disabled' : '');
  if (idx > 0) {
    prevBtn.href = 'report-' + ALL_REPORTS[idx - 1] + '.html';
    prevBtn.textContent = '\u2192 ' + formatDateAr(ALL_REPORTS[idx - 1]);
  } else {
    prevBtn.textContent = '\u2192 السابق';
  }

  var center = document.createElement('span');
  center.className = 'day-nav-current';
  var dt = new Date(parseInt(currentDate.split('-')[0]), parseInt(currentDate.split('-')[1]) - 1, parseInt(currentDate.split('-')[2]));
  center.textContent = arabicDayNames[dt.getDay()];

  var nextBtn = document.createElement('a');
  nextBtn.className = 'day-nav-btn' + (idx === ALL_REPORTS.length - 1 ? ' disabled' : '');
  if (idx < ALL_REPORTS.length - 1) {
    nextBtn.href = 'report-' + ALL_REPORTS[idx + 1] + '.html';
    nextBtn.textContent = formatDateAr(ALL_REPORTS[idx + 1]) + ' \u2190';
  } else {
    nextBtn.textContent = 'التالي \u2190';
  }

  nav.appendChild(prevBtn);
  nav.appendChild(center);
  nav.appendChild(nextBtn);

  // Insert after hero or stats
  var hero = document.querySelector('.day-hero');
  var ref = hero || document.querySelector('.stats');
  if (ref) ref.parentNode.insertBefore(nav, ref.nextSibling);
})();

// ═══════════════ MAP FULLSCREEN ═══════════════
function addFullscreenBtn(mapDiv, mapInstance) {
  if (!mapDiv) return;
  var parent = mapDiv.parentNode;

  // Wrap in relative container if not already
  if (!parent.classList.contains('map-wrapper')) {
    var wrapper = document.createElement('div');
    wrapper.className = 'map-wrapper';
    parent.insertBefore(wrapper, mapDiv);
    wrapper.appendChild(mapDiv);
    parent = wrapper;
  }

  var btn = document.createElement('button');
  btn.className = 'map-fs-btn';
  btn.textContent = '\u26F6';
  btn.title = '\u0645\u0644\u0621 \u0627\u0644\u0634\u0627\u0634\u0629';
  parent.appendChild(btn);

  var isFS = false;
  var origH = mapDiv.style.height;

  btn.onclick = function() {
    isFS = !isFS;
    if (isFS) {
      mapDiv.classList.add('map-fullscreen');
      btn.textContent = '\u2716';
      btn.title = '\u0625\u063A\u0644\u0627\u0642';
      btn.style.position = 'fixed';
      btn.style.top = '10px';
      btn.style.left = '10px';
      btn.style.zIndex = '10000';
      document.body.style.overflow = 'hidden';
    } else {
      mapDiv.classList.remove('map-fullscreen');
      btn.textContent = '\u26F6';
      btn.title = '\u0645\u0644\u0621 \u0627\u0644\u0634\u0627\u0634\u0629';
      btn.style.position = '';
      btn.style.top = '';
      btn.style.left = '';
      btn.style.zIndex = '';
      document.body.style.overflow = '';
    }
    if (mapInstance) {
      setTimeout(function() { mapInstance.invalidateSize(); }, 200);
    }
  };

  // ESC to exit
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isFS) {
      btn.click();
    }
  });
}

// ── THEME TOGGLE ──
(function() {
  var saved = localStorage.getItem('harbi-theme');
  if (saved === 'light') document.body.classList.add('light');

  var header = document.querySelector('.header');
  if (!header) return;

  var btn = document.createElement('button');
  btn.className = 'theme-toggle';
  btn.textContent = document.body.classList.contains('light') ? '\u263E' : '\u2600';
  btn.title = '\u062A\u0628\u062F\u064A\u0644 \u0627\u0644\u0633\u0645\u0629';
  btn.onclick = function() {
    document.body.classList.toggle('light');
    var isLight = document.body.classList.contains('light');
    btn.textContent = isLight ? '\u263E' : '\u2600';
    localStorage.setItem('harbi-theme', isLight ? 'light' : 'dark');
  };
  header.appendChild(btn);
})();

// ── Helper: create bar row ──
function makeBarRow(label, count, max, color) {
  var row = document.createElement('div');
  row.className = 'cat-bar-row';
  var lbl = document.createElement('span');
  lbl.className = 'cat-bar-label';
  lbl.textContent = label;
  var track = document.createElement('div');
  track.className = 'cat-bar-track';
  var fill = document.createElement('div');
  fill.className = 'cat-bar-fill';
  fill.style.width = Math.round((count / max) * 100) + '%';
  fill.style.background = color;
  fill.textContent = count;
  track.appendChild(fill);
  row.appendChild(lbl);
  row.appendChild(track);
  return row;
}

// ── Helper: create pill ──
function makePill(num, label, bg, color) {
  var pill = document.createElement('div');
  pill.className = 'cat-pill';
  pill.style.background = bg;
  pill.style.color = color;
  pill.style.flex = '1';
  var n = document.createElement('span');
  n.className = 'pill-num';
  n.textContent = num;
  pill.appendChild(n);
  pill.appendChild(document.createTextNode(label));
  return pill;
}

// ── Helper: create card with title ──
function makeCatCard(iconHtml, iconBg, iconColor, titleText) {
  var card = document.createElement('div');
  card.className = 'siren-cat-card';
  var title = document.createElement('div');
  title.className = 'cat-title';
  var icon = document.createElement('div');
  icon.className = 'cat-icon';
  icon.style.background = iconBg;
  icon.style.color = iconColor;
  icon.textContent = iconHtml;
  title.appendChild(icon);
  title.appendChild(document.createTextNode(' ' + titleText));
  card.appendChild(title);
  return card;
}

// ── Helper: build timeline ──
function buildTimeline(containerId, hours, color) {
  var maxH = 0;
  hours.forEach(function(v) { if (v > maxH) maxH = v; });
  var container = document.getElementById(containerId);
  if (!container) return;
  for (var j = 0; j < 24; j++) {
    var bar = document.createElement('div');
    bar.className = 'cat-tbar';
    if (color) bar.style.background = color;
    var pct = maxH > 0 ? (hours[j] / maxH) * 100 : 0;
    bar.style.height = Math.max(pct, 2) + '%';
    if (hours[j] === 0) { bar.style.background = 'var(--surface3)'; bar.style.height = '4%'; }
    bar.title = j + ':00 \u2014 ' + hours[j];
    container.appendChild(bar);
  }
}

var barColors = ['#e74c3c','#e67e22','#f39c12','#2ecc71','#3498db','#9b59b6','#1abc9c','#6b7d92','#c9a84c'];

// ═══════════════════════ AUTO BAYANAT DASHBOARD ═══════════════════════
(function() {
  var bayanatTab = document.getElementById('bayanat');
  if (!bayanatTab) return;
  var container = bayanatTab.querySelector('.container');
  if (!container) return;
  var cards = container.querySelectorAll('.bayan');
  if (cards.length === 0) return;
  if (container.querySelector('.auto-dashboard')) return;

  var totalCards = cards.length;
  var types = {troops:0, settlement:0, air:0, tank:0, base:0};
  var weapons = {};
  var hits = 0;
  var targets = {};
  var hours = [];
  for (var i = 0; i < 24; i++) hours[i] = 0;

  var locNames = ['القنطرة','عيناتا','الطيبة','البيّاضة','مارون الراس','رشاف','بنت جبيل',
    'كريات شمونة','نهاريا','المطلة','مسكاف عام','يرؤون','أفيفيم','شلومي','حانيتا','مرغليوت',
    'الخيام','عيترون','المالكية','حولاتا','القوزح','دير سريان','العديسة','صفد','عكا','حيفا',
    'مركبا','القلعة','بيت ليف','سعسع','عيتا الشعب','ربّ ثلاثين'];

  cards.forEach(function(card) {
    var cls = card.className || '';
    var targetText = (card.querySelector('.bayan-target') || {}).textContent || '';
    var detailText = (card.querySelector('.bayan-details') || {}).textContent || '';
    var tagText = '';
    card.querySelectorAll('.bayan-tag').forEach(function(t) { tagText += ' ' + t.textContent; });

    if (cls.indexOf('tank') !== -1 || targetText.indexOf('ميركافا') !== -1) types.tank++;
    else if (cls.indexOf('settlement') !== -1) types.settlement++;
    else if (cls.indexOf('deep') !== -1 || targetText.indexOf('قاعدة') !== -1 || targetText.indexOf('ثكنة') !== -1) types.base++;
    else if (targetText.indexOf('طائرة') !== -1 || targetText.indexOf('مروحيّة') !== -1) types.air++;
    else types.troops++;

    var w = '';
    if (detailText.indexOf('صلي') !== -1 || (detailText.indexOf('صاروخ') !== -1 && detailText.indexOf('أرض') === -1 && detailText.indexOf('موجّه') === -1)) w = 'صليات صاروخية';
    else if (detailText.indexOf('مدفع') !== -1) w = 'مدفعية';
    else if (detailText.indexOf('مسيّر') !== -1 || detailText.indexOf('انقضاض') !== -1) w = 'مسيّرات';
    else if (detailText.indexOf('محلّق') !== -1) w = 'محلّقات';
    else if (detailText.indexOf('أرض') !== -1) w = 'صاروخ أرض-جو';
    else if (detailText.indexOf('موجّه') !== -1) w = 'صاروخ موجّه';
    else w = 'أخرى';
    weapons[w] = (weapons[w] || 0) + 1;

    if (tagText.indexOf('إصابة') !== -1) hits++;

    for (var n = 0; n < locNames.length; n++) {
      if (targetText.indexOf(locNames[n]) !== -1) { targets[locNames[n]] = (targets[locNames[n]] || 0) + 1; break; }
    }

    var timeEls = card.querySelectorAll('.t-val');
    if (timeEls.length >= 2) {
      var h = parseInt(timeEls[1].textContent.trim().split(':')[0]);
      if (!isNaN(h) && h >= 0 && h < 24) hours[h]++;
    }
  });

  var sortedTargets = Object.keys(targets).sort(function(a,b){ return targets[b]-targets[a]; }).slice(0,7);
  var maxTarget = sortedTargets.length > 0 ? targets[sortedTargets[0]] : 1;
  var sortedWeapons = Object.keys(weapons).sort(function(a,b){ return weapons[b]-weapons[a]; });
  var maxWeapon = sortedWeapons.length > 0 ? weapons[sortedWeapons[0]] : 1;

  var typeColors = {troops:'#2ecc71',settlement:'#9b59b6',air:'#3498db',tank:'#e67e22',base:'#e74c3c'};
  var typeLabels = {troops:'تجمّعات جنود',settlement:'مستوطنات',air:'طائرات / جو',tank:'دبابات',base:'قواعد / بنى تحتية'};
  var typeKeys = ['troops','settlement','base','air','tank'];
  var maxType = 0;
  typeKeys.forEach(function(k){ if(types[k]>maxType) maxType=types[k]; });

  var dash = document.createElement('div');
  dash.className = 'siren-cats auto-dashboard';
  dash.style.marginTop = '8px';

  // Card 1
  var c1 = makeCatCard('\u2733','var(--green-dim)','var(--green)','حسب نوع العملية');
  typeKeys.forEach(function(k){ if(types[k]>0) c1.appendChild(makeBarRow(typeLabels[k],types[k],maxType,typeColors[k])); });
  dash.appendChild(c1);

  // Card 2
  var c2 = makeCatCard('\u25C9','rgba(230,126,34,0.12)','#e67e22','حسب السلاح');
  sortedWeapons.forEach(function(w,idx){ c2.appendChild(makeBarRow(w,weapons[w],maxWeapon,barColors[idx%barColors.length])); });
  dash.appendChild(c2);

  // Card 3
  var c3 = makeCatCard('\u2713','var(--red-dim)','var(--red)','النتائج المعلنة');
  var pills = document.createElement('div');
  pills.className = 'cat-type-pills';
  pills.appendChild(makePill(hits,'إصابة مؤكّدة','var(--red-dim)','var(--red)'));
  pills.appendChild(makePill(totalCards-hits,'دون تفصيل','var(--green-dim)','var(--green)'));
  c3.appendChild(pills);
  var tlWrap = document.createElement('div');
  tlWrap.style.marginTop = '12px';
  var tlTitle = makeCatCard('\u23F1','rgba(155,89,182,0.12)','#9b59b6','توزيع العمليات بالساعة');
  var tlDiv = document.createElement('div');
  tlDiv.className = 'cat-timeline';
  tlDiv.id = 'autoBayanTimeline';
  c3.appendChild(tlWrap);
  tlWrap.appendChild(tlTitle.querySelector('.cat-title'));
  var tlBar = document.createElement('div');
  tlBar.className = 'cat-timeline';
  tlBar.id = 'autoBayanTimeline';
  tlWrap.appendChild(tlBar);
  var tlLabels = document.createElement('div');
  tlLabels.className = 'cat-tlabels';
  ['00:00','06:00','12:00','18:00','23:59'].forEach(function(l){
    var s = document.createElement('span'); s.textContent = l; tlLabels.appendChild(s);
  });
  tlWrap.appendChild(tlLabels);
  dash.appendChild(c3);

  // Card 4
  var c4 = makeCatCard('\u2694','var(--accent-dim)','var(--accent)','أكثر المواقع استهدافاً');
  sortedTargets.forEach(function(t,idx){ c4.appendChild(makeBarRow(t,targets[t],maxTarget,barColors[idx%barColors.length])); });
  dash.appendChild(c4);

  // Filters
  var filterDiv = document.createElement('div');
  filterDiv.className = 'cat-filter-bar';
  var fdata = [
    ['الكل ('+totalCards+')','all'],
    ['مستوطنات ('+types.settlement+')','settlement'],
    ['دبابات ('+types.tank+')','tank'],
    ['ضربات عمق ('+types.base+')','deep'],
    ['إصابة مؤكّدة ('+hits+')','hit'],
    ['جوّي ('+types.air+')','air']
  ];
  fdata.forEach(function(f){
    if(f[1]!=='all' && f[0].indexOf('(0)')!==-1) return;
    var b = document.createElement('button');
    b.className = 'cat-filter-btn' + (f[1]==='all'?' active':'');
    b.textContent = f[0];
    b.setAttribute('data-filter', f[1]);
    b.onclick = function(){ filterBayanatAuto(this.getAttribute('data-filter'),this); };
    filterDiv.appendChild(b);
  });

  var listTitle = document.createElement('div');
  listTitle.className = 'siren-list-title';
  listTitle.textContent = 'البيانات الكاملة';

  var firstChild = container.querySelector('.phase') || container.querySelector('.bayan');
  if (firstChild) {
    container.insertBefore(listTitle, firstChild);
    container.insertBefore(filterDiv, listTitle);
    container.insertBefore(dash, filterDiv);
  }

  buildTimeline('autoBayanTimeline', hours, '#2ecc71');
})();

function filterBayanatAuto(filter, btn) {
  var tab = document.getElementById('bayanat');
  tab.querySelectorAll('.cat-filter-btn').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  tab.querySelectorAll('.bayan').forEach(function(card){
    var cls = card.className||'';
    var tt = (card.querySelector('.bayan-target')||{}).textContent||'';
    var dt = (card.querySelector('.bayan-details')||{}).textContent||'';
    var tg = ''; card.querySelectorAll('.bayan-tag').forEach(function(t){ tg+=' '+t.textContent; });
    var show = filter==='all' ||
      (filter==='settlement' && cls.indexOf('settlement')!==-1) ||
      (filter==='tank' && (cls.indexOf('tank')!==-1||tt.indexOf('ميركافا')!==-1)) ||
      (filter==='deep' && (cls.indexOf('deep')!==-1||tt.indexOf('قاعدة')!==-1||tt.indexOf('ثكنة')!==-1)) ||
      (filter==='hit' && tg.indexOf('إصابة')!==-1) ||
      (filter==='air' && (tt.indexOf('طائرة')!==-1||tt.indexOf('مروحيّة')!==-1));
    card.style.display = show ? '' : 'none';
  });
  tab.querySelectorAll('.phase').forEach(function(p){
    var next=p.nextElementSibling; var vis=false;
    while(next && !next.classList.contains('phase') && !next.classList.contains('siren-list-title')){
      if(next.classList && next.classList.contains('bayan') && next.style.display!=='none'){vis=true;break;}
      next=next.nextElementSibling;
    }
    p.style.display = vis?'':'none';
  });
}

// ═══════════════════════ AUTO SIREN DASHBOARD ═══════════════════════
(function() {
  var sirensTab = document.getElementById('sirens');
  if (!sirensTab) return;
  var container = sirensTab.querySelector('.container');
  if (!container) return;
  var rows = container.querySelectorAll('.siren-row');
  if (rows.length === 0) return;
  if (container.querySelector('.auto-siren-dashboard')) return;

  var regions = {};
  var droneCount = 0, rocketCount = 0;
  var hours = [];
  for (var i = 0; i < 24; i++) hours[i] = 0;

  var regionKw = [
    ['تل أبيب',['تل أبيب']],['كريات شمونه',['كريات شمونه','كريات شمونة']],
    ['نهاريا',['نهاريا']],['المطلة',['المطلة']],['إصبع الجليل',['إصبع الجليل']],
    ['الجليل الغربي',['الجليل الغربي']],['الجليل الأعلى',['الجليل الأعلى']],
    ['الجولان',['الجولان']],['طبريا',['طبريا']],['أسدود',['أسدود']],
    ['القدس',['القدس']],['حيفا',['حيفا']],['صفد',['صفد']],
    ['بئر السبع',['بئر السبع']],['ديمونا',['ديمونا']],['إيلات',['إيلات']],['عكا',['عكا']]
  ];

  rows.forEach(function(row){
    var time = (row.querySelector('.s-time')||{}).textContent||'';
    var loc = (row.querySelector('.s-loc')||{}).textContent||'';
    var h = parseInt(time.split(':')[0]);
    if(!isNaN(h)&&h>=0&&h<24) hours[h]++;
    if(loc.indexOf('مسيّرة')!==-1||loc.indexOf('تسلل')!==-1) droneCount++; else rocketCount++;
    for(var r=0;r<regionKw.length;r++){
      var matched=false;
      for(var k=0;k<regionKw[r][1].length;k++){
        if(loc.indexOf(regionKw[r][1][k])!==-1){regions[regionKw[r][0]]=(regions[regionKw[r][0]]||0)+1;matched=true;break;}
      }
      if(matched) break;
    }
  });

  var sortedR = Object.keys(regions).sort(function(a,b){return regions[b]-regions[a];}).slice(0,9);
  var maxR = sortedR.length>0?regions[sortedR[0]]:1;

  var dash = document.createElement('div');
  dash.className = 'siren-cats auto-siren-dashboard';

  var c1 = makeCatCard('\u25C9','var(--red-dim)','var(--red)','حسب المنطقة');
  sortedR.forEach(function(r,idx){ c1.appendChild(makeBarRow(r,regions[r],maxR,barColors[idx%barColors.length])); });
  dash.appendChild(c1);

  var c2 = makeCatCard('\u26A0','rgba(52,152,219,0.12)','#3498db','حسب النوع');
  var pills = document.createElement('div');
  pills.className = 'cat-type-pills';
  pills.appendChild(makePill(rocketCount,'صواريخ / قصف','var(--red-dim)','var(--red)'));
  pills.appendChild(makePill(droneCount,'تسلل مسيّرات','rgba(52,152,219,0.12)','#3498db'));
  c2.appendChild(pills);

  var tlWrap = document.createElement('div');
  tlWrap.style.marginTop = '14px';
  var tlHead = makeCatCard('\u23F1','rgba(155,89,182,0.12)','#9b59b6','حسب الوقت');
  tlWrap.appendChild(tlHead.querySelector('.cat-title'));
  var tlBar = document.createElement('div');
  tlBar.className = 'cat-timeline';
  tlBar.id = 'autoSirenTimeline';
  tlWrap.appendChild(tlBar);
  var tlLabels = document.createElement('div');
  tlLabels.className = 'cat-tlabels';
  ['00:00','06:00','12:00','18:00','23:59'].forEach(function(l){
    var s=document.createElement('span');s.textContent=l;tlLabels.appendChild(s);
  });
  tlWrap.appendChild(tlLabels);
  c2.appendChild(tlWrap);
  dash.appendChild(c2);

  // Filters
  var filterDiv = document.createElement('div');
  filterDiv.className = 'cat-filter-bar';
  var sFilters = [['الكل ('+rows.length+')','all']];
  sortedR.slice(0,5).forEach(function(r){ sFilters.push([r+' ('+regions[r]+')','r:'+r]); });
  if(droneCount>0) sFilters.push(['مسيّرات ('+droneCount+')','drone']);
  sFilters.forEach(function(f){
    var b = document.createElement('button');
    b.className = 'cat-filter-btn'+(f[1]==='all'?' active':'');
    b.textContent = f[0];
    b.setAttribute('data-filter',f[1]);
    b.onclick = function(){ filterSirensAuto(this.getAttribute('data-filter'),this); };
    filterDiv.appendChild(b);
  });

  var listTitle = document.createElement('div');
  listTitle.className = 'siren-list-title';
  listTitle.textContent = 'القائمة الكاملة';

  var mapEl = document.getElementById('sirenMap');
  var ref = mapEl ? mapEl.nextSibling : (container.querySelector('.phase') || rows[0]);
  if (ref) {
    ref.parentNode.insertBefore(dash, ref.nextSibling || ref);
    dash.parentNode.insertBefore(filterDiv, dash.nextSibling);
    filterDiv.parentNode.insertBefore(listTitle, filterDiv.nextSibling);
  }

  buildTimeline('autoSirenTimeline', hours, '#e74c3c');
})();

function filterSirensAuto(filter, btn) {
  var tab = document.getElementById('sirens');
  tab.querySelectorAll('.cat-filter-btn').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  tab.querySelectorAll('.siren-row').forEach(function(row){
    var loc = (row.querySelector('.s-loc')||{}).textContent||'';
    if(filter==='all') row.style.display='';
    else if(filter==='drone') row.style.display=(loc.indexOf('مسيّرة')!==-1||loc.indexOf('تسلل')!==-1)?'':'none';
    else if(filter.indexOf('r:')===0) row.style.display=loc.indexOf(filter.substring(2))!==-1?'':'none';
    else row.style.display=loc.indexOf(filter)!==-1?'':'none';
  });
}

// ═══════════════════════ AUTO BAYANAT MAP ═══════════════════════
(function() {
  if (typeof L === 'undefined') return;
  var bayanatTab = document.getElementById('bayanat');
  if (!bayanatTab) return;
  var container = bayanatTab.querySelector('.container');
  if (!container) return;
  var cards = container.querySelectorAll('.bayan');
  if (cards.length < 3) return;
  if (container.querySelector('.auto-bayan-map')) return;

  var opCoords = {
    'القنطرة':[33.25,35.82],'عيناتا':[33.12,35.53],'الطيبة':[33.11,35.56],
    'البيّاضة':[33.15,35.53],'مارون الراس':[33.10,35.53],'رشاف':[33.09,35.52],
    'بنت جبيل':[33.12,35.43],'كريات شمونة':[33.21,35.57],'نهاريا':[33.00,35.10],
    'المطلة':[33.28,35.58],'مسكاف عام':[33.21,35.58],'يرؤون':[33.09,35.15],
    'أفيفيم':[33.08,35.42],'شلومي':[33.08,35.14],'حانيتا':[33.09,35.16],
    'مرغليوت':[33.23,35.62],'الخيام':[33.23,35.59],'المالكية':[33.09,35.48],
    'حولاتا':[33.01,35.61],'القوزح':[33.18,35.55],'دير سريان':[33.19,35.54],
    'العديسة':[33.18,35.57],'صفد':[32.96,35.50],'عكا':[32.92,35.07],
    'حيفا':[32.79,34.99],'مركبا':[33.17,35.58],'سعسع':[33.05,35.42],
    'عيتا الشعب':[33.10,35.45],'عيترون':[33.13,35.50],'كفاريوفال':[33.24,35.64],
    'كفرجلعادي':[33.24,35.58],'شوميرا':[33.08,35.17],'عميعاد':[32.92,35.51],
    'ميرون':[32.98,35.44],'القلعة':[33.35,35.60],'ربّ ثلاثين':[33.15,35.47],
    'كابري':[33.02,35.15],'جويّا':[33.33,35.39],'يارون':[33.07,35.44],
    'بفلاي':[33.31,35.38],'معيان باروخ':[33.24,35.60]
  };

  var typeColors = {
    'settlement': '#9b59b6',
    'tank': '#e67e22',
    'deep': '#3498db',
    'default': '#2ecc71'
  };

  var locData = {};
  cards.forEach(function(card) {
    var cls = card.className || '';
    var tt = (card.querySelector('.bayan-target') || {}).textContent || '';
    var type = 'default';
    if (cls.indexOf('tank') !== -1) type = 'tank';
    else if (cls.indexOf('settlement') !== -1) type = 'settlement';
    else if (cls.indexOf('deep') !== -1) type = 'deep';

    var keys = Object.keys(opCoords);
    for (var i = 0; i < keys.length; i++) {
      if (tt.indexOf(keys[i]) !== -1) {
        if (!locData[keys[i]]) locData[keys[i]] = {lat: opCoords[keys[i]][0], lng: opCoords[keys[i]][1], count: 0, types: []};
        locData[keys[i]].count++;
        if (locData[keys[i]].types.indexOf(type) === -1) locData[keys[i]].types.push(type);
        break;
      }
    }
  });

  var locs = Object.keys(locData);
  if (locs.length < 2) return;

  var titleDiv = document.createElement('div');
  titleDiv.className = 'siren-map-title';
  titleDiv.textContent = '\u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A \u0627\u0644\u0639\u0633\u0643\u0631\u064A\u0629';

  var mapDiv = document.createElement('div');
  mapDiv.id = 'autoBayanMap';
  mapDiv.className = 'auto-bayan-map';

  // Insert in dashboard area
  var dash = container.querySelector('.auto-dashboard');
  var ref = dash || container.querySelector('.phase') || container.firstChild;
  container.insertBefore(titleDiv, ref);
  container.insertBefore(mapDiv, titleDiv.nextSibling);

  var mapInited = false;
  var origSw2 = window._enhSwitchTab2 || switchTab;
  window._enhSwitchTab2 = origSw2;
  switchTab = function(id, el) {
    origSw2(id, el);
    if (id === 'bayanat' && !mapInited) initBayanMap();
  };
  // Also init if bayanat is already active
  if (bayanatTab.classList.contains('active')) setTimeout(initBayanMap, 300);

  function initBayanMap() {
    if (mapInited) return;
    mapInited = true;
    var map = L.map('autoBayanMap', {
      center: [33.1, 35.4], zoom: 10, zoomControl: true, attributionControl: false
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {maxZoom: 15}).addTo(map);

    locs.forEach(function(name) {
      var pt = locData[name];
      var mainType = pt.types[0] || 'default';
      var color = typeColors[mainType] || '#2ecc71';
      var radius = 5 + Math.min(pt.count * 3, 16);

      var marker = L.circleMarker([pt.lat, pt.lng], {
        radius: radius, fillColor: color, fillOpacity: 0.6,
        color: color, weight: 2
      }).addTo(map);

      var popup = document.createElement('div');
      popup.style.cssText = 'text-align:right;direction:rtl;min-width:100px;';
      var pTitle = document.createElement('div');
      pTitle.style.cssText = 'font-weight:800;font-size:0.85rem;color:' + color + ';margin-bottom:3px;';
      pTitle.textContent = name;
      popup.appendChild(pTitle);
      var pCount = document.createElement('div');
      pCount.style.cssText = 'font-size:0.72rem;color:#6b7d92;';
      pCount.textContent = pt.count + ' \u0639\u0645\u0644\u064A\u0629';
      popup.appendChild(pCount);
      marker.bindPopup(popup, {closeButton: false});
      marker.on('mouseover', function() { this.openPopup(); this.setStyle({fillOpacity: 1, weight: 3}); });
      marker.on('mouseout', function() { this.closePopup(); this.setStyle({fillOpacity: 0.6, weight: 2}); });

      if (pt.count >= 3) {
        var icon = L.divIcon({
          className: '',
          html: '<div style="background:' + color + ';color:#fff;font-size:0.55rem;font-weight:800;padding:1px 4px;border-radius:4px;font-family:sans-serif;">' + pt.count + '</div>',
          iconSize: [18, 14], iconAnchor: [9, -6]
        });
        L.marker([pt.lat, pt.lng], {icon: icon, interactive: false}).addTo(map);
      }
    });
    setTimeout(function() { map.invalidateSize(); }, 200);
    addFullscreenBtn(document.getElementById('autoSirenMap'), map);
  }
})();

// ═══════════════════════ AUTO SIREN MAP ═══════════════════════
(function() {
  if (typeof L === 'undefined') return; // Leaflet not loaded
  var sirensTab = document.getElementById('sirens');
  if (!sirensTab) return;
  var container = sirensTab.querySelector('.container');
  if (!container) return;
  var rows = container.querySelectorAll('.siren-row');
  if (rows.length === 0) return;

  // Skip if map already exists (e.g. Apr 1 has manual map)
  if (document.getElementById('sirenMap') || document.getElementById('autoSirenMap')) return;

  // Known city coordinates
  var cityCoords = {
    'تل أبيب':[32.0853,34.7818], 'كريات شمونه':[33.2081,35.5731], 'كريات شمونة':[33.2081,35.5731],
    'نهاريا':[33.0042,35.0968], 'المطلة':[33.2784,35.5785], 'أسدود':[31.8040,34.6500],
    'حيفا':[32.7940,34.9896], 'صفد':[32.9646,35.4962], 'طبريا':[32.6996,35.3035],
    'الناصرة':[32.6996,35.2977], 'عكا':[32.9226,35.0687], 'القدس':[31.7683,35.2137],
    'بئر السبع':[31.2518,34.7913], 'ديمونا':[31.0700,35.0332], 'إيلات':[29.5577,34.9519],
    'مرجليوت':[33.2260,35.6233], 'مسكاف عام':[33.2060,35.5750], 'مسكافعام':[33.2060,35.5750],
    'يفتاح':[33.1310,35.5150], 'راموت نفتالي':[33.1340,35.5540], 'المنارة':[33.1720,35.5820],
    'يرؤون':[33.0876,35.1475], 'أفيفيم':[33.0823,35.4217], 'شلومي':[33.0772,35.1416],
    'حانيتا':[33.0878,35.1564], 'مرغليوت':[33.2260,35.6233], 'الجولان':[32.9500,35.7500],
    'إصبع الجليل':[33.2100,35.5900], 'الجليل الغربي':[33.0580,35.1005],
    'الجليل الأعلى':[33.0500,35.4500], 'كفار جلعادي':[33.2400,35.5800],
    'كفار يوفال':[33.2350,35.6350], 'دان':[33.2390,35.6450],
    'نتانيا':[32.3215,34.8532], 'بتاح تكفا':[32.0841,34.8878],
    'اللد':[31.9515,34.8953], 'حولون':[32.0117,34.7748],
    'كتسرين':[32.9925,35.6910], 'بني براك':[32.0833,34.8333],
    'رامات غان':[32.0686,34.8244], 'ريشون لتسيون':[31.9642,34.8045],
    'عراد':[31.2611,35.2126], 'كريات غات':[31.6100,34.7642],
    'أوفاكيم':[31.3167,34.6167], 'روش بينا':[32.9691,35.5411],
    'معالوت ترشيحا':[33.0167,35.2728]
  };

  // Analyze siren locations and aggregate by city
  var cityData = {};
  rows.forEach(function(row) {
    var timeEl = row.querySelector('.s-time');
    var locEl = row.querySelector('.s-loc');
    if (!timeEl || !locEl) return;
    var time = timeEl.textContent.trim();
    var loc = locEl.textContent;

    var keys = Object.keys(cityCoords);
    for (var i = 0; i < keys.length; i++) {
      if (loc.indexOf(keys[i]) !== -1) {
        if (!cityData[keys[i]]) {
          cityData[keys[i]] = {lat: cityCoords[keys[i]][0], lng: cityCoords[keys[i]][1], times: [], count: 0};
        }
        cityData[keys[i]].times.push(time);
        cityData[keys[i]].count++;
        break;
      }
    }
  });

  var cities = Object.keys(cityData);
  if (cities.length === 0) return;

  // Create map container
  var titleDiv = document.createElement('div');
  titleDiv.className = 'siren-map-title';
  titleDiv.textContent = '\u062E\u0631\u064A\u0637\u0629 \u0627\u0646\u062A\u0634\u0627\u0631 \u0635\u0641\u0627\u0631\u0627\u062A \u0627\u0644\u0625\u0646\u0630\u0627\u0631'; // خريطة انتشار صفارات الإنذار

  var mapDiv = document.createElement('div');
  mapDiv.id = 'autoSirenMap';
  mapDiv.className = 'auto-siren-map';

  // Insert after the phase title
  var phase = container.querySelector('.phase');
  if (phase) {
    phase.parentNode.insertBefore(titleDiv, phase.nextSibling);
    titleDiv.parentNode.insertBefore(mapDiv, titleDiv.nextSibling);
  }

  // Init map when tab is shown
  var mapInited = false;
  var origSwitch = window._enhSwitchTab || switchTab;
  window._enhSwitchTab = origSwitch;

  switchTab = function(id, el) {
    origSwitch(id, el);
    if (id === 'sirens' && !mapInited) initAutoMap();
  };

  function initAutoMap() {
    mapInited = true;
    var map = L.map('autoSirenMap', {
      center: [32.5, 35.0],
      zoom: 8,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 15
    }).addTo(map);

    cities.forEach(function(name) {
      var pt = cityData[name];
      var radius = 6 + Math.min(pt.count * 2, 14);
      var opacity = 0.5 + Math.min(pt.count * 0.06, 0.4);

      var marker = L.circleMarker([pt.lat, pt.lng], {
        radius: radius,
        fillColor: '#e74c3c',
        fillOpacity: opacity,
        color: '#e74c3c',
        weight: 2,
        className: 'siren-pulse'
      }).addTo(map);

      var popupContent = document.createElement('div');
      popupContent.style.cssText = 'text-align:right;direction:rtl;min-width:120px;';
      var titleEl = document.createElement('div');
      titleEl.style.cssText = 'font-weight:800;font-size:0.9rem;color:#e74c3c;margin-bottom:4px;';
      titleEl.textContent = name;
      popupContent.appendChild(titleEl);
      var countEl = document.createElement('div');
      countEl.style.cssText = 'font-size:0.72rem;color:#6b7d92;margin-bottom:6px;';
      countEl.textContent = pt.count + ' \u0635\u0641\u0627\u0631\u0629';
      popupContent.appendChild(countEl);
      pt.times.forEach(function(t) {
        var tDiv = document.createElement('div');
        tDiv.style.cssText = 'font-size:0.75rem;padding:2px 0;color:#e74c3c;font-weight:700;';
        tDiv.textContent = t;
        popupContent.appendChild(tDiv);
      });

      marker.bindPopup(popupContent, {closeButton: false, offset: [0, -5]});
      marker.on('mouseover', function() {
        this.openPopup();
        this.setStyle({fillOpacity: 1, weight: 3, radius: radius + 3});
        rows.forEach(function(row) {
          var loc = (row.querySelector('.s-loc') || {}).textContent || '';
          if (loc.indexOf(name) !== -1) row.classList.add('highlighted');
        });
      });
      marker.on('mouseout', function() {
        this.closePopup();
        this.setStyle({fillOpacity: opacity, weight: 2, radius: radius});
        rows.forEach(function(row) { row.classList.remove('highlighted'); });
      });
      marker.on('click', function() {
        rows.forEach(function(row) {
          var loc = (row.querySelector('.s-loc') || {}).textContent || '';
          if (loc.indexOf(name) !== -1) {
            row.scrollIntoView({behavior: 'smooth', block: 'center'});
            row.classList.add('highlighted');
            setTimeout(function() { row.classList.remove('highlighted'); }, 2000);
          }
        });
      });

      // Count badge for 3+
      if (pt.count >= 3) {
        var icon = L.divIcon({
          className: '',
          html: '<div style="background:rgba(231,76,60,0.85);color:#fff;font-size:0.6rem;font-weight:800;padding:1px 5px;border-radius:6px;font-family:sans-serif;white-space:nowrap;text-align:center;">' + pt.count + '</div>',
          iconSize: [20, 16],
          iconAnchor: [10, -8]
        });
        L.marker([pt.lat, pt.lng], {icon: icon, interactive: false}).addTo(map);
      }
    });

    setTimeout(function() { map.invalidateSize(); }, 200);
    addFullscreenBtn(document.getElementById('autoBayanMap'), map);
  }
})();
