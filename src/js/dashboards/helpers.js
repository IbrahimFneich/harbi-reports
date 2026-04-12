/* === src/js/dashboards/helpers.js === */

export function makeBarRow(label, count, max, color) {
  var row = document.createElement('div');
  row.className = 'cat-bar-row';
  var lbl = document.createElement('span');
  lbl.className = 'cat-bar-label';
  lbl.textContent = label;
  var track = document.createElement('div');
  track.className = 'cat-bar-track';
  var fill = document.createElement('div');
  fill.className = 'cat-bar-fill';
  fill.style.width = Math.round((count / max) * 100) + '%';
  fill.style.background = color;
  fill.textContent = count;
  track.appendChild(fill);
  row.appendChild(lbl);
  row.appendChild(track);
  return row;
}

export function makePill(num, label, bg, color) {
  var pill = document.createElement('div');
  pill.className = 'cat-pill';
  pill.style.background = bg;
  pill.style.color = color;
  pill.style.flex = '1';
  var n = document.createElement('span');
  n.className = 'pill-num';
  n.textContent = num;
  pill.appendChild(n);
  pill.appendChild(document.createTextNode(label));
  return pill;
}

export function makeCatCard(iconHtml, iconBg, iconColor, titleText) {
  var card = document.createElement('div');
  card.className = 'siren-cat-card';
  var title = document.createElement('div');
  title.className = 'cat-title';
  var icon = document.createElement('div');
  icon.className = 'cat-icon';
  icon.style.background = iconBg;
  icon.style.color = iconColor;
  icon.textContent = iconHtml;
  title.appendChild(icon);
  title.appendChild(document.createTextNode(' ' + titleText));
  card.appendChild(title);
  return card;
}

function ensureHourTooltip() {
  var tip = document.getElementById('cat-tbar-tooltip');
  if (tip) return tip;
  tip = document.createElement('div');
  tip.id = 'cat-tbar-tooltip';
  tip.className = 'cat-tbar-tooltip';
  tip.setAttribute('role', 'tooltip');
  tip.setAttribute('aria-hidden', 'true');
  document.body.appendChild(tip);
  return tip;
}

function positionHourTooltip(tip, rect) {
  var tipRect = tip.getBoundingClientRect();
  var left = rect.left + (rect.width / 2) - (tipRect.width / 2) + window.scrollX;
  var top  = rect.top - tipRect.height - 8 + window.scrollY;
  var maxLeft = window.scrollX + document.documentElement.clientWidth - tipRect.width - 6;
  if (left < window.scrollX + 6) left = window.scrollX + 6;
  if (left > maxLeft) left = maxLeft;
  if (top < window.scrollY + 6) top = rect.bottom + 8 + window.scrollY;
  tip.style.left = left + 'px';
  tip.style.top  = top + 'px';
}

function showHourTooltip(e) {
  var bar = e.currentTarget;
  var hour = parseInt(bar.dataset.hour, 10);
  var count = parseInt(bar.dataset.count, 10);
  var nextH = (hour + 1) % 24;
  var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
  var tip = ensureHourTooltip();
  while (tip.firstChild) tip.removeChild(tip.firstChild);

  var timeRow = document.createElement('div');
  timeRow.className = 'cat-tbar-tooltip-time';
  timeRow.textContent = pad(hour) + ':00 \u2192 ' + pad(nextH) + ':00';

  var countRow = document.createElement('div');
  countRow.className = 'cat-tbar-tooltip-count';
  var num = document.createElement('span');
  num.className = 'cat-tbar-tooltip-num';
  num.textContent = String(count);
  countRow.appendChild(num);
  countRow.appendChild(document.createTextNode(
    ' ' + (count === 1 ? '\u062D\u062F\u062B' : '\u0623\u062D\u062F\u0627\u062B')
  ));

  tip.appendChild(timeRow);
  tip.appendChild(countRow);

  tip.classList.add('is-visible');
  tip.setAttribute('aria-hidden', 'false');
  positionHourTooltip(tip, bar.getBoundingClientRect());
}

function hideHourTooltip() {
  var tip = document.getElementById('cat-tbar-tooltip');
  if (!tip) return;
  tip.classList.remove('is-visible');
  tip.setAttribute('aria-hidden', 'true');
}

export function buildTimeline(containerId, hours, color) {
  var maxH = 0;
  hours.forEach(function(v) { if (v > maxH) maxH = v; });
  var container = document.getElementById(containerId);
  if (!container) return;
  for (var j = 0; j < 24; j++) {
    var count = hours[j] || 0;
    var bar = document.createElement('div');
    bar.className = 'cat-tbar';
    if (color) bar.style.background = color;
    var pct = maxH > 0 ? (count / maxH) * 100 : 0;
    bar.style.height = Math.max(pct, 2) + '%';
    if (count === 0) { bar.style.background = 'var(--surface3)'; bar.style.height = '4%'; }
    bar.dataset.hour = String(j);
    bar.dataset.count = String(count);
    bar.setAttribute('aria-label', j + ':00 \u2014 ' + count);
    bar.tabIndex = 0;
    bar.addEventListener('mouseenter', showHourTooltip);
    bar.addEventListener('mouseleave', hideHourTooltip);
    bar.addEventListener('focus', showHourTooltip);
    bar.addEventListener('blur', hideHourTooltip);
    container.appendChild(bar);
  }
}

export var barColors = ['#e74c3c','#e67e22','#f39c12','#2ecc71','#3498db','#9b59b6','#1abc9c','#6b7d92','#c9a84c'];
