const TG_TOKEN = process.env.TG_BOT_TOKEN, TG_CHAT = process.env.TG_CHAT_ID;
const SB_URL = process.env.SUPABASE_URL, SB_KEY = process.env.SUPABASE_SERVICE_KEY;
const esc = (s) => String(s == null ? '' : s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
const clean = (s, max) => String(s == null ? '' : s).trim().slice(0, max);

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  let raw = '';
  for await (const chunk of req) raw += chunk;
  try { return JSON.parse(raw || '{}'); } catch (e) { return {}; }
}
function orderNo(prefix) {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  return `${prefix}${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.floor(Math.random() * 900 + 100)}`;
}
async function sendTelegram(text) {
  if (!TG_TOKEN || !TG_CHAT) throw new Error('telegram_not_configured');
  const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML', disable_web_page_preview: true })
  });
  const d = await r.json();
  if (!d.ok) throw new Error('telegram_failed:' + (d.description || ''));
}
async function persist(row) {
  if (!SB_URL || !SB_KEY) return false;
  try {
    const r = await fetch(`${SB_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(row)
    });
    return r.ok;
  } catch (e) { return false; }
}
/* 🆕 26/11/2026 (قرار الصيدلي 26/11) الصنف الغير متوفر ميتطلبش — الفحص هنا لأن زرار السلة لوحده ممكن يتخطى
   (سلة قديمة، صفحة مفتوحة من بدري، طلب مباشر). نفس قاعدة public/app.js بالظبط: المنع على «غير متوفر» المؤكد بس.
   الملف مااتقراش فى 2.5 ثانية / بايظ / أقدم من 48 ساعة ← الطلب يعدّي (الصيدلية بتتصل تأكد قبل التوصيل)، عشان
   عطل فى ملف التوافر ميوقفش كل الطلبات. */
const AV_URLS = ['https://quaniny-images.pages.dev/api/availability.json', 'https://quaniny-images.pages.dev/availability.json'];
const AV_MAX_AGE = 48 * 3600 * 1000;
async function fetchOutSet() {
  for (const url of AV_URLS) {
    try {
      const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(2500) });
      if (!r.ok) continue;
      const a = await r.json();
      if (!a || a.v !== 2 || !Array.isArray(a.out)) continue;
      const checked = Date.parse(a.checked_at);
      if (!checked || Date.now() - checked > AV_MAX_AGE) return null; // قديم ← مفيش منع
      return new Set(a.out.map(String));
    } catch (e) { /* جرّب الاحتياطي */ }
  }
  return null;
}
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method_not_allowed' }); }
  if (!TG_TOKEN || !TG_CHAT) return res.status(500).json({ error: 'not_configured' });

  const body = await readJson(req);
  const name = clean(body.name, 80), phone = clean(body.phone, 20).replace(/\s|-/g, '');
  const address = clean(body.address, 300), note = clean(body.note, 400);
  const items = Array.isArray(body.items) ? body.items.slice(0, 40) : [];

  if (name.length < 2) return res.status(400).json({ error: 'invalid_name' });
  if (!/^0?1[0-9]{9}$/.test(phone)) return res.status(400).json({ error: 'invalid_phone' });
  if (address.length < 6) return res.status(400).json({ error: 'invalid_address' });
  if (!items.length) return res.status(400).json({ error: 'empty_cart' });

  let total = 0; const lines = [], pids = [];
  for (const it of items) {
    const n = clean(it && it.name, 120);
    const q = Math.max(1, Math.min(99, parseInt(it && it.qty, 10) || 1));
    const p = Math.max(0, Math.min(100000, Number(it && it.price) || 0));
    if (!n) continue;
    total += p * q; lines.push({ name: n, qty: q, price: p });
    // id = 'm<رقم>' لأصناف الكتالوج. السلة القديمة (قبل 26/11) مبتبعتش id ← مبتتفحصش
    const id = String((it && it.id) || '');
    pids.push(/^m\d{1,9}$/.test(id) ? id.slice(1) : null);
  }
  if (!lines.length) return res.status(400).json({ error: 'empty_cart' });

  if (pids.some(Boolean)) {
    const outSet = await fetchOutSet();
    if (outSet) {
      const bad = lines.map((l, i) => ({ l, pid: pids[i] })).filter((x) => x.pid && outSet.has(x.pid));
      if (bad.length) return res.status(409).json({ error: 'out_of_stock', out: bad.map((x) => Number(x.pid)), names: bad.map((x) => x.l.name) });
    }
  }

  const no = orderNo('Q');
  const msg = `🛒 <b>طلب منتجات — ${esc(no)}</b>\n━━━━━━━━━━━━━━\n` +
    lines.map((l) => `• ${esc(l.name)} ×${l.qty} = ${l.price * l.qty} ج`).join('\n') +
    `\n━━━━━━━━━━━━━━\n💰 <b>الإجمالي:</b> ${total} ج — الدفع عند الاستلام\n` +
    `👤 <b>الاسم:</b> ${esc(name)}\n📞 <b>التليفون:</b> ${esc(phone)}\n📍 <b>العنوان:</b> ${esc(address)}\n` +
    (note ? `📝 <b>ملاحظات:</b> ${esc(note)}\n` : '');

  try { await sendTelegram(msg); }
  catch (e) { console.error('order_notify_failed', e && e.message); return res.status(502).json({ error: 'notify_failed' }); }

  await persist({ order_no: no, kind: 'shop', care_type: null, customer_name: name, phone, address, items: lines, total, note: note || null, refill_due_on: null });
  return res.status(200).json({ ok: true, orderNo: no, total });
}
