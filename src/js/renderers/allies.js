/* === src/js/renderers/allies.js === */

import { createTimelineCard, makePhase } from './timeline-card.js';

// ── renderAllies ─────────────────────────────────────────

export function renderAllies(container, items) {
  container.appendChild(makePhase('\u0627\u0644\u064A\u0645\u0646 \u0648\u0627\u0644\u0639\u0631\u0627\u0642'));

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var summary = item.summary || '';
    var shortTitle = summary.length > 80 ? summary.substring(0, 80) + '...' : summary;

    var card = createTimelineCard({
      wrapClass: 'ally-card',
      srcIdx: i,
      nodeTime: item.time || '',
      nodeColor: 'node-cyan',
      hasHit: false,
      tintColor: 'tint-cyan',
      title: shortTitle,
      chips: [{ cls: 'flag-chip', text: item.flag || '' }],
      dots: [],
      hiddenEls: {
        'a-flag': item.flag || '',
        'a-time': item.time || '',
        'a-text': summary
      },
      fullText: item.fullText
    });

    container.appendChild(card);
  }
}
