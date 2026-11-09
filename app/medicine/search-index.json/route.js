// فهرس البحث: بيتحمّل لما الزبون يكتب فى خانة البحث بس (catalog.js) — مش مع أي صفحة.
// [slug, اسم عربي, اسم إنجليزي, مادة فعالة, سعر] — أقل حقول تكفي للبحث والعرض.
import { sorted } from '../../../lib/catalog/data.mjs';

export const dynamic = 'force-static';
export function GET() {
  const rows = sorted.map((it) => [it.slug, it.name_ar, it.name_en, it.active_ingredient, it.price]);
  return new Response(JSON.stringify(rows), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
