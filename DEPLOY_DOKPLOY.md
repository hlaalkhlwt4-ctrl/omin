# نشر OmniFlow على Dokploy

## إعداد الخدمة

- النوع: `Application`
- المستودع: `https://github.com/hlaalkhlwt4-ctrl/omin.git`
- الفرع: `main`
- Build Type: `Dockerfile`
- Dockerfile Path: `Dockerfile`
- Docker Context Path: `.`
- Docker Build Stage: اتركه فارغًا
- المنفذ الداخلي: `3000`
- Health Check Path: `/api/health`

## متغيرات البيئة

انسخ قيم الإنتاج الحالية إلى تبويب **Environment** في الخدمة. الحد الأدنى المطلوب:

```dotenv
NODE_ENV=production
PORT=3000
APP_URL=https://app.alisohail.cloud
DATABASE_URL=file:./prisma/dev.db
SUPABASE_DATABASE_URL=postgresql://...
SUPABASE_DIRECT_URL=postgresql://...
JWT_SECRET=...
CRON_SECRET=...
HEALTH_SECRET=...
INTEGRATION_ENCRYPTION_KEY=...
EVOLUTION_API_URL=https://evo.alisohail.cloud
EVOLUTION_API_KEY=...
EVOLUTION_WEBHOOK_SECRET=...
```

أضف بقية متغيرات `.env.example` عند تفعيل البريد أو Meta أو مفاتيح المزود المركزي. لا تحفظ القيم السرية في GitHub ولا تضعها ضمن Docker Build Arguments.

بعد تثبيت النطاق العام غيّر أيضًا:

```dotenv
APP_URL=https://app.alisohail.cloud
META_OAUTH_REDIRECT_URI=https://app.alisohail.cloud/api/integrations/meta/callback
```

## النطاق وHTTPS

1. أنشئ سجل DNS من النوع `A` للنطاق الفرعي واجعله يشير إلى عنوان IP للخادم.
2. من تبويب **Domains** أضف النطاق، واختر المنفذ `3000`، وفعّل HTTPS عبر Let's Encrypt.
3. اضغط **Deploy** وانتظر اكتمال البناء، ثم افتح `/api/health`. يجب أن يعيد `status: ok`.

## المهام المجدولة

ملف `vercel.json` لا يعمل خارج Vercel. من تبويب **Schedules** أنشئ طلبًا كل خمس دقائق إلى:

```text
POST https://app.alisohail.cloud/api/jobs/process
Authorization: Bearer <CRON_SECRET>
```

## بعد تغيير النطاق

من صفحة التكاملات افصل اتصال Evolution API ثم أعد ربطه أو شغّل المزامنة، لكي يتم تسجيل Webhook الجديد المبني على `APP_URL` العام.
