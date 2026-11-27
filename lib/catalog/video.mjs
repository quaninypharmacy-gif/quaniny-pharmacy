// 🆕 27/11/2026 فيديو يوتيوب «خفيف» (قرار الصيدلي 27/11): الصفحة فيها صورة الفيديو وزرار تشغيل بس — الـ iframe بتاع
// يوتيوب (~1 ميجا JS) مبيتحمّلش غير لما الزبون يدوس (public/catalog.js). من غير JS الرابط بيفتح الفيديو على يوتيوب.
// المقاس ثابت 16:9 (aspect-ratio فى catalog.css) فمفيش اهتزاز للصفحة (CLS) لا قبل التشغيل ولا بعده.
// تحت الفيديو «الخلاصة» نص عادي: جوجل بيقرا النص مش الفيديو، والزبون اللي مش هيشغّل بياخد الفكرة.
import { esc, ORG, SITE } from './html.mjs';
import { CHANNEL } from './content.mjs';

const thumbOf = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

// PT4M30S → «4:30 دقيقة»
const durText = (iso) => {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(iso || ''));
  if (!m) return '';
  const h = +(m[1] || 0), mi = +(m[2] || 0), s = +(m[3] || 0);
  const mm = h * 60 + mi;
  return `${mm}:${String(s).padStart(2, '0')} دقيقة`;
};

export function videoBlock(v, { heading = 'h2' } = {}) {
  const d = durText(v.duration);
  const summary = (v.summary || []).filter(Boolean);
  return `<section class="yt-block" aria-label="${esc(v.title)}">
<figure class="yt-video">
<a class="yt-lite" href="https://www.youtube.com/watch?v=${v.id}" data-yt="${v.id}" data-title="${esc(v.title)}" target="_blank" rel="noopener" aria-label="شغّل الفيديو: ${esc(v.title)}">
<img src="${thumbOf(v.id)}" alt="" width="480" height="360" loading="lazy" decoding="async">
<span class="yt-play" aria-hidden="true"><svg viewBox="0 0 68 48" width="68" height="48"><path d="M66.5 7.7a8.5 8.5 0 0 0-6-6C55.3.3 34 .3 34 .3S12.7.3 7.5 1.7a8.5 8.5 0 0 0-6 6C.1 12.9.1 24 .1 24s0 11.1 1.4 16.3a8.5 8.5 0 0 0 6 6c5.2 1.4 26.5 1.4 26.5 1.4s21.3 0 26.5-1.4a8.5 8.5 0 0 0 6-6C67.9 35.1 67.9 24 67.9 24s0-11.1-1.4-16.3z" fill="#43205e"/><path d="M27 34l18-10-18-10z" fill="#fff"/></svg></span>
</a>
<figcaption>${esc(v.title)}${d ? ` · <span dir="ltr">${d.split(' ')[0]}</span> دقيقة` : ''}</figcaption>
</figure>
${summary.length ? `<div class="yt-summary"><${heading}>الخلاصة</${heading}><ul>${summary.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}
${CHANNEL ? `<a class="text-link yt-channel" href="${esc(CHANNEL.url)}" target="_blank" rel="noopener">فيديوهات تانية على قناتنا في يوتيوب</a>` : ''}
</section>`;
}

// VideoObject: بيخلي صورة الفيديو تظهر جنب الصفحة فى نتايج جوجل. thumbnailUrl + uploadDate + name + description إجباريين عند جوجل.
export function videoLd(v, path) {
  return {
    '@context': 'https://schema.org', '@type': 'VideoObject',
    name: v.title, description: v.description || (v.summary || []).join(' ') || v.title,
    thumbnailUrl: [thumbOf(v.id)], uploadDate: v.upload_date,
    ...(v.duration ? { duration: v.duration } : {}),
    embedUrl: `https://www.youtube.com/embed/${v.id}`,
    url: SITE + path, inLanguage: 'ar',
    ...(v.keywords && v.keywords.length ? { keywords: v.keywords.join(', ') } : {}),
    publisher: ORG,
  };
}

export const DRAFT_BANNER = '<div class="draft-banner" role="note">مسودة — مستنية مراجعة الصيدلي، ومش هتتنشر قبل ما تتعلّم reviewed في ملف المحتوى.</div>';
