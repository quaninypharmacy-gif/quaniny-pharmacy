/* كتالوج /products: زرار «أضف للسلة» + البحث. الملف ده بيتحمّل فى صفحات الكتالوج بس.
   فهرس البحث (/products/search-index.json) بيتجاب أول ما الزبون يكتب، مش مع الصفحة. */
(function () {
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-med]');
    if (!b) return;
    var m; try { m = JSON.parse(b.getAttribute('data-med')); } catch (_) { return; }
    addToCart(m.id, m);
    var t = b.textContent;
    b.textContent = 'تمت الإضافة ✓'; b.classList.add('added');
    setTimeout(function () { b.textContent = t; b.classList.remove('added'); }, 1600);
  });

  // 🆕 22/11/2026 متوفر / غير متوفر — availability.json فيه أرقام الأصناف الغير متوفرة بس (الـ ERP بيرفعه كل
  // ساعة على quaniny-images). لو الملف مااتقراش العلامات تفضل فاضية: من غير حالة مش متأكدين منها.
  // 🆕 23/11/2026 عقد v2: checked_at = آخر قراءة ناجحة من السيستم. أقدم من 48 ساعة (قرار الصيدلي 23/11) ← «اسأل عن
  // التوفر» بدل حالة ممكن تكون قديمة، حتى لو الصفحة مفتوحة من بدري. seq بيمنع نسخة أقدم توصل متأخر تغطي على أحدث.
  // الملف بكاش 5 دقايق على الـ CDN، فالتحديث كل 30 دقيقة وعند الرجوع للصفحة أو للنت كفاية.
  var flags = document.querySelectorAll('.stock-flag[data-pid]');
  // 🆕 23/11/2026 المصدر الأساسي R2 (bucket خاص، بيتقرا من Pages Function وبيتحدّث كل ساعة)، والملف الثابت على
  // Pages احتياطي لو R2 مارجعش. لو الاحتياطي أقدم، seq و checked_at بيحموا: مش هيغطي على أحدث، ولو قدّم ← «اسأل».
  var AV_URLS = ['https://quaniny-images.pages.dev/api/availability.json', 'https://quaniny-images.pages.dev/availability.json'];
  function getAv(i) {
    return fetch(AV_URLS[i], { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .catch(function (e) { if (i + 1 < AV_URLS.length) return getAv(i + 1); throw e; });
  }
  var MAX_AGE = 48 * 3600 * 1000;
  var av = null, lastFetch = 0;
  function renderFlags() {
    if (!av) return; // لسه مفيش بيانات سليمة — العلامة تفضل فاضية
    var stale = av.checked && Date.now() - av.checked > MAX_AGE;
    flags.forEach(function (el) {
      var no = av.out[el.getAttribute('data-pid')];
      var big = el.closest('.med-buy');
      el.className = 'stock-flag ' + (stale ? 'is-ask' : no ? 'is-out' : 'is-in');
      el.textContent = stale ? 'اسأل عن التوفر'
        : no ? (big ? 'غير متوفر حاليًا — اطلبه والصيدلية هتأكد معاك' : 'غير متوفر حاليًا') : '✓ متوفر';
    });
  }
  function loadAv() {
    lastFetch = Date.now();
    getAv(0)
      .then(function (a) {
        if (!a || !Array.isArray(a.out)) return;
        var checked = a.v === 2 ? Date.parse(a.checked_at) : 0; // v1 القديم مالوش checked_at — بيتعرض زي الأول
        if (a.v === 2 && !checked) return; // ملف بايظ — نسيب اللي معانا
        var seq = a.v === 2 ? Number(a.seq) || 0 : 0;
        if (av && seq < av.seq) return; // نسخة أقدم وصلت متأخر
        var out = {}; a.out.forEach(function (id) { out[id] = 1; });
        av = { out: out, checked: checked, seq: seq };
        renderFlags();
      })
      .catch(function () { renderFlags(); }); // الجلب فشل: نفحص صلاحية اللي معانا (ممكن يكون قدم)
  }
  if (flags.length && window.fetch) {
    loadAv();
    setInterval(function () { renderFlags(); if (!document.hidden && Date.now() - lastFetch > 30 * 60000) loadAv(); }, 10 * 60000);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      renderFlags(); // الصلاحية الأول، من غير ما نستنى الشبكة
      if (Date.now() - lastFetch > 5 * 60000) loadAv();
    });
    window.addEventListener('online', loadAv);
  }

  var q = document.getElementById('medq'), box = document.getElementById('medres');
  if (!q || !box) return;
  var idx = null, loading = null;

  // تطبيع عربي/إنجليزي: الهمزات، التاء المربوطة، الألف المقصورة، التشكيل، والحروف اللي بتتكتب بأكتر من شكل —
  // عشان «بانادول» و«بنادول» و«Panadol» يوصلوا لنفس الصنف
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[ً-ْـ]/g, '')
      .replace(/[أإآا]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
      .replace(/[^a-z0-9ء-ي]+/g, ' ').trim();
  }
  // المد جوه الكلمة بيتشال («بانادول» = «بنادول»)، والحرف المكرر واحد
  function loose(s) { return norm(s).replace(/(\S)ا(?=\S)/g, '$1').replace(/(.)\1+/g, '$1'); }

  function load() {
    if (loading) return loading;
    loading = fetch('/products/search-index.json').then(function (r) { return r.json(); }).then(function (rows) {
      idx = rows.map(function (r) { var t = [r[1], r[2], r[3]].join(' '); return { r: r, n: norm(t), l: loose(t) }; });
    });
    return loading;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function run() {
    var v = q.value.trim();
    if (v.length < 2) { box.innerHTML = ''; return; }
    load().then(function () {
      var words = norm(v).split(' ').filter(Boolean), lw = loose(v).split(' ').filter(Boolean);
      var hits = [];
      for (var i = 0; i < idx.length && hits.length < 20; i++) {
        var x = idx[i];
        var ok = words.every(function (w) { return x.n.indexOf(w) >= 0; }) || lw.every(function (w) { return x.l.indexOf(w) >= 0; });
        if (ok) hits.push(x.r);
      }
      box.innerHTML = hits.length
        ? '<ul>' + hits.map(function (r) {
            return '<li><a href="/products/' + r[0] + '"><b>' + esc(r[1] || r[2]) + '</b><span dir="ltr">' + esc(r[2]) + '</span><em>' + esc(r[4]) + ' جنيه</em></a></li>';
          }).join('') + '</ul>'
        : '<p class="med-none">مش لاقيين الصنف ده — <a href="/delivery?mode=rx">صوّر الروشتة</a> أو <a href="https://wa.me/201036181518" target="_blank" rel="noopener">اسألنا على واتساب</a>.</p>';
    });
  }
  var t;
  q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(run, 150); });
  q.addEventListener('focus', load, { once: true });
})();
