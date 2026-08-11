# OmniFlow Integrations

## Meta / WhatsApp

تستخدم صفحة التكاملات تسجيل Meta الرسمي بدل إدخال الرموز يدويًا. اضبط
`META_APP_ID` و`META_APP_SECRET` و`META_OAUTH_REDIRECT_URI` لربط Facebook وInstagram،
واضبط `META_WHATSAPP_CONFIG_ID` لتفعيل WhatsApp Embedded Signup. يجب أن يطابق عنوان
إعادة التوجيه القيمة المسجلة داخل تطبيق Meta حرفيًا.

المحول والـWebhook الأساسيان موجودان. لكل Channel حقيقي استخدم:

`https://YOUR_DOMAIN/api/webhooks/meta/CHANNEL_ID`

- Verify token: القيمة السرية في `META_WEBHOOK_VERIFY_TOKEN`.
- توقيع POST: يتحقق من `x-hub-signature-256` باستخدام `META_APP_SECRET`.
- WhatsApp: `WHATSAPP_PHONE_NUMBER_ID` و`WHATSAPP_ACCESS_TOKEN`.
- إصدار Graph قابل للضبط عبر `META_GRAPH_API_VERSION`.

OAuth وApp Review وتجديد tokens ليست مكتملة بعد. أبقِ القناة `DISCONNECTED` حتى تنفيذها واختبارها.

## Gmail وOutlook

متغيرات Google/Microsoft موجودة في `.env.example` وصفحة الإعداد تعرض الحالة، لكن OAuth وAdapters غير منفذة بعد. Redirect URLs ستحدد عند تنفيذ المسارات، ولا ينبغي إضافتها إلى Console قبل ثباتها.

## SMTP

استعادة كلمة المرور تستخدم `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. عند غيابها يظهر رابط معاينة في development فقط؛ في الإنتاج لا يعاد الرمز في الاستجابة.

## OpenAI

عند وجود `OPENAI_API_KEY` يستخدم المساعد API من الخادم. عند غيابه يعمل fallback محلي مبني على بنك المعرفة ويظهر للمستخدم أن المزود الخارجي غير متصل.

## Development Provider

`DEV_MOCK` معزول ولا يرسل خارجيًا. استخدامه لا يعني نجاح أي اتصال حقيقي.
