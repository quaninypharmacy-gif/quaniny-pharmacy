export default async function handler(req, res) {
  const tg = !!process.env.TG_BOT_TOKEN, chat = !!process.env.TG_CHAT_ID;
  const sbUrl = !!process.env.SUPABASE_URL, sbKey = !!process.env.SUPABASE_SERVICE_KEY;
  const tally = !!process.env.TALLY_SIGNING_SECRET;
  let telegram = 'not_tested', db = 'not_tested';
  if (tg && chat) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/getMe`);
      const d = await r.json();
      telegram = d.ok ? `ok:@${d.result.username}` : `fail:${d.description}`;
    } catch (e) { telegram = 'fail:network'; }
  }
  if (sbUrl && sbKey) {
    try {
      const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/orders?select=id&limit=1`, {
        headers: { apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` }
      });
      db = r.ok ? 'ok' : `fail:${r.status}`;
    } catch (e) { db = 'fail:network'; }
  }
  return res.status(200).json({
    env: { TG_BOT_TOKEN: tg, TG_CHAT_ID: chat, SUPABASE_URL: sbUrl, SUPABASE_SERVICE_KEY: sbKey, TALLY_SIGNING_SECRET: tally },
    telegram, db, runtime: process.version
  });
}
