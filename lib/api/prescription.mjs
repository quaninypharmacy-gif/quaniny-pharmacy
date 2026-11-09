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
async function tgText(text) {
  const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML', disable_web_page_preview: true })
  });
  const d = await r.json();
  if (!d.ok) throw new Error('telegram_failed:' + (d.description || ''));
}
async function tgPhoto(dataUrl, caption) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return false;
  const bytes = Buffer.from(m[2], 'base64');
  if (bytes.length > 4 * 1024 * 1024) return false;
  const fd = new FormData();
  fd.append('chat_id', TG_CHAT);
  if (caption) fd.append('caption', caption);
  fd.append('photo', new Blob([bytes], { type: m[1] }), 'rx.jpg');
  const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendPhoto`, { method: 'POST', body: fd });
  const d = await r.json();
  if (!d.ok) console.error('photo_failed', d.description);
  return !!d.ok;
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
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method_not_allowed' }); }
  if (!TG_TOKEN || !TG_CHAT) return res.status(500).json({ error: 'not_configured' });

  const body = await readJson(req);
  const name = clean(body.name, 80), phone = clean(body.phone, 20).replace(/\s|-/g, '');
  const address = clean(body.address, 300), note = clean(body.note, 400), company = clean(body.company, 80);
  const mode = body.mode === 'contract' ? 'contract' : 'rx';
  const careType = body.careType === 'monthly' ? 'monthly' : 'daily';
  const photos = Array.isArray(body.photos) ? body.photos.slice(0, 3) : [];

  if (name.length < 2) return res.status(400).json({ error: 'invalid_name' });
  if (!/^0?1[0-9]{9}$/.test(phone)) return res.status(400).json({ error: 'invalid_phone' });
  if (address.length < 6) return res.status(400).json({ error: 'invalid_address' });
  if (body.consent !== true) return res.status(400).json({ error: 'consent_required' });
  if (!photos.length && !note) return res.status(400).json({ error: 'need_photo_or_note' });

  const no = orderNo('R');
  let refillDue = null;
  if (careType === 'monthly') { const d = new Date(); d.setDate(d.getDate() + 25); refillDue = d.toISOString().slice(0, 10); }

  let msg = `🩺 <b>${mode === 'contract' ? 'طلب صرف تعاقدات' : 'طلب صرف روشتة'} — ${esc(no)}</b>\n━━━━━━━━━━━━━━\n` +
    `👤 <b>الاسم:</b> ${esc(name)}\n📞 <b>التليفون:</b> ${esc(phone)}\n📍 <b>العنوان:</b> ${esc(address)}\n` +
    `⏱ <b>نوع الصرف:</b> ${careType === 'monthly' ? 'شهري (مزمن)' : 'يومي'}\n`;
  if (mode === 'contract' && company) msg += `🏦 <b>شركة التأمين:</b> ${esc(company)}\n`;
  if (refillDue) msg += `🔔 <b>تنبيه إعادة الصرف:</b> ${refillDue}\n`;
  if (note) msg += `📝 <b>ملاحظات:</b> ${esc(note)}\n`;
  msg += `📷 <b>صور الروشتة:</b> ${photos.length}`;

  try { await tgText(msg); }
  catch (e) { console.error('rx_notify_failed', e && e.message); return res.status(502).json({ error: 'notify_failed' }); }

  let sentPhotos = 0;
  for (let i = 0; i < photos.length; i++) {
    try { if (await tgPhoto(photos[i], `${no} — صورة ${i + 1}`)) sentPhotos++; } catch (e) { console.error('photo_err', e && e.message); }
  }

  await persist({
    order_no: no, kind: 'prescription', care_type: careType,
    customer_name: name, phone, address,
    items: [{ name: mode === 'contract' ? `تعاقدات${company ? ' - ' + company : ''}` : 'روشتة', qty: 1, price: 0 }],
    total: 0, note: note || null, refill_due_on: refillDue
  });

  return res.status(200).json({ ok: true, orderNo: no, photos: sentPhotos, refillDue });
}
