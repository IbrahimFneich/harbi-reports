/* === src/js/ui/nav.js === */

export var ALL_REPORTS = ['2023-10-07','2023-10-08','2023-10-09','2023-10-10','2023-10-11','2023-10-12','2023-10-13','2023-10-14','2026-02-28','2026-03-01','2026-03-02','2026-03-03','2026-03-04','2026-03-05','2026-03-06','2026-03-07','2026-03-08','2026-03-09','2026-03-10','2026-03-11','2026-03-12','2026-03-13','2026-03-14','2026-03-15','2026-03-16','2026-03-17','2026-03-18','2026-03-19','2026-03-20','2026-03-21','2026-03-22','2026-03-23','2026-03-24','2026-03-25','2026-03-26','2026-03-27','2026-03-28','2026-03-29','2026-03-30','2026-03-31','2026-04-01','2026-04-02','2026-04-03','2026-04-04','2026-04-05','2026-04-06','2026-04-07','2026-04-08','2026-04-09','2026-04-10'];

export var arabicMonthNames = {1:'\u0643\u0627\u0646\u0648\u0646 \u0627\u0644\u062B\u0627\u0646\u064A',2:'\u0634\u0628\u0627\u0637',3:'\u0622\u0630\u0627\u0631',4:'\u0646\u064A\u0633\u0627\u0646',5:'\u0623\u064A\u0627\u0631',6:'\u062D\u0632\u064A\u0631\u0627\u0646',7:'\u062A\u0645\u0648\u0632',8:'\u0622\u0628',9:'\u0623\u064A\u0644\u0648\u0644',10:'\u062A\u0634\u0631\u064A\u0646 \u0627\u0644\u0623\u0648\u0644',11:'\u062A\u0634\u0631\u064A\u0646 \u0627\u0644\u062B\u0627\u0646\u064A',12:'\u0643\u0627\u0646\u0648\u0646 \u0627\u0644\u0623\u0648\u0644'};

export var arabicDayNames = {0:'\u0627\u0644\u0623\u062D\u062F',1:'\u0627\u0644\u0625\u062B\u0646\u064A\u0646',2:'\u0627\u0644\u062B\u0644\u0627\u062B\u0627\u0621',3:'\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621',4:'\u0627\u0644\u062E\u0645\u064A\u0633',5:'\u0627\u0644\u062C\u0645\u0639\u0629',6:'\u0627\u0644\u0633\u0628\u062A'};

export function getCurrentReportDate() {
  var match = window.location.pathname.match(/report-(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  var params = new URLSearchParams(window.location.search);
  var dateParam = params.get('date');
  if (dateParam && dateParam.match(/^\d{4}-\d{2}-\d{2}$/)) return dateParam;
  return null;
}

export function reportUrl(date) {
  if (window.location.pathname.indexOf('report.html') !== -1) {
    return 'report.html?date=' + date;
  }
  return 'report-' + date + '.html';
}

export function formatDateAr(dateStr) {
  var p = dateStr.split('-');
  var d = parseInt(p[2]);
  var m = parseInt(p[1]);
  return d + ' ' + (arabicMonthNames[m] || '');
}

export function initNav() {
  var currentDate = getCurrentReportDate();
  if (!currentDate) return;

  var idx = ALL_REPORTS.indexOf(currentDate);
  if (idx === -1) return;

  var nav = document.createElement('div');
  nav.className = 'day-nav';
  nav.style.direction = 'ltr';

  var prevBtn = document.createElement('a');
  prevBtn.className = 'day-nav-btn' + (idx === 0 ? ' disabled' : '');
  if (idx > 0) {
    prevBtn.href = reportUrl(ALL_REPORTS[idx - 1]);
    prevBtn.textContent = '\u2190 ' + formatDateAr(ALL_REPORTS[idx - 1]);
  } else {
    prevBtn.textContent = '\u2190 \u0627\u0644\u0633\u0627\u0628\u0642';
  }

  var center = document.createElement('span');
  center.className = 'day-nav-current';
  var dt = new Date(parseInt(currentDate.split('-')[0]), parseInt(currentDate.split('-')[1]) - 1, parseInt(currentDate.split('-')[2]));
  center.textContent = arabicDayNames[dt.getDay()];

  var nextBtn = document.createElement('a');
  nextBtn.className = 'day-nav-btn' + (idx === ALL_REPORTS.length - 1 ? ' disabled' : '');
  if (idx < ALL_REPORTS.length - 1) {
    nextBtn.href = reportUrl(ALL_REPORTS[idx + 1]);
    nextBtn.textContent = formatDateAr(ALL_REPORTS[idx + 1]) + ' \u2192';
  } else {
    nextBtn.textContent = '\u0627\u0644\u062A\u0627\u0644\u064A \u2192';
  }

  nav.appendChild(prevBtn);
  nav.appendChild(center);
  nav.appendChild(nextBtn);

  // Insert after hero or header
  var hero = document.querySelector('.day-hero');
  var ref = hero || document.querySelector('.header');
  if (ref) ref.parentNode.insertBefore(nav, ref.nextSibling);
}
