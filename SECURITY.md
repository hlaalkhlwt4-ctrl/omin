# Security Policy and Threat Model

## ما هو مطبق

- تحقق العضوية والـWorkspace على الخادم، وإعادة التحقق من ملكية المعرفات المرتبطة قبل الكتابة.
- RBAC في Route Handlers وServer Actions وإخفاء عناصر التنقل غير المسموحة.
- جلسات قابلة للإلغاء، cookies محمية، bcrypt، واستعادة كلمة المرور برمز hash محدود الوقت.
- rate limiting داخل العملية لمسارات المصادقة. في النشر متعدد النسخ يجب استبداله بمخزن موزع.
- Zod لمسارات المصادقة وإنشاء Workspace والمنتجات والطلبات والمصاريف والرسائل.
- Meta HMAC وidempotency للرسائل الواردة.
- CSP وHSTS في الإنتاج وnosniff وframe denial وPermissions Policy.
- لا توجد مفاتيح service/API في Client Components أو `.env.example`.

## تهديدات ما زالت مفتوحة قبل الإنتاج

- قاعدة التطوير SQLite بلا RLS؛ يجب نقلها إلى PostgreSQL وسياسات RLS واختبار tenant A/B.
- أسرار Channel داخل `settingsJson` ليست مشفرة بعد؛ لا تخزن tokens حقيقية فيها قبل بناء vault/encryption adapter.
- rate limiter المحلي لا ينسق بين Serverless instances.
- لا يوجد Queue durable أو webhook event ledger مستقل أو dead-letter queue.
- OAuth وتجديد tokens وemail HTML sanitization غير منفذة.
- CSP يسمح بـ`unsafe-inline` لتوافق Next الحالي؛ الانتقال إلى nonce-based CSP تحسين مطلوب.

## الاستجابة للحوادث

1. عطّل القناة أو Workspace المتأثر.
2. دوّر الأسرار وألغِ Sessions وOAuth tokens.
3. احفظ Audit Logs وprovider event IDs دون نسخ محتوى أو أسرار حساسة.
4. صحح السبب وأضف اختبار regression قبل إعادة التفعيل.

لا تُرسل أسرارًا أو بيانات عملاء في issue عامة.
