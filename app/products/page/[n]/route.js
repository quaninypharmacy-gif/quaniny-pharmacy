// /products/page/<n> — باقي صفحات الفهرس (الصفحة 1 مكانها /products بس، فـ /products/page/1 مش موجودة)
import { pageCount } from '../../../../lib/catalog/data.mjs';
import { listingPage } from '../../../../lib/catalog/listing.mjs';
import { htmlResponse } from '../../../../lib/catalog/html.mjs';

export const dynamic = 'force-static';
export const dynamicParams = false;
export function generateStaticParams() { return Array.from({ length: pageCount - 1 }, (_, i) => ({ n: String(i + 2) })); }

export async function GET(_req, { params }) {
  const n = Number((await params).n);
  if (!Number.isInteger(n) || n < 2 || n > pageCount) return new Response('Not found', { status: 404 });
  return htmlResponse(listingPage(n));
}
