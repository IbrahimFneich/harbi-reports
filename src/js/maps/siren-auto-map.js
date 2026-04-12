/* === src/js/maps/siren-auto-map.js === */

import { addFullscreenBtn } from './fullscreen.js';
import { addSatelliteBtn } from './satellite-toggle.js';
import { onTabSwitch } from '../ui/tabs.js';

export function initAutoSirenMap() {
  if (typeof L === 'undefined') return; // Leaflet not loaded
  var sirensTab = document.getElementById('sirens');
  if (!sirensTab) return;
  var container = sirensTab.querySelector('.container');
  if (!container) return;
  var rows = container.querySelectorAll('.siren-row');
  if (rows.length === 0) return;

  // Skip if map already exists (e.g. Apr 1 has manual map)
  if (document.getElementById('sirenMap') || document.getElementById('autoSirenMap')) return;

  // Known city coordinates
  var cityCoords = {
    '\u062A\u0644 \u0623\u0628\u064A\u0628':[32.0853,34.7818], '\u0643\u0631\u064A\u0627\u062A \u0634\u0645\u0648\u0646\u0647':[33.2081,35.5731], '\u0643\u0631\u064A\u0627\u062A \u0634\u0645\u0648\u0646\u0629':[33.2081,35.5731],
    '\u0646\u0647\u0627\u0631\u064A\u0627':[33.0042,35.0968], '\u0627\u0644\u0645\u0637\u0644\u0629':[33.2784,35.5785], '\u0623\u0633\u062F\u0648\u062F':[31.8040,34.6500],
    '\u062D\u064A\u0641\u0627':[32.7940,34.9896], '\u0635\u0641\u062F':[32.9646,35.4962], '\u0637\u0628\u0631\u064A\u0627':[32.6996,35.3035],
    '\u0627\u0644\u0646\u0627\u0635\u0631\u0629':[32.6996,35.2977], '\u0639\u0643\u0627':[32.9226,35.0687], '\u0627\u0644\u0642\u062F\u0633':[31.7683,35.2137],
    '\u0628\u0626\u0631 \u0627\u0644\u0633\u0628\u0639':[31.2518,34.7913], '\u062F\u064A\u0645\u0648\u0646\u0627':[31.0700,35.0332], '\u0625\u064A\u0644\u0627\u062A':[29.5577,34.9519],
    '\u0645\u0631\u062C\u0644\u064A\u0648\u062A':[33.2260,35.6233], '\u0645\u0633\u0643\u0627\u0641 \u0639\u0627\u0645':[33.2060,35.5750], '\u0645\u0633\u0643\u0627\u0641\u0639\u0627\u0645':[33.2060,35.5750],
    '\u064A\u0641\u062A\u0627\u062D':[33.1310,35.5150], '\u0631\u0627\u0645\u0648\u062A \u0646\u0641\u062A\u0627\u0644\u064A':[33.1340,35.5540], '\u0627\u0644\u0645\u0646\u0627\u0631\u0629':[33.1720,35.5820],
    '\u064A\u0631\u0624\u0648\u0646':[33.0876,35.1475], '\u0623\u0641\u064A\u0641\u064A\u0645':[33.0823,35.4217], '\u0634\u0644\u0648\u0645\u064A':[33.0772,35.1416],
    '\u062D\u0627\u0646\u064A\u062A\u0627':[33.0878,35.1564], '\u0645\u0631\u063A\u0644\u064A\u0648\u062A':[33.2260,35.6233], '\u0627\u0644\u062C\u0648\u0644\u0627\u0646':[32.9500,35.7500],
    '\u0625\u0635\u0628\u0639 \u0627\u0644\u062C\u0644\u064A\u0644':[33.2100,35.5900], '\u0627\u0644\u062C\u0644\u064A\u0644 \u0627\u0644\u063A\u0631\u0628\u064A':[33.0580,35.1005],
    '\u0627\u0644\u062C\u0644\u064A\u0644 \u0627\u0644\u0623\u0639\u0644\u0649':[33.0500,35.4500], '\u0643\u0641\u0627\u0631 \u062C\u0644\u0639\u0627\u062F\u064A':[33.2400,35.5800],
    '\u0643\u0641\u0627\u0631 \u064A\u0648\u0641\u0627\u0644':[33.2350,35.6350], '\u062F\u0627\u0646':[33.2390,35.6450],
    '\u0646\u062A\u0627\u0646\u064A\u0627':[32.3215,34.8532], '\u0628\u062A\u0627\u062D \u062A\u0643\u0641\u0627':[32.0841,34.8878],
    '\u0627\u0644\u0644\u062F':[31.9515,34.8953], '\u062D\u0648\u0644\u0648\u0646':[32.0117,34.7748],
    '\u0643\u062A\u0633\u0631\u064A\u0646':[32.9925,35.6910], '\u0628\u0646\u064A \u0628\u0631\u0627\u0643':[32.0833,34.8333],
    '\u0631\u0627\u0645\u0627\u062A \u063A\u0627\u0646':[32.0686,34.8244], '\u0631\u064A\u0634\u0648\u0646 \u0644\u062A\u0633\u064A\u0648\u0646':[31.9642,34.8045],
    '\u0639\u0631\u0627\u062F':[31.2611,35.2126], '\u0643\u0631\u064A\u0627\u062A \u063A\u0627\u062A':[31.6100,34.7642],
    '\u0623\u0648\u0641\u0627\u0643\u064A\u0645':[31.3167,34.6167], '\u0631\u0648\u0634 \u0628\u064A\u0646\u0627':[32.9691,35.5411],
    '\u0645\u0639\u0627\u0644\u0648\u062A \u062A\u0631\u0634\u064A\u062D\u0627':[33.0167,35.2728]
  };

  // Analyze siren locations and aggregate by city
  var cityData = {};
  rows.forEach(function(row) {
    var timeEl = row.querySelector('.s-time');
    var locEl = row.querySelector('.s-loc');
    if (!timeEl || !locEl) return;
    var time = timeEl.textContent.trim();
    var loc = locEl.textContent;

    var keys = Object.keys(cityCoords);
    for (var i = 0; i < keys.length; i++) {
      if (loc.indexOf(keys[i]) !== -1) {
        if (!cityData[keys[i]]) {
          cityData[keys[i]] = {lat: cityCoords[keys[i]][0], lng: cityCoords[keys[i]][1], times: [], count: 0};
        }
        cityData[keys[i]].times.push(time);
        cityData[keys[i]].count++;
        break;
      }
    }
  });

  var cities = Object.keys(cityData);
  if (cities.length === 0) return;

  // Create map container
  var titleDiv = document.createElement('div');
  titleDiv.className = 'siren-map-title';
  titleDiv.textContent = '\u062E\u0631\u064A\u0637\u0629 \u0627\u0646\u062A\u0634\u0627\u0631 \u0635\u0641\u0627\u0631\u0627\u062A \u0627\u0644\u0625\u0646\u0630\u0627\u0631';

  var mapDiv = document.createElement('div');
  mapDiv.id = 'autoSirenMap';
  mapDiv.className = 'auto-siren-map';

  // Insert after the phase title
  var phase = container.querySelector('.phase');
  if (phase) {
    phase.parentNode.insertBefore(titleDiv, phase.nextSibling);
    titleDiv.parentNode.insertBefore(mapDiv, titleDiv.nextSibling);
  }

  // Init map when tab is shown
  var mapInited = false;

  onTabSwitch(function(id) {
    if (id === 'sirens' && !mapInited) initAutoMap();
  });

  function initAutoMap() {
    mapInited = true;
    var map = L.map('autoSirenMap', {
      center: [32.5, 35.0],
      zoom: 8,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 15
    }).addTo(map);

    cities.forEach(function(name) {
      var pt = cityData[name];
      var radius = 6 + Math.min(pt.count * 2, 14);
      var opacity = 0.5 + Math.min(pt.count * 0.06, 0.4);

      var marker = L.circleMarker([pt.lat, pt.lng], {
        radius: radius,
        fillColor: '#e74c3c',
        fillOpacity: opacity,
        color: '#e74c3c',
        weight: 2,
        className: 'siren-pulse'
      }).addTo(map);

      var popupContent = document.createElement('div');
      popupContent.style.cssText = 'text-align:right;direction:rtl;min-width:120px;';
      var titleEl = document.createElement('div');
      titleEl.style.cssText = 'font-weight:800;font-size:0.9rem;color:#e74c3c;margin-bottom:4px;';
      titleEl.textContent = name;
      popupContent.appendChild(titleEl);
      var countEl = document.createElement('div');
      countEl.style.cssText = 'font-size:0.72rem;color:#6b7d92;margin-bottom:6px;';
      countEl.textContent = pt.count + ' \u0635\u0641\u0627\u0631\u0629';
      popupContent.appendChild(countEl);
      pt.times.forEach(function(t) {
        var tDiv = document.createElement('div');
        tDiv.style.cssText = 'font-size:0.75rem;padding:2px 0;color:#e74c3c;font-weight:700;';
        tDiv.textContent = t;
        popupContent.appendChild(tDiv);
      });

      marker.bindPopup(popupContent, {closeButton: false, offset: [0, -5]});
      marker.on('mouseover', function() {
        this.openPopup();
        this.setStyle({fillOpacity: 1, weight: 3, radius: radius + 3});
        rows.forEach(function(row) {
          var loc = (row.querySelector('.s-loc') || {}).textContent || '';
          if (loc.indexOf(name) !== -1) row.classList.add('highlighted');
        });
      });
      marker.on('mouseout', function() {
        this.closePopup();
        this.setStyle({fillOpacity: opacity, weight: 2, radius: radius});
        rows.forEach(function(row) { row.classList.remove('highlighted'); });
      });
      marker.on('click', function() {
        rows.forEach(function(row) {
          var loc = (row.querySelector('.s-loc') || {}).textContent || '';
          if (loc.indexOf(name) !== -1) {
            row.scrollIntoView({behavior: 'smooth', block: 'center'});
            row.classList.add('highlighted');
            setTimeout(function() { row.classList.remove('highlighted'); }, 2000);
          }
        });
      });

      // Count badge for 3+
      if (pt.count >= 3) {
        var icon = L.divIcon({
          className: '',
          html: '<div style="background:rgba(231,76,60,0.85);color:#fff;font-size:0.6rem;font-weight:800;padding:1px 5px;border-radius:6px;font-family:sans-serif;white-space:nowrap;text-align:center;">' + pt.count + '</div>',
          iconSize: [20, 16],
          iconAnchor: [10, -8]
        });
        L.marker([pt.lat, pt.lng], {icon: icon, interactive: false}).addTo(map);
      }
    });

    setTimeout(function() { map.invalidateSize(); }, 200);
    addFullscreenBtn(document.getElementById('autoSirenMap'), map);
    addSatelliteBtn(document.getElementById('autoSirenMap'), map);
  }
}
