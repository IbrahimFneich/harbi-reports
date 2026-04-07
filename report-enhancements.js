// ═══════════════════════════════════════════════════════════
// Report Enhancements — shared across all daily reports
// Auto-generates: categorization dashboards + theme toggle
// Note: innerHTML used only with locally-generated static strings
// (no user input), safe for this static site context.
// ═══════════════════════════════════════════════════════════

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
