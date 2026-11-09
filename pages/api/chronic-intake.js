// نفس الدالة اللي كانت في api/chronic-intake.mjs — اتنقلت lib/api/ عشان Next.js بيخدم /api من pages/api.
// توقيع Tally بيتحسب على الجسم الخام، فالـ bodyParser مقفول والدالة بتقرا الـ stream بنفسها (readRaw).
export { default } from '../../lib/api/chronic-intake.mjs';
export const config = { api: { bodyParser: false } };
