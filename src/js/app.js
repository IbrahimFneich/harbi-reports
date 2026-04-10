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

// Attach globals needed by onclick handlers
window.switchTab = switchTab;
window.initSirenMap = initSirenMap;
window.showChangelog = showChangelog;
window.clearSearch = clearSearch;

// ── renderReport — master orchestrator ───────────────────

function renderReport(data) {
  var root = document.getElementById('report-root');
  root.innerHTML = '';

  // Header
  var header = document.createElement('div');
  header.className = 'header';

  var homeBtn = document.createElement('a');
  homeBtn.href = 'index.html';
  homeBtn.className = 'home-btn';
  homeBtn.textContent = '\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 ';
  var arrow = document.createTextNode('\u2190');
  homeBtn.appendChild(arrow);
  header.appendChild(homeBtn);

  var h1 = document.createElement('h1');
  var h1Link = document.createElement('a');
  h1Link.href = 'index.html';
  h1Link.textContent = '\u0627\u0644\u0625\u0639\u0644\u0627\u0645 \u0627\u0644\u062D\u0631\u0628\u064A \u2014 \u0627\u0644\u062A\u063A\u0637\u064A\u0629 \u0627\u0644\u0625\u062E\u0628\u0627\u0631\u064A\u0629';
  h1Link.style.color = 'inherit';
  h1Link.style.textDecoration = 'none';
  h1Link.style.cursor = 'pointer';
  h1.appendChild(h1Link);
  header.appendChild(h1);

  // Compute day name from date (don't trust JSON — may have inherited wrong values)
  var _dayNames = {0:'\u0627\u0644\u0623\u062D\u062F',1:'\u0627\u0644\u0625\u062B\u0646\u064A\u0646',2:'\u0627\u0644\u062B\u0644\u0627\u062B\u0627\u0621',3:'\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621',4:'\u0627\u0644\u062E\u0645\u064A\u0633',5:'\u0627\u0644\u062C\u0645\u0639\u0629',6:'\u0627\u0644\u0633\u0628\u062A'};
  var _dp = data.date.split('-');
  var _dt = new Date(parseInt(_dp[0]), parseInt(_dp[1]) - 1, parseInt(_dp[2]));
  var computedDay = _dayNames[_dt.getDay()];

  var dateDiv = document.createElement('div');
  dateDiv.className = 'date';
  var dateText = document.createTextNode(computedDay + ' ');
  dateDiv.appendChild(dateText);
  var dateSpan = document.createElement('span');
  dateSpan.textContent = data.dateAr;
  dateDiv.appendChild(dateSpan);
  var dateSuffix = document.createTextNode(' \u2014 ' + data.hijri);
  dateDiv.appendChild(dateSuffix);
  header.appendChild(dateDiv);

  root.appendChild(header);

  // Tab bar
  var tabsConfig = [
    { id: 'bayanat', label: '\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0642\u0627\u0648\u0645\u0629', count: data.stats.bayanat },
    { id: 'sirens', label: '\u0635\u0641\u0627\u0631\u0627\u062A \u0627\u0644\u0625\u0646\u0630\u0627\u0631', count: data.stats.sirens },
    { id: 'enemy', label: '\u0625\u0639\u0644\u0627\u0645 \u0627\u0644\u0639\u062F\u0648', count: data.stats.enemy },
    { id: 'iran', label: '\u0625\u064A\u0631\u0627\u0646', count: data.stats.iran },
    { id: 'videos', label: '\u0641\u064A\u062F\u064A\u0648\u0647\u0627\u062A', count: data.stats.videos },
    { id: 'allies', label: '\u0627\u0644\u064A\u0645\u0646 \u0648\u0627\u0644\u0639\u0631\u0627\u0642', count: data.stats.allies }
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
  searchInput.placeholder = '\u0628\u062D\u062B... (\u0645\u062B\u0644\u0627\u064B: \u0645\u064A\u0631\u0643\u0627\u0641\u0627\u060C \u0643\u0631\u064A\u0627\u062A \u0634\u0645\u0648\u0646\u0629\u060C \u0645\u0633\u064A\u0651\u0631\u0629\u060C \u062A\u0644 \u0623\u0628\u064A\u0628)';
  searchInput.setAttribute('autocomplete', 'off');
  searchBar.appendChild(searchInput);

  var searchStats = document.createElement('div');
  searchStats.className = 'search-stats';
  searchStats.id = 'searchStats';
  searchBar.appendChild(searchStats);

  var clearBtn = document.createElement('button');
  clearBtn.className = 'search-clear';
  clearBtn.id = 'searchClear';
  clearBtn.textContent = '\u0645\u0633\u062D';
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
  footer.textContent = '\u0645\u0635\u062F\u0631: \u0642\u0646\u0627\u0629 \u0627\u0644\u0625\u0639\u0644\u0627\u0645 \u0627\u0644\u062D\u0631\u0628\u064A \u2014 \u0627\u0644\u062A\u063A\u0637\u064A\u0629 \u0627\u0644\u0625\u062E\u0628\u0627\u0631\u064A\u0629 (Telegram) \u2022 ' + computedDay + ' ' + data.dateAr;
  var ver = document.createElement('span');
  ver.className = 'ver-link';
  ver.style.cssText = 'display:inline-block;margin-top:6px;font-size:0.6rem;opacity:0.5;direction:ltr;cursor:pointer;';
  ver.textContent = 'Harbi Reports v1.4.1';
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
