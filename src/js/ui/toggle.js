/* === src/js/ui/toggle.js === */

export function toggleText(btn) {
  var ft = btn.nextElementSibling;
  ft.classList.toggle('show');
  btn.classList.toggle('open');
  btn.textContent = ft.classList.contains('show') ? '\u0625\u062E\u0641\u0627\u0621 \u0627\u0644\u0646\u0635 \u25B2' : '\u0627\u0644\u0646\u0635 \u0627\u0644\u0643\u0627\u0645\u0644 \u25BC';
}

export function addToggle(card, text) {
  if (!text) return;
  var target = card.querySelector('.tl-body') || card;
  var btn = document.createElement('span');
  btn.className = 'txt-toggle';
  btn.textContent = '\u0627\u0644\u0646\u0635 \u0627\u0644\u0643\u0627\u0645\u0644 \u25BC';
  btn.onclick = function() { toggleText(this); };
  var div = document.createElement('div');
  div.className = 'txt-full';
  div.textContent = text;
  target.appendChild(btn);
  target.appendChild(div);
}
