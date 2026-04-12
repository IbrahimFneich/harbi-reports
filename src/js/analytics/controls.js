/* === src/js/analytics/controls.js — Filter and grouping state === */

import { createDatePicker } from './datepicker.js';

var _state = {
  dateStart: '',
  dateEnd: '',
  categories: ['bayanat', 'sirens', 'enemy', 'iran', 'videos', 'allies'],
  grouping: 'daily'
};

var _onChange = null;

export function getState() {
  return {
    dateStart: _state.dateStart,
    dateEnd: _state.dateEnd,
    categories: _state.categories.slice(),
    grouping: _state.grouping
  };
}

/**
 * Build SQL WHERE clause + params from current state.
 */
export function buildWhere() {
  var clauses = [];
  var params = [];

  if (_state.dateStart) {
    clauses.push('date >= ?');
    params.push(_state.dateStart);
  }
  if (_state.dateEnd) {
    clauses.push('date <= ?');
    params.push(_state.dateEnd);
  }

  if (_state.categories.length > 0 && _state.categories.length < 6) {
    var placeholders = _state.categories.map(function() { return '?'; }).join(',');
    clauses.push('category IN (' + placeholders + ')');
    _state.categories.forEach(function(c) { params.push(c); });
  }

  var where = clauses.length > 0 ? 'WHERE ' + clauses.join(' AND ') : '';
  return { where: where, params: params };
}

/**
 * Get the strftime format for current grouping.
 */
export function getGroupFormat() {
  if (_state.grouping === 'daily') return '%Y-%m-%d';
  if (_state.grouping === 'weekly') return '%Y-W%W';
  return '%Y-%m';
}

/**
 * Initialize controls — bind DOM event handlers.
 */
export function initControls(onChange, dateRange) {
  _onChange = onChange;

  // start/end = initial selection; min/max = picker navigation bounds
  var pickerMin = dateRange.min || dateRange.start;
  var pickerMax = dateRange.max || dateRange.end;

  _state.dateStart = dateRange.start;
  _state.dateEnd = dateRange.end;

  // Custom date pickers
  createDatePicker({
    triggerId: 'dateFrom',
    value: dateRange.start,
    min: pickerMin,
    max: pickerMax,
    onChange: function(val) {
      _state.dateStart = val;
      if (_onChange) _onChange(getState());
    }
  });

  createDatePicker({
    triggerId: 'dateTo',
    value: dateRange.end,
    min: pickerMin,
    max: pickerMax,
    onChange: function(val) {
      _state.dateEnd = val;
      if (_onChange) _onChange(getState());
    }
  });

  // Category filter drawer
  initDrawer();

  // Grouping segmented control
  initSegmentedGroup();
}

/**
 * Wire the category filter drawer: checkbox toggles, open/close behavior,
 * badge counter, partial-state highlight, outside-click and Escape to close.
 */
function initDrawer() {
  var btn = document.getElementById('aDrawerBtn');
  var panel = document.getElementById('aDrawerPanel');
  var badge = document.getElementById('aDrawerBadge');
  if (!btn || !panel || !badge) return;

  var boxes = panel.querySelectorAll('input[type=checkbox][data-cat]');
  var total = boxes.length;

  function syncBadge() {
    var on = 0;
    boxes.forEach(function(b) { if (b.checked) on++; });
    badge.textContent = on + '/' + total;
    btn.classList.toggle('partial', on > 0 && on < total);
  }

  boxes.forEach(function(box) {
    box.addEventListener('change', function() {
      var cat = box.getAttribute('data-cat');
      var idx = _state.categories.indexOf(cat);
      if (box.checked && idx < 0) _state.categories.push(cat);
      if (!box.checked && idx >= 0) _state.categories.splice(idx, 1);
      syncBadge();
      if (_onChange) _onChange(getState());
    });
  });

  function openDrawer() {
    btn.classList.add('open');
    panel.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
  function closeDrawer() {
    btn.classList.remove('open');
    panel.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (btn.classList.contains('open')) closeDrawer();
    else openDrawer();
  });

  document.addEventListener('click', function(e) {
    if (!panel.contains(e.target) && !btn.contains(e.target)) closeDrawer();
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && btn.classList.contains('open')) closeDrawer();
  });

  syncBadge();
}

/**
 * Wire the grouping segmented control: button clicks + RTL-aware sliding thumb.
 */
function initSegmentedGroup() {
  var seg = document.getElementById('aGroupSeg');
  if (!seg) return;
  var thumb = seg.querySelector('.a-seg-thumb');
  var buttons = seg.querySelectorAll('button[data-group]');

  function placeThumb(active) {
    if (!thumb || !active) return;
    var segRect = seg.getBoundingClientRect();
    var btnRect = active.getBoundingClientRect();
    var rightOffset = segRect.right - btnRect.right;
    thumb.style.right = rightOffset + 'px';
    thumb.style.width = btnRect.width + 'px';
  }

  function activate(btn) {
    buttons.forEach(function(b) {
      b.classList.remove('on');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('on');
    btn.setAttribute('aria-selected', 'true');
    placeThumb(btn);
    _state.grouping = btn.getAttribute('data-group');
    if (_onChange) _onChange(getState());
  }

  buttons.forEach(function(btn) {
    btn.addEventListener('click', function() { activate(btn); });
  });

  // Initial placement — wait a frame so fonts/layout settle
  requestAnimationFrame(function() {
    var active = seg.querySelector('button.on') || buttons[0];
    placeThumb(active);
  });
  window.addEventListener('resize', function() {
    var active = seg.querySelector('button.on');
    if (active) placeThumb(active);
  });
}
