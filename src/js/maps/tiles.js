/* === src/js/maps/tiles.js === */

export var DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
export var LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
export var SAT_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
var _allMapLayers = []; // track all tile layers for theme swap

export function getMapTileUrl() {
  return document.body.classList.contains('light') ? LIGHT_TILES : DARK_TILES;
}

export function addTrackedTileLayer(map) {
  var layer = L.tileLayer(getMapTileUrl(), {maxZoom: 15}).addTo(map);
  _allMapLayers.push({map: map, layer: layer});
  return layer;
}

export function swapAllMapTiles() {
  var url = getMapTileUrl();
  _allMapLayers.forEach(function(entry) {
    if (entry.map._satMode) return; // keep satellite mode across theme swaps
    entry.map.removeLayer(entry.layer);
    entry.layer = L.tileLayer(url, {maxZoom: 15}).addTo(entry.map);
  });
}

// Swap the map's base tile layer between street and satellite.
// Returns the new mode (true = satellite).
export function toggleSatellite(map) {
  var isSat = !map._satMode;
  map.eachLayer(function(l) {
    if (l instanceof L.TileLayer) map.removeLayer(l);
  });
  var url = isSat ? SAT_TILES : getMapTileUrl();
  var newLayer = L.tileLayer(url, { maxZoom: isSat ? 18 : 15 }).addTo(map);
  // Keep tracked-layer registry in sync so theme swaps target the right layer.
  _allMapLayers.forEach(function(entry) {
    if (entry.map === map) entry.layer = newLayer;
  });
  map._satMode = isSat;
  return isSat;
}
