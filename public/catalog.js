/* كتالوج /products: زرار «أضف للسلة» + البحث. الملف ده بيتحمّل فى صفحات الكتالوج بس.
   فهرس البحث (/products/search-index.json) بيتجاب أول ما الزبون يكتب، مش مع الصفحة. */
(function () {
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-med]');
    if (!b || b.style.display === 'none') return; // 26/11: غير متوفر — الزرار متخبي ومكانه واتساب
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
  // 26/11/2026 الجلب والقراءة اتنقلوا app.js (avGet/avParse/avStale) عشان السلة بتستخدمهم كمان
  var av = null, lastFetch = 0;
  // 🆕 26/11/2026 (قرار الصيدلي 26/11) غير متوفر مؤكد ← «أضف للسلة» يتخبى ومكانه «اسأل على واتساب» برسالة فيها
  // اسم الصنف. لو رجع متوفر أو الحالة قدمت (أقدم من 48 ساعة) الزرار يرجع — المنع على المؤكد بس.
  function setBuy(flag, out) {
    var btn = flag.parentNode && flag.parentNode.querySelector('button.add-btn[data-med]');
    if (!btn) return; // أصناف الروشتة: «اطلبه بروشتة» زي ما هو
    var wa = btn.nextElementSibling && btn.nextElementSibling.classList.contains('wa-btn') ? btn.nextElementSibling : null;
    if (out && !wa) {
      var m; try { m = JSON.parse(btn.getAttribute('data-med')); } catch (_) { return; }
      wa = document.createElement('a');
      wa.className = btn.className.replace(/\badded\b/, '') + ' wa-btn';
      wa.href = waAsk(m.n, m.u); wa.target = '_blank'; wa.rel = 'noopener';
      wa.textContent = flag.closest('.med-buy') ? 'اسأل الصيدلي على واتساب' : 'اسأل على واتساب';
      btn.parentNode.insertBefore(wa, btn.nextSibling);
    }
    btn.style.display = out ? 'none' : '';
    if (wa) wa.style.display = out ? '' : 'none';
  }
  function renderFlags() {
    if (!av) return; // لسه مفيش بيانات سليمة — العلامة تفضل فاضية
    var stale = avStale(av);
    flags.forEach(function (el) {
      var no = !stale && av.out[el.getAttribute('data-pid')];
      var big = el.closest('.med-buy');
      el.className = 'stock-flag ' + (stale ? 'is-ask' : no ? 'is-out' : 'is-in');
      el.textContent = stale ? 'اسأل عن التوفر'
        : no ? (big ? 'غير متوفر حاليًا — اسأل الصيدلي عن البديل أو ميعاد توفره' : 'غير متوفر حاليًا') : '✓ متوفر';
      setBuy(el, !!no);
    });
  }
  function loadAv() {
    lastFetch = Date.now();
    avGet(0)
      .then(function (a) {
        var n = avParse(a);
        if (!n) return; // ملف بايظ — نسيب اللي معانا
        if (av && n.seq < av.seq) return; // نسخة أقدم وصلت متأخر
        av = n;
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

/* 🆕 27/11/2026 فيديو يوتيوب خفيف (lib/catalog/video.mjs): الـ iframe بيتحمّل بالضغط بس — قبلها صورة وزرار.
   youtube-nocookie + rel=0: من غير كوكيز تتبع قبل التشغيل، والمقترحات آخر الفيديو من نفس القناة.
   الـ iframe بياخد نفس الصندوق 16:9 فالصفحة متتحركش. */
(function () {
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.yt-lite[data-yt]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var id = a.getAttribute('data-yt');
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
    e.preventDefault();
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
    f.title = a.getAttribute('data-title') || 'فيديو';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.className = 'yt-frame';
    a.replaceWith(f);
    f.focus();
  });
})();
