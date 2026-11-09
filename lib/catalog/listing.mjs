// صفحات القوايم: /medicine و /medicine/page/<n> — 48 صنف فى الصفحة وميترسمش الباقي أبدًا
// (قياس dd498c6: 4000 كارت فى صفحة واحدة = 32 ألف عنصر و25 ثانية).
import { pageItems, pageCount, meta } from './data.mjs';
import { page, card, esc, breadcrumb } from './html.mjs';

const hrefOf = (n) => (n === 1 ? '/medicine' : `/medicine/page/${n}`);

function pager(n) {
  const nums = [...new Set([1, n - 2, n - 1, n, n + 1, n + 2, pageCount])].filter((x) => x >= 1 && x <= pageCount).sort((a, b) => a - b);
  let out = '', prev = 0;
  for (const x of nums) {
    if (x - prev > 1) out += '<span class="pg-gap">…</span>';
    out += x === n ? `<span class="pg-cur" aria-current="page">${x}</span>` : `<a href="${hrefOf(x)}">${x}</a>`;
    prev = x;
  }
  return `<nav class="pager" aria-label="صفحات الكتالوج">${n > 1 ? `<a rel="prev" href="${hrefOf(n - 1)}">السابق</a>` : ''}${out}${n < pageCount ? `<a rel="next" href="${hrefOf(n + 1)}">التالي</a>` : ''}</nav>`;
}

export function listingPage(n) {
  const path = hrefOf(n);
  const title = n === 1 ? 'الأدوية ومنتجات العناية | صيدلية كوانيني' : `الأدوية ومنتجات العناية — صفحة ${n} | صيدلية كوانيني`;
  const description = `${meta.count.toLocaleString('en-US')} صنف من أدوية ومنتجات العناية بأسعارها في صيدلية كوانيني بشبين القناطر — دوّر بالاسم أو المادة الفعالة واطلب بتوصيل لحد البيت.`;
  const body = `<div class="pagehead"><div class="wrap"><div class="page-emblem"><svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#pill"></use></svg></div><div class="eyebrow">صيدلية كوانيني · صحتك أولويتنا</div><h1>الأدوية ومنتجات العناية</h1><p>دوّر بالاسم العربي أو الإنجليزي أو المادة الفعالة، واطلب — الدفع عند الاستلام.</p></div></div>
<section><div class="wrap">
<div class="med-search" role="search"><label for="medq" class="sr-only">دوّر على صنف</label><input id="medq" type="search" autocomplete="off" placeholder="مثلًا: بنادول، Augmentin، باراسيتامول" aria-controls="medres"><div id="medres" class="med-results" aria-live="polite"></div></div>
<div class="prod-grid med-grid">${pageItems(n).map(card).join('')}</div>
${pager(n)}
</div></section>`;
  return page({ path, title, description, body, jsonld: [breadcrumb(n === 1 ? [['الرئيسية', '/'], ['الأدوية والمنتجات', '/medicine']] : [['الرئيسية', '/'], ['الأدوية والمنتجات', '/medicine'], [`صفحة ${n}`, path]])] });
}

export { esc };
