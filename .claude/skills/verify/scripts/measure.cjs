#!/usr/bin/env node
/* ⚠️ .cjs مقصود — نفس سبب serve.cjs ("type": "module" في الريبو). */
/* قياس CLS و LCP على موبايل مبطّأ. الرقم المرجعي المسجّل: CLS = 0.000
   على كل الصفحات. أي رقم فوق 0.1 معناه إن حاجة اتكسرت — غالبًا chrome()
   اتحركت من أول الـ body، أو صورة/عنصر اتضاف من غير مساحة محجوزة.
   التشغيل:  node measure.js [baseUrl] [path,path,...] */
/* playwright-core بيتدوّر عليه جنب السكربت افتراضيًا، والريبو مالوش
   node_modules. فبندوّر كمان في مكان التشغيل وفي PW_PATH — عشان
   `npm i playwright-core` في أي مجلد مؤقت يكفي. */
const { chromium } = (function () {
  const path = require('path');
  for (const t of ['playwright-core', path.join(process.cwd(), 'node_modules', 'playwright-core'), process.env.PW_PATH]) {
    if (!t) continue;
    try { return require(t); } catch (e) {}
  }
  console.error('مش لاقي playwright-core.\n  mkdir -p /tmp/pw && cd /tmp/pw && npm i playwright-core\n  ثم شغّل measure.cjs من /tmp/pw، أو حط PW_PATH على مساره.');
  process.exit(2);
})();
const EXE = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = process.argv[2] || 'http://127.0.0.1:8099';
const PAGES = (process.argv[3] || '/,/delivery,/delivery-areas,/insurance,/pharmacy/shibin-el-qanater,/products,/cart').split(',');

(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  console.log('الصفحة'.padEnd(34), 'CLS      LCP      أكبر إزاحة');
  console.log('-'.repeat(86));
  let worst = 0;
  for (const p of PAGES) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
    const pg = await ctx.newPage();
    const cdp = await ctx.newCDPSession(pg);
    // موبايل مصري على شبكة بطيئة — القياس على شبكة سريعة بيخفي المشاكل
    await cdp.send('Network.emulateNetworkConditions',
      { offline: false, latency: 300, downloadThroughput: 700 * 1024 / 8, uploadThroughput: 300 * 1024 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await pg.addInitScript(() => {
      window.__s = []; window.__lcp = 0;
      new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput)
        window.__s.push({ v: e.value, srcs: (e.sources || []).map(s => ({
          tag: s.node && s.node.tagName,
          cls: s.node && s.node.className && String(s.node.className).slice(0, 26),
          dy: Math.round((s.currentRect.y || 0) - (s.previousRect.y || 0)) })) });
      }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver(l => { const e = l.getEntries(); window.__lcp = e[e.length - 1].startTime; })
        .observe({ type: 'largest-contentful-paint', buffered: true });
    });
    await pg.goto(BASE + p, { waitUntil: 'load' });
    await pg.waitForTimeout(2500);
    const r = await pg.evaluate(() => ({ cls: window.__s.reduce((a, s) => a + s.v, 0), lcp: window.__lcp, s: window.__s }));
    worst = Math.max(worst, r.cls);
    const big = r.s.sort((a, b) => b.v - a.v)[0];
    const d = big ? `${big.v.toFixed(3)} · ${(big.srcs[0] && big.srcs[0].tag) || '?'}${big.srcs[0] && big.srcs[0].cls ? '.' + big.srcs[0].cls : ''} نزل ${big.srcs[0] ? big.srcs[0].dy : '?'}px` : '—';
    console.log(p.padEnd(34), (r.cls > 0.25 ? '🔴' : r.cls > 0.1 ? '🟠' : '🟢'),
      r.cls.toFixed(3).padEnd(7), (r.lcp / 1000).toFixed(2) + 's  ', d);
    await ctx.close();
  }
  await b.close();
  console.log('\n' + (worst > 0.1 ? `❌ أسوأ CLS = ${worst.toFixed(3)} — فوق عتبة جوجل (0.1)` : `✅ كل الصفحات خضرا (أسوأ ${worst.toFixed(3)})`));
  process.exit(worst > 0.1 ? 1 : 0);
})();
