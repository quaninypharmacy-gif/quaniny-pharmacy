// 🆕 27/11/2026 /guides/<slug> — دليل علمي عن مادة (مثال: الهيالورونيك أسيد) فيه فيديو المادة + الخلاصة + لينكات أصنافنا
// اللي فيها المادة (قرار الصيدلي 27/11). المحتوى فى data/guides.json، ومبيتبنيش غير لما reviewed = true.
// صفحة المادة الفعالة /products/ingredient/<slug> للأدوية بس (≥3 أصناف بنفس المادة بالظبط)، فالدليل نوع منفصل
// للكوزمو والمواد اللي داخلة فى تركيبات — ولو ليها صفحة مادة، الدليل بيربطلها (related_ingredient).
import { getGuide, guides, guideVideos, isDraft } from '../../../lib/catalog/content.mjs';
import { getIngredient } from '../../../lib/catalog/data.mjs';
import { page, htmlResponse, esc, card, breadcrumb, ORG, SITE, DISCLAIMER } from '../../../lib/catalog/html.mjs';
import { videoBlock, videoLd, DRAFT_BANNER } from '../../../lib/catalog/video.mjs';

export const dynamic = 'force-static';
export const dynamicParams = false;
export function generateStaticParams() { return guides.map((g) => ({ slug: g.slug })); }

export async function GET(_req, { params }) {
  const g = getGuide((await params).slug);
  if (!g) return new Response('Not found', { status: 404 });
  const path = `/guides/${g.slug}`;
  const draft = isDraft(g);
  const vids = guideVideos(g.slug);
  const ing = g.related_ingredient ? getIngredient(g.related_ingredient) : null;
  const paras = (a) => (a || []).map((p) => `<p>${esc(p)}</p>`).join('');
  // 🆕 27/11 دليل لأدوية بروشتة (حقن التخسيس): مكانه «اسأل الصيدلي» مش «المنتجات»، ومن غير أصناف ولا سلة — بيخلص بسؤال على الواتساب
  const sec = g.section || { name: 'المنتجات', href: '/products' };
  const cta = g.cta ? `<p class="learn-more">${esc(g.cta)}: <a href="https://wa.me/201036181518" target="_blank" rel="noopener" dir="ltr">واتساب 01036181518</a> · <a href="/ask">اسأل الصيدلي</a></p>` : '';

  const body = `${draft ? DRAFT_BANNER : ''}<div class="pagehead"><div class="wrap"><div class="page-emblem"><svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#bottle"></use></svg></div>
<div class="eyebrow"><a href="${sec.href}">${esc(sec.name)}</a> · دليل</div>
<h1>${esc(g.name)}</h1>${g.lead ? `<p>${esc(g.lead)}</p>` : ''}</div></div>
<section><div class="wrap prose guide-body">
${vids.map((v) => videoBlock(v)).join('')}
${paras(g.intro)}
</div></section>
${g.itemsList.length ? `<section><div class="wrap"><h2 class="med-h2">${esc(g.products_heading || 'منتجات عندنا فيها ' + g.name)}</h2><div class="prod-grid med-grid">${g.itemsList.map(card).join('')}</div></div></section>` : ''}
<section><div class="wrap prose guide-body">
${(g.sections || []).map((s) => `<h2>${esc(s.h2)}</h2>${paras(s.p)}${s.list ? `<ul>${s.list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`).join('\n')}
${ing ? `<p class="learn-more">أدوية فيها نفس المادة: <a href="/products/ingredient/${ing.slug}" dir="ltr">${esc(ing.name)}</a></p>` : ''}
${cta}
<div class="disclaimer">${DISCLAIMER}</div>
</div></section>`;

  const article = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: g.name, description: g.description, url: SITE + path, inLanguage: 'ar',
    author: ORG, publisher: ORG, ...(g.updated ? { dateModified: g.updated, datePublished: g.published || g.updated } : {}),
    ...(g.keywords && g.keywords.length ? { keywords: g.keywords.join(', ') } : {}),
    ...(g.about ? { about: { '@type': 'Thing', name: g.about } } : {}),
  };
  return htmlResponse(page({ path, active: sec.href, title: g.title, description: g.description, robots: draft ? 'noindex,nofollow' : 'index,follow', body,
    jsonld: [article, breadcrumb([['الرئيسية', '/'], [sec.name, sec.href], [g.name, path]]), ...vids.map((v) => videoLd(v, path))] }));
}
