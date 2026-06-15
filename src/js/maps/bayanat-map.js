/* === src/js/maps/bayanat-map.js === */

import { addTrackedTileLayer } from './tiles.js';
import { addFullscreenBtn } from './fullscreen.js';
import { addSatelliteBtn } from './satellite-toggle.js';
import { createBorderMap } from './border-renderer.js';
import { onTabSwitch } from '../ui/tabs.js';

export function initBayanatMap() {
  if (typeof L === 'undefined') return;
  var bayanatTab = document.getElementById('bayanat');
  if (!bayanatTab) return;
  var container = bayanatTab.querySelector('.container');
  if (!container) return;
  var cards = container.querySelectorAll('.bayan');
  if (cards.length < 1) return;
  if (container.querySelector('.auto-bayan-map')) return;

  var opCoords = {
    'القنطرة':[33.2745,35.4593],'عيناتا':[33.1311,35.4447],'الطيبة':[33.275,35.5205],
    'البيّاضة':[33.15,35.53],'مارون الراس':[33.1038,35.4534],'رشاف':[33.1437,35.3607],
    'بنت جبيل':[33.1209,35.4333],'كريات شمونة':[33.2132,35.5717],'نهاريا':[33.0176,35.0995],
    'المطلة':[33.2786,35.5772],'مسكاف عام':[33.2479,35.5481],'يرؤون':[33.0769,35.455],
    'أفيفيم':[33.0884,35.4718],'شلومي':[33.0774,35.1491],'حانيتا':[33.0885,35.1743],
    'مرغليوت':[33.2141,35.5453],'الخيام':[33.311,35.5957],'المالكية':[33.0989,35.5121],
    'حولاتا':[33.051,35.6113],'القوزح':[33.18,35.55],'دير سريان':[33.2966,35.4981],
    'العديسة':[33.2509,35.5447],'صفد':[32.9619,35.4948],'عكا':[32.9205,35.0773],
    'حيفا':[32.79,34.99],'مركبا':[33.2312,35.5204],'سعسع':[33.05,35.42],
    'عيتا الشعب':[33.092,35.3359],'عيترون':[33.1115,35.4799],'كفاريوفال':[33.2451,35.597],
    'كفرجلعادي':[33.2386,35.5762],'شوميرا':[33.0851,35.2855],'عميعاد':[32.9088,35.5248],
    'ميرون':[32.9759,35.4055],'القلعة':[33.3026,35.664],'ربّ ثلاثين':[33.15,35.47],
    'كابري':[33.0202,35.1483],'جويّا':[33.2421,35.3336],'يارون':[33.0789,35.4213],
    'بفلاي':[33.31,35.38],'معيان باروخ':[33.2399,35.6066],'المنارة':[33.1933,35.5471],
    'المالكيّة':[33.0989,35.5121],'زرعيت':[33.0999,35.2884],'جل العلام':[33.1,35.49],
    'بركة ريشا':[33.3,35.83],'المرج':[33.28,35.6],'راميم':[33.06,35.43],
    'دوفيف':[33.0519,35.4064],'راميا':[33.07,35.47],'الراهب':[33.2,35.55],
    'برانيت':[33.059,35.3408],'الضهيرة':[33.1011,35.2271],'المطلّة':[33.2786,35.5772],
    'هونين':[33.2194,35.5442],'بياض بليدا':[33.1345,35.5127],'قلعة هونين':[33.2208,35.5443],
    'ميتات':[33.0409,35.3578],'نهاريّا':[33.0176,35.0995],'بلدة دبل':[33.1276,35.3694],
    'العاصي':[33.15,35.55],'العباد':[33.11,35.46],'شتولا':[33.0854,35.3149],
    'شبعا':[33.3455,35.7471],'زبدين':[33.3739,35.4633],'رويسات العلم':[33.4,35.8],
    'الصدح':[33.06,35.42],'الجرداح':[33.08,35.44],'يفتاح':[33.1279,35.5506],
    'دبل':[33.1276,35.3694],'طلعة المحيبيب':[33.1511,35.5016],'كتسرين':[32.991,35.6848],
    'الجولان':[32.99,35.69],'غورن':[33.0561,35.2374],'صلحا':[33.0833,35.45],
    'نعيم':[33.09,35.51]
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
  if (locs.length < 1) return;

  // Adapt locData into the place-list shape the shared border-renderer expects.
  var places = locs.map(function(name) {
    return { name: name, lat: locData[name].lat, lng: locData[name].lng, count: locData[name].count };
  });

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

    var div = document.getElementById('autoBayanMap');
    createBorderMap(map, div, places, { unit: '\u0639\u0645\u0644\u064A\u0629' });

    setTimeout(function() { map.invalidateSize(); }, 200);
    addFullscreenBtn(div, map);
    addSatelliteBtn(div, map);
  }
}
