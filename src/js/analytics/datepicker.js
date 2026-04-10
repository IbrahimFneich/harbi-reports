/* === src/js/analytics/datepicker.js — Custom date picker matching project theme === */

var MONTHS_AR = [
  'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
  'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'
];
var DAYS_AR = ['إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت', 'أحد'];

/**
 * Create a custom date picker attached to a trigger element.
 * @param {object} opts
 * @param {string} opts.triggerId — ID of the clickable element
 * @param {string} opts.value — initial YYYY-MM-DD
 * @param {string} opts.min — min date YYYY-MM-DD
 * @param {string} opts.max — max date YYYY-MM-DD
 * @param {function} opts.onChange — called with YYYY-MM-DD on selection
 */
export function createDatePicker(opts) {
  var trigger = document.getElementById(opts.triggerId);
  if (!trigger) return;

  var current = parseDate(opts.value);
  var viewYear = current.y;
  var viewMonth = current.m;
  var minD = parseDate(opts.min);
  var maxD = parseDate(opts.max);

  var popup = null;
  var isOpen = false;

  // Set initial display
  trigger.textContent = formatDisplay(current);

  trigger.addEventListener('click', function(e) {
    e.stopPropagation();
    if (isOpen) { close(); return; }
    open();
  });

  function parseDate(s) {
    if (!s) return { y: 2023, m: 0, d: 1 };
    var p = s.split('-');
    return { y: parseInt(p[0]), m: parseInt(p[1]) - 1, d: parseInt(p[2]) };
  }

  function toStr(y, m, d) {
    return y + '-' + pad(m + 1) + '-' + pad(d);
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function formatDisplay(d) {
    return d.d + ' ' + MONTHS_AR[d.m] + ' ' + d.y;
  }

  function open() {
    if (popup) popup.remove();

    popup = document.createElement('div');
    popup.className = 'dp-popup';

    var rect = trigger.getBoundingClientRect();
    popup.style.top = (rect.bottom + 6) + 'px';
    popup.style.left = rect.left + 'px';

    popup.addEventListener('click', function(e) { e.stopPropagation(); });

    render();
    document.body.appendChild(popup);
    isOpen = true;

    setTimeout(function() {
      document.addEventListener('click', outsideClick);
    }, 0);
  }

  function close() {
    if (popup) { popup.remove(); popup = null; }
    isOpen = false;
    document.removeEventListener('click', outsideClick);
  }

  function outsideClick() { close(); }

  function render() {
    if (!popup) return;
    popup.textContent = '';

    // Header: month/year nav
    var header = document.createElement('div');
    header.className = 'dp-header';

    var prevBtn = document.createElement('button');
    prevBtn.className = 'dp-nav';
    prevBtn.textContent = '→';
    prevBtn.onclick = function() {
      viewMonth--;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      render();
    };

    var nextBtn = document.createElement('button');
    nextBtn.className = 'dp-nav';
    nextBtn.textContent = '←';
    nextBtn.onclick = function() {
      viewMonth++;
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      render();
    };

    var title = document.createElement('div');
    title.className = 'dp-title';
    title.textContent = MONTHS_AR[viewMonth] + ' ' + viewYear;

    header.appendChild(nextBtn);
    header.appendChild(title);
    header.appendChild(prevBtn);
    popup.appendChild(header);

    // Day-of-week headers
    var dowRow = document.createElement('div');
    dowRow.className = 'dp-dow';
    DAYS_AR.forEach(function(d) {
      var cell = document.createElement('div');
      cell.textContent = d;
      dowRow.appendChild(cell);
    });
    popup.appendChild(dowRow);

    // Calendar grid
    var grid = document.createElement('div');
    grid.className = 'dp-grid';

    var firstDay = new Date(viewYear, viewMonth, 1).getDay();
    // Convert to Monday-first: Mon=0 ... Sun=6
    var startOffset = (firstDay + 6) % 7;
    var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    // Empty cells
    for (var e = 0; e < startOffset; e++) {
      var empty = document.createElement('div');
      empty.className = 'dp-cell dp-empty';
      grid.appendChild(empty);
    }

    // Day cells
    for (var day = 1; day <= daysInMonth; day++) {
      var cell = document.createElement('div');
      cell.className = 'dp-cell';

      var dateVal = toStr(viewYear, viewMonth, day);
      var dateObj = new Date(viewYear, viewMonth, day);
      var minDate = new Date(minD.y, minD.m, minD.d);
      var maxDate = new Date(maxD.y, maxD.m, maxD.d);

      var isDisabled = dateObj < minDate || dateObj > maxDate;
      var isSelected = (viewYear === current.y && viewMonth === current.m && day === current.d);
      var isToday = false;
      var now = new Date();
      if (viewYear === now.getFullYear() && viewMonth === now.getMonth() && day === now.getDate()) {
        isToday = true;
      }

      if (isSelected) cell.classList.add('dp-selected');
      if (isToday) cell.classList.add('dp-today');
      if (isDisabled) cell.classList.add('dp-disabled');

      cell.textContent = day;

      if (!isDisabled) {
        (function(dv, dy) {
          cell.addEventListener('click', function() {
            current = { y: viewYear, m: viewMonth, d: dy };
            trigger.textContent = formatDisplay(current);
            if (opts.onChange) opts.onChange(dv);
            close();
          });
        })(dateVal, day);
      }

      grid.appendChild(cell);
    }

    popup.appendChild(grid);
  }
}
