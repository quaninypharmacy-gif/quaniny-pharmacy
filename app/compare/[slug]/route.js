// 🆕 27/11/2026 /compare/<slug> — مقارنة صنفين بالاسم (مثال: Eva cleanser مع Vichy cleanser) — قرار الصيدلي 27/11:
// صفحة لوحدها لأن «X ولا Y» بحث لوحده. شروطها: كل صف فى الجدول من مصدر (العبوة/النشرة/الموقع الرسمي للبراند)،
// من غير ما نقلل من الطرف التاني، والصيدلي بيراجع قبل النشر (reviewed). صورة المنتج من الكتالوج بس، من غير لوجو البراند.
// الصنفين لازم يكونوا فى الكتالوج (lib/catalog/content.mjs بيشيل المقارنة لو واحد ناقص) عشان زرار السلة للاتنين.
import { getComparison, comparisons, compareVideos, isDraft } from '../../../lib/catalog/content.mjs';
import { page, htmlResponse, esc, card, breadcrumb, ORG, SITE, DISCLAIMER } from '../../../lib/catalog/html.mjs';
import { videoBlock, videoLd, DRAFT_BANNER } from '../../../lib/catalog/video.mjs';

export const dynamic = 'force-static';
export const dynamicParams = false;
export function generateStaticParams() { return comparisons.map((c) => ({ slug: c.slug })); }

export async function GET(_req, { params }) {
  const c = getComparison((await params).slug);
  if (!c) return new Response('Not found', { status: 404 });
  const path = `/compare/${c.slug}`;
  const draft = isDraft(c);
  const vids = compareVideos(c.slug);
  const nA = c.A.name_ar || c.A.name_en, nB = c.B.name_ar || c.B.name_en;
  const paras = (a) => (a || []).map((p) => `<p>${esc(p)}</p>`).join('');

  const body = `${draft ? DRAFT_BANNER : ''}<div class="pagehead"><div class="wrap"><div class="page-emblem"><svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#clipboard"></use></svg></div>
<div class="eyebrow"><a href="/products">المنتجات</a> · مقارنة</div>
<h1>${esc(c.name)}</h1>${c.lead ? `<p>${esc(c.lead)}</p>` : ''}</div></div>
<section><div class="wrap prose guide-body">
${vids.map((v) => videoBlock(v)).join('')}
${paras(c.intro)}
<div class="cmp-wrap"><table class="cmp-table"><thead><tr><th scope="col"></th><th scope="col">${esc(nA)}</th><th scope="col">${esc(nB)}</th></tr></thead>
<tbody>${(c.rows || []).map((r) => `<tr><th scope="row">${esc(r.label)}</th><td>${esc(r.a)}</td><td>${esc(r.b)}</td></tr>`).join('')}</tbody></table></div>
${paras(c.outro)}
${(c.sources || []).length ? `<p class="cmp-sources">المصادر: ${c.sources.map((s) => s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener nofollow">${esc(s.label)}</a>` : esc(s.label)).join(' · ')}</p>` : ''}
</div></section>
<section><div class="wrap"><div class="prod-grid med-grid">${card(c.A)}${card(c.B)}</div></div></section>
<section><div class="wrap prose guide-body"><div class="disclaimer">${DISCLAIMER}</div></div></section>`;

  const article = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: c.name, description: c.description, url: SITE + path, inLanguage: 'ar', author: ORG, publisher: ORG,
    ...(c.updated ? { dateModified: c.updated, datePublished: c.published || c.updated } : {}),
    ...(c.keywords && c.keywords.length ? { keywords: c.keywords.join(', ') } : {}),
    about: [{ '@type': 'Product', name: c.A.name_en, url: `${SITE}/products/${c.A.slug}` }, { '@type': 'Product', name: c.B.name_en, url: `${SITE}/products/${c.B.slug}` }],
  };
  return htmlResponse(page({ path, title: c.title, description: c.description, robots: draft ? 'noindex,nofollow' : 'index,follow', body,
    jsonld: [article, breadcrumb([['الرئيسية', '/'], ['المنتجات', '/products'], [c.name, path]]), ...vids.map((v) => videoLd(v, path))] }));
}
