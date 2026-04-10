/* === src/js/renderers/enemy.js === */

import { createTimelineCard, makePhase } from './timeline-card.js';

// ── renderEnemy ──────────────────────────────────────────

export function renderEnemy(container, items) {
  container.appendChild(makePhase(items.length + ' \u062A\u0642\u0631\u064A\u0631 \u0625\u0639\u0644\u0627\u0645 \u0627\u0644\u0639\u062F\u0648'));

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var summary = item.summary || '';
    var shortTitle = summary.length > 80 ? summary.substring(0, 80) + '...' : summary;
    var tlText = summary.length > 80 ? summary : null;

    var card = createTimelineCard({
      wrapClass: 'enemy-row',
      nodeTime: item.time || '',
      nodeColor: 'node-orange',
      hasHit: false,
      tintColor: '',
      title: shortTitle,
      chips: [],
      dots: [],
      hiddenEls: {
        'e-time': item.time || '',
        'e-text': summary
      },
      tlText: tlText,
      fullText: item.fullText
    });

    container.appendChild(card);
  }
}
