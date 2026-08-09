# OmniFlow Database

المصدر الحالي للمخطط هو `prisma/schema.prisma`، وقاعدة التطوير هي `prisma/dev.db` (SQLite). تحتوي النماذج على Users/Sessions/PasswordResetTokens/Workspaces/Memberships، والباقات والاشتراكات، وCRM، والقنوات والمحادثات، والمنتجات والطلبات والمدفوعات والفواتير والمصاريف، والحملات والأتمتة وAI، وإعدادات المنصة وسجلات التدقيق.

## قواعد العزل الحالية

- سجلات الأعمال الرئيسية مرتبطة بـ`workspaceId`.
- Workspace لا يؤخذ من body أو query؛ يُستخرج من session وعضوية المستخدم.
- المعرفات المرتبطة بالطلب (عميل، مرحلة، منتج، محادثة، فاتورة) يعاد التحقق من ملكيتها للـWorkspace قبل الكتابة.
- `SUSPENDED` يمنع الوصول و`READ_ONLY` يمنع الكتابة.

## المطلوب قبل الإنتاج

- نقل datasource إلى PostgreSQL وإنشاء migrations مراجعة بدل `db push`.
- تفعيل RLS لكل الجداول ذات النطاق التجاري وسياسات العضوية، مع اختبارات Workspace A/B.
- إضافة indexes مبنية على الاستعلامات، خصوصًا `(workspaceId, status)`, `(workspaceId, createdAt)`, channel handles وwebhook idempotency.
- اعتماد Decimal/أصغر وحدة نقدية بدل Float في الحقول المالية قبل بيانات إنتاج حقيقية.
- إضافة سياسة soft-delete/retention ونسخ احتياطية واختبار الاستعادة.

## مسار PostgreSQL وRLS الجاهز

1. شغّل `npm run postgres:schema` لتوليد `prisma/postgresql/schema.prisma` من المخطط الحالي.
2. اضبط `POSTGRES_DATABASE_URL` ثم أنشئ وطبّق migrations Prisma على قاعدة غير إنتاجية أولًا.
3. شغّل `npm run postgres:rls` لتطبيق سياسات `prisma/postgresql/rls.sql`.
4. استخدم مستخدم قاعدة بيانات runtime لا يملك الجداول ولا يحمل `BYPASSRLS`.
5. اضبط `POSTGRES_TEST_DATABASE_URL` على قاعدة اختبار معزولة وشغّل `npm run postgres:test-rls`.

يعتمد التطبيق في PostgreSQL على `withTenantTransaction` لضبط `app.user_id` و`app.is_super_admin` داخل transaction محلية، لمنع تسرب هوية Tenant عبر connection pooling.

لا يُعتبر وجود `workspaceId` وحده بديلًا عن RLS.

## Supabase

يستطيع التطبيق الآن العمل بقاعدتين دون حذف قاعدة المعاينة المحلية:

- عند ترك `SUPABASE_DATABASE_URL` فارغًا يستخدم التطبيق SQLite المحلية.
- عند ضبط `SUPABASE_DATABASE_URL` يستخدم التطبيق PostgreSQL على Supabase تلقائيًا.
- استخدم Transaction Pooler على المنفذ `6543` للتطبيق، و`SUPABASE_DIRECT_URL` على المنفذ `5432` لعمليات Prisma.
- لا تُرسل هذه الروابط إلى المتصفح ولا تضعها في متغيرات تبدأ بـ `NEXT_PUBLIC_`.

بعد وضع الرابطين في `.env` شغّل:

```text
npm run supabase:setup
npm run supabase:secure
npm run seed
npm run dev
```

أمر `supabase:setup` يولّد عميل PostgreSQL، يطبّق المخطط، ثم يفحص الاتصال. تطبيق RLS يبقى خطوة مستقلة عبر `npm run postgres:rls` بعد إنشاء مستخدم runtime غير مالك للجداول واختباره على قاعدة معزولة.

أمر `supabase:secure` يلغي وصول أدوار Data API (`anon` و`authenticated` و`service_role`) إلى جداول Prisma الحالية والمستقبلية. استخدمه عندما يكون الوصول إلى البيانات من خادم Next.js فقط، ثم امنح أي صلاحيات مستقبلية بشكل صريح إذا قررت استخدام Supabase Data API.
