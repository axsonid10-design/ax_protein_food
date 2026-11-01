---
name: Cold Chain Arctic Precision
brand: منظومة المجمدات ومخازن التبريد والتوزيع
colors:
  surface: '#f8fafc'
  surface-dim: '#e2e8f0'
  surface-bright: '#f8fafc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f5f9'
  surface-container: '#e2e8f0'
  surface-container-high: '#cbd5e1'
  surface-container-highest: '#94a3b8'
  on-surface: '#0f172a'
  on-surface-variant: '#475569'
  outline: '#94a3b8'
  outline-variant: '#cbd5e1'
  primary: '#991b1b'
  on-primary: '#ffffff'
  primary-container: '#450a0a'
  on-primary-container: '#fee2e2'
  secondary: '#b91c1c'
  on-secondary: '#ffffff'
  secondary-container: '#fecaca'
  on-secondary-container: '#7f1d1d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  background: '#f8fafc'
  on-background: '#0f172a'
typography:
  display:
    fontFamily: Cairo
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
  headline-lg:
    fontFamily: Cairo
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Cairo
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 30px
  body-lg:
    fontFamily: Tajawal
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Tajawal
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  md: 0.5rem
  lg: 0.75rem
  xl: 1rem
  2xl: 1.5rem
  full: 9999px
---

# الدستور البصري - منظومة المجمدات (DESIGN.md - قواعد 2610)

## 1. الهوية والطابع العام
- **الطابع:** سلاسل التبريد والتجميد اللوجستية الحديثة (Cold Chain Logistics).
- **الألوان:** أحمر اللحوم الداكن `#991b1b` مع البرغندي العميق `#450a0a` والأحمر القرمزي `#b91c1c`.
- **الخلفية المائية:** شعار التبريد مثبت مائياً بهدوء (`/site-bg-watermark.png`) بنسبة 3% شفافية لضمان راحة العين ومنع الإجهاد البصري.

## 2. قواعد استغلال الشاشة (Zero Empty Gutters - Rule 2610)
- ممنوع نهائياً حشر محتوى النظام في منتصف الشاشة على اللابتوب وترك هوامش بيضاء فارغة يميناً ويساراً.
- تمدد كامل للحاوية (`w-full` أو `max-w-7xl` / `max-w-[1600px]`) مع شبكات Bento متعددة الأعمدة وتوزيع أفقي واسع.

## 3. الأزرار والمكونات التفاعلية
- كبسولية دائماً: `rounded-full` بخط عريض `font-extrabold`.
- الكالندر: المكون المؤسسي `AX_CompanyDatePicker` حصراً.
- القوائم: Select مخصص كبسولي متوافق مع الديزاين سيستم.
- التحميل: سكيلتون 1:1 (`AX_SkeletonLoader`) وحظر الـ Spinners نهائياً.
