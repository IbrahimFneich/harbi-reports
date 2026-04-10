/* === src/js/ui/theme.js === */

import { swapAllMapTiles } from '../maps/tiles.js';

export function initTheme() {
  var saved = localStorage.getItem('harbi-theme');
  if (saved !== 'dark') document.body.classList.add('light');

  var header = document.querySelector('.header');
  if (!header) return;

  var btn = document.createElement('button');
  btn.className = 'theme-toggle';
  btn.textContent = document.body.classList.contains('light') ? '\u263E' : '\u2600';
  btn.title = '\u062A\u0628\u062F\u064A\u0644 \u0627\u0644\u0633\u0645\u0629';
  btn.onclick = function() {
    document.body.classList.toggle('light');
    var isLight = document.body.classList.contains('light');
    btn.textContent = isLight ? '\u263E' : '\u2600';
    localStorage.setItem('harbi-theme', isLight ? 'light' : 'dark');
    swapAllMapTiles();
  };
  header.appendChild(btn);
}
