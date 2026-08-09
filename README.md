# OmniFlow SaaS

منصة SaaS عربية متعددة الأنشطة لإدارة العملاء والمحادثات والمنتجات والطلبات والفواتير والمصاريف والحملات والأتمتة. الواجهة RTL افتراضيًا، وجميع قراءات وكتابات التطبيق تمر بسياق Workspace مستخرج من جلسة الخادم.

> المشروع قابل للتشغيل والمعاينة حاليًا بقاعدة SQLite محلية. مخطط PostgreSQL وسياسات RLS وأدوات تطبيقها واختبارها موجودة، لكن نجاح العزل الإنتاجي والتكاملات الخارجية لا يُعلن قبل توفير قاعدة اختبار ومفاتيح حقيقية. راجع `PROJECT_STATUS.md`.

## المتطلبات

- Node.js 20.9 أو أحدث (مجرّب على Node 24).
- npm 10 أو أحدث.
- SMTP اختياري لاستعادة كلمة المرور خارج التطوير.

## التشغيل المحلي

1. انسخ `.env.example` إلى `.env` واضبط `JWT_SECRET` بقيمة عشوائية لا تقل عن 32 حرفًا.
2. اضبط `SUPERADMIN_EMAIL` و`SUPERADMIN_PASSWORD` إذا كنت ستشغّل seed.
3. ثبّت الحزم: `npm install`.
4. حدّث قاعدة التطوير: `npm run prisma:db:push`.
5. شغّل seed مرة واحدة: `npm run seed`.
6. شغّل التطبيق: `npm run dev` ثم افتح `http://localhost:3000`.

للمعاينة الحالية بعد تشغيل الخادم: الصفحة الرئيسية على `http://localhost:3000`، ولوحة المدير على `/admin` بعد الدخول بحساب Super Admin المنشأ عبر seed.

لبيانات Demo معزولة، اضبط `SEED_DEMO=true`. إذا تُرك `DEMO_USER_PASSWORD` فارغًا يولّد seed كلمة قوية ويطبعها مرة في الطرفية. مزود Demo لا يرسل رسائل حقيقية.

## فحوص الجودة

```text
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev
npm run test:smoke # يتطلب خادمًا يعمل؛ اضبط SMOKE_BASE_URL إذا لم يكن المنفذ 3100
```

## PostgreSQL وRLS

```text
npm run postgres:schema
npm run postgres:rls
npm run postgres:test-rls
```

يتطلب الأمران الأخيران `POSTGRES_DATABASE_URL` و`POSTGRES_TEST_DATABASE_URL` لقواعد PostgreSQL معزولة. لا تشغّل اختبار RLS على بيانات الإنتاج.

## المصادقة والأمان

- كلمات المرور مشفرة بـbcrypt.
- cookie الجلسة `httpOnly` و`sameSite=lax` و`secure` في الإنتاج.
- JWT له سجل Session مخزن كـSHA-256 في قاعدة البيانات، مما يسمح بالإلغاء وتسجيل الخروج من الخادم.
- استعادة كلمة المرور تستخدم رمزًا عشوائيًا مخزنًا كـhash، صالحًا 30 دقيقة، وتلغي كل الجلسات القديمة بعد نجاحها.
- الصلاحيات وحالة Workspace مفروضة داخل Route Handlers وServer Actions، لا بإخفاء الأزرار فقط.
- Meta webhooks تتحقق من `x-hub-signature-256` وتمنع التكرار عبر `idempotencyKey`.

## المسارات الرئيسية

- عامة: `/`, `/features`, `/solutions`, `/integrations`, `/pricing`, `/login`, `/signup`.
- النشاط: `/dashboard`, `/contacts`, `/products`, `/orders`, `/invoices`, `/expenses`, `/inbox`, `/reports`.
- التشغيل: `/campaigns`, `/automations`, `/settings/ai`, `/settings/integrations`.
- مدير المنصة: `/admin`.
- إعداد SMTP ونماذج AI المركزية: `/admin/providers` (يتطلب Super Admin).

## النشر

قبل الإنتاج يجب إكمال بنود PostgreSQL/RLS والـQueue وOAuth المبينة في `PROJECT_STATUS.md`. اضبط `APP_URL` على HTTPS، استخدم أسرارًا من مدير أسرار المنصة، ولا تنسخ قيم `.env` إلى Git أو Client Components.

راجع أيضًا: `ARCHITECTURE.md`, `DATABASE.md`, `INTEGRATIONS.md`, `SECURITY.md`.
