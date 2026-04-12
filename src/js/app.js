/* === src/js/app.js — Entry point for report.html === */

import { switchTab } from './ui/tabs.js';
import { initSearch, clearSearch } from './ui/search-bar.js';
import { showChangelog } from './ui/changelog.js';
import { renderBayanat } from './renderers/bayanat.js';
import { renderSirens } from './renderers/sirens.js';
import { renderEnemy } from './renderers/enemy.js';
import { renderIran } from './renderers/iran.js';
import { renderVideos } from './renderers/videos.js';
import { renderAllies } from './renderers/allies.js';
import { initSirenMap } from './maps/siren-map.js';
import { swapAllMapTiles } from './maps/tiles.js';
import { createDatePicker } from './analytics/datepicker.js';
import { ALL_REPORTS } from './ui/nav.js';

// Attach globals needed by onclick handlers
window.switchTab = switchTab;
window.initSirenMap = initSirenMap;
window.showChangelog = showChangelog;
window.clearSearch = clearSearch;
window.swapAllMapTiles = swapAllMapTiles;

// Compute Hijri date (Arabic Umm al-Qura) from a Gregorian Date.
// Returns '' if the runtime doesn't support islamic-umalqura calendar.
var _hijriFmt = null;
try {
  _hijriFmt = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
} catch (_e) { _hijriFmt = null; }
function computeHijri(date) {
  if (!_hijriFmt || !(date instanceof Date) || isNaN(date.getTime())) return '';
  try { return _hijriFmt.format(date); } catch (_e) { return ''; }
}

// ── renderReport — master orchestrator ───────────────────

