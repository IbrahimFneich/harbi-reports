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

export function buildTimeline(containerId, hours, color) {
  var maxH = 0;
  hours.forEach(function(v) { if (v > maxH) maxH = v; });
  var container = document.getElementById(containerId);
  if (!container) return;
  for (var j = 0; j < 24; j++) {
    var bar = document.createElement('div');
    bar.className = 'cat-tbar';
    if (color) bar.style.background = color;
    var pct = maxH > 0 ? (hours[j] / maxH) * 100 : 0;
    bar.style.height = Math.max(pct, 2) + '%';
    if (hours[j] === 0) { bar.style.background = 'var(--surface3)'; bar.style.height = '4%'; }
    bar.title = j + ':00 \u2014 ' + hours[j];
    container.appendChild(bar);
  }
}

export var barColors = ['#e74c3c','#e67e22','#f39c12','#2ecc71','#3498db','#9b59b6','#1abc9c','#6b7d92','#c9a84c'];
