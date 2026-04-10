/* === src/js/ui/tabs.js === */

var _tabHooks = [];

export function onTabSwitch(fn) { _tabHooks.push(fn); }

export function switchTab(id, el) {
  document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
  document.getElementById(id).classList.add('active');
  el.classList.add('active');
  window.scrollTo({ top: document.querySelector('.tabs').offsetTop, behavior: 'smooth' });
  if (id === 'sirens' && !window._mapInited) {
    initSirenMap();
  }
  for (var i = 0; i < _tabHooks.length; i++) { _tabHooks[i](id, el); }
}
