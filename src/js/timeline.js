/* === src/js/timeline.js -- Scroll-driven timeline interactions === */

(function () {
  'use strict';

  /* ── Scroll Progress Bar ── */
  var progressBar = document.querySelector('.tl-progress');

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

  /* ── Phase Navigator: smooth scroll on click ── */
  var navItems = document.querySelectorAll('.pn-item');
  navItems.forEach(function (item) {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      var target = document.querySelector(item.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ── Phase Navigator: scroll tracking with per-chapter progress ── */
  var chapters = document.querySelectorAll('.tl-ch');
  var fills = document.querySelectorAll('.pn-fill');
  var ticking = false;

  function updateNavProgress() {
    var scrollY = window.scrollY;
    var winH = window.innerHeight;
    var docH = document.documentElement.scrollHeight;
    var activeIdx = -1;

    // Update global progress bar
    var totalProgress = docH - winH;
    if (totalProgress > 0) progressBar.style.width = (scrollY / totalProgress * 100) + '%';

    // Shadow
    if (phaseNav) phaseNav.classList.toggle('scrolled', scrollY > 100);

    // Calculate per-chapter progress
    chapters.forEach(function (ch, i) {
      var rect = ch.getBoundingClientRect();
      var chTop = rect.top;
      var chH = rect.height;

      // How far through this chapter (0 to 1)
      // Chapter starts being "entered" when its top reaches 80% of viewport
      // Chapter is "done" when its bottom passes 30% of viewport
      var enterLine = winH * 0.8;
      var exitLine = winH * 0.3;

      var progress = 0;
      if (chTop < enterLine && chTop + chH > exitLine) {
        // Currently in this chapter
        progress = Math.min(1, Math.max(0, (enterLine - chTop) / chH));
        activeIdx = i;
      } else if (chTop + chH <= exitLine) {
        // Past this chapter
        progress = 1;
      }

      // Update fill bar width
      if (fills[i]) fills[i].style.width = (progress * 100) + '%';

      // Mark done chapters
      navItems[i].classList.toggle('done', progress >= 1 && activeIdx !== i);
    });

    // Highlight active nav item
    navItems.forEach(function (item, i) {
      var isActive = i === activeIdx;
      item.classList.toggle('active', isActive);

      if (isActive) {
        item.style.borderBottomColor = 'transparent'; // fill bar handles color
      } else if (!item.classList.contains('done')) {
        item.style.borderBottomColor = 'transparent';
      }
    });

    // Auto-scroll nav to keep active item visible
    if (activeIdx >= 0 && navItems[activeIdx]) {
      var track = document.querySelector('.pn-track');
      var activeItem = navItems[activeIdx];
      var trackRect = track.getBoundingClientRect();
      var itemRect = activeItem.getBoundingClientRect();

      if (itemRect.right > trackRect.right - 20 || itemRect.left < trackRect.left + 20) {
        activeItem.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }

    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(updateNavProgress);
      ticking = true;
    }
  });

  // Initial call
  updateNavProgress();
})();
