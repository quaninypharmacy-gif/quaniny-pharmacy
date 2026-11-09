// نفس الدالة اللي كانت في api/prescription.mjs — اتنقلت lib/api/ عشان Next.js بيخدم /api من pages/api.
// حد Next.js الافتراضي للجسم 1 ميجا؛ الروشتة فيها لحد 3 صور base64، فالحد زي دوال Vercel القديمة (4.5 ميجا).
export { default } from '../../lib/api/prescription.mjs';
export const config = { api: { bodyParser: { sizeLimit: '4.5mb' } } };
