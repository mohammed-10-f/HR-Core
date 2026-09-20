# HR Core — Cloudflare D1

هذا هو مخطط D1 الذي تتوقعه نسخة HR Core الحالية.

> إذا كانت قاعدة `hr-core` لديك تحتوي جداول مختلفة، لا تشغّل migration عشوائيًا فوقها. أرسل لي schema الحالية أو نتيجة `wrangler d1 execute hr-core --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"` وسنطابق الـAPI معها.

## التشغيل

```bash
npx wrangler d1 migrations apply hr-core --remote
```

بعدها:

```bash
npm run build
npx wrangler pages deploy dist --project-name hr-core
```
