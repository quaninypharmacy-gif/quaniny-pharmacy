/* كتالوج /medicine: زرار «أضف للسلة» + البحث. الملف ده بيتحمّل فى صفحات الكتالوج بس.
   فهرس البحث (/medicine/search-index.json) بيتجاب أول ما الزبون يكتب، مش مع الصفحة. */
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
    loading = fetch('/medicine/search-index.json').then(function (r) { return r.json(); }).then(function (rows) {
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
            return '<li><a href="/medicine/' + r[0] + '"><b>' + esc(r[1] || r[2]) + '</b><span dir="ltr">' + esc(r[2]) + '</span><em>' + esc(r[4]) + ' جنيه</em></a></li>';
          }).join('') + '</ul>'
        : '<p class="med-none">مش لاقيين الصنف ده — <a href="/delivery?mode=rx">صوّر الروشتة</a> أو <a href="https://wa.me/201036181518" target="_blank" rel="noopener">اسألنا على واتساب</a>.</p>';
    });
  }
  var t;
  q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(run, 150); });
  q.addEventListener('focus', load, { once: true });
})();
