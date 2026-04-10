/* === src/js/dashboards/enemy-dash.js === */

import { makeBarRow, makeCatCard, buildTimeline, barColors } from './helpers.js';

export function initEnemyDash() {
  var enemyTab = document.getElementById('enemy');
  if (!enemyTab) return;
  var container = enemyTab.querySelector('.container');
  if (!container) return;
  var rows = container.querySelectorAll('.enemy-row');
  if (rows.length === 0) return;
  if (container.querySelector('.auto-enemy-dashboard')) return;

  var sources = {};
  var topics = {missiles:0, casualties:0, clashes:0, political:0, other:0};
  var hours = [];
  for (var i = 0; i < 24; i++) hours[i] = 0;

  var sourceKw = [
    ['\u0627\u0644\u0642\u0646\u0627\u0629 12',['\u0627\u0644\u0642\u0646\u0627\u0629 12']],['\u0627\u0644\u0642\u0646\u0627\u0629 13',['\u0627\u0644\u0642\u0646\u0627\u0629 13']],['\u0627\u0644\u0642\u0646\u0627\u0629 14',['\u0627\u0644\u0642\u0646\u0627\u0629 14']],
    ['\u0627\u0644\u0642\u0646\u0627\u0629 15',['\u0627\u0644\u0642\u0646\u0627\u0629 15']],['\u0643\u0627\u0646',['\u0642\u0646\u0627\u0629 \u0643\u0627\u0646']],['\u064A\u062F\u064A\u0639\u0648\u062A',['\u064A\u062F\u064A\u0639\u0648\u062A']],
    ['\u063A\u0644\u0648\u0628\u0632',['\u063A\u0644\u0648\u0628\u0632']],['\u0627\u0644\u062C\u0628\u0647\u0629 \u0627\u0644\u062F\u0627\u062E\u0644\u064A\u0629',['\u0627\u0644\u062C\u0628\u0647\u0629 \u0627\u0644\u062F\u0627\u062E\u0644\u064A\u0629']],
    ['\u0625\u0630\u0627\u0639\u0629 \u0627\u0644\u062C\u064A\u0634',['\u0625\u0630\u0627\u0639\u0629 \u062C\u064A\u0634']],['\u062C\u064A\u0634 \u0627\u0644\u0639\u062F\u0648',['\u062C\u064A\u0634 \u0627\u0644\u0639\u062F\u0648']],
    ['\u0648\u0633\u0627\u0626\u0644 \u0625\u0639\u0644\u0627\u0645',['\u0648\u0633\u0627\u0626\u0644 \u0625\u0639\u0644\u0627\u0645']]
  ];

  rows.forEach(function(row) {
    var timeEl = row.querySelector('.e-time');
    var textEl = row.querySelector('.e-text');
    if (!timeEl) return;
    var time = timeEl.textContent.trim();
    var text = textEl ? textEl.textContent : '';

    var h = parseInt(time.split(':')[0]);
    if (!isNaN(h) && h >= 0 && h < 24) hours[h]++;

    // Source
    var matched = false;
    for (var s = 0; s < sourceKw.length; s++) {
      for (var k = 0; k < sourceKw[s][1].length; k++) {
        if (text.indexOf(sourceKw[s][1][k]) !== -1) {
          sources[sourceKw[s][0]] = (sources[sourceKw[s][0]] || 0) + 1;
          matched = true; break;
        }
      }
      if (matched) break;
    }

    // Topics
    if (text.indexOf('\u0635\u0627\u0631\u0648\u062E') !== -1 || text.indexOf('\u0645\u0642\u0630\u0648\u0641') !== -1 || text.indexOf('\u0633\u0642\u0648\u0637') !== -1 || text.indexOf('\u0627\u0646\u0641\u062C\u0627\u0631') !== -1) topics.missiles++;
    else if (text.indexOf('\u0642\u062A\u0644') !== -1 || text.indexOf('\u062C\u0631\u062D') !== -1 || text.indexOf('\u0625\u0635\u0627\u0628') !== -1 || text.indexOf('\u0642\u062A\u064A\u0644') !== -1) topics.casualties++;
    else if (text.indexOf('\u0642\u062A\u0627\u0644') !== -1 || text.indexOf('\u0627\u0634\u062A\u0628\u0627\u0643') !== -1 || text.indexOf('\u0643\u0645\u064A\u0646') !== -1 || text.indexOf('\u0639\u0645\u0644\u064A\u0629') !== -1) topics.clashes++;
    else if (text.indexOf('\u0646\u062A\u0646\u064A\u0627\u0647\u0648') !== -1 || text.indexOf('\u0631\u0626\u064A\u0633 \u0627\u0644\u0623\u0631\u0643\u0627\u0646') !== -1 || text.indexOf('\u0643\u0627\u0628\u064A\u0646\u064A\u062A') !== -1 || text.indexOf('\u0633\u0643\u0627\u0646') !== -1) topics.political++;
    else topics.other++;
  });

  var sortedSources = Object.keys(sources).sort(function(a,b){return sources[b]-sources[a];}).slice(0,8);
  var maxSrc = sortedSources.length > 0 ? sources[sortedSources[0]] : 1;

  var topicLabels = {missiles:'\u0635\u0648\u0627\u0631\u064A\u062E \u0648\u0642\u0635\u0641',casualties:'\u0642\u062A\u0644\u0649 \u0648\u062C\u0631\u062D\u0649',clashes:'\u0627\u0634\u062A\u0628\u0627\u0643\u0627\u062A \u0648\u0639\u0645\u0644\u064A\u0627\u062A',political:'\u0633\u064A\u0627\u0633\u064A \u0648\u0639\u0633\u0643\u0631\u064A',other:'\u0623\u062E\u0631\u0649'};
  var topicColors = {missiles:'#e74c3c',casualties:'#e67e22',clashes:'#f39c12',political:'#9b59b6',other:'#6b7d92'};
  var topicKeys = ['missiles','casualties','clashes','political','other'];
  var maxTopic = 0;
  topicKeys.forEach(function(k){if(topics[k]>maxTopic)maxTopic=topics[k];});

  var dash = document.createElement('div');
  dash.className = 'siren-cats auto-enemy-dashboard';

  // Card 1: By source
  var c1 = makeCatCard('\u2139','rgba(230,126,34,0.12)','#e67e22','\u062D\u0633\u0628 \u0627\u0644\u0645\u0635\u062F\u0631');
  sortedSources.forEach(function(s,idx){c1.appendChild(makeBarRow(s,sources[s],maxSrc,barColors[idx%barColors.length]));});
  dash.appendChild(c1);

  // Card 2: By topic + timeline
  var c2 = makeCatCard('\u2691','rgba(231,76,60,0.12)','#e74c3c','\u062D\u0633\u0628 \u0627\u0644\u0645\u0648\u0636\u0648\u0639');
  topicKeys.forEach(function(k){
    if(topics[k]>0) c2.appendChild(makeBarRow(topicLabels[k],topics[k],maxTopic,topicColors[k]));
  });
  var tlWrap = document.createElement('div');
  tlWrap.style.marginTop = '12px';
  var tlHead = makeCatCard('\u23F1','rgba(155,89,182,0.12)','#9b59b6','\u0627\u0644\u062A\u0648\u0632\u064A\u0639 \u0627\u0644\u0632\u0645\u0646\u064A');
  tlWrap.appendChild(tlHead.querySelector('.cat-title'));
  var tlBar = document.createElement('div');
  tlBar.className = 'cat-timeline';
  tlBar.id = 'autoEnemyTimeline';
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
  var eFilters = [['\u0627\u0644\u0643\u0644 ('+rows.length+')','all']];
  sortedSources.slice(0,5).forEach(function(s){eFilters.push([s+' ('+sources[s]+')','s:'+s]);});
  eFilters.forEach(function(f){
    var b = document.createElement('button');
    b.className = 'cat-filter-btn'+(f[1]==='all'?' active':'');
    b.textContent = f[0];
    b.setAttribute('data-filter',f[1]);
    b.onclick = function(){filterEnemyAuto(this.getAttribute('data-filter'),this);};
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

  buildTimeline('autoEnemyTimeline', hours, '#e67e22');
}

export function filterEnemyAuto(filter, btn) {
  var tab = document.getElementById('enemy');
  tab.querySelectorAll('.cat-filter-btn').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  tab.querySelectorAll('.enemy-row').forEach(function(row){
    var text = (row.querySelector('.e-text')||{}).textContent||'';
    if(filter==='all') row.style.display='';
    else if(filter.indexOf('s:')===0) row.style.display=text.indexOf(filter.substring(2))!==-1?'':'none';
    else row.style.display=text.indexOf(filter)!==-1?'':'none';
  });
  tab.querySelectorAll('.phase').forEach(function(p){
    var next=p.nextElementSibling; var vis=false;
    while(next&&!next.classList.contains('phase')&&!next.classList.contains('siren-list-title')){
      if(next.classList&&next.classList.contains('enemy-row')&&next.style.display!=='none'){vis=true;break;}
      next=next.nextElementSibling;
    }
    p.style.display=vis?'':'none';
  });
}
