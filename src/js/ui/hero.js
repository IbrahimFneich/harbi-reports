/* === src/js/ui/hero.js === */

export function initHero() {
  var statsBar = document.querySelector('.stats');
  if (!statsBar) return;
  var bayanat = document.querySelectorAll('#bayanat .bayan').length;
  if (bayanat === 0) return;

  var tanks = 0, hits = 0, aircraft = 0, settlements = 0, bases = 0;
  document.querySelectorAll('#bayanat .bayan').forEach(function(c) {
    var cls = c.className || '';
    var tt = (c.querySelector('.bayan-target') || {}).textContent || '';
    var tg = ''; c.querySelectorAll('.bayan-tag').forEach(function(t) { tg += t.textContent; });
    if (cls.indexOf('tank') !== -1 || tt.indexOf('\u0645\u064A\u0631\u0643\u0627\u0641\u0627') !== -1) tanks++;
    if (tg.indexOf('\u0625\u0635\u0627\u0628\u0629') !== -1) hits++;
    if (tt.indexOf('\u0637\u0627\u0626\u0631\u0629') !== -1 || tt.indexOf('\u0645\u0631\u0648\u062D\u064A\u0651\u0629') !== -1) aircraft++;
    if (cls.indexOf('settlement') !== -1) settlements++;
    if (cls.indexOf('deep') !== -1 || tt.indexOf('\u0642\u0627\u0639\u062F\u0629') !== -1) bases++;
  });

  var hero = document.createElement('div');
  hero.className = 'day-hero';

  var chips = [
    [bayanat + ' \u0639\u0645\u0644\u064A\u0629', 'rgba(46,204,113,0.12)', '#2ecc71'],
    [hits + ' \u0625\u0635\u0627\u0628\u0629 \u0645\u0624\u0643\u0651\u062F\u0629', 'rgba(231,76,60,0.12)', '#e74c3c']
  ];
  if (tanks > 0) chips.push([tanks + ' \u0645\u064A\u0631\u0643\u0627\u0641\u0627', 'rgba(230,126,34,0.12)', '#e67e22']);
  if (aircraft > 0) chips.push([aircraft + ' \u0637\u0627\u0626\u0631\u0629', 'rgba(52,152,219,0.12)', '#3498db']);
  if (settlements > 0) chips.push([settlements + ' \u0645\u0633\u062A\u0648\u0637\u0646\u0629', 'rgba(155,89,182,0.12)', '#9b59b6']);
  if (bases > 0) chips.push([bases + ' \u0642\u0627\u0639\u062F\u0629/\u0628\u0646\u0649 \u062A\u062D\u062A\u064A\u0629', 'rgba(201,168,76,0.12)', '#c9a84c']);

  var sirens = document.querySelectorAll('#sirens .siren-row').length;
  if (sirens > 0) chips.push([sirens + ' \u0635\u0641\u0627\u0631\u0629 \u0625\u0646\u0630\u0627\u0631', 'rgba(231,76,60,0.08)', '#e74c3c']);

  chips.forEach(function(ch) {
    var chip = document.createElement('span');
    chip.className = 'hero-chip';
    chip.style.background = ch[1];
    chip.style.color = ch[2];
    chip.textContent = ch[0];
    hero.appendChild(chip);
  });

  statsBar.parentNode.insertBefore(hero, statsBar.nextSibling);
}
