var PHONE = '01036181518', WA = '201036181518';

/* ================= القياس (GA4) =================
   ⚠️ قاعدة ثابتة: **مفيش أي بيانات شخصية بتتبعت لجوجل.**
   لا اسم، لا تليفون، لا عنوان، لا اسم شركة التأمين، ولا أي حاجة
   عن الروشتة أو الصور. دي بيانات صحية — إرسالها مخالف لسياسة
   جوجل نفسها وغلط أخلاقيًا. بنقيس **إن الفعل حصل**، مش مين عمله.

   شغّله: حط الـ Measurement ID تحت (شكله G-XXXXXXXXXX).
   من غيره السكربت ساكت تمامًا ومش بيحمّل أي حاجة. */
var GA_ID = '';

window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }

(function () {
  if (!GA_ID) return;
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
  gtag('js', new Date());
  gtag('config', GA_ID);
})();

/* نادِها من أي صفحة. قبل ما الـ ID يتحط، بتطبع في الكونسول بس
   لو شغّلت window.__trackDebug = true — عشان نتأكد إن الأحداث
   بتتنده في مكانها الصح. */
function track(name, params) {
  if (!GA_ID) { if (window.__trackDebug) console.log('[track]', name, params || {}); return; }
  gtag('event', name, params || {});
}

/* الحد الأدنى للتوصيل المجاني بالجنيه. **مش بينطبق على روشتات التأمين.**
   لو اتغير، غيّره هنا بس — كل الصفحات بتقراه من هنا. */
var FREE_DELIVERY_MIN = 200;

/* ---- المنتجات: انسخ الكارت ده وغيّر بياناته لإضافة منتج جديد ---- */
var PRODUCTS = []; /* 🩹 [10/11/2026] RILY GRO اتشال بطلب الصيدلي — كل الأصناف بقت صفحات /products/<slug> */

/* 🆕 [9/11/2026] أصناف الكتالوج (/products/<slug>) مش فى PRODUCTS — ودي القاعدة: 4000 صنف هنا = كل صفحة أبطأ 9 مرات
   (dd498c6). فالصنف بيتحفظ فى السلة نفسها بالاسم والسعر والرابط ({id:'m<رقم>', n, p, u}) وP بتقراه من هناك. */
function P(id) {
  for (var i = 0; i < PRODUCTS.length; i++) { if (PRODUCTS[i].id === id) return PRODUCTS[i]; }
  var c = getCart();
  for (var j = 0; j < c.length; j++) { if (c[j].id === id && c[j].n) return { id: id, name: c[j].n, price: c[j].p, img: '/logo.webp', url: c[j].u }; }
  return null;
}

/* ---- السلة (متخزنة في متصفح العميل) ---- */
// 🩹 [10/11/2026] صنف قديم من PRODUCTS (زي rily-gro) اتشال من الموقع: يتشال من السلة كمان بدل ما يتحسب فى العدّاد من غير سعر
function getCart() {
  var c; try { c = JSON.parse(localStorage.getItem('qcart') || '[]'); } catch (e) { return []; }
  return c.filter(function (x) { if (x.n) return true; for (var i = 0; i < PRODUCTS.length; i++) { if (PRODUCTS[i].id === x.id) return true; } return false; });
}
function saveCart(c) { try { localStorage.setItem('qcart', JSON.stringify(c)); } catch (e) {} updateBadge(); }
function cartCount() { var c = getCart(), n = 0; for (var i = 0; i < c.length; i++) n += c[i].q; return n; }
function addToCart(id, med) {
  var c = getCart(), f = false;
  for (var i = 0; i < c.length; i++) { if (c[i].id === id) { c[i].q++; f = true; } }
  if (!f) c.push(med ? { id: id, q: 1, n: med.n, p: med.p, u: med.u } : { id: id, q: 1 });
  saveCart(c);
  var p = P(id);
  track('add_to_cart', { currency: 'EGP', value: p ? p.price : 0, item_id: id });
}
function setQty(id, q) { var c = getCart(); for (var i = 0; i < c.length; i++) { if (c[i].id === id) { c[i].q = q; if (q < 1) c.splice(i, 1); break; } } saveCart(c); }

