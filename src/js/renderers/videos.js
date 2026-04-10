/* === src/js/renderers/videos.js === */

import { createTimelineCard, makePhase } from './timeline-card.js';

// ── renderVideos ─────────────────────────────────────────

export function renderVideos(container, items) {
  container.appendChild(makePhase(items.length + ' \u0639\u0645\u0644\u064A\u0627\u062A \u0645\u0648\u062B\u0651\u0642\u0629 \u0628\u0627\u0644\u0641\u064A\u062F\u064A\u0648'));

  for (var i = 0; i < items.length; i++) {
    var item = items[i];

    var card = createTimelineCard({
      wrapClass: 'vid-card',
      srcIdx: i,
      nodeTime: item.time || '',
      nodeColor: 'node-cyan',
      hasHit: false,
      tintColor: 'tint-cyan',
      title: item.description || '',
      chips: [{ cls: 'play-chip', html: '&#9654; \u0641\u064A\u062F\u064A\u0648' }],
      dots: [],
      hiddenEls: {
        'v-time': item.time || '',
        'v-text': item.description || ''
      },
      fullText: item.fullText
    });

    container.appendChild(card);
  }
}
