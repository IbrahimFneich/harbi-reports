/* === src/js/renderers/timeline-card.js === */

import { addToggle } from '../ui/toggle.js';

export function makePhase(text, count) {
  var div = document.createElement('div');
  div.className = 'phase';
  var span = document.createElement('span');
  var label = text;
  if (count !== undefined && count !== null) {
    label = label + ' \u2014 ' + count + ' \u0639\u0645\u0644\u064A\u0629';
  }
  span.textContent = label;
  div.appendChild(span);
  return div;
}

// ── createTimelineCard helper ────────────────────────────

export function createTimelineCard(config) {
  // config: { wrapClass, nodeTime, nodeColor, hasHit, tintColor, title,
  //           chips:[], dots:[], hiddenEls:{}, fullText, refNum, meta }
  var wrap = document.createElement('div');
  wrap.className = 'tl-wrap' + (config.wrapClass ? ' ' + config.wrapClass : '');
  if (config.refNum !== undefined && config.refNum !== null && config.refNum !== '') {
    wrap.classList.add('has-ref');
  }

  // Node
  var node = document.createElement('div');
  node.className = 'tl-node' + (config.nodeColor ? ' ' + config.nodeColor : '') + (config.hasHit ? ' has-hit' : '');
  var nodeTime = document.createElement('span');
  nodeTime.className = 'node-time';
  nodeTime.textContent = config.nodeTime || '';
  node.appendChild(nodeTime);
  wrap.appendChild(node);

  // Ref number pill (V1 — sits below the node in the right column)
  if (config.refNum !== undefined && config.refNum !== null && config.refNum !== '') {
    var pill = document.createElement('div');
    pill.className = 'tl-num-pill';
    pill.textContent = '#' + config.refNum;
    wrap.appendChild(pill);
  }

  // Line
  var line = document.createElement('div');
  line.className = 'tl-line';
  wrap.appendChild(line);

  // Body
  var body = document.createElement('div');
  body.className = 'tl-body' + (config.tintColor ? ' ' + config.tintColor : '');

  // Hidden elements for compatibility
  if (config.hiddenEls) {
    var keys = Object.keys(config.hiddenEls);
    for (var hi = 0; hi < keys.length; hi++) {
      var hKey = keys[hi];
      var hDiv = document.createElement('div');
      hDiv.className = hKey;
      hDiv.style.display = 'none';
      hDiv.textContent = config.hiddenEls[hKey];
      body.appendChild(hDiv);
    }
  }

  // Title — optionally wrapped in a row with a clock strip
  var titleEl = document.createElement('div');
  titleEl.className = 'tl-title';
  titleEl.textContent = config.title || '';

  var hasMeta = config.meta && config.meta.length > 0;
  if (hasMeta) {
    var titleRow = document.createElement('div');
    titleRow.className = 'tl-title-row';
    titleRow.appendChild(titleEl);

    var clockStrip = document.createElement('div');
    clockStrip.className = 'clock-strip';
    for (var mi = 0; mi < config.meta.length; mi++) {
      var metaItem = config.meta[mi];
      if (!metaItem || !metaItem.value) continue;
      var clockBox = document.createElement('div');
      clockBox.className = 'clock-box';
      var clockLbl = document.createElement('span');
      clockLbl.className = 'lbl';
      clockLbl.textContent = metaItem.label;
      var clockVal = document.createElement('b');
      clockVal.textContent = metaItem.value;
      clockBox.appendChild(clockLbl);
      clockBox.appendChild(clockVal);
      clockStrip.appendChild(clockBox);
    }
    if (clockStrip.childNodes.length > 0) {
      titleRow.appendChild(clockStrip);
    }
    body.appendChild(titleRow);
  } else {
    body.appendChild(titleEl);
  }

  // Chips
  if (config.chips && config.chips.length > 0) {
    var chipsWrap = document.createElement('div');
    chipsWrap.className = 'tl-chips';
    for (var ci = 0; ci < config.chips.length; ci++) {
      var chipConf = config.chips[ci];
      var chip = document.createElement('span');
      chip.className = 'tl-chip' + (chipConf.cls ? ' ' + chipConf.cls : '');
      if (chipConf.html) {
        chip.innerHTML = chipConf.html;
      } else {
        chip.textContent = chipConf.text || '';
      }
      chipsWrap.appendChild(chip);
    }
    body.appendChild(chipsWrap);
  }

  // Dots
  if (config.dots && config.dots.length > 0) {
    var dotsWrap = document.createElement('div');
    dotsWrap.className = 'tl-dots';
    for (var di = 0; di < config.dots.length; di++) {
      var dotConf = config.dots[di];
      var dotSpan = document.createElement('span');
      dotSpan.className = 'tl-dot';
      var dotCircle = document.createElement('span');
      dotCircle.className = 'dot';
      dotCircle.style.background = dotConf.color || '#888';
      dotSpan.appendChild(dotCircle);
      dotSpan.appendChild(document.createTextNode(' ' + dotConf.label));
      dotsWrap.appendChild(dotSpan);
    }
    body.appendChild(dotsWrap);
  }

  // Hidden tag spans (for enhancements.js)
  if (config.hiddenTags) {
    for (var ti = 0; ti < config.hiddenTags.length; ti++) {
      var tagSpan = document.createElement('span');
      tagSpan.className = 'bayan-tag';
      tagSpan.style.display = 'none';
      tagSpan.textContent = config.hiddenTags[ti];
      body.appendChild(tagSpan);
    }
  }

  // Optional tl-text for long summaries
  if (config.tlText) {
    var tlTextEl = document.createElement('div');
    tlTextEl.className = 'tl-text';
    tlTextEl.textContent = config.tlText;
    body.appendChild(tlTextEl);
  }

  wrap.appendChild(body);

  // addToggle appends inside tl-body via the updated function
  addToggle(wrap, config.fullText);

  return wrap;
}
