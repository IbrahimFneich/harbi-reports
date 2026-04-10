/* === src/js/maps/tiles.js === */

export var DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
export var LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
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
    entry.map.removeLayer(entry.layer);
    entry.layer = L.tileLayer(url, {maxZoom: 15}).addTo(entry.map);
  });
}
