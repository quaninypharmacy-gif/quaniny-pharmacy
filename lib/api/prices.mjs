// 🆕 28/11/2026 سعر الطلب من الكتالوج مش من المتصفح — قبل كده السيرفر كان بيصدّق السعر اللي السلة باعتاه،
// فأي حد يقدر يطلب صنف بـ 1 جنيه ويوصل تليجرام كده. نفس المصدر اللي الصفحات بتتبني منه (data/catalog.json
// + catalog-overrides.json بالـ id)، بـ require عشان الملفين يتحزموا جوه الـ function على Vercel.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const catalog = require('../../data/catalog.json');
let overrides = {};
try { overrides = require('../../data/catalog-overrides.json').by_id || {}; } catch (e) { /* مفيش تصحيحات */ }

const byId = new Map();
for (const it of catalog.items) {
  const o = overrides[it.id];
  const price = Number(o && o.price != null ? o.price : it.price);
  if (price > 0) byId.set(String(it.id), { price, name: (o && o.name_ar) || it.name_ar || it.name_en });
}
// id جاي من السلة 'm<رقم>' → { price, name } أو null لو الصنف مش فى الكتالوج
export function catalogPrice(cartId) {
  const m = /^m(\d{1,9})$/.exec(String(cartId || ''));
  return m ? byId.get(m[1]) || null : null;
}
