// 🆕 [10/11/2026] صور الأصناف (قرار الصيدلي: صورة الشركة + قالب كوانيني، تجربة 10 أصناف الأول).
// الصور نفسها فى ريبو منفصل (quaninypharmacy-gif/quaniny-images) مش هنا — آلاف الصور تتقل ريبو الموقع وبناه.
// data/images.json = مين ليه صورة + عنوان الريبو. تغيير الاستضافة (jsDelivr → Cloudflare Pages) = تغيير base بس.
// IMG_BASE فى env للتجربة المحلية بس.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const file = join(process.cwd(), 'data', 'images.json');
const conf = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { base: '', ids: [] };
const BASE = (process.env.IMG_BASE || conf.base || '').replace(/\/$/, '');
const has = new Set(BASE ? conf.ids : []);

export const imgOf = (it) => (has.has(it.id) ? { s: `${BASE}/p/${it.id}-400.webp`, l: `${BASE}/p/${it.id}-1000.webp` } : null);
