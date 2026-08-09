# OmniFlow Architecture

## الشكل الحالي

- Next.js 16 App Router وReact Server Components للقراءات، وClient Components للتفاعل.
- Prisma كطبقة وصول للبيانات. ملف التطوير يستخدم SQLite.
- جلسة موقعة + سجل Session قابل للإلغاء، مع استخراج Workspace من العضوية الموثقة على الخادم.
- كل جدول أعمال رئيسي يحمل `workspaceId`، وكل استعلام مطبق حاليًا يمر بهذا القيد.
- RBAC للأدوار OWNER/ADMIN/SALES/SUPPORT/ACCOUNTANT/VIEWER.
- Adapter للرسائل (Development, WhatsApp, Instagram, Facebook) وAdapter AI.

## حدود النسخة الحالية

RLS في PostgreSQL وQueue durable غير منفذين بعد؛ لذلك لا يجوز وصفهما بأنهما جاهزان للإنتاج. التنفيذ المحلي يمنع التسرب في طبقة الخادم، لكن معيار الإطلاق يتطلب دفاعًا ثانيًا في قاعدة PostgreSQL واختبارات عزل مباشرة.

OAuth لـMeta/Google/Microsoft غير مكتمل. القناة الحقيقية تُنشأ `DISCONNECTED`، ولا تتحول إلى `CONNECTED` إلا عند معالجة Webhook موقع أو نجاح فحص اتصال فعلي.

## المسار المستهدف للإطلاق

1. PostgreSQL migration وRLS تعتمد user/workspace context داخل transaction.
2. Queue durable للحملات والأتمتة وwebhooks مع retries وdead-letter.
3. تشفير connection secrets بمفتاح خادم منفصل ودوران مفاتيح.
4. OAuth adapters وtoken refresh ومراقبة صحة القنوات.
5. Observability: correlation IDs، structured logs، metrics، error adapter وhealth endpoint محدود.
