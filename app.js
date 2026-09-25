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
var PRODUCTS = [
  {
    id: 'rily-gro',
    name: 'RILY GRO سيرم الشعر بالكافيار',
    brand: 'GRO Pharma — 120 مل',
    price: 210,
    img: 'rily-gro.webp',
    video: '', // لينك embed من يوتيوب لما يتصور
    short: 'سيرم معالج بالبروتين غني بزيت الأرجان والكيراتين ومستخلص الكافيار، لتغذية الشعر وتقويته من الجذور.',
    uses: [
      ['يعالج التقصف', 'يصلح أطراف الشعر التالفة ويقلل من التقصف'],
      ['نعومة ولمعة', 'يمنح الشعر نعومة فائقة ولمعان صحي'],
      ['فرد للشعر', 'يساعد على فرد الشعر ويقلل من الهيشان'],
      ['يرطب الشعر', 'يرطب بعمق ويحافظ على رطوبته الطبيعية'],
      ['يغذي الشعر', 'غني بزيت الأرجان والكيراتين ومستخلص الكافيار لتغذية الشعر وتقويته من الجذور']
    ]
  }
];

function P(id) { for (var i = 0; i < PRODUCTS.length; i++) { if (PRODUCTS[i].id === id) return PRODUCTS[i]; } return null; }

/* ---- السلة (متخزنة في متصفح العميل) ---- */
function getCart() { try { return JSON.parse(localStorage.getItem('qcart') || '[]'); } catch (e) { return []; } }
function saveCart(c) { try { localStorage.setItem('qcart', JSON.stringify(c)); } catch (e) {} updateBadge(); }
function cartCount() { var c = getCart(), n = 0; for (var i = 0; i < c.length; i++) n += c[i].q; return n; }
function addToCart(id) {
  var c = getCart(), f = false;
  for (var i = 0; i < c.length; i++) { if (c[i].id === id) { c[i].q++; f = true; } }
  if (!f) c.push({ id: id, q: 1 });
  saveCart(c);
  var p = P(id);
  track('add_to_cart', { currency: 'EGP', value: p ? p.price : 0, item_id: id });
}
function setQty(id, q) { var c = getCart(); for (var i = 0; i < c.length; i++) { if (c[i].id === id) { c[i].q = q; if (q < 1) c.splice(i, 1); break; } } saveCart(c); }
function updateBadge() { var e = document.getElementById('cartCount'); if (e) { var n = cartCount(); e.textContent = n; e.style.display = n ? '' : 'none'; } }

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
    '<a class="brand" href="/"><img src="/logo.webp" width="40" height="40" alt="شعار صيدلية كوانيني"><span class="brand-name">صيدلية كوانيني</span></a>' +
    '<div class="header-right"><a class="header-phone" href="tel:' + PHONE + '">' + PHONE + '</a>' +
    '<a class="cart-link" href="/cart">السلة<span class="cart-count" id="cartCount">0</span></a></div>' +
    '</div></header><nav class="mainnav"><div class="wrap">' + links + '</div></nav>');
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
      '<footer><div class="wrap"><div style="margin-bottom:10px">' + links.replace(/ class="active"/g, '') + '</div>' +
      '© 2026 صيدلية كوانيني — جميع الحقوق محفوظة</div></footer>');
  });
}
