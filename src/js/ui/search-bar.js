/* === src/js/ui/search-bar.js === */

import { switchTab } from './tabs.js';

export var aliases = {
  'merkava': '\u0645\u064A\u0631\u0643\u0627\u0641\u0627', 'tank': '\u0645\u064A\u0631\u0643\u0627\u0641\u0627', '\u062F\u0628\u0627\u0628\u0629': '\u0645\u064A\u0631\u0643\u0627\u0641\u0627', '\u062F\u0628\u0627\u0628\u0647': '\u0645\u064A\u0631\u0643\u0627\u0641\u0627',
  'drone': '\u0645\u0633\u064A\u0651\u0631\u0629', 'uav': '\u0645\u0633\u064A\u0651\u0631\u0629', 'fpv': 'FPV',
  'missile': '\u0635\u0627\u0631\u0648\u062E', 'rocket': '\u0635\u0627\u0631\u0648\u062E',
  'siren': '\u0635\u0641\u0627\u0631\u0627\u062A', '\u0635\u0641\u0627\u0631\u0629': '\u0635\u0641\u0627\u0631\u0627\u062A', '\u0627\u0646\u0630\u0627\u0631': '\u0625\u0646\u0630\u0627\u0631',
  'haifa': '\u062D\u064A\u0641\u0627', 'tel aviv': '\u062A\u0644 \u0623\u0628\u064A\u0628', 'telaviv': '\u062A\u0644 \u0623\u0628\u064A\u0628',
  'iran': '\u0625\u064A\u0631\u0627\u0646', '\u0627\u064A\u0631\u0627\u0646': '\u0625\u064A\u0631\u0627\u0646',
  'kiryat': '\u0643\u0631\u064A\u0627\u062A', 'kiryat shmona': '\u0643\u0631\u064A\u0627\u062A \u0634\u0645\u0648\u0646\u0629',
  'nahariya': '\u0646\u0647\u0627\u0631\u064A\u0627', 'metula': '\u0627\u0644\u0645\u0637\u0644\u0629',
  'bint jbeil': '\u0628\u0646\u062A \u062C\u0628\u064A\u0644', 'maroun': '\u0645\u0627\u0631\u0648\u0646',
  'litani': '\u0627\u0644\u0644\u064A\u0637\u0627\u0646\u064A', '\u0644\u064A\u0637\u0627\u0646\u064A': '\u0627\u0644\u0644\u064A\u0637\u0627\u0646\u064A',
  'yemen': '\u0627\u0644\u064A\u0645\u0646', '\u064A\u0645\u0646': '\u0627\u0644\u064A\u0645\u0646',
  'iraq': '\u0627\u0644\u0639\u0631\u0627\u0642', '\u0639\u0631\u0627\u0642': '\u0627\u0644\u0639\u0631\u0627\u0642',
  'ambush': '\u0643\u0645\u064A\u0646',
  'killed': '\u0642\u062A\u0644\u0649', '\u0642\u062A\u064A\u0644': '\u0642\u062A\u0644\u0649', '\u0645\u0642\u062A\u0644': '\u0642\u062A\u0644\u0649',
  'injured': '\u062C\u0631\u062D\u0649', '\u062C\u0631\u064A\u062D': '\u062C\u0631\u062D\u0649', '\u0625\u0635\u0627\u0628\u0629': '\u0625\u0635\u0627\u0628',
  'settlement': '\u0645\u0633\u062A\u0648\u0637\u0646\u0629', '\u0645\u0633\u062A\u0648\u0637\u0646\u0647': '\u0645\u0633\u062A\u0648\u0637\u0646\u0629',
  'base': '\u0642\u0627\u0639\u062F\u0629', '\u0642\u0627\u0639\u062F\u0647': '\u0642\u0627\u0639\u062F\u0629',
  'artillery': '\u0645\u062F\u0641\u0639\u064A\u0629', '\u0645\u062F\u0641\u0639\u064A\u0647': '\u0645\u062F\u0641\u0639\u064A\u0629',
  'safed': '\u0635\u0641\u062F', 'acre': '\u0639\u0643\u0627', 'akka': '\u0639\u0643\u0627',
  'golan': '\u0627\u0644\u062C\u0648\u0644\u0627\u0646', '\u062C\u0648\u0644\u0627\u0646': '\u0627\u0644\u062C\u0648\u0644\u0627\u0646',
  'jerusalem': '\u0627\u0644\u0642\u062F\u0633', '\u0642\u062F\u0633': '\u0627\u0644\u0642\u062F\u0633',
  'warning': '\u0627\u0644\u062A\u062D\u0630\u064A\u0631', '\u062A\u062D\u0630\u064A\u0631': '\u0627\u0644\u062A\u062D\u0630\u064A\u0631',
  'khiam': '\u0627\u0644\u062E\u064A\u0627\u0645', '\u062E\u064A\u0627\u0645': '\u0627\u0644\u062E\u064A\u0627\u0645'
};

export function normalizeAr(s) {
  return s.replace(/[\u0625\u0623\u0622\u0671]/g, '\u0627').replace(/\u0629/g, '\u0647').replace(/\u0649/g, '\u064A')
    .replace(/\u0624/g, '\u0648').replace(/\u0626/g, '\u064A').replace(/\u0651/g, '')
    .replace(/[\u064B-\u065F\u0670]/g, '').toLowerCase();
}

var CARD_SEL = '.tl-wrap';
var tabNames = { bayanat: '\u0628\u064A\u0627\u0646\u0627\u062A', sirens: '\u0635\u0641\u0627\u0631\u0627\u062A', enemy: '\u0625\u0639\u0644\u0627\u0645', iran: '\u0625\u064A\u0631\u0627\u0646', videos: '\u0641\u064A\u062F\u064A\u0648', allies: '\u062D\u0644\u0641\u0627\u0621' };
var _searchTimer = null;

export function initSearch() {
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

export function clearSearch() {
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

export function performSearch(query) {
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
        noMsg.textContent = '\u0644\u0627 \u0646\u062A\u0627\u0626\u062C';
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
  document.getElementById('searchStats').textContent = totalMatches + ' \u0646\u062A\u064A\u062C\u0629 \u2014 ' + statParts.join(' | ');

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
