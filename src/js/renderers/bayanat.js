/* === src/js/renderers/bayanat.js === */

import { createTimelineCard, makePhase } from './timeline-card.js';

// ── renderBayanat ────────────────────────────────────────

export function renderBayanat(container, items) {
  var phases = [
    { id: 'fajr', label: '\u0627\u0644\u0641\u062C\u0631 \u2014 00:00 \u2013 05:00', min: 0, max: 4 },
    { id: 'sabah', label: '\u0627\u0644\u0635\u0628\u0627\u062D \u2014 05:00 \u2013 12:00', min: 5, max: 11 },
    { id: 'zuhr', label: '\u0627\u0644\u0638\u0647\u0631 \u2014 12:00 \u2013 16:00', min: 12, max: 15 },
    { id: 'masaa', label: '\u0627\u0644\u0645\u0633\u0627\u0621 \u2014 16:00 \u2013 \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u064A\u0648\u0645', min: 16, max: 23 }
  ];

  var grouped = { fajr: [], sabah: [], zuhr: [], masaa: [] };

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    item._srcIdx = i;
    var timeStr = item.opTime || item.postTime || '00:00';
    var hour = parseInt(timeStr.split(':')[0], 10);
    if (hour < 5) grouped.fajr.push(item);
    else if (hour < 12) grouped.sabah.push(item);
    else if (hour < 16) grouped.zuhr.push(item);
    else grouped.masaa.push(item);
  }

  var tagColorMap = {
    '\u0641\u064A \u0625\u0637\u0627\u0631 \u0627\u0644\u062A\u062D\u0630\u064A\u0631': '#a855f7',
    '\u0625\u0635\u0627\u0628\u0629 \u0645\u0628\u0627\u0634\u0631\u0629': '#ef4444',
    '\u0625\u0635\u0627\u0628\u0629 \u0645\u0624\u0643\u0651\u062F\u0629': '#ef4444',
    '\u0636\u0631\u0628\u0629 \u0639\u0645\u0642': '#3b82f6',
    '\u0631\u062F\u0651\u0627\u064B \u0639\u0644\u0649': '#f97316'
  };

  var badgeNodeMap = {
    'settlement': 'node-purple',
    'tank': 'node-orange',
    'deep': 'node-blue',
    'multi': 'node-accent'
  };

  var badgeTintMap = {
    'settlement': 'tint-purple',
    'tank': 'tint-orange',
    'deep': 'tint-blue'
  };

  for (var pi = 0; pi < phases.length; pi++) {
    var phase = phases[pi];
    var phaseItems = grouped[phase.id];
    if (phaseItems.length === 0) continue;

    container.appendChild(makePhase(phase.label, phaseItems.length));

    for (var bi = 0; bi < phaseItems.length; bi++) {
      var b = phaseItems[bi];

      // Determine node color and tint
      var nodeColor = 'node-green';
      var tintColor = '';
      if (b.badge && badgeNodeMap[b.badge]) {
        nodeColor = badgeNodeMap[b.badge];
      }
      if (b.badge && badgeTintMap[b.badge]) {
        tintColor = badgeTintMap[b.badge];
      }

      // Build chips
      var chips = [];
      if (b.weapon) {
        chips.push({ cls: 'weapon-chip', text: b.weapon });
      }

      // Build dots and determine hasHit
      var dots = [];
      var hasHit = false;
      var hiddenTags = [];
      if (b.tags && b.tags.length > 0) {
        for (var tgi = 0; tgi < b.tags.length; tgi++) {
          var tagText = b.tags[tgi];
          hiddenTags.push(tagText);
          var dotColor = tagColorMap[tagText] || '#888';
          dots.push({ color: dotColor, label: tagText });
          if (tagText === '\u0625\u0635\u0627\u0628\u0629 \u0645\u0628\u0627\u0634\u0631\u0629' || tagText === '\u0625\u0635\u0627\u0628\u0629 \u0645\u0624\u0643\u0651\u062F\u0629') {
            hasHit = true;
          }
        }
      }

      // Wrap class
      var wrapClass = 'bayan' + (b.badge ? ' ' + b.badge : '');

      // Footer meta — always show نُشر + نُفّذ when available (tracking data).
      // The node only shows one of them; the footer surfaces both explicitly.
      var nodeTimeVal = b.opTime || b.postTime || '';
      var metaArr = [];
      if (b.postTime) metaArr.push({ label: '\u0646\u064F\u0634\u0631', value: b.postTime });
      if (b.opTime)   metaArr.push({ label: '\u0646\u064F\u0641\u0651\u0630', value: b.opTime });

      var card = createTimelineCard({
        wrapClass: wrapClass,
        srcIdx: b._srcIdx,
        nodeTime: nodeTimeVal,
        nodeColor: nodeColor,
        hasHit: hasHit,
        tintColor: tintColor,
        title: b.target || '',
        chips: chips,
        dots: dots,
        refNum: (b.num || b.num === 0) ? b.num : '+',
        meta: metaArr,
        hiddenEls: {
          'bayan-target': b.target || '',
          'bayan-num': b.num || '+'
        },
        hiddenTags: hiddenTags,
        fullText: b.fullText
      });

      container.appendChild(card);
    }
  }
}
