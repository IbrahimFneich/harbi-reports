// src/js/export/pdf-button.js
// Injects a single "تحميل PDF" button and wires it to window.print().
// Preloads Leaflet tiles (if a map is present) so print preview has them cached.

const SVG_NS = 'http://www.w3.org/2000/svg';

function makeDownloadIcon() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  const tray = document.createElementNS(SVG_NS, 'path');
  tray.setAttribute('d', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4');
  svg.appendChild(tray);

  const chevron = document.createElementNS(SVG_NS, 'polyline');
  chevron.setAttribute('points', '7 10 12 15 17 10');
  svg.appendChild(chevron);

  const shaft = document.createElementNS(SVG_NS, 'line');
  shaft.setAttribute('x1', '12');
  shaft.setAttribute('y1', '15');
  shaft.setAttribute('x2', '12');
  shaft.setAttribute('y2', '3');
  svg.appendChild(shaft);

  return svg;
}

function createButton(label) {
  const btn = document.createElement('button');
  btn.className = 'download-btn download-btn-pdf';
  btn.type = 'button';
  btn.setAttribute('aria-label', label);
  btn.appendChild(makeDownloadIcon());
  const span = document.createElement('span');
  span.textContent = label;
  btn.appendChild(span);
  return btn;
}

async function preloadLeafletTiles() {
  const maps = document.querySelectorAll('.leaflet-container');
  if (!maps.length) return;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

export async function mountPdfButton(targetSelector, { label = 'تحميل PDF' } = {}) {
  const host = document.querySelector(targetSelector);
  if (!host) {
    console.warn('[pdf-button] target not found:', targetSelector);
    return null;
  }
  const btn = createButton(label);
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      await preloadLeafletTiles();
      window.print();
    } finally {
      btn.disabled = false;
    }
  });
  host.appendChild(btn);
  return btn;
}
