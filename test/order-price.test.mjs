// 28/11/2026: السيرفر لازم يحسب السعر من الكتالوج مش من المتصفح، ويقول فى تليجرام لو الحفظ فشل.
// تشغيل: node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const catalog = require('../data/catalog.json');

process.env.TG_BOT_TOKEN = 'x'; process.env.TG_CHAT_ID = '1';
delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_KEY;
let sent = [];
globalThis.fetch = async (url, opt) => {
  if (String(url).includes('api.telegram.org')) { sent.push(JSON.parse(opt.body).text); return { json: async () => ({ ok: true }) }; }
  return { ok: false, json: async () => ({}) }; // availability → مفيش منع
};
const { default: handler } = await import('../lib/api/order.mjs');
const call = async (body) => { let code, out; const res = { setHeader() {}, status(c) { code = c; return this; }, json(o) { out = o; return this; } };
  await handler({ method: 'POST', body }, res); return { code, out }; };
const base = { name: 'تجربة', phone: '01000000000', address: 'شارع التجربة 1' };
const it = catalog.items.find((x) => x.price > 10);

test('سعر المتصفح بيتجاهل — الإجمالي من الكتالوج', async () => {
  sent = [];
  const r = await call({ ...base, items: [{ id: 'm' + it.id, name: 'أي اسم', qty: 2, price: 1 }] });
  assert.equal(r.code, 200);
  assert.equal(r.out.total, it.price * 2);
  assert.match(sent[0], new RegExp(`= ${it.price * 2} ج`));
});
test('صنف مش فى الكتالوج بيترفض باسمه', async () => {
  const r = await call({ ...base, items: [{ id: 'm999999999', name: 'صنف وهمي', qty: 1, price: 1 }, { name: 'من غير id', qty: 1, price: 5 }] });
  assert.equal(r.code, 409);
  assert.equal(r.out.error, 'unknown_item');
  assert.deepEqual(r.out.names, ['صنف وهمي', 'من غير id']);
});
test('الحفظ فشل ← تليجرام فيه تحذير والزبون ياخد ok', async () => {
  sent = [];
  const r = await call({ ...base, items: [{ id: 'm' + it.id, qty: 1 }] });
  assert.equal(r.code, 200);
  assert.match(sent[0], /مااتسجلش فى الداتابيز/);
});
