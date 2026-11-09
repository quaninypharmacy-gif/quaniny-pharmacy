// قالب صفحات الكتالوج: نفس head وقشرة باقي صفحات الموقع (public/*.html) بالظبط — نفس الخطوط والـ CSS،
// و chrome() أول الـ body (قاعدة الـ CLS فى quaniny-nextjs-migration بند 6). HTML نص عادي من غير React،
// فمفيش hydration ومفيش JS زيادة على الصفحة.
export const SITE = 'https://quaniny.com';
export const ORG = { '@id': `${SITE}/#org` };

export const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// JSON-LD جوه <script>: أي «</» يتكسر عشان محدش يقفل الـ script من جوه نص صنف
const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/<\//g, '<\\/')}</script>`;

export function page({ path, title, description, robots = 'index,follow', jsonld = [], active = '/products', body, scripts = '' }) {
  const url = SITE + path;
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${robots}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
<link rel="stylesheet" href="/design.css">
<link rel="stylesheet" href="/catalog.css">
<link rel="icon" href="/logo.webp" type="image/webp">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="صيدلية كوانيني">
<meta property="og:locale" content="ar_EG">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}/logo.webp">
<meta name="twitter:card" content="summary">
${jsonld.map(ld).join('\n')}
<script src="/app.js"></script>
<script src="/design.js" defer></script>
</head>
<body class="inner-page">
<script>chrome('${active}');</script>
<main>
${body}
</main>
<script src="/catalog.js" defer></script>
${scripts}
</body>
</html>
`;
}

export const htmlResponse = (html) => new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });

export const breadcrumb = (trail) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: trail.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + path })),
});

export const price = (n) => `${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })} جنيه`;
const D = (iso) => { const [y, m, d] = String(iso).split('-'); return `${+d}/${+m}/${y}`; };
export const priceDate = (iso) => D(iso);

// 🆕 [10/11/2026] لحد ما صورة الصنف تيجي (قرار الصيدلي): شعار الصيدلية وتحته اسم الصنف بالعربي والإنجليزي بخط واضح.
// HTML ونص مش صورة متولّدة: أخف، والاسم مقروء لجوجل وللقارئ الصوتي. مقاس ثابت (aspect-ratio) فمفيش اهتزاز.
export function thumb(it, href) {
  const inner = `<img src="/logo.webp" alt="" width="150" height="150" loading="lazy" decoding="async"><span class="mt-ar">${esc(it.name_ar || it.name_en)}</span><span class="mt-en" dir="ltr">${esc(it.name_en)}</span>`;
  return href ? `<a class="thumb med-thumb" href="${href}" tabindex="-1" aria-hidden="true">${inner}</a>` : `<div class="thumb med-thumb" aria-hidden="true">${inner}</div>`;
}

// كارت صنف فى القوايم (الفهرس وصفحة المادة الفعالة)
export function card(it) {
  const sub = [it.active_ingredient, it.strength].filter(Boolean).join(' · ');
  return `<div class="prod-card med-card">${thumb(it, `/products/${it.slug}`)}<div class="prod-body">
<a class="prod-name" href="/products/${it.slug}">${esc(it.name_ar || it.name_en)}</a>
<div class="prod-brand" dir="ltr">${esc(it.name_en)}</div>
${sub ? `<div class="med-sub">${esc(sub)}</div>` : ''}
<div class="prod-price">${price(it.price)}</div>
${orderButton(it, 'sm')}
</div></div>`;
}

// زرار الطلب: عادي لكل الأصناف (السلة)، والمواد اللي الصيدلي حددها (rx) → صفحة الروشتة والاسم مكتوب جاهز
export function orderButton(it, size = '') {
  if (it.rx) {
    return `<a class="add-btn rx-btn ${size}" href="/delivery?mode=rx&amp;drug=${encodeURIComponent(it.name_en)}">اطلبه بروشتة</a>`;
  }
  const data = esc(JSON.stringify({ id: 'm' + it.id, n: it.name_ar || it.name_en, p: it.price, u: '/products/' + it.slug }));
  return `<button class="add-btn ${size}" data-med="${data}">أضف للسلة</button>`;
}

export const DISCLAIMER = 'المعلومات هنا إرشادية ومش بديل عن استشارة الطبيب أو الصيدلي. الصرف بيتم بمراجعة الصيدلي.';
