/* === src/js/ui/navbar.js -- Shared navigation bar === */

export function initNavbar() {
  if (document.querySelector('.navbar')) return;

  var path = window.location.pathname;
  var page = 'index';
  if (path.indexOf('report') !== -1) page = 'report';
  if (path.indexOf('analytics') !== -1) page = 'analytics';
  if (path.indexOf('timeline') !== -1) page = 'timeline';
  if (path.indexOf('monthly') !== -1) page = 'monthly';

  // Detect if we're in a subdirectory (e.g. monthly/)
  var prefix = (path.indexOf('/monthly/') !== -1) ? '../' : '';

  var nav = document.createElement('nav');
  nav.className = 'navbar';

  var logo = document.createElement('a');
  logo.className = 'nav-logo';
  logo.href = prefix + 'index.html';
  logo.textContent = '\u2605 \u0623\u0631\u0634\u064A\u0641 \u0627\u0644\u0625\u0639\u0644\u0627\u0645 \u0627\u0644\u062D\u0631\u0628\u064A';
  nav.appendChild(logo);

  var links = document.createElement('div');
  links.className = 'nav-links';
  var items = [
    { href: prefix + 'index.html', label: '\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629', id: 'index' },
    { href: prefix + 'timeline.html', label: '\u0627\u0644\u062A\u0633\u0644\u0633\u0644 \u0627\u0644\u0632\u0645\u0646\u064A', id: 'timeline' },
    { href: prefix + 'analytics.html', label: '\u0627\u0644\u062A\u062D\u0644\u064A\u0644\u0627\u062A', id: 'analytics' },
    { href: (page === 'monthly') ? '#' : (prefix + 'monthly/2023-10.html'), label: '\u0627\u0644\u0648\u062B\u064A\u0642\u0629 \u0627\u0644\u0634\u0647\u0631\u064A\u0629', id: 'monthly' }
  ];
  items.forEach(function(item) {
    var a = document.createElement('a');
    a.className = 'nav-link' + (page === item.id ? ' active' : '');
    a.href = item.href;
    a.textContent = item.label;
    links.appendChild(a);
  });
  nav.appendChild(links);

  var actions = document.createElement('div');
  actions.className = 'nav-actions';

  var searchBtn = document.createElement('button');
  searchBtn.className = 'nav-search-btn';
  searchBtn.textContent = '\u0628\u062D\u062B ';
  searchBtn.title = '\u0628\u062D\u062B (/)';
  var kbd = document.createElement('kbd');
  kbd.textContent = '/';
  searchBtn.appendChild(kbd);
  searchBtn.onclick = function() {
    if (typeof window.openSpotlight === 'function') window.openSpotlight();
  };
  actions.appendChild(searchBtn);

  var themeBtn = document.createElement('button');
  themeBtn.className = 'nav-theme-btn';
  themeBtn.title = '\u062A\u0628\u062F\u064A\u0644 \u0627\u0644\u0633\u0645\u0629';
  themeBtn.textContent = document.body.classList.contains('light') ? '\u263E' : '\u2600';
  themeBtn.onclick = function() {
    document.body.classList.toggle('light');
    var isLight = document.body.classList.contains('light');
    themeBtn.textContent = isLight ? '\u263E' : '\u2600';
    localStorage.setItem('harbi-theme', isLight ? 'light' : 'dark');
    if (typeof window.swapAllMapTiles === 'function') window.swapAllMapTiles();
  };
  actions.appendChild(themeBtn);
  nav.appendChild(actions);

  var hamburger = document.createElement('button');
  hamburger.className = 'nav-hamburger';
  hamburger.setAttribute('aria-label', '\u0627\u0644\u0642\u0627\u0626\u0645\u0629');
  for (var i = 0; i < 3; i++) hamburger.appendChild(document.createElement('span'));
  nav.appendChild(hamburger);

  var overlay = document.createElement('div');
  overlay.className = 'nav-mobile-overlay';
  function closeOverlay() {
    hamburger.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
  items.forEach(function(item) {
    var a = document.createElement('a');
    a.className = 'nav-link' + (page === item.id ? ' active' : '');
    a.href = item.href;
    a.textContent = item.label;
    a.onclick = function() { closeOverlay(); };
    overlay.appendChild(a);
  });
  var mSearch = document.createElement('a');
  mSearch.className = 'nav-link';
  mSearch.href = '#';
  mSearch.textContent = '\u0628\u062D\u062B...';
  mSearch.onclick = function(e) {
    e.preventDefault();
    closeOverlay();
    if (typeof window.openSpotlight === 'function') window.openSpotlight();
  };
  overlay.appendChild(mSearch);
  var mTheme = document.createElement('a');
  mTheme.className = 'nav-link';
  mTheme.href = '#';
  mTheme.textContent = '\u062A\u0628\u062F\u064A\u0644 \u0627\u0644\u0633\u0645\u0629';
  mTheme.onclick = function(e) {
    e.preventDefault();
    themeBtn.click();
  };
  overlay.appendChild(mTheme);
  var mFooter = document.createElement('div');
  mFooter.className = 'nav-mobile-footer';
  var mFooterLink = document.createElement('a');
  mFooterLink.href = 'https://t.me/C_Military1';
  mFooterLink.target = '_blank';
  mFooterLink.rel = 'noopener';
  mFooterLink.textContent = '\u0642\u0646\u0627\u0629 \u0627\u0644\u0625\u0639\u0644\u0627\u0645 \u0627\u0644\u062D\u0631\u0628\u064A';
  mFooter.appendChild(mFooterLink);
  overlay.appendChild(mFooter);

  hamburger.onclick = function() {
    if (overlay.classList.contains('open')) {
      closeOverlay();
    } else {
      hamburger.classList.add('open');
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  };

  document.body.insertBefore(overlay, document.body.firstChild);
  document.body.insertBefore(nav, document.body.firstChild);
}
