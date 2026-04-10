/* === src/js/maps/fullscreen.js === */

export function addFullscreenBtn(mapDiv, mapInstance) {
  if (!mapDiv) return;

  // Make map container position:relative so button positions correctly
  mapDiv.style.position = 'relative';

  var btn = document.createElement('button');
  btn.className = 'map-fs-btn';
  btn.textContent = '\u26F6';

  // Append button INSIDE the map div so it stays on top of tiles
  mapDiv.appendChild(btn);

  var isFS = false;
  var savedStyle = {
    position: mapDiv.style.position,
    top: mapDiv.style.top,
    left: mapDiv.style.left,
    width: mapDiv.style.width,
    height: mapDiv.style.height,
    zIndex: mapDiv.style.zIndex,
    borderRadius: mapDiv.style.borderRadius,
    margin: mapDiv.style.margin,
    border: mapDiv.style.border
  };

  function enterFS() {
    isFS = true;
    mapDiv.style.position = 'fixed';
    mapDiv.style.top = '0';
    mapDiv.style.left = '0';
    mapDiv.style.width = '100vw';
    mapDiv.style.height = '100vh';
    mapDiv.style.zIndex = '9999';
    mapDiv.style.borderRadius = '0';
    mapDiv.style.margin = '0';
    mapDiv.style.border = 'none';
    btn.textContent = '\u2716';
    btn.classList.add('fs-active');
    document.body.style.overflow = 'hidden';
    if (mapInstance) setTimeout(function() { mapInstance.invalidateSize(); }, 150);
  }

  function exitFS() {
    isFS = false;
    mapDiv.style.position = savedStyle.position || 'relative';
    mapDiv.style.top = savedStyle.top || '';
    mapDiv.style.left = savedStyle.left || '';
    mapDiv.style.width = savedStyle.width || '';
    mapDiv.style.height = savedStyle.height || '';
    mapDiv.style.zIndex = savedStyle.zIndex || '';
    mapDiv.style.borderRadius = savedStyle.borderRadius || '';
    mapDiv.style.margin = savedStyle.margin || '';
    mapDiv.style.border = savedStyle.border || '';
    btn.textContent = '\u26F6';
    btn.classList.remove('fs-active');
    document.body.style.overflow = '';
    if (mapInstance) setTimeout(function() { mapInstance.invalidateSize(); }, 150);
  }

  btn.onclick = function(e) {
    e.stopPropagation();
    if (isFS) exitFS(); else enterFS();
  };

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isFS) exitFS();
  });
}
