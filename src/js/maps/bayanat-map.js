/* === src/js/maps/bayanat-map.js === */

import { addTrackedTileLayer } from './tiles.js';
import { addFullscreenBtn } from './fullscreen.js';
import { barColors } from '../dashboards/helpers.js';
import { onTabSwitch } from '../ui/tabs.js';

export function initBayanatMap() {
  if (typeof L === 'undefined') return;
  var bayanatTab = document.getElementById('bayanat');
  if (!bayanatTab) return;
  var container = bayanatTab.querySelector('.container');
  if (!container) return;
  var cards = container.querySelectorAll('.bayan');
  if (cards.length < 3) return;
  if (container.querySelector('.auto-bayan-map')) return;

  var opCoords = {
    '\u0627\u0644\u0642\u0646\u0637\u0631\u0629':[33.25,35.82],'\u0639\u064A\u0646\u0627\u062A\u0627':[33.12,35.53],'\u0627\u0644\u0637\u064A\u0628\u0629':[33.11,35.56],
    '\u0627\u0644\u0628\u064A\u0651\u0627\u0636\u0629':[33.15,35.53],'\u0645\u0627\u0631\u0648\u0646 \u0627\u0644\u0631\u0627\u0633':[33.10,35.53],'\u0631\u0634\u0627\u0641':[33.09,35.52],
    '\u0628\u0646\u062A \u062C\u0628\u064A\u0644':[33.12,35.43],'\u0643\u0631\u064A\u0627\u062A \u0634\u0645\u0648\u0646\u0629':[33.21,35.57],'\u0646\u0647\u0627\u0631\u064A\u0627':[33.00,35.10],
    '\u0627\u0644\u0645\u0637\u0644\u0629':[33.28,35.58],'\u0645\u0633\u0643\u0627\u0641 \u0639\u0627\u0645':[33.21,35.58],'\u064A\u0631\u0624\u0648\u0646':[33.09,35.15],
    '\u0623\u0641\u064A\u0641\u064A\u0645':[33.08,35.42],'\u0634\u0644\u0648\u0645\u064A':[33.08,35.14],'\u062D\u0627\u0646\u064A\u062A\u0627':[33.09,35.16],
    '\u0645\u0631\u063A\u0644\u064A\u0648\u062A':[33.23,35.62],'\u0627\u0644\u062E\u064A\u0627\u0645':[33.23,35.59],'\u0627\u0644\u0645\u0627\u0644\u0643\u064A\u0629':[33.09,35.48],
    '\u062D\u0648\u0644\u0627\u062A\u0627':[33.01,35.61],'\u0627\u0644\u0642\u0648\u0632\u062D':[33.18,35.55],'\u062F\u064A\u0631 \u0633\u0631\u064A\u0627\u0646':[33.19,35.54],
    '\u0627\u0644\u0639\u062F\u064A\u0633\u0629':[33.18,35.57],'\u0635\u0641\u062F':[32.96,35.50],'\u0639\u0643\u0627':[32.92,35.07],
    '\u062D\u064A\u0641\u0627':[32.79,34.99],'\u0645\u0631\u0643\u0628\u0627':[33.17,35.58],'\u0633\u0639\u0633\u0639':[33.05,35.42],
    '\u0639\u064A\u062A\u0627 \u0627\u0644\u0634\u0639\u0628':[33.10,35.45],'\u0639\u064A\u062A\u0631\u0648\u0646':[33.13,35.50],'\u0643\u0641\u0627\u0631\u064A\u0648\u0641\u0627\u0644':[33.24,35.64],
    '\u0643\u0641\u0631\u062C\u0644\u0639\u0627\u062F\u064A':[33.24,35.58],'\u0634\u0648\u0645\u064A\u0631\u0627':[33.08,35.17],'\u0639\u0645\u064A\u0639\u0627\u062F':[32.92,35.51],
    '\u0645\u064A\u0631\u0648\u0646':[32.98,35.44],'\u0627\u0644\u0642\u0644\u0639\u0629':[33.35,35.60],'\u0631\u0628\u0651 \u062B\u0644\u0627\u062B\u064A\u0646':[33.15,35.47],
    '\u0643\u0627\u0628\u0631\u064A':[33.02,35.15],'\u062C\u0648\u064A\u0651\u0627':[33.33,35.39],'\u064A\u0627\u0631\u0648\u0646':[33.07,35.44],
    '\u0628\u0641\u0644\u0627\u064A':[33.31,35.38],'\u0645\u0639\u064A\u0627\u0646 \u0628\u0627\u0631\u0648\u062E':[33.24,35.60],
    'المنارة':[33.17,35.58],'المالكيّة':[33.09,35.48],'زرعيت':[33.09,35.22],
    'جل العلام':[33.10,35.49],'بركة ريشا':[33.30,35.83],'المرج':[33.28,35.60],
    'راميم':[33.06,35.43],'دوفيف':[33.10,35.52],'راميا':[33.07,35.47],
    'الراهب':[33.20,35.55],'برانيت':[33.10,35.51],'الضهيرة':[33.08,35.45],
    'المطلّة':[33.28,35.58],'هونين':[33.12,35.48],'بياض بليدا':[33.13,35.39],
    'قلعة هونين':[33.12,35.48],'ميتات':[33.09,35.51],'نهاريّا':[33.00,35.10],
    'بلدة دبل':[33.12,35.35],'العاصي':[33.15,35.55],'العباد':[33.11,35.46],
    'شتولا':[33.08,35.17],'شبعا':[33.40,35.77],'زبدين':[33.40,35.82],
    'رويسات العلم':[33.40,35.80],'الصدح':[33.06,35.42],'الجرداح':[33.08,35.44],
    'يفتاح':[33.13,35.52],'دبل':[33.12,35.35],'طلعة المحيبيب':[33.10,35.53],
    'كتسرين':[32.99,35.69],'الجولان':[32.99,35.69],'غورن':[33.06,35.47],
    'صلحا':[33.06,35.42],'نعيم':[33.09,35.51]
  };

  var typeColors = {
    'settlement': '#9b59b6',
    'tank': '#e67e22',
    'deep': '#3498db',
    'default': '#2ecc71'
  };

  var locData = {};
  cards.forEach(function(card) {
    var cls = card.className || '';
    var tt = (card.querySelector('.bayan-target') || {}).textContent || '';
    var type = 'default';
    if (cls.indexOf('tank') !== -1) type = 'tank';
    else if (cls.indexOf('settlement') !== -1) type = 'settlement';
    else if (cls.indexOf('deep') !== -1) type = 'deep';

    var keys = Object.keys(opCoords);
    for (var i = 0; i < keys.length; i++) {
      if (tt.indexOf(keys[i]) !== -1) {
        if (!locData[keys[i]]) locData[keys[i]] = {lat: opCoords[keys[i]][0], lng: opCoords[keys[i]][1], count: 0, types: []};
        locData[keys[i]].count++;
        if (locData[keys[i]].types.indexOf(type) === -1) locData[keys[i]].types.push(type);
        break;
      }
    }
  });

  var locs = Object.keys(locData).sort(function(a,b){ return locData[b].count - locData[a].count; });
  if (locs.length < 2) return;

  // Assign barColors by rank (same order as the dashboard chart)
  var locColorMap = {};
  locs.forEach(function(name, idx) { locColorMap[name] = barColors[idx % barColors.length]; });

  var titleDiv = document.createElement('div');
  titleDiv.className = 'siren-map-title';
  titleDiv.textContent = '\u062E\u0631\u064A\u0637\u0629 \u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A \u0627\u0644\u0639\u0633\u0643\u0631\u064A\u0629';

  var mapDiv = document.createElement('div');
  mapDiv.id = 'autoBayanMap';
  mapDiv.className = 'auto-bayan-map';

  // Insert in dashboard area
  var dash = container.querySelector('.auto-dashboard');
  var ref = dash || container.querySelector('.phase') || container.firstChild;
  container.insertBefore(titleDiv, ref);
  container.insertBefore(mapDiv, titleDiv.nextSibling);

  var mapInited = false;

  onTabSwitch(function(id) {
    if (id === 'bayanat' && !mapInited) initBayanMap();
  });

  // Also init if bayanat is already active
  if (bayanatTab.classList.contains('active')) setTimeout(initBayanMap, 300);

  function initBayanMap() {
    if (mapInited) return;
    mapInited = true;
    var map = L.map('autoBayanMap', {
      center: [33.1, 35.4], zoom: 10, zoomControl: true, attributionControl: false
    });
    addTrackedTileLayer(map);

    locs.forEach(function(name) {
      var pt = locData[name];
      var color = locColorMap[name] || '#2ecc71';
      var radius = 5 + Math.min(pt.count * 3, 16);

      var marker = L.circleMarker([pt.lat, pt.lng], {
        radius: radius, fillColor: color, fillOpacity: 0.6,
        color: color, weight: 2
      }).addTo(map);

      var popup = document.createElement('div');
      popup.style.cssText = 'text-align:right;direction:rtl;min-width:100px;';
      var pTitle = document.createElement('div');
      pTitle.style.cssText = 'font-weight:800;font-size:0.85rem;color:' + color + ';margin-bottom:3px;';
      pTitle.textContent = name;
      popup.appendChild(pTitle);
      var pCount = document.createElement('div');
      pCount.style.cssText = 'font-size:0.72rem;color:#6b7d92;';
      pCount.textContent = pt.count + ' \u0639\u0645\u0644\u064A\u0629';
      popup.appendChild(pCount);
      marker.bindPopup(popup, {closeButton: false});
      marker.on('mouseover', function() { this.openPopup(); this.setStyle({fillOpacity: 1, weight: 3}); });
      marker.on('mouseout', function() { this.closePopup(); this.setStyle({fillOpacity: 0.6, weight: 2}); });

      if (pt.count >= 3) {
        var icon = L.divIcon({
          className: '',
          html: '<div style="background:' + color + ';color:#fff;font-size:0.55rem;font-weight:800;padding:1px 4px;border-radius:4px;font-family:sans-serif;">' + pt.count + '</div>',
          iconSize: [18, 14], iconAnchor: [9, -6]
        });
        L.marker([pt.lat, pt.lng], {icon: icon, interactive: false}).addTo(map);
      }
    });
    setTimeout(function() { map.invalidateSize(); }, 200);
    addFullscreenBtn(document.getElementById('autoBayanMap'), map);
  }
}
