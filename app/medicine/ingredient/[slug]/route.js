// /medicine/ingredient/<slug> — صفحة مادة فعالة: كل الأصناف والتركيزات اللي عندنا (SPEC §5.4)
// صفحة واحدة غنية للمادة أقوى فى البحث من 10 صفحات أصناف شبه بعض.
import { ingredients, getIngredient } from '../../../../lib/catalog/data.mjs';
import { page, htmlResponse, esc, card, breadcrumb, ORG, SITE, DISCLAIMER } from '../../../../lib/catalog/html.mjs';

export const dynamic = 'force-static';
export const dynamicParams = false;
export function generateStaticParams() { return ingredients.map((g) => ({ slug: g.slug })); }

export async function GET(_req, { params }) {
  const g = getIngredient((await params).slug);
  if (!g) return new Response('Not found', { status: 404 });
  const path = `/medicine/ingredient/${g.slug}`;
  const prices = g.items.map((i) => i.price);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  const strengths = [...new Set(g.items.map((i) => i.strength).filter(Boolean))];
  const forms = [...new Set(g.items.map((i) => i.form).filter(Boolean))];
  const usage = (g.items.find((i) => i.usage) || {}).usage || '';

  const title = `${g.name} — ${g.items.length} صنف بأسعارها | صيدلية كوانيني`;
  const description = `${g.name}: ${g.items.length} صنف في صيدلية كوانيني${strengths.length ? ` بتركيزات ${strengths.slice(0, 4).join('، ')}` : ''}، من ${lo} لـ ${hi} جنيه. ${usage}`.slice(0, 158);

  const body = `<div class="pagehead"><div class="wrap"><div class="page-emblem"><svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#pill"></use></svg></div>
<div class="eyebrow"><a href="/medicine">الأدوية والمنتجات</a> · مادة فعالة</div>
<h1 dir="ltr">${esc(g.name)}</h1><p>${g.items.length} صنف عندنا — من ${lo} لـ ${hi} جنيه.</p></div></div>
<section><div class="wrap prose med-intro">
${usage ? `<p>${esc(usage)}</p>` : ''}
<p>الأصناف دي فيها نفس المادة الفعالة <b dir="ltr">${esc(g.name)}</b>${strengths.length ? ` بتركيزات <span dir="ltr">${esc(strengths.join(' · '))}</span>` : ''}${forms.length ? ` وأشكال <span dir="ltr">${esc(forms.join(' · '))}</span>` : ''}. اختيار الصنف والتركيز بيرجع لروشتة الطبيب، والصيدلي بيراجع أي طلب قبل الصرف.</p>
<div class="disclaimer">${DISCLAIMER}</div>
</div></section>
<section><div class="wrap"><div class="prod-grid med-grid">${g.items.map(card).join('')}</div></div></section>`;

  const list = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: g.name, url: SITE + path, numberOfItems: g.items.length,
    itemListElement: g.items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/medicine/${it.slug}`, name: it.name_en })),
  };
  return htmlResponse(page({ path, title, description, body,
    jsonld: [list, breadcrumb([['الرئيسية', '/'], ['الأدوية والمنتجات', '/medicine'], [g.name, path]])] }));
}
