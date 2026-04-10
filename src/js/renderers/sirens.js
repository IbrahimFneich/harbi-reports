/* === src/js/renderers/sirens.js === */

import { createTimelineCard } from './timeline-card.js';

// ── renderSirens ─────────────────────────────────────────

export function renderSirens(container, items, sirenPoints) {
  var mapTitle = document.createElement('div');
  mapTitle.className = 'siren-map-title';
  mapTitle.textContent = '\u062E\u0631\u064A\u0637\u0629 \u0627\u0646\u062A\u0634\u0627\u0631 \u0635\u0641\u0627\u0631\u0627\u062A \u0627\u0644\u0625\u0646\u0630\u0627\u0631';
  container.appendChild(mapTitle);

  var mapDiv = document.createElement('div');
  mapDiv.id = 'sirenMap';
  container.appendChild(mapDiv);

  for (var i = 0; i < items.length; i++) {
    var item = items[i];

    var card = createTimelineCard({
      wrapClass: 'siren-row',
      srcIdx: i,
      nodeTime: item.time || '',
      nodeColor: 'node-red',
      hasHit: false,
      tintColor: 'tint-red',
      title: item.location || '',
      chips: [],
      dots: [],
      hiddenEls: {
        's-time': item.time || '',
        's-loc': item.location || ''
      },
      fullText: item.fullText
    });

    container.appendChild(card);
  }

  window._sirenPoints = sirenPoints;
}
