/* === src/js/dashboards/bayanat-dash.js === */

import { makeBarRow, makePill, makeCatCard, buildTimeline, barColors } from './helpers.js';

export function initBayanatDash() {
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

  var locNames = ['\u0627\u0644\u0642\u0646\u0637\u0631\u0629','\u0639\u064A\u0646\u0627\u062A\u0627','\u0627\u0644\u0637\u064A\u0628\u0629','\u0627\u0644\u0628\u064A\u0651\u0627\u0636\u0629','\u0645\u0627\u0631\u0648\u0646 \u0627\u0644\u0631\u0627\u0633','\u0631\u0634\u0627\u0641','\u0628\u0646\u062A \u062C\u0628\u064A\u0644',
    '\u0643\u0631\u064A\u0627\u062A \u0634\u0645\u0648\u0646\u0629','\u0646\u0647\u0627\u0631\u064A\u0627','\u0627\u0644\u0645\u0637\u0644\u0629','\u0645\u0633\u0643\u0627\u0641 \u0639\u0627\u0645','\u064A\u0631\u0624\u0648\u0646','\u0623\u0641\u064A\u0641\u064A\u0645','\u0634\u0644\u0648\u0645\u064A','\u062D\u0627\u0646\u064A\u062A\u0627','\u0645\u0631\u063A\u0644\u064A\u0648\u062A',
    '\u0627\u0644\u062E\u064A\u0627\u0645','\u0639\u064A\u062A\u0631\u0648\u0646','\u0627\u0644\u0645\u0627\u0644\u0643\u064A\u0629','\u062D\u0648\u0644\u0627\u062A\u0627','\u0627\u0644\u0642\u0648\u0632\u062D','\u062F\u064A\u0631 \u0633\u0631\u064A\u0627\u0646','\u0627\u0644\u0639\u062F\u064A\u0633\u0629','\u0635\u0641\u062F','\u0639\u0643\u0627','\u062D\u064A\u0641\u0627',
    '\u0645\u0631\u0643\u0628\u0627','\u0627\u0644\u0642\u0644\u0639\u0629','\u0628\u064A\u062A \u0644\u064A\u0641','\u0633\u0639\u0633\u0639','\u0639\u064A\u062A\u0627 \u0627\u0644\u0634\u0639\u0628','\u0631\u0628\u0651 \u062B\u0644\u0627\u062B\u064A\u0646'];

  cards.forEach(function(card) {
    var cls = card.className || '';
    var targetText = (card.querySelector('.bayan-target') || {}).textContent || '';
    var weaponChip = card.querySelector('.weapon-chip');
    var weaponText = weaponChip ? weaponChip.textContent.trim() : '';
    var tagText = '';
    card.querySelectorAll('.bayan-tag').forEach(function(t) { tagText += ' ' + t.textContent; });

    if (cls.indexOf('tank') !== -1 || targetText.indexOf('\u0645\u064A\u0631\u0643\u0627\u0641\u0627') !== -1) types.tank++;
    else if (cls.indexOf('settlement') !== -1) types.settlement++;
    else if (cls.indexOf('deep') !== -1 || targetText.indexOf('\u0642\u0627\u0639\u062F\u0629') !== -1 || targetText.indexOf('\u062B\u0643\u0646\u0629') !== -1) types.base++;
    else if (targetText.indexOf('\u0637\u0627\u0626\u0631\u0629') !== -1 || targetText.indexOf('\u0645\u0631\u0648\u062D\u064A\u0651\u0629') !== -1) types.air++;
    else types.troops++;

    var w = '';
    if (weaponText) {
      w = weaponText;
    } else {
      w = '\u0623\u062E\u0631\u0649';
    }
    weapons[w] = (weapons[w] || 0) + 1;

    if (tagText.indexOf('\u0625\u0635\u0627\u0628\u0629') !== -1) hits++;

    for (var n = 0; n < locNames.length; n++) {
      if (targetText.indexOf(locNames[n]) !== -1) { targets[locNames[n]] = (targets[locNames[n]] || 0) + 1; break; }
    }

    var nodeTimeEl = card.querySelector('.node-time');
    if (nodeTimeEl) {
      var h = parseInt(nodeTimeEl.textContent.trim().split(':')[0]);
      if (!isNaN(h) && h >= 0 && h < 24) hours[h]++;
    }
  });

  var sortedTargets = Object.keys(targets).sort(function(a,b){ return targets[b]-targets[a]; }).slice(0,7);
  var maxTarget = sortedTargets.length > 0 ? targets[sortedTargets[0]] : 1;
  var sortedWeapons = Object.keys(weapons).sort(function(a,b){ return weapons[b]-weapons[a]; });
  var maxWeapon = sortedWeapons.length > 0 ? weapons[sortedWeapons[0]] : 1;

  var typeColors = {troops:'#2ecc71',settlement:'#9b59b6',air:'#3498db',tank:'#e67e22',base:'#e74c3c'};
  var typeLabels = {troops:'\u062A\u062C\u0645\u0651\u0627\u062A \u062C\u0646\u0648\u062F',settlement:'\u0645\u0633\u062A\u0648\u0637\u0646\u0627\u062A',air:'\u0637\u0627\u0626\u0631\u0627\u062A / \u062C\u0648',tank:'\u062F\u0628\u0627\u0628\u0627\u062A',base:'\u0642\u0648\u0627\u0639\u062F / \u0628\u0646\u0649 \u062A\u062D\u062A\u064A\u0629'};
  var typeKeys = ['troops','settlement','base','air','tank'];
  var maxType = 0;
  typeKeys.forEach(function(k){ if(types[k]>maxType) maxType=types[k]; });

  var dash = document.createElement('div');
  dash.className = 'siren-cats auto-dashboard';
  dash.style.marginTop = '8px';

  // Card 1
  var c1 = makeCatCard('\u2733','var(--green-dim)','var(--green)','\u062D\u0633\u0628 \u0646\u0648\u0639 \u0627\u0644\u0639\u0645\u0644\u064A\u0629');
  typeKeys.forEach(function(k){ if(types[k]>0) c1.appendChild(makeBarRow(typeLabels[k],types[k],maxType,typeColors[k])); });
  dash.appendChild(c1);

  // Card 2
  var c2 = makeCatCard('\u25C9','rgba(230,126,34,0.12)','#e67e22','\u062D\u0633\u0628 \u0627\u0644\u0633\u0644\u0627\u062D');
  sortedWeapons.forEach(function(w,idx){ c2.appendChild(makeBarRow(w,weapons[w],maxWeapon,barColors[idx%barColors.length])); });
  dash.appendChild(c2);

  // Card 3
  var c3 = makeCatCard('\u2713','var(--red-dim)','var(--red)','\u0627\u0644\u0646\u062A\u0627\u0626\u062C \u0627\u0644\u0645\u0639\u0644\u0646\u0629');
  var pills = document.createElement('div');
  pills.className = 'cat-type-pills';
  pills.appendChild(makePill(hits,'\u0625\u0635\u0627\u0628\u0629 \u0645\u0624\u0643\u0651\u062F\u0629','var(--red-dim)','var(--red)'));
  pills.appendChild(makePill(totalCards-hits,'\u062F\u0648\u0646 \u062A\u0641\u0635\u064A\u0644','var(--green-dim)','var(--green)'));
  c3.appendChild(pills);
  var tlWrap = document.createElement('div');
  tlWrap.style.marginTop = '12px';
  var tlTitle = makeCatCard('\u23F1','rgba(155,89,182,0.12)','#9b59b6','\u062A\u0648\u0632\u064A\u0639 \u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A \u0628\u0627\u0644\u0633\u0627\u0639\u0629');
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
  var c4 = makeCatCard('\u2694','var(--accent-dim)','var(--accent)','\u0623\u0643\u062B\u0631 \u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u0627\u0633\u062A\u0647\u062F\u0627\u0641\u0627\u064B');
  sortedTargets.forEach(function(t,idx){ c4.appendChild(makeBarRow(t,targets[t],maxTarget,barColors[idx%barColors.length])); });
  dash.appendChild(c4);

  // Filters
  var filterDiv = document.createElement('div');
  filterDiv.className = 'cat-filter-bar';
  var fdata = [
    ['\u0627\u0644\u0643\u0644 ('+totalCards+')','all'],
    ['\u0645\u0633\u062A\u0648\u0637\u0646\u0627\u062A ('+types.settlement+')','settlement'],
    ['\u062F\u0628\u0627\u0628\u0627\u062A ('+types.tank+')','tank'],
    ['\u0636\u0631\u0628\u0627\u062A \u0639\u0645\u0642 ('+types.base+')','deep'],
    ['\u0625\u0635\u0627\u0628\u0629 \u0645\u0624\u0643\u0651\u062F\u0629 ('+hits+')','hit'],
    ['\u062C\u0648\u0651\u064A ('+types.air+')','air']
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
  listTitle.textContent = '\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0643\u0627\u0645\u0644\u0629';

  var firstChild = container.querySelector('.phase') || container.querySelector('.bayan');
  if (firstChild) {
    container.insertBefore(listTitle, firstChild);
    container.insertBefore(filterDiv, listTitle);
    container.insertBefore(dash, filterDiv);
  }

  buildTimeline('autoBayanTimeline', hours, '#2ecc71');
}

export function filterBayanatAuto(filter, btn) {
  var tab = document.getElementById('bayanat');
  tab.querySelectorAll('.cat-filter-btn').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  tab.querySelectorAll('.bayan').forEach(function(card){
    var cls = card.className||'';
    var tt = (card.querySelector('.bayan-target')||{}).textContent||'';
    var tg = ''; card.querySelectorAll('.bayan-tag').forEach(function(t){ tg+=' '+t.textContent; });
    var show = filter==='all' ||
      (filter==='settlement' && cls.indexOf('settlement')!==-1) ||
      (filter==='tank' && (cls.indexOf('tank')!==-1||tt.indexOf('\u0645\u064A\u0631\u0643\u0627\u0641\u0627')!==-1)) ||
      (filter==='deep' && (cls.indexOf('deep')!==-1||tt.indexOf('\u0642\u0627\u0639\u062F\u0629')!==-1||tt.indexOf('\u062B\u0643\u0646\u0629')!==-1)) ||
      (filter==='hit' && tg.indexOf('\u0625\u0635\u0627\u0628\u0629')!==-1) ||
      (filter==='air' && (tt.indexOf('\u0637\u0627\u0626\u0631\u0629')!==-1||tt.indexOf('\u0645\u0631\u0648\u062D\u064A\u0651\u0629')!==-1));
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
