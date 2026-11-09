// صفحة صنف: /products/<slug> — بتتبني ثابتة وقت البناء لكل صنف مكتمل فى data/catalog.json (SPEC §5.4).
// 10/11/2026: اتنقلت من /medicine/<slug> واتفتحت لجوجل (index,follow) بقرار الصيدلي «اظهر كله لجوجل».
import { items, getItem, ingredientOf, alternativesOf, meta } from '../../../lib/catalog/data.mjs';
import { page, htmlResponse, esc, card, thumb, orderButton, breadcrumb, price, priceDate, ORG, SITE, DISCLAIMER } from '../../../lib/catalog/html.mjs';

export const dynamic = 'force-static';
export const dynamicParams = false;
export function generateStaticParams() { return items.map((it) => ({ slug: it.slug })); }

const FORM_AR = { tab: 'أقراص', cap: 'كبسولات', syrup: 'شراب', susp: 'معلق', amp: 'أمبول', vial: 'فيال', cream: 'كريم', gel: 'جل',
  oint: 'مرهم', drop: 'نقط', drops: 'نقط', spray: 'بخاخ', supp: 'لبوس', sachet: 'أكياس', lotion: 'لوشن', sol: 'محلول', solution: 'محلول', powder: 'بودرة' };
const formAr = (f) => FORM_AR[String(f || '').toLowerCase().replace(/[^a-z]/g, '')] || f;

const cut = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');

export async function GET(_req, { params }) {
  const { slug } = await params;
  const it = getItem(slug);
  if (!it) return new Response('Not found', { status: 404 });
  const ing = ingredientOf(it);
  const alts = alternativesOf(it);
  const nameAr = it.name_ar || it.name_en;
  const isDrug = it.type === 'drug';

  const title = cut(isDrug && it.active_ingredient ? `${nameAr} — ${it.active_ingredient} | صيدلية كوانيني` : `${nameAr} | صيدلية كوانيني`, 70);
  const description = cut(`${it.usage ? it.usage + ' ' : ''}${nameAr} (${it.name_en}) بسعر ${price(it.price)} من صيدلية كوانيني — توصيل في شبين القناطر والقليوبية.`, 158);

  const rows = [
    isDrug && it.active_ingredient && ['المادة الفعالة', ing ? `<a href="/products/ingredient/${ing.slug}">${esc(it.active_ingredient)}</a>` : esc(it.active_ingredient)],
    it.form && ['الشكل', esc(formAr(it.form))],
    it.strength && ['التركيز', `<span dir="ltr">${esc(it.strength)}</span>`],
    it.category && ['التصنيف', `<span dir="ltr">${esc(it.category)}</span>`],
  ].filter(Boolean);

  const body = `<div class="pagehead"><div class="wrap"><div class="page-emblem"><svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#${isDrug ? 'pill' : 'bottle'}"></use></svg></div>
<div class="eyebrow"><a href="/products">المنتجات</a>${ing ? ` · <a href="/products/ingredient/${ing.slug}">${esc(ing.name)}</a>` : ''}</div>
<h1>${esc(nameAr)}</h1><p dir="ltr">${esc(it.name_en)}</p></div></div>
<section><div class="wrap med-layout">
<div class="med-main prose">
${it.usage ? `<p class="med-usage">${esc(it.usage)}</p>` : ''}
${rows.length ? `<dl class="med-facts">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}
<div class="disclaimer">${DISCLAIMER}</div>
</div>
<aside class="med-buy">
${thumb(it)}
<div class="med-price">${price(it.price)}</div>
<div class="med-date">السعر آخر تحديث ${priceDate(meta.price_updated_at)}</div>
${orderButton(it)}
${it.rx ? '<p class="med-note">الصنف ده بيتصرف بروشتة — صوّرها وابعتها وهنراجعها ونتصل بيك.</p>' : '<p class="med-note">الدفع عند الاستلام — وهنتصل بيك نأكد الطلب قبل التوصيل.</p>'}
<a class="text-link" href="https://wa.me/201036181518?text=${encodeURIComponent('عايز أسأل عن ' + it.name_en)}" target="_blank" rel="noopener">اسأل الصيدلي على واتساب</a>
</aside>
</div></section>
${alts.length ? `<section><div class="wrap"><h2 class="med-h2">بدائل بنفس المادة والتركيز</h2><div class="prod-grid med-grid">${alts.map(card).join('')}</div></div></section>` : ''}`;

  const offer = { '@type': 'Offer', price: String(it.price), priceCurrency: 'EGP', url: `${SITE}/products/${it.slug}`, seller: ORG, priceValidUntil: undefined };
  const product = {
    '@context': 'https://schema.org',
    '@type': isDrug ? ['Product', 'Drug'] : 'Product',
    name: it.name_en, alternateName: it.name_ar || undefined,
    description: it.usage || undefined, category: it.category || undefined, url: `${SITE}/products/${it.slug}`,
    ...(isDrug && it.active_ingredient ? { activeIngredient: it.active_ingredient, nonProprietaryName: it.active_ingredient } : {}),
    ...(isDrug && it.form ? { dosageForm: it.form } : {}),
    offers: offer,
  };
  const trail = [['الرئيسية', '/'], ['المنتجات', '/products']];
  if (ing) trail.push([ing.name, `/products/ingredient/${ing.slug}`]);
  trail.push([nameAr, `/products/${it.slug}`]);

  return htmlResponse(page({ path: `/products/${it.slug}`, title, description, jsonld: [JSON.parse(JSON.stringify(product)), breadcrumb(trail)], body }));
}
