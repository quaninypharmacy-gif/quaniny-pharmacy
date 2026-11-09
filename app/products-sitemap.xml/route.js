// /products-sitemap.xml — خريطة الأصناف لجوجل (🆕 10/11/2026، «اظهر كله لجوجل»). منفصلة عن /sitemap.xml
// (16 صفحة الموقع اللي متسجلة فى Search Console) ومتسجلة فى robots.txt. الحد 50 ألف رابط — إحنا ~4 آلاف.
import { items, ingredients, pageCount, meta } from '../../lib/catalog/data.mjs';
import { SITE } from '../../lib/catalog/html.mjs';

export const dynamic = 'force-static';
export function GET() {
  const day = String(meta.generated_at || '').slice(0, 10);
  const lm = /^\d{4}-\d{2}-\d{2}$/.test(day) ? `<lastmod>${day}</lastmod>` : '';
  const urls = [
    ...Array.from({ length: pageCount - 1 }, (_, i) => `/products/page/${i + 2}`),
    ...ingredients.map((g) => `/products/ingredient/${g.slug}`),
    ...items.map((it) => `/products/${it.slug}`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${SITE}${u}</loc>${lm}</url>`).join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