function renderReport(data) {
  var root = document.getElementById('report-root');
  root.innerHTML = '';

  // Header
  var header = document.createElement('div');
  header.className = 'header';

  // Compute day name from date (don't trust JSON — may have inherited wrong values)
  var _dayNames = {0:'\u0627\u0644\u0623\u062D\u062F',1:'\u0627\u0644\u0625\u062B\u0646\u064A\u0646',2:'\u0627\u0644\u062B\u0644\u0627\u062B\u0627\u0621',3:'\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621',4:'\u0627\u0644\u062E\u0645\u064A\u0633',5:'\u0627\u0644\u062C\u0645\u0639\u0629',6:'\u0627\u0644\u0633\u0628\u062A'};
  var _dp = data.date.split('-');
  var _dt = new Date(parseInt(_dp[0]), parseInt(_dp[1]) - 1, parseInt(_dp[2]));
  var computedDay = _dayNames[_dt.getDay()];

  var dateRow = document.createElement('div');
  dateRow.className = 'date-row';

  var dateCenter = document.createElement('div');
  dateCenter.className = 'date-center';

  // day name — gold, bold
  var daySpan = document.createElement('span');
  daySpan.className = 'd-day';
  daySpan.textContent = computedDay;
  dateCenter.appendChild(daySpan);

  // Arabic date (e.g. ٣ نيسان ٢٠٢٦)
  var dateArSpan = document.createElement('span');
  dateArSpan.className = 'd-datear';
  dateArSpan.textContent = data.dateAr;
  dateCenter.appendChild(dateArSpan);

  // hijri — use stored value if present, else compute via Intl islamic-umalqura
  var hijriText = (data.hijri && String(data.hijri).trim()) || computeHijri(_dt);
  if (hijriText) {
    var sep1 = document.createElement('span');
    sep1.className = 'd-sep';
    sep1.textContent = '\u2022';
    dateCenter.appendChild(sep1);

    var hijriSpan = document.createElement('span');
    hijriSpan.className = 'd-hijri';
    hijriSpan.textContent = hijriText;
    dateCenter.appendChild(hijriSpan);
  }

  // separator before the picker
  var sep2 = document.createElement('span');
  sep2.className = 'd-sep';
  sep2.textContent = '\u2022';
  dateCenter.appendChild(sep2);

  // dd/mm/yyyy picker — dotted-underline accent
  var dpTrigger = document.createElement('button');
  dpTrigger.type = 'button';
  dpTrigger.className = 'report-date-trigger';
  dpTrigger.id = 'reportDatePicker';
  var dp = data.date.split('-');
  dpTrigger.textContent = dp[2] + '/' + dp[1] + '/' + dp[0];
  dateCenter.appendChild(dpTrigger);

  dateRow.appendChild(dateCenter);
  header.appendChild(dateRow);

  root.appendChild(header);

  // Init datepicker after DOM is ready
  setTimeout(function() {
    var numericText = dp[2] + '/' + dp[1] + '/' + dp[0];
    createDatePicker({
      triggerId: 'reportDatePicker',
      value: data.date,
      min: ALL_REPORTS[0],
      max: ALL_REPORTS[ALL_REPORTS.length - 1],
      onChange: function(newDate) {
        window.location.href = 'report.html?date=' + newDate;
      }
    });
    // Restore dd/mm/yyyy format (createDatePicker sets Arabic format)
    dpTrigger.textContent = numericText;
  }, 0);

  // Tab bar
  var st = data.stats || {};
  function sc(full, short) { return full in st ? st[full] : short in st ? st[short] : 0; }
  var tabsConfig = [
    { id: 'bayanat', label: '\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0642\u0627\u0648\u0645\u0629', count: sc('bayanat','b') },
    { id: 'sirens', label: '\u0635\u0641\u0627\u0631\u0627\u062A \u0627\u0644\u0625\u0646\u0630\u0627\u0631', count: sc('sirens','s') },
    { id: 'enemy', label: '\u0625\u0639\u0644\u0627\u0645 \u0627\u0644\u0639\u062F\u0648', count: sc('enemy','e') },
    { id: 'iran', label: '\u0625\u064A\u0631\u0627\u0646', count: sc('iran','ir') },
    { id: 'videos', label: '\u0641\u064A\u062F\u064A\u0648\u0647\u0627\u062A', count: sc('videos','v') },
    { id: 'allies', label: '\u0627\u0644\u064A\u0645\u0646 \u0648\u0627\u0644\u0639\u0631\u0627\u0642', count: sc('allies','al') }
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

  // Compact search inside tabs bar
  var searchWrap = document.createElement('div');
  searchWrap.className = 'tab-search-wrap';

  var searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.id = 'searchInput';
  searchInput.className = 'tab-search-input';
  searchInput.placeholder = '\u0628\u062D\u062B...';
  searchInput.setAttribute('autocomplete', 'off');
  searchWrap.appendChild(searchInput);

  var searchStats = document.createElement('div');
  searchStats.className = 'search-stats';
  searchStats.id = 'searchStats';
  searchWrap.appendChild(searchStats);

  var clearBtn = document.createElement('button');
  clearBtn.className = 'search-clear';
  clearBtn.id = 'searchClear';
  clearBtn.textContent = '\u00d7';
  clearBtn.onclick = function() { clearSearch(); };
  searchWrap.appendChild(clearBtn);

  tabsBar.appendChild(searchWrap);
  root.appendChild(tabsBar);

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
  var srcLine = document.createElement('div');
  srcLine.textContent = 'مصدر: قناة الإعلام الحربي — التغطية الإخبارية (Telegram) • ' + computedDay + ' ' + data.dateAr;
  footer.appendChild(srcLine);
  var notice = document.createElement('div');
  notice.style.cssText = 'margin-top:8px;font-size:0.68rem;opacity:0.8;line-height:1.6;';
  notice.appendChild(document.createTextNode('هذا الموقع '));
  var noticeBold = document.createElement('strong');
  noticeBold.textContent = 'غير رسمي';
  notice.appendChild(noticeBold);
  notice.appendChild(document.createTextNode(' ولا يتبع قناة «الإعلام الحربي» ولا أي جهة مرتبطة بها. البيانات مأخوذة من تليغرام ومُعالَجة بواسطة ذكاء اصطناعي — قد تحتوي على أخطاء.'));
  footer.appendChild(notice);
  var slot = document.createElement('div');
  slot.setAttribute('data-disclaimer-slot', '');
  slot.style.cssText = 'margin-top:10px;font-size:0.68rem;';
  var ver = document.createElement('span');
  ver.className = 'ver-link';
  ver.style.cssText = 'display:inline-block;font-size:0.6rem;opacity:0.55;direction:ltr;cursor:pointer;';
  ver.textContent = 'Harbi Reports v2.5.0';
  ver.onclick = function() { showChangelog(); };
  slot.appendChild(ver);
  footer.appendChild(slot);
  root.appendChild(footer);
  if (window.injectDisclaimerLink) window.injectDisclaimerLink(slot);

  // Init search and siren map lazy loading
  initSearch();
  window._mapInited = false;
  window._sirenPoints = data.sirenPoints || [];

  // Handle deep-link from search: ?tab=X&idx=N&q=term
  var urlParams = new URLSearchParams(window.location.search);
  var targetTab = urlParams.get('tab');
  var targetIdx = urlParams.get('idx');

  if (targetTab) {
    // Switch to the target tab — skip its scroll so we can scroll to the card instead
    var tabEl = document.querySelector('.tab[onclick*="' + targetTab + '"]');
    if (tabEl) switchTab(targetTab, tabEl, true);

    if (targetIdx !== null) {
      // Instant-jump to tabs area first (no smooth — avoids scroll conflict)
      var tabsBar = document.querySelector('.tabs');
      if (tabsBar) window.scrollTo(0, tabsBar.offsetTop);

      // Then scroll to the specific card after DOM settles (match by data-src-idx)
      setTimeout(function() {
        var card = document.querySelector('#' + targetTab + ' .tl-wrap[data-src-idx="' + targetIdx + '"]');
        if (!card) return;
        card.classList.add('search-target');
        // Use rAF to ensure layout before scroll
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(function() {
              card.classList.remove('search-target');
              card.classList.add('search-target-fade');
              setTimeout(function() {
                card.classList.remove('search-target-fade');
              }, 1000);
            }, 5000);
          });
        });
      }, 300);
    } else {
      // No card target — just scroll to tabs
      var tabsBar = document.querySelector('.tabs');
      if (tabsBar) window.scrollTo({ top: tabsBar.offsetTop, behavior: 'smooth' });
    }
  }

  // Load enhancements AFTER DOM is fully built
  import('./enhancements.js').catch(function(e) {
    console.warn('[app] enhancements failed to load:', e);
  });
}

// ── Boot + data loading ──────────────────────────────────

(function boot() {
  var params = new URLSearchParams(window.location.search);
  var date = params.get('date');
  if (!date) {
    document.getElementById('report-root').textContent = '\u0644\u0627 \u064A\u0648\u062C\u062F \u062A\u0642\u0631\u064A\u0631 \u0644\u0647\u0630\u0627 \u0627\u0644\u062A\u0627\u0631\u064A\u062E';
    return;
  }

  fetch('data/' + date + '.json?t=' + Date.now())
    .then(function(res) {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    })
    .then(function(data) {
      document.title = '\u062A\u0642\u0631\u064A\u0631 ' + data.dateAr + ' \u2014 \u0627\u0644\u0625\u0639\u0644\u0627\u0645 \u0627\u0644\u062D\u0631\u0628\u064A';
      renderReport(data);
    })
    .catch(function() {
      document.getElementById('report-root').textContent = '\u0644\u0627 \u064A\u0648\u062C\u062F \u062A\u0642\u0631\u064A\u0631 \u0644\u0647\u0630\u0627 \u0627\u0644\u062A\u0627\u0631\u064A\u062E';
    });
})();
