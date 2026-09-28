#!/usr/bin/env python3
"""
بيحوّل صور المنتجات الخام لنسختين WebP جاهزة للرفع على R2.

    python3 tools/prep-images.py <مجلد الصور الخام> [-o <مجلد الخرج>]

بيطلّع لكل صورة:
    <sku>/400.webp   للموبايل
    <sku>/800.webp   للديسكتوب

الـ sku بيتاخد من اسم الملف بعد تنضيفه، وده اللي بيبقى المسار على
image.quaniny.com — فلازم يفضل ثابت. غيّر اسم ملف = غيّر رابط صورة
منشورة، والصورة القديمة بتفضل في الـ bucket بتاكل مساحة.

القياس اللي بني عليه الاختيار (WebP q78، مقيس على صور الموقع الفعلية):
صورة مشهد كامل 400px = 8.7KB و800px = 19.4KB · علبة على أبيض = 2.4 و5.7KB.
يعني ~40KB للصنف كأسوأ حالة متحفظة، و5000 صنف ≈ 200 ميجا = 2% من سقف R2.
"""
import argparse, re, sys
from pathlib import Path
from PIL import Image, ImageOps

SIZES = {400: 78, 800: 78}          # العرض: جودة WebP
SRC_EXT = {'.jpg', '.jpeg', '.png', '.webp', '.heic', '.tif', '.tiff', '.bmp'}
MAX_KB = 90                          # حد إنذار — فوقه الصورة غالبًا محتاجة قص


def slug(name: str) -> str:
    """اسم ملف → sku آمن في رابط. عربي وإنجليزي وأرقام وشرطات بس."""
    s = name.strip().lower()
    s = re.sub(r'[\s_]+', '-', s)
    s = re.sub(r'[^0-9a-zء-ي\-]', '', s)
    s = re.sub(r'-{2,}', '-', s).strip('-')
    return s


def build(src: Path, out_dir: Path, force: bool):
    sku = slug(src.stem)
    if not sku:
        return sku, [('!', 'الاسم مبقاش فيه حروف صالحة بعد التنضيف')]

    try:
        im = Image.open(src)
        im = ImageOps.exif_transpose(im)      # يحترم دوران الكاميرا
    except Exception as e:
        return sku, [('!', f'مقدرتش أفتحها: {e}')]

    if im.mode not in ('RGB', 'RGBA'):
        im = im.convert('RGBA' if 'A' in im.getbands() else 'RGB')

    rows = []
    for w, q in SIZES.items():
        dest = out_dir / sku / f'{w}.webp'
        if dest.exists() and not force:
            rows.append((f'{w}px', f'موجودة — اتخطّت ({dest.stat().st_size/1024:.1f} KB)'))
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)

        r = im.copy()
        # thumbnail مبيكبّرش صورة أصغر من المطلوب — ودي الحاجة الصح:
        # تكبير صورة صغيرة بيزوّد الحجم من غير ما يزوّد التفاصيل.
        r.thumbnail((w, w * 4), Image.LANCZOS)
        r.save(dest, 'WEBP', quality=q, method=6)

        kb = dest.stat().st_size / 1024
        flag = '  ⚠️ تقيلة' if kb > MAX_KB else ''
        rows.append((f'{w}px', f'{kb:6.1f} KB  {r.size[0]}×{r.size[1]}{flag}'))

    if max(im.size) < 800:
        rows.append(('i', f'الأصل {im.size[0]}×{im.size[1]} — أصغر من 800px، فنسخة الديسكتوب مش كاملة'))
    return sku, rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src', type=Path, help='مجلد الصور الخام')
    ap.add_argument('-o', '--out', type=Path, default=Path('build/images'))
    ap.add_argument('-f', '--force', action='store_true', help='أعد التوليد حتى لو الملف موجود')
    a = ap.parse_args()

    if not a.src.is_dir():
        sys.exit(f'المجلد مش موجود: {a.src}')

    files = sorted(p for p in a.src.iterdir() if p.suffix.lower() in SRC_EXT)
    if not files:
        sys.exit(f'مفيش صور في {a.src}')

    seen, total, errors = {}, 0, 0
    for f in files:
        sku, rows = build(f, a.out, a.force)
        print(f'\n{f.name}  →  {sku}/')
        for tag, msg in rows:
            print(f'   {tag:>5}  {msg}')
            if tag == '!':
                errors += 1
        # اسمين خام مختلفين بيطلّعوا نفس الـ sku = الأولى بتتدهس
        if sku in seen:
            print(f'   🔴 تعارض: «{seen[sku]}» طلّعت نفس الاسم — واحدة منهم هتدهس التانية')
            errors += 1
        seen[sku] = f.name
        total += sum((a.out / sku / f'{w}.webp').stat().st_size
                     for w in SIZES if (a.out / sku / f'{w}.webp').exists())

    n = len(seen)
    print(f'\n{"─"*56}')
    print(f'{n} صنف · إجمالي {total/1024/1024:.1f} ميجا · متوسط {total/n/1024:.1f} KB للصنف')
    if n:
        print(f'لو الكتالوج وصل 5000 صنف بنفس المتوسط: {total/n*5000/1024/1024/1024:.2f} جيجا '
              f'({total/n*5000/1024/1024/1024/10*100:.1f}% من سقف R2 المجاني)')
    if errors:
        print(f'🔴 {errors} مشكلة فوق — راجعها قبل الرفع')
        sys.exit(1)


if __name__ == '__main__':
    main()
