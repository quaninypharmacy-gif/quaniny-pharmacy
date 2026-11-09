// Tally webhook → Supabase.orders + Telegram.
// بيخلي فورم العلاج المزمن على Tally يغذّي نفس المحرّك اللي بيغذّيه /delivery?mode=rx،
// عشان كرون /api/refills يلاقي refill_due_on ويدق على المريض قبل ما علاجه يخلص.
// من غير الدالة دي، التسجيل بيقع في Airtable ومحدش بينبّه عليه.
import { createHmac, timingSafeEqual } from 'node:crypto';

const TG_TOKEN = process.env.TG_BOT_TOKEN, TG_CHAT = process.env.TG_CHAT_ID;
const SB_URL = process.env.SUPABASE_URL, SB_KEY = process.env.SUPABASE_SERVICE_KEY;
const TALLY_SECRET = process.env.TALLY_SIGNING_SECRET;

const esc = (s) => String(s == null ? '' : s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
const clean = (s, max) => String(s == null ? '' : s).trim().slice(0, max);

async function readRaw(req) {
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw;
}

// Tally بيوقّع بـ HMAC-SHA256 base64. المثال الرسمي بيوقّع على JSON.stringify(الجسم المفكوك)،
// فبنقارن بالخام وبالمعاد-تسلسله — الاتنين، عشان أي فرق في المسافات ميكسرش التحقق.
function signatureOk(raw, reSerialized, received) {
  if (!received) return false;
  const got = Buffer.from(String(received));
  for (const payload of new Set([raw, reSerialized])) {
    const want = Buffer.from(createHmac('sha256', TALLY_SECRET).update(payload).digest('base64'));
    if (want.length === got.length && timingSafeEqual(want, got)) return true;
  }
  return false;
}

// بيحوّل أي نوع حقل في Tally لنص مقروء. اختيارات المتعدد بتيجي كـ ids فبنرجّعها لنصها.
function answerText(f) {
  const v = f && f.value;
  if (v == null || v === '') return '';
  if (Array.isArray(v)) {
    const opts = f.options || f.columns || [];
    return v.map((item) => {
      if (item && typeof item === 'object') return item.name || item.url || '';
      const hit = opts.find((o) => o.id === item);
      return hit ? hit.text : String(item);
    }).filter(Boolean).join('، ');
  }
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'boolean') return v ? 'نعم' : 'لا';
  return String(v);
}

const fileUrls = (fields) => fields
  .filter((f) => f.type === 'FILE_UPLOAD' && Array.isArray(f.value))
  .flatMap((f) => f.value.map((x) => x && x.url).filter(Boolean));

function orderNo() {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  return `C${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.floor(Math.random() * 900 + 100)}`;
}

async function tgText(text) {
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

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method_not_allowed' }); }
  if (!TG_TOKEN || !TG_CHAT) return res.status(500).json({ error: 'not_configured' });
  if (!TALLY_SECRET) return res.status(500).json({ error: 'signing_secret_missing' });

  const raw = await readRaw(req);
  let body;
  try { body = JSON.parse(raw || '{}'); } catch (e) { return res.status(400).json({ error: 'bad_json' }); }

  if (!signatureOk(raw, JSON.stringify(body), req.headers['tally-signature'])) {
    return res.status(401).json({ error: 'invalid_signature' });
  }
  if (body.eventType && body.eventType !== 'FORM_RESPONSE') return res.status(200).json({ ok: true, ignored: body.eventType });

  const data = body.data || {};
  const fields = Array.isArray(data.fields) ? data.fields : [];
  const byType = (t) => fields.filter((f) => f.type === t);
  const labelHas = (f, s) => String(f.label || '').includes(s);

  const texts = byType('INPUT_TEXT');
  const name = clean(answerText(texts.find((f) => !labelHas(f, 'عنوان')) || texts[0]), 80);
  const phone = clean(answerText(byType('INPUT_PHONE_NUMBER')[0]), 20).replace(/[\s-]/g, '').replace(/^\+?20/, '0');
  const address = clean(answerText(texts.find((f) => labelHas(f, 'عنوان'))), 300);

  // تاريخ نزول العلاج الشهري هو refill_due_on نفسه — ده اللي بيشغّل الكرون.
  const dateAnswer = clean(answerText(byType('INPUT_DATE')[0]), 10);
  let refillDue = /^\d{4}-\d{2}-\d{2}$/.test(dateAnswer) ? dateAnswer : null;
  if (!refillDue) { const d = new Date(); d.setDate(d.getDate() + 25); refillDue = d.toISOString().slice(0, 10); }

  if (name.length < 2) return res.status(200).json({ ok: false, skipped: 'no_name' });

  // باقي الإجابات بتتبعت زي ما هي — لو اتضاف سؤال جديد للفورم بيظهر هنا من غير تعديل كود.
  const handled = new Set([...texts.slice(0, 2), byType('INPUT_PHONE_NUMBER')[0], byType('INPUT_DATE')[0]].filter(Boolean));
  const rest = fields
    .filter((f) => !handled.has(f) && f.type !== 'FILE_UPLOAD' && f.type !== 'HIDDEN_FIELDS' && answerText(f))
    .map((f) => `• <b>${esc(clean(f.label, 60))}:</b> ${esc(clean(answerText(f), 200))}`);

  const photos = fileUrls(fields);
  const no = orderNo();

  let msg = `💊 <b>تسجيل جديد — برنامج العلاج المزمن — ${esc(no)}</b>\n━━━━━━━━━━━━━━\n` +
    `👤 <b>الاسم:</b> ${esc(name)}\n📞 <b>التليفون:</b> ${esc(phone || '—')}\n`;
  if (address) msg += `📍 <b>العنوان:</b> ${esc(address)}\n`;
  msg += `🔔 <b>ميعاد إعادة الصرف:</b> ${refillDue}${dateAnswer ? '' : ' (تقديري — المريض مكتبش تاريخ)'}\n`;
  if (rest.length) msg += `━━━━━━━━━━━━━━\n${rest.join('\n')}\n`;
  if (photos.length) msg += `━━━━━━━━━━━━━━\n📷 <b>الروشتة / الكارنيه:</b>\n${photos.map(esc).join('\n')}\n`;
  msg += `\n🗂 المصدر: Tally (${esc(clean(data.formName, 60) || 'objOpx')})`;

  // لو تليجرام وقع بنرجّع 502 عشان Tally يعيد المحاولة — ولسه مكتبناش صف، فمفيش تكرار.
  try { await tgText(msg); }
  catch (e) { console.error('chronic_notify_failed', e && e.message); return res.status(502).json({ error: 'notify_failed' }); }

  const saved = await persist({
    order_no: no, kind: 'prescription', care_type: 'monthly',
    customer_name: name, phone: phone || null, address: address || null,
    items: [{ name: 'تسجيل علاج مزمن (Tally)', qty: 1, price: 0 }],
    total: 0,
    note: clean([...rest.map((l) => l.replace(/<[^>]+>/g, '')), ...photos].join(' | '), 400) || null,
    refill_due_on: refillDue
  });
  if (!saved) console.error('chronic_persist_failed', no);

  // 200 حتى لو التسجيل فشل: التنبيه وصل خلاص، وإعادة المحاولة هتكرّره على تليجرام.
  return res.status(200).json({ ok: true, orderNo: no, refillDue, saved });
}
