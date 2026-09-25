#!/usr/bin/env node
/* ⚠️ الامتداد .cjs مقصود: package.json بتاع الريبو فيه "type": "module"
   عشان دوال الـ API بتاعة .mjs، وده بيخلي أي ملف .js هنا ES module
   فـ require() بيقع. متغيّرش الامتداد. */
/* سيرفر محلي بيحاكي سلوك Vercel للموقع ده — وأهم حاجة فيه cleanUrls.
   من غيره /insurance/globemed بترجع 404 محليًا وهي شغالة على الإنتاج،
   وبتضيّع وقت في تشخيص عطل مش موجود.
   التشغيل:  node serve.js [port]   (الافتراضي 8099) */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.SITE_ROOT || path.resolve(__dirname, '../../../..');
const PORT = Number(process.argv[2] || 8099);
const T = { '.html':'text/html;charset=utf-8', '.css':'text/css', '.js':'text/javascript',
            '.mjs':'text/javascript', '.webp':'image/webp', '.png':'image/png',
            '.xml':'application/xml', '.json':'application/json', '.txt':'text/plain' };
http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') u = '/index.html';
  let f = path.join(ROOT, u);
  if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';          // cleanUrls
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('404 ' + u); }
  res.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log('serving ' + ROOT + ' on http://127.0.0.1:' + PORT));
