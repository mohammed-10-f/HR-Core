# HR Core — Enterprise HR Operating System

نسخة HR Core الحالية تحتوي على:
- رئيسية مشتركة لجميع المستخدمين مع محتوى يتغير حسب الدور.
- قائمة جانبية تعتمد على الصلاحيات.
- مركز معاملات مقسم إلى الكل / الواردة / الصادرة / مسودة / قيد المعالجة / معادة للتعديل / مرفوضة / مكتملة.
- تفاصيل المعاملة ومسارها وسجل إجراءاتها.
- نطاق وصول مختلف للموظفين والمديرين وHR ومدير النظام.
- منشئ معاملات ديناميكي + Workflow.
- تكامل Cloudflare Pages Functions + D1.
- وضع محلي احتياطي للتطوير.

## التشغيل

```bash
npm install
npm run dev
```

## Cloudflare D1

القاعدة المستهدفة: `hr-core`

1. ضع Database ID في `wrangler.toml`.
2. طبّق migration:

```bash
npx wrangler d1 migrations apply hr-core --remote
```

3. انشر Pages مع binding باسم `DB`.
4. اختبر `/api/health`.

## ملاحظة أمنية

اختيار الدور في أعلى الواجهة Demo فقط. D1 لا يوفر Authentication بحد ذاته. للإنتاج يجب إضافة هوية موثوقة، تخزين الدور والنطاق Server-side، ومنع أي mutation أو query غير مصرح بها داخل Functions. لا تعتمد على إخفاء عناصر React كحماية.
