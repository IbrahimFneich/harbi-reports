/* === src/js/dashboards/iran-dash.js === */

import { makeBarRow, makePill, makeCatCard, buildTimeline, barColors } from './helpers.js';

export function initIranDash() {
  var iranTab = document.getElementById('iran');
  if (!iranTab) return;
  var container = iranTab.querySelector('.container');
  if (!container) return;
  var rows = container.querySelectorAll('.iran-card');
  if (rows.length === 0) return;
  if (container.querySelector('.auto-iran-dashboard')) return;

  var categories = {irgc:0, army:0, missiles:0, drones_down:0, warnings:0, statements:0, other:0};
  var hours = [];
  for (var i = 0; i < 24; i++) hours[i] = 0;

  rows.forEach(function(row) {
    var timeEl = row.querySelector('.i-time');
    var srcEl = row.querySelector('.i-source');
    var textEl = row.querySelector('.i-text');
    var time = timeEl ? timeEl.textContent.trim() : '';
    var src = srcEl ? srcEl.textContent : '';
    var text = textEl ? textEl.textContent : '';
    var all = src + ' ' + text;

    var h = parseInt(time.split(':')[0]);
    if (!isNaN(h) && h >= 0 && h < 24) hours[h]++;

    if (all.indexOf('\u062D\u0631\u0633 \u0627\u0644\u062B\u0648\u0631\u0629') !== -1 || all.indexOf('\u0627\u0644\u062D\u0631\u0633') !== -1) categories.irgc++;
    else if (all.indexOf('\u0627\u0644\u062C\u064A\u0634 \u0627\u0644\u0625\u064A\u0631\u0627\u0646\u064A') !== -1 || all.indexOf('\u0627\u0644\u0642\u0648\u0627\u062A \u0627\u0644\u0645\u0633\u0644\u062D\u0629') !== -1) categories.army++;

    if (all.indexOf('\u0625\u0633\u0642\u0627\u0637') !== -1 || all.indexOf('\u0623\u0633\u0642\u0637') !== -1) categories.drones_down++;
    if (all.indexOf('\u0635\u0648\u0627\u0631\u064A\u062E \u0645\u0646 \u0625\u064A\u0631\u0627\u0646') !== -1 || all.indexOf('\u0631\u0635\u062F \u0625\u0637\u0644\u0627\u0642') !== -1 || all.indexOf('\u0627\u0644\u0645\u0644\u0627\u062C\u0626') !== -1) categories.warnings++;
    if (all.indexOf('\u0627\u0644\u0648\u0639\u062F \u0627\u0644\u0635\u0627\u062F\u0642') !== -1 || all.indexOf('\u0627\u0644\u0645\u0648\u062C\u0629') !== -1 || all.indexOf('\u0645\u0648\u062C\u0629') !== -1) categories.missiles++;
    if (all.indexOf('\u0628\u064A\u0627\u0646') !== -1 || all.indexOf('\u0642\u0627\u0626\u062F \u0627\u0644\u062B\u0648\u0631\u0629') !== -1 || all.indexOf('\u062E\u0627\u0645\u0646\u0626\u064A') !== -1) categories.statements++;
  });

  var catLabels = {irgc:'\u062D\u0631\u0633 \u0627\u0644\u062B\u0648\u0631\u0629',army:'\u0627\u0644\u062C\u064A\u0634 \u0627\u0644\u0625\u064A\u0631\u0627\u0646\u064A',missiles:'\u0645\u0648\u062C\u0627\u062A \u0635\u0627\u0631\u0648\u062E\u064A\u0629',drones_down:'\u0625\u0633\u0642\u0627\u0637 \u0637\u0627\u0626\u0631\u0627\u062A',warnings:'\u0625\u0646\u0630\u0627\u0631\u0627\u062A',statements:'\u0628\u064A\u0627\u0646\u0627\u062A \u0631\u0633\u0645\u064A\u0629'};
  var catColors = {irgc:'#9b59b6',army:'#3498db',missiles:'#e74c3c',drones_down:'#e67e22',warnings:'#f39c12',statements:'#1abc9c'};
  var catKeys = ['irgc','army','missiles','drones_down','warnings','statements'];
  var maxCat = 0;
  catKeys.forEach(function(k){if(categories[k]>maxCat)maxCat=categories[k];});

  var dash = document.createElement('div');
  dash.className = 'siren-cats auto-iran-dashboard';

  // Card 1: By category
  var c1 = makeCatCard('\u2600','rgba(155,89,182,0.12)','#9b59b6','\u062D\u0633\u0628 \u0627\u0644\u0641\u0626\u0629');
  catKeys.forEach(function(k){
    if(categories[k]>0) c1.appendChild(makeBarRow(catLabels[k],categories[k],maxCat,catColors[k]));
  });
  dash.appendChild(c1);

  // Card 2: Type pills + timeline
  var c2 = makeCatCard('\u26A1','rgba(231,76,60,0.12)','#e74c3c','\u0646\u0648\u0639 \u0627\u0644\u0646\u0634\u0627\u0637');
  var pills = document.createElement('div');
  pills.className = 'cat-type-pills';
  if (categories.missiles > 0) pills.appendChild(makePill(categories.missiles,'\u0647\u062C\u0648\u0645 \u0635\u0627\u0631\u0648\u062E\u064A','rgba(231,76,60,0.12)','#e74c3c'));
  if (categories.drones_down > 0) pills.appendChild(makePill(categories.drones_down,'\u0625\u0633\u0642\u0627\u0637 \u0637\u0627\u0626\u0631\u0629','rgba(230,126,34,0.12)','#e67e22'));
  if (categories.warnings > 0) pills.appendChild(makePill(categories.warnings,'\u0625\u0646\u0630\u0627\u0631','rgba(243,156,18,0.12)','#f39c12'));
  c2.appendChild(pills);

  var tlWrap = document.createElement('div');
  tlWrap.style.marginTop = '12px';
  var tlHead = makeCatCard('\u23F1','rgba(155,89,182,0.12)','#9b59b6','\u0627\u0644\u062A\u0648\u0632\u064A\u0639 \u0627\u0644\u0632\u0645\u0646\u064A');
  tlWrap.appendChild(tlHead.querySelector('.cat-title'));
  var tlBar = document.createElement('div');
  tlBar.className = 'cat-timeline';
  tlBar.id = 'autoIranTimeline';
  tlWrap.appendChild(tlBar);
  var tlLabels = document.createElement('div');
  tlLabels.className = 'cat-tlabels';
  ['00:00','06:00','12:00','18:00','23:59'].forEach(function(l){
    var s2=document.createElement('span');s2.textContent=l;tlLabels.appendChild(s2);
  });
  tlWrap.appendChild(tlLabels);
  c2.appendChild(tlWrap);
  dash.appendChild(c2);

  // Filters
  var filterDiv = document.createElement('div');
  filterDiv.className = 'cat-filter-bar';
  var iFilters = [['\u0627\u0644\u0643\u0644 ('+rows.length+')','all']];
  if(categories.irgc>0) iFilters.push(['\u062D\u0631\u0633 \u0627\u0644\u062B\u0648\u0631\u0629 ('+categories.irgc+')','\u062D\u0631\u0633 \u0627\u0644\u062B\u0648\u0631\u0629']);
  if(categories.army>0) iFilters.push(['\u0627\u0644\u062C\u064A\u0634 ('+categories.army+')','\u0627\u0644\u062C\u064A\u0634 \u0627\u0644\u0625\u064A\u0631\u0627\u0646\u064A']);
  if(categories.missiles>0) iFilters.push(['\u0627\u0644\u0648\u0639\u062F \u0627\u0644\u0635\u0627\u062F\u0642 ('+categories.missiles+')','\u0627\u0644\u0648\u0639\u062F']);
  if(categories.drones_down>0) iFilters.push(['\u0625\u0633\u0642\u0627\u0637 ('+categories.drones_down+')','\u0625\u0633\u0642\u0627\u0637']);
  if(categories.warnings>0) iFilters.push(['\u0625\u0646\u0630\u0627\u0631\u0627\u062A ('+categories.warnings+')','\u0627\u0644\u0645\u0644\u0627\u062C\u0626']);

  iFilters.forEach(function(f){
    var b = document.createElement('button');
    b.className = 'cat-filter-btn'+(f[1]==='all'?' active':'');
    b.textContent = f[0];
    b.setAttribute('data-filter',f[1]);
    b.onclick = function(){filterIranAuto(this.getAttribute('data-filter'),this);};
    filterDiv.appendChild(b);
  });

  var listTitle = document.createElement('div');
  listTitle.className = 'siren-list-title';
  listTitle.textContent = '\u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0643\u0627\u0645\u0644\u0629';

  var firstEl = container.querySelector('.phase') || rows[0];
  if (firstEl) {
    container.insertBefore(listTitle, firstEl);
    container.insertBefore(filterDiv, listTitle);
    container.insertBefore(dash, filterDiv);
  }

  buildTimeline('autoIranTimeline', hours, '#9b59b6');
}

export function filterIranAuto(filter, btn) {
  var tab = document.getElementById('iran');
  tab.querySelectorAll('.cat-filter-btn').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  tab.querySelectorAll('.iran-card').forEach(function(row){
    var text = row.textContent || '';
    if(filter==='all') row.style.display='';
    else row.style.display=text.indexOf(filter)!==-1?'':'none';
  });
}
