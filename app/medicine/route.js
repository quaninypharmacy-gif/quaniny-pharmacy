// /medicine — أول صفحة فى فهرس الكتالوج
import { listingPage } from '../../lib/catalog/listing.mjs';
import { htmlResponse } from '../../lib/catalog/html.mjs';

export const dynamic = 'force-static';
export function GET() { return htmlResponse(listingPage(1)); }
