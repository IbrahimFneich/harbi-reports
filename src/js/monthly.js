/* === src/js/monthly.js — Scroll interactions for monthly chronicle pages === */

(function () {
  'use strict';

  /* ── Scroll Progress Bar ── */
  var prog = document.querySelector('.mc-progress');
  if (prog) {
    window.addEventListener('scroll', function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      if (h > 0) prog.style.width = (window.scrollY / h * 100) + '%';
    });
  }

  /* ── Scroll Reveal (IntersectionObserver) ── */
  var revealEls = document.querySelectorAll('.mc-rv');
  if (revealEls.length) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('vis');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    revealEls.forEach(function (el) { obs.observe(el); });
  }

  /* ── Counter Animation ── */
  var counted = false;
  var ribbon = document.querySelector('.mc-ribbon');
  if (ribbon) {
    var cObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !counted) {
          counted = true;
          var els = document.querySelectorAll('[data-count]');
          els.forEach(function (el) {
            var target = parseInt(el.dataset.count, 10);
            var current = 0;
            var step = Math.ceil(target / 45);
            var iv = setInterval(function () {
              current += step;
              if (current >= target) { current = target; clearInterval(iv); }
              el.textContent = current;
            }, 28);
          });
        }
      });
    }, { threshold: 0.5 });
    cObs.observe(ribbon);
  }
})();
