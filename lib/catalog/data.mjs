// بيانات الكتالوج وقت البناء بس — data/catalog.json بيطلع من Quaniny (tools/export-public-catalog.js على PC1)
// ومفيش فيه غير الحقول المسموحة. ممنوع يتحمّل فى المتصفح كله (قياس dd498c6: 4000 صنف فى ملف مشترك = الرئيسية أبطأ 9 مرات).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const catalog = JSON.parse(readFileSync(join(process.cwd(), 'data', 'catalog.json'), 'utf8'));

export const PER_PAGE = 48;
export const items = catalog.items;
export const meta = { generated_at: catalog.generated_at, price_updated_at: catalog.price_updated_at, count: items.length };

const bySlug = new Map(items.map((it) => [it.slug, it]));
export const getItem = (slug) => bySlug.get(slug) || null;

// ترتيب الفهرس: بالاسم الإنجليزي (ثابت بين التصديرات، فالصفحات متتنقلش من صفحة لصفحة من غير سبب)
export const sorted = [...items].sort((a, b) => a.name_en.localeCompare(b.name_en, 'en', { sensitivity: 'base' }) || a.id - b.id);
export const pageCount = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
export const pageItems = (n) => sorted.slice((n - 1) * PER_PAGE, n * PER_PAGE);

// صفحة المادة الفعالة: للمواد المكتوبة بالإنجليزي اللي ليها 3 أصناف أو أكتر (SPEC §5.4)
const ingKey = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
export const ingSlug = (s) => ingKey(s).replace(/%/g, ' pct ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const groups = new Map();
for (const it of items) {
  if (it.type !== 'drug' || !/^[a-z]/i.test(it.active_ingredient)) continue;
  const k = ingKey(it.active_ingredient);
  if (!groups.has(k)) groups.set(k, { name: it.active_ingredient, slug: ingSlug(k), items: [] });
  groups.get(k).items.push(it);
}
export const ingredients = [...groups.values()].filter((g) => g.items.length >= 3 && g.slug)
  .map((g) => ({ ...g, items: g.items.sort((a, b) => a.name_en.localeCompare(b.name_en, 'en')) }));
const ingBySlug = new Map(ingredients.map((g) => [g.slug, g]));
const ingByKey = new Map(ingredients.map((g) => [ingKey(g.name), g]));
export const getIngredient = (slug) => ingBySlug.get(slug) || null;
export const ingredientOf = (it) => ingByKey.get(ingKey(it.active_ingredient)) || null;

// بدائل: نفس المادة الفعالة ونفس التركيز (نفس فكرة /api/drugs/alternatives فى Quaniny، من غير شرط الرصيد)
export function alternativesOf(it, max = 8) {
  const g = ingredientOf(it);
  if (!g) return [];
  const conc = String(it.strength || '').toLowerCase().replace(/\s+/g, '');
  return g.items.filter((x) => x.id !== it.id && conc && String(x.strength || '').toLowerCase().replace(/\s+/g, '') === conc).slice(0, max);
}
