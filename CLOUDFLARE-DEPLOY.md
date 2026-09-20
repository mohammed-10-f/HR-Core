# HR Core — Cloudflare Pages + D1

## 1. Build

```bash
npm install
npm run build
```

Output: `dist`

## 2. D1 binding

`wrangler.toml` يحتوي binding باسم `DB` وقاعدة باسم `hr-core`.
استبدل `REPLACE_WITH_YOUR_D1_DATABASE_ID` بالـDatabase ID من Cloudflare.

## 3. Migration

إذا كانت قاعدة `hr-core` جديدة:

```bash
npx wrangler d1 migrations apply hr-core --remote
```

## 4. Pages

في Cloudflare Pages:
- Build command: `npm run build`
- Build output: `dist`
- Functions موجودة داخل `functions/`
- اربط D1 binding باسم `DB` في Pages > Settings > Functions > D1 database bindings.

## 5. اختبار الاتصال

بعد النشر افتح:

`/api/health`

ويجب أن تحصل على JSON يوضح أن D1 متصل.

## مهم جدًا — المصادقة

D1 قاعدة بيانات فقط وليست نظام تسجيل دخول. النسخة الحالية تستخدم اختيار الدور في شريط النظام للديمو، وهذا **ليس حماية إنتاجية**.
قبل إدخال بيانات موظفين حقيقية يجب إضافة Auth وربط المستخدم بالدور والنطاق، ثم تطبيق التحقق داخل Functions قبل كل query/mutation. إخفاء القائمة في React ليس بديلًا عن الحماية الخادمية.
