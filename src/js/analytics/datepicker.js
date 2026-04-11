/* === src/js/analytics/datepicker.js — Custom date picker matching project theme === */

var MONTHS_AR = [
  'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
  'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'
];
var DAYS_AR = ['إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت', 'أحد'];

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

  function formatNumeric(d) {
    return pad(d.d) + '/' + pad(d.m + 1) + '/' + d.y;
  }

  function isValidDate(y, m, d) {
    var dt = new Date(y, m, d);
    return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
  }

  function clampToRange(y, m, d) {
    var dt = new Date(y, m, d);
    var mn = new Date(minD.y, minD.m, minD.d);
    var mx = new Date(maxD.y, maxD.m, maxD.d);
    if (dt < mn) return { y: minD.y, m: minD.m, d: minD.d };
    if (dt > mx) return { y: maxD.y, m: maxD.m, d: maxD.d };
    return { y: y, m: m, d: d };
  }

  function isInRange(y, m, d) {
    var dt = new Date(y, m, d);
    var mn = new Date(minD.y, minD.m, minD.d);
    var mx = new Date(maxD.y, maxD.m, maxD.d);
    return dt >= mn && dt <= mx;
  }

  function selectDate(y, m, d) {
    current = { y: y, m: m, d: d };
    viewYear = y;
    viewMonth = m;
    trigger.textContent = formatDisplay(current);
    if (opts.onChange) opts.onChange(toStr(y, m, d));
    close();
  }

  function applyManualInput(val) {
    var parts = val.trim().split('/');
    if (parts.length === 3) {
      var d = parseInt(parts[0], 10);
      var m = parseInt(parts[1], 10) - 1;
      var y = parseInt(parts[2], 10);
      if (isValidDate(y, m, d)) {
        var clamped = clampToRange(y, m, d);
        current = clamped;
        viewYear = clamped.y;
        viewMonth = clamped.m;
        trigger.textContent = formatDisplay(current);
        if (opts.onChange) opts.onChange(toStr(clamped.y, clamped.m, clamped.d));
        render(); // refresh calendar to show new selection
        return true;
      }
    }
    return false;
  }

  function open() {
    if (popup) popup.remove();

    popup = document.createElement('div');
    popup.className = 'dp-popup';
    popup.addEventListener('click', function(e) { e.stopPropagation(); });

    render();
    document.body.appendChild(popup);

    var rect = trigger.getBoundingClientRect();
    var popW = popup.offsetWidth;
    var popH = popup.offsetHeight;
    var winW = window.innerWidth;
    var winH = window.innerHeight;

    var top = rect.bottom + 6;
    if (top + popH > winH - 10) top = rect.top - popH - 6;
    if (top < 10) top = 10;

    var left = rect.left;
    if (left + popW > winW - 10) left = winW - popW - 10;
    if (left < 10) left = 10;

    popup.style.top = top + 'px';
    popup.style.left = left + 'px';
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

    // ── Manual input row ──
    var inputRow = document.createElement('div');
    inputRow.className = 'dp-input-row';

    var inputField = document.createElement('input');
    inputField.className = 'dp-manual-input';
    inputField.type = 'text';
    inputField.placeholder = 'DD/MM/YYYY';
    inputField.value = formatNumeric(current);
    inputField.maxLength = 10;

    inputField.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        if (!applyManualInput(inputField.value)) {
          inputField.classList.add('dp-input-error');
          setTimeout(function() { inputField.classList.remove('dp-input-error'); }, 600);
        }
      }
    });

    // Also apply on blur (when user clicks away from input but stays in popup)
    inputField.addEventListener('blur', function() {
      var val = inputField.value.trim();
      if (val && val !== formatNumeric(current)) {
        applyManualInput(val);
      }
    });

    inputRow.appendChild(inputField);
    popup.appendChild(inputRow);

    // ── Numeric date display ──
    var numericDisplay = document.createElement('div');
    numericDisplay.className = 'dp-numeric';
    numericDisplay.textContent = formatNumeric(current);
    popup.appendChild(numericDisplay);

    // ── Header: month/year nav ──
    var header = document.createElement('div');
    header.className = 'dp-header';

    var prevBtn = document.createElement('button');
    prevBtn.className = 'dp-nav';
    prevBtn.textContent = '\u2039';
    prevBtn.onclick = function() {
      viewMonth--;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      render();
    };

    var nextBtn = document.createElement('button');
    nextBtn.className = 'dp-nav';
    nextBtn.textContent = '\u203A';
    nextBtn.onclick = function() {
      viewMonth++;
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      render();
    };

    var title = document.createElement('div');
    title.className = 'dp-title';
    title.textContent = MONTHS_AR[viewMonth] + ' ' + viewYear;

    header.appendChild(prevBtn);
    header.appendChild(title);
    header.appendChild(nextBtn);
    popup.appendChild(header);

    // ── Day-of-week headers ──
    var dowRow = document.createElement('div');
    dowRow.className = 'dp-dow';
    DAYS_AR.forEach(function(d) {
      var cell = document.createElement('div');
      cell.textContent = d;
      dowRow.appendChild(cell);
    });
    popup.appendChild(dowRow);

    // ── Calendar grid ──
    var grid = document.createElement('div');
    grid.className = 'dp-grid';

    var firstDay = new Date(viewYear, viewMonth, 1).getDay();
    var startOffset = (firstDay + 6) % 7;
    var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    for (var e = 0; e < startOffset; e++) {
      var empty = document.createElement('div');
      empty.className = 'dp-cell dp-empty';
      grid.appendChild(empty);
    }

    var now = new Date();
    for (var day = 1; day <= daysInMonth; day++) {
      var cell = document.createElement('div');
      cell.className = 'dp-cell';

      var dateObj = new Date(viewYear, viewMonth, day);
      var minDate = new Date(minD.y, minD.m, minD.d);
      var maxDate = new Date(maxD.y, maxD.m, maxD.d);

      var isDisabled = dateObj < minDate || dateObj > maxDate;
      var isSelected = (viewYear === current.y && viewMonth === current.m && day === current.d);
      var isToday = (viewYear === now.getFullYear() && viewMonth === now.getMonth() && day === now.getDate());

      if (isSelected) cell.classList.add('dp-selected');
      if (isToday) cell.classList.add('dp-today');
      if (isDisabled) cell.classList.add('dp-disabled');

      cell.textContent = day;

      if (!isDisabled) {
        (function(dy) {
          cell.addEventListener('click', function() {
            selectDate(viewYear, viewMonth, dy);
          });
        })(day);
      }

      grid.appendChild(cell);
    }

    popup.appendChild(grid);

    // ── Footer: Today button ──
    var footer = document.createElement('div');
    footer.className = 'dp-footer';

    var todayBtn = document.createElement('button');
    todayBtn.className = 'dp-today-btn';
    todayBtn.textContent = '\u0627\u0644\u064A\u0648\u0645';

    todayBtn.onclick = function() {
      var ty = now.getFullYear();
      var tm = now.getMonth();
      var td = now.getDate();
      // Clamp to range — if today is past max, jump to max
      var clamped = clampToRange(ty, tm, td);
      selectDate(clamped.y, clamped.m, clamped.d);
    };

    footer.appendChild(todayBtn);
    popup.appendChild(footer);
  }
}
