// 🆕 27/11/2026 محتوى الفيديوهات العلمية (قرار الصيدلي 27/11): يوتيوب embed خفيف + صفحات «دليل» للمواد ومقارنات.
// المحتوى بيتكتب بالإيد فى data/videos.json و data/guides.json و data/comparisons.json — مش من تصدير الـ ERP،
// فإعادة تصدير الكتالوج متمسحوش. أي عنصر reviewed ≠ true مبيتبنيش على الإنتاج: الصيدلي بيراجع النص الأول
// (حدود الادعاءات فى quaniny-content، والمقارنة بالاسم مع براند تاني لازم مصدر ومراجعة).
// معاينة المسودات محليًا بس: QUANINY_DRAFTS=1 (بتطلع noindex وعليها شريط «مسودة»). Vercel مفيهوش المتغير ده.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getItem } from './data.mjs';

const read = (f, dflt) => {
  const p = join(process.cwd(), 'data', f);
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : dflt;
};
export const DRAFTS = process.env.QUANINY_DRAFTS === '1';
const live = (x) => x && (x.reviewed === true || DRAFTS);

const vfile = read('videos.json', { channel: null, videos: [] });
export const CHANNEL = vfile.channel || null;

// فيديو يوتيوب: الـ id لازم 11 حرف (غير كده يبقى غلط فى الملف ومينفعش يتعرض)
const YT_ID = /^[A-Za-z0-9_-]{11}$/;
export const videos = (vfile.videos || []).filter((v) => live(v) && YT_ID.test(v.id || ''));
const videosAt = (type, slug) => videos.filter((v) => v.place && v.place.type === type && (type === 'home' || v.place.slug === slug));
export const productVideos = (slug) => videosAt('product', slug);
export const guideVideos = (slug) => videosAt('guide', slug);
export const compareVideos = (slug) => videosAt('compare', slug);
export const homeVideos = () => videosAt('home');

// الدليل: أصنافه بالاسم (products) — الصيدلي بيختارهم، مش مطابقة تلقائية (الهيالورونيك مثلًا موجود فى قطرات عين
// وحقن مفاصل مالهمش علاقة بدليل البشرة). الصنف اللي مش فى الكتالوج بيتشال من غير ما الصفحة تقع.
export const guides = (read('guides.json', { guides: [] }).guides || []).filter(live)
  .map((g) => ({ ...g, itemsList: (g.products || []).map(getItem).filter(Boolean) }));
const guideBySlug = new Map(guides.map((g) => [g.slug, g]));
export const getGuide = (slug) => guideBySlug.get(slug) || null;
// صفحة الصنف ← «اعرف أكتر»: الدليل اللي الصنف ده من أصنافه
export const guidesOf = (it) => guides.filter((g) => (g.products || []).includes(it.slug));

// المقارنة: الصنفين لازم يكونوا فى الكتالوج (زرار السلة للاتنين)، وإلا الصفحة مبتتبنيش
export const comparisons = (read('comparisons.json', { comparisons: [] }).comparisons || []).filter(live)
  .map((c) => ({ ...c, A: getItem(c.a), B: getItem(c.b) })).filter((c) => c.A && c.B);
const cmpBySlug = new Map(comparisons.map((c) => [c.slug, c]));
export const getComparison = (slug) => cmpBySlug.get(slug) || null;
export const comparisonsOf = (it) => comparisons.filter((c) => c.a === it.slug || c.b === it.slug);

export const isDraft = (x) => x && x.reviewed !== true;
