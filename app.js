var PHONE = '01036181518', WA = '201036181518';

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
function addToCart(id) { var c = getCart(), f = false; for (var i = 0; i < c.length; i++) { if (c[i].id === id) { c[i].q++; f = true; } } if (!f) c.push({ id: id, q: 1 }); saveCart(c); }
function setQty(id, q) { var c = getCart(); for (var i = 0; i < c.length; i++) { if (c[i].id === id) { c[i].q = q; if (q < 1) c.splice(i, 1); break; } } saveCart(c); }
function updateBadge() { var e = document.getElementById('cartCount'); if (e) { var n = cartCount(); e.textContent = n; e.style.display = n ? '' : 'none'; } }

/* ---- الهيدر والنav والفوتر المشتركين بين كل الصفحات ---- */
function chrome(active) {
  var nav = [
    ['index.html', 'الرئيسية'],
    ['delivery.html', 'صرف الروشتة'],
    ['products.html', 'المنتجات'],
    ['branches.html', 'فروعنا'],
    ['ask.html', 'اسأل الصيدلي']
  ];
  var links = '';
  for (var i = 0; i < nav.length; i++) {
    links += '<a' + (nav[i][0] === active ? ' class="active"' : '') + ' href="' + nav[i][0] + '">' + nav[i][1] + '</a>';
  }
  document.body.insertAdjacentHTML('afterbegin',
    '<header><div class="wrap header-row">' +
    '<a class="brand" href="index.html"><img src="logo.webp" alt="شعار صيدلية كوانيني"><span class="brand-name">صيدلية كوانيني</span></a>' +
    '<div class="header-right"><a class="header-phone" href="tel:' + PHONE + '">' + PHONE + '</a>' +
    '<a class="cart-link" href="cart.html">السلة<span class="cart-count" id="cartCount">0</span></a></div>' +
    '</div></header><nav class="mainnav"><div class="wrap">' + links + '</div></nav>');
  document.body.insertAdjacentHTML('beforeend',
    '<footer><div class="wrap"><div style="margin-bottom:10px">' + links.replace(/ class="active"/g, '') + '</div>' +
    '© 2026 صيدلية كوانيني — جميع الحقوق محفوظة</div></footer>');
  updateBadge();
}
