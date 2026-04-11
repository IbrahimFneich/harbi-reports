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

  // Category toggles
  var catBtns = document.querySelectorAll('.a-ctrl[data-cat]');
  catBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var cat = btn.getAttribute('data-cat');
      var idx = _state.categories.indexOf(cat);
      if (idx >= 0) {
        _state.categories.splice(idx, 1);
        btn.classList.remove('on');
      } else {
        _state.categories.push(cat);
        btn.classList.add('on');
      }
      if (_onChange) _onChange(getState());
    });
  });

  // Grouping toggles
  var grpBtns = document.querySelectorAll('.a-ctrl[data-group]');
  grpBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      _state.grouping = btn.getAttribute('data-group');
      grpBtns.forEach(function(b) { b.classList.remove('on'); });
      btn.classList.add('on');
      if (_onChange) _onChange(getState());
    });
  });
}
