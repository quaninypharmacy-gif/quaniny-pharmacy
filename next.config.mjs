// صفحات الموقع القديمة فاضلة HTML زي ما هي جوه public/ (نفس البايتات اللي كانت بتتنشر)،
// والـ config ده بيدّيها نفس الروابط اللي كان Vercel بيدّيها بـ cleanUrls — من غير .html.
// الروابط مفهرسة في جوجل وBing: أي رابط يتغير = ترتيب ضاع (quaniny-nextjs-migration، بند 1).
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const PUBLIC = join(process.cwd(), 'public');

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return htmlFiles(full);
    return name.endsWith('.html') ? ['/' + relative(PUBLIC, full).split(sep).join('/')] : [];
  });
}

// '/index.html' → '/' · '/insurance/index.html' → '/insurance' · '/delivery.html' → '/delivery'
const cleanOf = (file) => file.replace(/\/index\.html$/, '') .replace(/\.html$/, '') || '/';
const pages = htmlFiles(PUBLIC).map((file) => ({ file, clean: cleanOf(file) }));

/** @type {import('next').NextConfig} */
export default {
  trailingSlash: false,
  async redirects() {
    // زي cleanUrls: أي طلب بـ .html يتحوّل 308 للرابط النضيف
    return [
      ...pages.map(({ file, clean }) => ({ source: file, destination: clean, permanent: true })),
      // 🆕 10/11/2026: /products بقت فهرس كل الأصناف (route handler) — صفحتا العناية القديمتين اتشالوا
      // وروابط الكتالوج القديمة /medicine/* بتتحوّل لنفس الصنف تحت /products (قرار الصيدلي).
      { source: '/products.html', destination: '/products', permanent: true },
      { source: '/product.html', destination: '/products', permanent: true },
      { source: '/product', destination: '/products', permanent: true },
      { source: '/medicine', destination: '/products', permanent: true },
      { source: '/medicine/:path*', destination: '/products/:path*', permanent: true },
    ];
  },
  async rewrites() {
    return { beforeFiles: pages.map(({ file, clean }) => ({ source: clean, destination: file })) };
  },
};
