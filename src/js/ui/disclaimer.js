/* Disclaimer modal — shared across all pages.
   Exposes: window.showDisclaimer(), window.injectDisclaimerLink(container) */
(function () {
  var POINTS = [
    {
      t: 'عدم الانتساب',
      b: 'هذا الموقع غير رسمي ولا يتبع قناة «الإعلام الحربي» ولا أي جهة مرتبطة بها. لا توجد أي علاقة، تعاون، أو تمثيل بين صاحب هذا الموقع وأي جهة عسكرية أو سياسية أو إعلامية.'
    },
    {
      t: 'مصدر البيانات',
      b: 'جميع البيانات مأخوذة من قناة عامة على تليغرام (@C_Military1) لأغراض التوثيق والأرشفة فقط. لا يتم جمع أي معلومات من مصادر خاصة أو غير علنية.'
    },
    {
      t: 'المعالجة بالذكاء الاصطناعي',
      b: 'يتم تصنيف وتلخيص وتحليل المحتوى باستخدام نماذج ذكاء اصطناعي. قد تحتوي التصنيفات، الإحصاءات، والملخصات على أخطاء أو عدم دقة. النص الأصلي في القناة هو المرجع الوحيد عند أي تعارض.'
    },
    {
      t: 'لا يمثل موقفاً',
      b: 'الموقع لا يعبّر عن أي موقف سياسي أو ديني أو عسكري، ولا يُقصد منه التحريض أو الترويج أو الدعاية لأي طرف. الغرض توثيقي وأرشيفي وبحثي بحت.'
    },
    {
      t: 'إخلاء المسؤولية عن المحتوى',
      b: 'صاحب الموقع غير مسؤول عن دقة أو صحة المحتوى الصادر عن المصدر الأصلي، ولا عن أي ادعاءات أو أرقام أو أحداث وردت فيه. عرض المحتوى هنا لا يعني تبنّيه أو التحقق منه.'
    },
    {
      t: 'حقوق الملكية',
      b: 'جميع حقوق النصوص والصور والفيديوهات تعود لأصحابها الأصليين. يُستخدم المحتوى وفق مبدأ الاستخدام العادل (Fair Use) لأغراض التوثيق والبحث التاريخي والأرشفة غير الربحية. لا يوجد أي استخدام تجاري.'
    },
    {
      t: 'لا ضمانات',
      b: 'يُقدَّم الموقع «كما هو» دون أي ضمانات من أي نوع. استخدامك للموقع يعني موافقتك على هذه الشروط.'
    }
  ];

  function build() {
    var o = document.createElement('div');
    o.className = 'disclaimer-overlay show';
    o.style.cssText = 'display:flex;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.75);z-index:9999;justify-content:center;align-items:center;padding:20px;';
    o.onclick = function (e) { if (e.target === o) close(o); };

    var m = document.createElement('div');
    m.style.cssText = 'background:#0f1520;border:1px solid #1e2d3d;border-radius:14px;max-width:640px;width:100%;max-height:85vh;overflow-y:auto;direction:rtl;text-align:right;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'padding:20px 24px 16px;border-bottom:1px solid #1e2d3d;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#0f1520;border-radius:14px 14px 0 0;gap:12px;';
    var h2 = document.createElement('h2');
    h2.style.cssText = 'font-size:1.05rem;font-weight:800;color:#c9a84c;margin:0;';
    h2.textContent = 'إخلاء مسؤولية';
    hdr.appendChild(h2);
    var cb = document.createElement('button');
    cb.style.cssText = 'background:none;border:1px solid #1e2d3d;border-radius:8px;color:#6b7d92;cursor:pointer;padding:4px 10px;font-size:0.9rem;';
    cb.textContent = '\u2715';
    cb.onclick = function () { close(o); };
    hdr.appendChild(cb);
    m.appendChild(hdr);

    var bd = document.createElement('div');
    bd.style.cssText = 'padding:18px 24px 22px;';

    var intro = document.createElement('p');
    intro.style.cssText = 'font-size:0.78rem;color:#9ca3af;margin:0 0 16px;line-height:1.7;';
    intro.textContent = 'يُرجى قراءة هذه الشروط بعناية قبل استخدام الموقع.';
    bd.appendChild(intro);

    var ol = document.createElement('ol');
    ol.style.cssText = 'list-style:decimal-leading-zero;padding:0 22px 0 0;margin:0;';

    for (var i = 0; i < POINTS.length; i++) {
      var li = document.createElement('li');
      li.style.cssText = 'font-size:0.78rem;color:#c2cbd6;padding:10px 6px 10px 0;margin-bottom:6px;line-height:1.75;border-bottom:1px dashed #1a2433;';
      var strong = document.createElement('strong');
      strong.style.cssText = 'color:#c9a84c;font-weight:800;display:block;margin-bottom:4px;font-size:0.82rem;';
      strong.textContent = POINTS[i].t;
      li.appendChild(strong);
      var span = document.createElement('span');
      span.textContent = POINTS[i].b;
      li.appendChild(span);
      ol.appendChild(li);
    }

    bd.appendChild(ol);
    m.appendChild(bd);
    o.appendChild(m);
    document.body.appendChild(o);

    document.addEventListener('keydown', onKey);
    function onKey(e) {
      if (e.key === 'Escape') {
        close(o);
        document.removeEventListener('keydown', onKey);
      }
    }
  }

  function close(o) {
    if (o && o.parentNode) o.parentNode.removeChild(o);
  }

  window.showDisclaimer = function () {
    var existing = document.querySelector('.disclaimer-overlay');
    if (existing) { close(existing); return; }
    build();
  };

  window.injectDisclaimerLink = function (container) {
    if (!container) return;
    if (container.querySelector('.disclaimer-link')) return;
    var sep = document.createElement('span');
    sep.style.cssText = 'margin:0 6px;opacity:0.4;';
    sep.textContent = '\u2022';
    var a = document.createElement('a');
    a.className = 'disclaimer-link';
    a.href = '#';
    a.style.cssText = 'color:#c9a84c;text-decoration:none;font-size:0.68rem;cursor:pointer;';
    a.textContent = 'إخلاء مسؤولية';
    a.onclick = function (e) { e.preventDefault(); window.showDisclaimer(); };
    container.appendChild(sep);
    container.appendChild(a);
  };

  // Auto-wire: find any element marked data-disclaimer-slot and inject into it
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInject);
  } else {
    autoInject();
  }
  function autoInject() {
    var slots = document.querySelectorAll('[data-disclaimer-slot]');
    for (var i = 0; i < slots.length; i++) {
      window.injectDisclaimerLink(slots[i]);
    }
  }
})();
