/* === src/js/timeline.js -- Scroll-driven timeline interactions === */

(function () {
  'use strict';

  /* ── Scroll Progress Bar ── */
  var progressBar = document.querySelector('.tl-progress');
  window.addEventListener('scroll', function () {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (h > 0) progressBar.style.width = (window.scrollY / h * 100) + '%';
  });

  /* ── Scroll Reveal (IntersectionObserver) ── */
  var revealEls = document.querySelectorAll('.rv, .rv-r, .rv-l, .rv-scale');
  var revealObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) e.target.classList.add('vis');
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(function (el) { revealObs.observe(el); });

  /* ── Phase Navigator: show after hero ── */
  var phaseNav = document.getElementById('phaseNav');
  var hero = document.querySelector('.tl-hero');
  if (hero && phaseNav) {
    var navShowObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) {
          phaseNav.classList.add('vis');
        } else {
          phaseNav.classList.remove('vis');
        }
      });
    }, { threshold: 0 });
    navShowObs.observe(hero);
  }

  /* ── Phase Navigator: highlight active chapter on scroll ── */
  var chapters = document.querySelectorAll('.tl-ch');
  var navItems = document.querySelectorAll('.pn-item');
  var colors = [
    'var(--accent)', 'var(--red)', 'var(--orange)',
    'var(--purple)', 'var(--green)', 'var(--blue)'
  ];

  var chapterObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        var id = e.target.id;
        navItems.forEach(function (item, i) {
          var isActive = item.getAttribute('href') === '#' + id;
          item.classList.toggle('active', isActive);
          item.style.borderBottomColor = isActive ? colors[i] : 'transparent';
        });
      }
    });
  }, { threshold: 0.3, rootMargin: '-80px 0px -50% 0px' });
  chapters.forEach(function (ch) { chapterObs.observe(ch); });

  /* ── Phase Navigator: smooth scroll on click ── */
  navItems.forEach(function (item) {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      var target = document.querySelector(item.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ── Phase Navigator: shadow on scroll ── */
  window.addEventListener('scroll', function () {
    if (phaseNav) phaseNav.classList.toggle('scrolled', window.scrollY > 100);
  });
})();
