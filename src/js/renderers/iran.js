/* === src/js/renderers/iran.js === */

import { createTimelineCard, makePhase } from './timeline-card.js';

// ── renderIran ───────────────────────────────────────────

export function renderIran(container, items) {
  container.appendChild(makePhase('\u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A \u0627\u0644\u0625\u064A\u0631\u0627\u0646\u064A\u0629 \u2014 ' + items.length + ' \u062E\u0628\u0631\u0627\u064B'));

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var summary = item.summary || '';
    var shortTitle = summary.length > 80 ? summary.substring(0, 80) + '...' : summary;

    var chips = [];
    if (item.source) {
      chips.push({ cls: 'source-chip', text: item.source });
    }

    var card = createTimelineCard({
      wrapClass: 'iran-card',
      srcIdx: i,
      nodeTime: item.time || '',
      nodeColor: 'node-purple',
      hasHit: false,
      tintColor: 'tint-purple',
      title: shortTitle,
      chips: chips,
      dots: [],
      hiddenEls: {
        'i-time': item.time || '',
        'i-source': item.source || '',
        'i-text': summary
      },
      fullText: item.fullText
    });

    container.appendChild(card);
  }
}
