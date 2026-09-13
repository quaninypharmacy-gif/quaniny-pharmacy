const TG_TOKEN = process.env.TG_BOT_TOKEN, TG_CHAT = process.env.TG_CHAT_ID;
const SB_URL = process.env.SUPABASE_URL, SB_KEY = process.env.SUPABASE_SERVICE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

async function tg(text) {
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML', disable_web_page_preview: true })
  });
}
export default async function handler(req, res) {
  if (CRON_SECRET) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${CRON_SECRET}`) return res.status(401).json({ error: 'unauthorized' });
  }
  if (!SB_URL || !SB_KEY || !TG_TOKEN || !TG_CHAT) return res.status(200).json({ ok: true, skipped: 'not_configured' });

  const today = new Date().toISOString().slice(0, 10);
  const h = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
  const q = `${SB_URL}/rest/v1/orders?select=id,order_no,customer_name,phone,refill_due_on&refill_due_on=lte.${today}&refill_notified_at=is.null&limit=50`;
  const r = await fetch(q, { headers: h });
  if (!r.ok) return res.status(502).json({ error: 'db_read_failed' });
  const rows = await r.json();
  if (!rows.length) return res.status(200).json({ ok: true, due: 0 });

  let sent = 0;
  for (const row of rows) {
    try {
      await tg(`🔔 <b>تذكير إعادة صرف — علاج شهري</b>\n━━━━━━━━━━━━━━\n👤 ${row.customer_name}\n📞 ${row.phone}\n🧾 ${row.order_no}\n\nدواؤه قارب على الانتهاء — كلّمه قبل ما يخلص.`);
      await fetch(`${SB_URL}/rest/v1/orders?id=eq.${row.id}`, {
        method: 'PATCH', headers: { ...h, Prefer: 'return=minimal' },
        body: JSON.stringify({ refill_notified_at: new Date().toISOString() })
      });
      sent++;
    } catch (e) {}
  }
  return res.status(200).json({ ok: true, sent });
}
