/* === src/js/enhancements.js === */

import { ALL_REPORTS } from './ui/nav.js';
import { initHero } from './ui/hero.js';
import { initNav } from './ui/nav.js';
import { initTheme } from './ui/theme.js';
import { initBayanatDash, filterBayanatAuto } from './dashboards/bayanat-dash.js';
import { initSirensDash, filterSirensAuto } from './dashboards/sirens-dash.js';
import { initEnemyDash, filterEnemyAuto } from './dashboards/enemy-dash.js';
import { initIranDash, filterIranAuto } from './dashboards/iran-dash.js';
import { initBayanatMap } from './maps/bayanat-map.js';
import { initAutoSirenMap } from './maps/siren-auto-map.js';

export { ALL_REPORTS };

// Attach filter functions to window for onclick handlers
window.filterBayanatAuto = filterBayanatAuto;
window.filterSirensAuto = filterSirensAuto;
window.filterEnemyAuto = filterEnemyAuto;
window.filterIranAuto = filterIranAuto;

// Run everything in order — each wrapped so one failure doesn't kill the rest
var _inits = [
  ['hero', initHero],
  ['nav', initNav],
  // theme toggle now handled by navbar.js
  ['bayanatDash', initBayanatDash],
  ['sirensDash', initSirensDash],
  ['enemyDash', initEnemyDash],
  ['iranDash', initIranDash],
  ['bayanatMap', initBayanatMap],
  ['sirenMap', initAutoSirenMap]
];
for (var _i = 0; _i < _inits.length; _i++) {
  try { _inits[_i][1](); } catch (e) { console.warn('[enhancements] ' + _inits[_i][0] + ' failed:', e); }
}