/* 🆕 26/11/2026 التوافر مشترك بين الكتالوج والسلة (قرار الصيدلي 26/11: الصنف الغير متوفر ميتضافش للسلة،
   ومكانه «اسأل على واتساب» — بدل «اطلبه والصيدلية هتحاول توفره» بتاع 23/11).
   availability.json فيه أرقام الأصناف الغير متوفرة بس (الـ ERP بيرفعه كل ساعة). R2 أساسي والملف الثابت احتياطي.
   المنع على «غير متوفر» المؤكد بس: لو الملف مااتقراش أو أقدم من 48 ساعة ← مسموح (مش هنمنع بيع على معلومة قديمة).
   ونفس القاعدة بالظبط فى lib/api/order.mjs على السيرفر — لو غيّرت هنا غيّر هناك. */
var AV_URLS = ['https://quaniny-images.pages.dev/api/availability.json', 'https://quaniny-images.pages.dev/availability.json'];
var AV_MAX_AGE = 48 * 3600 * 1000;
function avGet(i) {
  i = i || 0;
  return fetch(AV_URLS[i], { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .catch(function (e) { if (i + 1 < AV_URLS.length) return avGet(i + 1); throw e; });
}
// null لو الملف بايظ. v1 القديم مالوش checked_at
function avParse(a) {
  if (!a || !Array.isArray(a.out)) return null;
  var checked = a.v === 2 ? Date.parse(a.checked_at) : 0;
  if (a.v === 2 && !checked) return null;
  var out = {}; a.out.forEach(function (id) { out[id] = 1; });
  return { out: out, checked: checked, seq: a.v === 2 ? Number(a.seq) || 0 : 0 };
}
function avStale(av) { return !!(av && av.checked && Date.now() - av.checked > AV_MAX_AGE); }
// صنف الكتالوج id = 'm<رقم>'. الأصناف القديمة اللي فى PRODUCTS مش فى ملف التوافر ← دايمًا مسموحة
function avIsOut(av, id) { return !!(av && !avStale(av) && /^m\d+$/.test(id) && av.out[id.slice(1)]); }
function waAsk(name, url) {
  return 'https://wa.me/' + WA + '?text=' + encodeURIComponent('السلام عليكم، عايز أسأل عن ' + name +
    ' — مكتوب على الموقع إنه غير متوفر. فيه بديل أو هيتوفر إمتى؟' + (url ? '\nhttps://quaniny.com' + url : ''));
}
function updateBadge() {
  var n = cartCount();
  ['cartCount', 'qbarCount'].forEach(function (id) {
    var e = document.getElementById(id);
    if (e) { e.textContent = n; e.style.display = n ? '' : 'none'; }
  });
}

/* ---- الهيدر والنav والفوتر المشتركين بين كل الصفحات ----
   المسارات كلها root-absolute (بتبدأ بـ /) عشان الصفحات اللي جوه
   مجلدات زي /insurance/* تشتغل صح. cleanUrls شغال في vercel.json.

   ⚠️ chrome() لازم تتنادى في *أول* الـ body، مش في آخره.
   كانت متنادية في الآخر، فالهيدر كان بيتحقن بعد ما المحتوى اترسم
   وبينزّل الصفحة كلها 123px — CLS قياسه كان 0.146 على كل صفحة
   (عتبة جوجل للأخضر 0.1). دلوقتي الهيدر بيتحط والـ body لسه فاضي،
   فمفيش إزاحة أصلًا. */
function chrome(active) {
  var nav = [
    ['/', 'الرئيسية'],
    ['/chronic-care', 'العلاج الشهري'],
    ['/delivery', 'صرف الروشتة'],
    ['/insurance', 'التأمين'],
    ['/products', 'المنتجات'],
    ['/branches', 'فروعنا'],
    ['/ask', 'اسأل الصيدلي']
  ];
  var links = '';
  for (var i = 0; i < nav.length; i++) {
    links += '<a' + (nav[i][0] === active ? ' class="active"' : '') + ' href="' + nav[i][0] + '">' + nav[i][1] + '</a>';
  }
  document.body.insertAdjacentHTML('afterbegin',
    '<header><div class="wrap header-row">' +
    '<a class="brand" href="/"><img src="/logo.webp" width="44" height="44" alt="شعار صيدلية كوانيني"><span class="brand-name">صيدلية كوانيني</span></a>' +
    '<div class="header-right">' +
    '<a class="header-phone" href="tel:' + PHONE + '"><span class="i" aria-hidden="true">📞</span>' + PHONE + '</a>' +
    '<a class="header-wa" href="https://wa.me/' + WA + '" target="_blank" rel="noopener"><span class="i" aria-hidden="true">💬</span><span class="lbl">تواصل معنا</span></a>' +
    '<a class="cart-link" href="/cart">السلة<span class="cart-count" id="cartCount">0</span></a>' +
    '</div></div></header><nav class="mainnav"><div class="wrap">' + links + '</div></nav>');
  updateBadge();

  /* تفويض واحد بيمسك كل روابط الاتصال والواتساب في الموقع كله —
     الموجودة دلوقتي واللي هتتضاف بعدين. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.getAttribute('href') || '';
    if (h.indexOf('tel:') === 0) track('phone_click', { number: h.slice(4) });
    else if (h.indexOf('wa.me') > -1) track('whatsapp_click', {});
    else if (h.indexOf('maps') > -1 || h.indexOf('goo.gl/maps') > -1) track('map_click', {});
  });

  /* الفوتر لازم يستنى باقي الصفحة تتقرا — لو اتحط دلوقتي بـ beforeend
     هيقع فوق المحتوى لأن الـ body لسه فاضي. */
  document.addEventListener('DOMContentLoaded', function () {
    document.body.insertAdjacentHTML('beforeend',
      '<footer>' +
      '<div class="wrap foot-grid">' +
        '<div class="foot-brand">' +
          '<img src="/logo.webp" width="52" height="52" alt="">' +
          '<span class="fb-name">صيدلية كوانيني</span>' +
          '<span class="fb-tag">صحتك.. أولويتنا</span>' +
        '</div>' +
        '<nav class="foot-col" aria-label="روابط مهمة"><h4>روابط مهمة</h4>' +
          '<a href="/chronic-care">العلاج الشهري</a>' +
          '<a href="/delivery">صرف الروشتة</a>' +
          '<a href="/insurance">التأمين الطبي</a>' +
          '<a href="/delivery-areas">مناطق التوصيل</a>' +
        '</nav>' +
        '<nav class="foot-col" aria-label="روابط سريعة"><h4>روابط سريعة</h4>' +
          '<a href="/">الرئيسية</a>' +
          '<a href="/products">المنتجات</a>' +
          '<a href="/branches">فروعنا</a>' +
          '<a href="/ask">اسأل الصيدلي</a>' +
          '<a href="/about">عن كوانيني</a>' +
        '</nav>' +
        '<div class="foot-col foot-contact"><h4>تواصل معنا</h4>' +
          '<a href="tel:' + PHONE + '" class="fc-phone">' + PHONE + '</a>' +
          '<a href="https://wa.me/' + WA + '" target="_blank" rel="noopener">واتساب</a>' +
          '<span class="fc-hours">يوميًا 12 الضهر – 12 بالليل · الجمعة إجازة</span>' +
        '</div>' +
      '</div>' +
      '<div class="foot-bar"><div class="wrap">' +
        '<span>© 2026 صيدلية كوانيني — جميع الحقوق محفوظة</span>' +
        '<span class="fb-loc"><span aria-hidden="true">📍</span> شبين القناطر — القليوبية — مصر</span>' +
      '</div></div></footer>');

    /* الصفحة الحالية من المسار الفعلي مش من الـ active — لأن cart.html
       بتنادي chrome('/products') فالـ active مش بيوصف الصفحة نفسها. */
    var here = (location.pathname.replace(/\/$/, '') || '/');
    var on = function (p) { return here === p ? ' class="on"' : ''; };
    document.body.insertAdjacentHTML('beforeend',
      '<nav class="qbar" aria-label="إجراءات سريعة">' +
      '<a' + on('/delivery') + ' href="/delivery?mode=rx"><span class="i" aria-hidden="true">📷</span>صوّر الروشتة</a>' +
      '<a' + on('/cart') + ' href="/cart"><span class="i" aria-hidden="true">🛒</span>السلة<span class="qb" id="qbarCount">0</span></a>' +
      '<a href="https://wa.me/' + WA + '" target="_blank" rel="noopener"><span class="i" aria-hidden="true">💬</span>واتساب</a>' +
      '</nav>');
    updateBadge();
  });
}
