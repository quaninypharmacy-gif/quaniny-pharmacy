// 🆕 [10/11/2026] صور الأصناف (قرار الصيدلي: صورة الشركة + قالب كوانيني، تجربة 10 أصناف الأول).
// الصور نفسها فى ريبو منفصل (quaninypharmacy-gif/quaniny-images) مش هنا — آلاف الصور تتقل ريبو الموقع وبناه.
// data/images.json = مين ليه صورة + عنوان الريبو. تغيير الاستضافة (كانت jsDelivr، ومن 10/11 Cloudflare Pages) = تغيير base بس.
// IMG_BASE فى env للتجربة المحلية بس.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const file = join(process.cwd(), 'data', 'images.json');
const conf = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { base: '', ids: [] };
const BASE = (process.env.IMG_BASE || conf.base || '').replace(/\/$/, '');
const has = new Set(BASE ? conf.ids : []);
// 🆕 [10/11/2026] الصور على Cloudflare Pages بكاش سنة (immutable) — ?v= بيتغير مع كل رفع جديد فالصورة المتعدلة بتوصل
const Q = conf.v ? `?v=${conf.v}` : '';

export const imgOf = (it) => (has.has(it.id) ? { s: `${BASE}/p/${it.id}-400.webp${Q}`, l: `${BASE}/p/${it.id}-1000.webp${Q}` } : null);
