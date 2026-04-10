/* === src/js/dashboards/sirens-dash.js === */

import { makeBarRow, makePill, makeCatCard, buildTimeline, barColors } from './helpers.js';

export function initSirensDash() {
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
    ['\u062A\u0644 \u0623\u0628\u064A\u0628',['\u062A\u0644 \u0623\u0628\u064A\u0628']],['\u0643\u0631\u064A\u0627\u062A \u0634\u0645\u0648\u0646\u0647',['\u0643\u0631\u064A\u0627\u062A \u0634\u0645\u0648\u0646\u0647','\u0643\u0631\u064A\u0627\u062A \u0634\u0645\u0648\u0646\u0629']],
    ['\u0646\u0647\u0627\u0631\u064A\u0627',['\u0646\u0647\u0627\u0631\u064A\u0627']],['\u0627\u0644\u0645\u0637\u0644\u0629',['\u0627\u0644\u0645\u0637\u0644\u0629']],['\u0625\u0635\u0628\u0639 \u0627\u0644\u062C\u0644\u064A\u0644',['\u0625\u0635\u0628\u0639 \u0627\u0644\u062C\u0644\u064A\u0644']],
    ['\u0627\u0644\u062C\u0644\u064A\u0644 \u0627\u0644\u063A\u0631\u0628\u064A',['\u0627\u0644\u062C\u0644\u064A\u0644 \u0627\u0644\u063A\u0631\u0628\u064A']],['\u0627\u0644\u062C\u0644\u064A\u0644 \u0627\u0644\u0623\u0639\u0644\u0649',['\u0627\u0644\u062C\u0644\u064A\u0644 \u0627\u0644\u0623\u0639\u0644\u0649']],
    ['\u0627\u0644\u062C\u0648\u0644\u0627\u0646',['\u0627\u0644\u062C\u0648\u0644\u0627\u0646']],['\u0637\u0628\u0631\u064A\u0627',['\u0637\u0628\u0631\u064A\u0627']],['\u0623\u0633\u062F\u0648\u062F',['\u0623\u0633\u062F\u0648\u062F']],
    ['\u0627\u0644\u0642\u062F\u0633',['\u0627\u0644\u0642\u062F\u0633']],['\u062D\u064A\u0641\u0627',['\u062D\u064A\u0641\u0627']],['\u0635\u0641\u062F',['\u0635\u0641\u062F']],
    ['\u0628\u0626\u0631 \u0627\u0644\u0633\u0628\u0639',['\u0628\u0626\u0631 \u0627\u0644\u0633\u0628\u0639']],['\u062F\u064A\u0645\u0648\u0646\u0627',['\u062F\u064A\u0645\u0648\u0646\u0627']],['\u0625\u064A\u0644\u0627\u062A',['\u0625\u064A\u0644\u0627\u062A']],['\u0639\u0643\u0627',['\u0639\u0643\u0627']]
  ];

  rows.forEach(function(row){
    var time = (row.querySelector('.s-time')||{}).textContent||'';
    var loc = (row.querySelector('.s-loc')||{}).textContent||'';
    var h = parseInt(time.split(':')[0]);
    if(!isNaN(h)&&h>=0&&h<24) hours[h]++;
    if(loc.indexOf('\u0645\u0633\u064A\u0651\u0631\u0629')!==-1||loc.indexOf('\u062A\u0633\u0644\u0644')!==-1) droneCount++; else rocketCount++;
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

  var c1 = makeCatCard('\u25C9','var(--red-dim)','var(--red)','\u062D\u0633\u0628 \u0627\u0644\u0645\u0646\u0637\u0642\u0629');
  sortedR.forEach(function(r,idx){ c1.appendChild(makeBarRow(r,regions[r],maxR,barColors[idx%barColors.length])); });
  dash.appendChild(c1);

  var c2 = makeCatCard('\u26A0','rgba(52,152,219,0.12)','#3498db','\u062D\u0633\u0628 \u0627\u0644\u0646\u0648\u0639');
  var pills = document.createElement('div');
  pills.className = 'cat-type-pills';
  pills.appendChild(makePill(rocketCount,'\u0635\u0648\u0627\u0631\u064A\u062E / \u0642\u0635\u0641','var(--red-dim)','var(--red)'));
  pills.appendChild(makePill(droneCount,'\u062A\u0633\u0644\u0644 \u0645\u0633\u064A\u0651\u0631\u0627\u062A','rgba(52,152,219,0.12)','#3498db'));
  c2.appendChild(pills);

  var tlWrap = document.createElement('div');
  tlWrap.style.marginTop = '14px';
  var tlHead = makeCatCard('\u23F1','rgba(155,89,182,0.12)','#9b59b6','\u062D\u0633\u0628 \u0627\u0644\u0648\u0642\u062A');
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
  var sFilters = [['\u0627\u0644\u0643\u0644 ('+rows.length+')','all']];
  sortedR.slice(0,5).forEach(function(r){ sFilters.push([r+' ('+regions[r]+')','r:'+r]); });
  if(droneCount>0) sFilters.push(['\u0645\u0633\u064A\u0651\u0631\u0627\u062A ('+droneCount+')','drone']);
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
  listTitle.textContent = '\u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0643\u0627\u0645\u0644\u0629';

  var mapEl = document.getElementById('sirenMap');
  var ref = mapEl ? mapEl.nextSibling : (container.querySelector('.phase') || rows[0]);
  if (ref) {
    ref.parentNode.insertBefore(dash, ref.nextSibling || ref);
    dash.parentNode.insertBefore(filterDiv, dash.nextSibling);
    filterDiv.parentNode.insertBefore(listTitle, filterDiv.nextSibling);
  }

  buildTimeline('autoSirenTimeline', hours, '#e74c3c');
}

export function filterSirensAuto(filter, btn) {
  var tab = document.getElementById('sirens');
  tab.querySelectorAll('.cat-filter-btn').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  tab.querySelectorAll('.siren-row').forEach(function(row){
    var loc = (row.querySelector('.s-loc')||{}).textContent||'';
    if(filter==='all') row.style.display='';
    else if(filter==='drone') row.style.display=(loc.indexOf('\u0645\u0633\u064A\u0651\u0631\u0629')!==-1||loc.indexOf('\u062A\u0633\u0644\u0644')!==-1)?'':'none';
    else if(filter.indexOf('r:')===0) row.style.display=loc.indexOf(filter.substring(2))!==-1?'':'none';
    else row.style.display=loc.indexOf(filter)!==-1?'':'none';
  });
}
