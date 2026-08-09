require('@next/env').loadEnvConfig(process.cwd());

const { PrismaClient } = process.env.SUPABASE_DATABASE_URL
  ? require('@omniflow/prisma-postgresql-client')
  : require('@prisma/client');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('crypto');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding OmniFlow database with production platform settings & realistic Arab business demo data...');

  // 1. Platform Settings (Dynamic Branding & Config)
  await prisma.platformSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      platformName: 'OmniFlow',
      logoUrl: '/logo.svg',
      faviconUrl: '/favicon.ico',
      primaryColor: '#0284c7',
      accentColor: '#10b981',
      fontArabic: 'Tajawal',
      landingHeroTitle: 'كل نشاطك الأونلاين في مكان واحد',
      landingHeroSub: 'منصة عربية شاملة تجمع العملاء، المحادثات، الطلبات، الأرباح، الأتمتة، ومساعد الذكاء الاصطناعي لكل نشاط تجاري.',
      contactEmail: 'support@omniflow.app',
      supportPhone: '+966500000000',
      defaultCurrency: 'SAR',
      maintenanceMode: false,
    },
  });

  // 2. Platform FAQs for Landing Page & Support
  const faqs = [
    {
      question: 'كيف تجمع المنصة جميع قنوات التواصل في مكان واحد؟',
      answer: 'تربط OmniFlow حسابات واتساب الأعمال، إنستغرام، فيسبوك ماسنجر، والبريد الإلكتروني بصندوق محادثات موحد مع خاصية الرد الآلي وتعيين المهام للفريق.',
      category: 'المميزات',
    },
    {
      question: 'هل يمكنني تخصيص اسم وشعار المنصة وألوانها؟',
      answer: 'نعم! تمنحك لوحة المدير التحكم الكامل في تغيير اسم المنصة، الشعار، الألوان الرئيسية، الخط العربي، والنصوص التعريفية بسهولة.',
      category: 'التطبيقات',
    },
    {
      question: 'هل تدعم المنصة إصدار الفواتير الضريبية وتتبع المصاريف؟',
      answer: 'تتيح لك المنصة تسجيل المدفوعات وإصدار فواتير PDF بالهوية الخاصة بك باللغة العربية، وحساب صافي الأرباح التشغيلية بدقة.',
      category: 'المالية',
    },
    {
      question: 'كيف يساعد الذكاء الاصطناعي في إدارة ردود العملاء؟',
      answer: 'يتم تدريب مساعد الذكاء الاصطناعي الخاص بنشاطك على كتالوج منتجاتك وسياساتك لاقتراح ردود دقيقة أو الرد التلقائي حسب اختيارك.',
      category: 'الذكاء الاصطناعي',
    },
  ];

  for (const faq of faqs) {
    await prisma.faq.create({
      data: {
        ...faq,
        isPublished: true,
      },
    });
  }

  // 3. Subscription Plans & Entitlements
  const starterPlan = await prisma.plan.create({
    data: {
      name: 'Starter Plan',
      nameAr: 'الباقة الأساسية',
      description: 'مثالية للأفراد والمستقلين والمتاجر الناشئة لتنظيم العملاء والطلبات.',
      sortingOrder: 1,
      prices: {
        create: [
          { interval: 'MONTHLY', price: 99, currency: 'SAR' },
          { interval: 'YEARLY', price: 990, currency: 'SAR' },
        ],
      },
      entitlements: {
        create: {
          maxUsers: 2,
          maxContacts: 1000,
          maxMessages: 5000,
          maxCampaigns: 5,
          aiTokensLimit: 25000,
          enableWhitelabel: false,
        },
      },
    },
  });

  const proPlan = await prisma.plan.create({
    data: {
      name: 'Pro Plan',
      nameAr: 'باقة المحترفين',
      description: 'الخيار الأكثر شعبية للفرق والمتاجر النامية التي تحتاج أتمتة وذكاء اصطناعي.',
      sortingOrder: 2,
      prices: {
        create: [
          { interval: 'MONTHLY', price: 199, currency: 'SAR' },
          { interval: 'YEARLY', price: 1990, currency: 'SAR' },
        ],
      },
      entitlements: {
        create: {
          maxUsers: 5,
          maxContacts: 5000,
          maxMessages: 20000,
          maxCampaigns: 20,
          aiTokensLimit: 100000,
          enableWhitelabel: false,
        },
      },
    },
  });

  const enterprisePlan = await prisma.plan.create({
    data: {
      name: 'Enterprise Plan',
      nameAr: 'باقة الشركات',
      description: 'حل كامل للوكالات والشركات الكبيرة مع تخصيص شامل ودعم أولوية.',
      sortingOrder: 3,
      prices: {
        create: [
          { interval: 'MONTHLY', price: 499, currency: 'SAR' },
          { interval: 'YEARLY', price: 4990, currency: 'SAR' },
        ],
      },
      entitlements: {
        create: {
          maxUsers: 20,
          maxContacts: 50000,
          maxMessages: 100000,
          maxCampaigns: 100,
          aiTokensLimit: 500000,
          enableWhitelabel: true,
        },
      },
    },
  });

  // 4. Super Admin Account
  const superAdminEmail = process.env.SUPERADMIN_EMAIL;
  const superAdminPassword = process.env.SUPERADMIN_PASSWORD;
  if (!superAdminEmail || !superAdminPassword || superAdminPassword.length < 12) {
    throw new Error('اضبط SUPERADMIN_EMAIL وSUPERADMIN_PASSWORD (12 حرفًا على الأقل) قبل تشغيل seed.');
  }
  const superAdminPasswordHash = await bcrypt.hash(superAdminPassword, 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail.toLowerCase() },
    update: { passwordHash: superAdminPasswordHash },
    create: {
      email: superAdminEmail.toLowerCase(),
      passwordHash: superAdminPasswordHash,
      fullName: 'مدير المنصة الرئيسي',
      isSuperAdmin: true,
      emailVerified: true,
    },
  });

  if (process.env.SEED_DEMO !== 'true') {
    console.log('✅ Platform seed complete. Demo data was not created (SEED_DEMO is not true).');
    return;
  }

  // 5. Demo Workspace & Merchant Owner
  const demoEmail = (process.env.DEMO_USER_EMAIL || 'demo@localhost.invalid').toLowerCase();
  const demoPassword = process.env.DEMO_USER_PASSWORD || randomBytes(18).toString('base64url');
  const demoOwnerPasswordHash = await bcrypt.hash(demoPassword, 12);
  const demoOwner = await prisma.user.upsert({
    where: { email: demoEmail },
    update: { passwordHash: demoOwnerPasswordHash },
    create: {
      email: demoEmail,
      passwordHash: demoOwnerPasswordHash,
      fullName: 'عبدالله السعيد',
      emailVerified: true,
    },
  });

  const demoWorkspace = await prisma.workspace.create({
    data: {
      name: 'متجر الرائدة للمنتجات الرقمية والمادية',
      slug: 'al-raida-store',
      businessType: 'PHYSICAL',
      country: 'SA',
      currency: 'SAR',
      timezone: 'Asia/Riyadh',
      taxRate: 15.0,
      status: 'ACTIVE',
      members: {
        create: {
          userId: demoOwner.id,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      },
      subscriptions: {
        create: {
          planId: proPlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  // 6. Pipeline & Pipeline Stages
  const pipeline = await prisma.pipeline.create({
    data: {
      workspaceId: demoWorkspace.id,
      name: 'مسار المبيعات الرئيسي',
      isDefault: true,
      stages: {
        create: [
          { name: 'جديد', color: '#3b82f6', sortingOrder: 1 },
          { name: 'تم التواصل', color: '#8b5cf6', sortingOrder: 2 },
          { name: 'بانتظار الدفع', color: '#f59e0b', sortingOrder: 3 },
          { name: 'تم الدفع', color: '#10b981', sortingOrder: 4 },
          { name: 'قيد التنفيذ', color: '#06b6d4', sortingOrder: 5 },
          { name: 'مكتمل', color: '#22c55e', sortingOrder: 6 },
        ],
      },
    },
  });

  const stages = await prisma.pipelineStage.findMany({
    where: { pipelineId: pipeline.id },
    orderBy: { sortingOrder: 'asc' },
  });

  // 7. Products & Services
  const prod1 = await prisma.product.create({
    data: {
      workspaceId: demoWorkspace.id,
      title: 'ساعة ذكية فاخرة مقاومة للماء',
      sku: 'W-SMART-01',
      type: 'PHYSICAL',
      price: 350.0,
      costPrice: 180.0,
      stockQuantity: 45,
    },
  });

  const prod2 = await prisma.product.create({
    data: {
      workspaceId: demoWorkspace.id,
      title: 'دورة التسويق الإلكتروني الاحترافي (رقمي)',
      sku: 'COURSE-DIG-02',
      type: 'COURSE',
      price: 500.0,
      costPrice: 50.0,
      stockQuantity: 999,
    },
  });

  const prod3 = await prisma.product.create({
    data: {
      workspaceId: demoWorkspace.id,
      title: 'جلسة استشارة تطوير الأعمال (ساعة)',
      sku: 'SERV-CONS-03',
      type: 'SERVICE',
      price: 300.0,
      costPrice: 0.0,
      stockQuantity: 100,
    },
  });

  // 8. CRM Contacts
  const contact1 = await prisma.contact.create({
    data: {
      workspaceId: demoWorkspace.id,
      fullName: 'محمد بن علي الشهري',
      phone: '+966551234567',
      email: 'm.al-shehri@example.com',
      stage: 'CUSTOMER',
      source: 'WHATSAPP',
      totalSpent: 850.0,
      notes: 'عميل مهتم بالمنتجات التقنية والدورات التدريبية.',
    },
  });

  const contact2 = await prisma.contact.create({
    data: {
      workspaceId: demoWorkspace.id,
      fullName: 'سارة خالد العتيبي',
      phone: '+966509876543',
      email: 'sara.otaibi@example.com',
      stage: 'LEAD',
      source: 'INSTAGRAM',
      totalSpent: 0.0,
      notes: 'استفسرت عن مواعيد الاستشارات.',
    },
  });

  // 9. Orders, Invoices, Payments
  const order1 = await prisma.order.create({
    data: {
      workspaceId: demoWorkspace.id,
      contactId: contact1.id,
      stageId: stages[5].id, // مكتمل
      totalAmount: 850.0,
      paidAmount: 850.0,
      status: 'COMPLETED',
      channel: 'WHATSAPP',
      notes: 'تم التوصيل والتفعيل بنجاح.',
      items: {
        create: [
          { productId: prod1.id, title: prod1.title, quantity: 1, price: 350.0, total: 350.0 },
          { productId: prod2.id, title: prod2.title, quantity: 1, price: 500.0, total: 500.0 },
        ],
      },
    },
  });

  await prisma.payment.create({
    data: {
      workspaceId: demoWorkspace.id,
      orderId: order1.id,
      amount: 850.0,
      method: 'BANK_TRANSFER',
      status: 'CONFIRMED',
      notes: 'تحويل بنكي - الراجحي',
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0001',
      workspaceId: demoWorkspace.id,
      orderId: order1.id,
      totalAmount: 850.0,
      status: 'PAID',
    },
  });

  // 10. Expenses
  await prisma.expense.create({
    data: {
      workspaceId: demoWorkspace.id,
      category: 'التسويق والإعلانات',
      amount: 300.0,
      notes: 'حملة إعلانات سناب شات وإنستغرام',
    },
  });

  await prisma.expense.create({
    data: {
      workspaceId: demoWorkspace.id,
      category: 'الشحن والشحن الداخلي',
      amount: 45.0,
      notes: 'رسوم توصيل شحنة الساعة الذكية',
    },
  });

  // 11. Channels & Conversations
  const devChannel = await prisma.channel.create({
    data: {
      workspaceId: demoWorkspace.id,
      provider: 'DEV_MOCK',
      name: 'قناة الاختيار المحاكية (WhatsApp & Instagram Demo)',
      isActive: true,
      healthStatus: 'CONNECTED',
    },
  });

  const conv1 = await prisma.conversation.create({
    data: {
      workspaceId: demoWorkspace.id,
      contactId: contact1.id,
      channelId: devChannel.id,
      status: 'OPEN',
      unreadCount: 0,
      aiEnabled: true,
      messages: {
        create: [
          {
            senderType: 'CONTACT',
            channel: 'WHATSAPP',
            body: 'السلام عليكم، هل الساعة الذكية متوفرة ومعها ضمان؟',
          },
          {
            senderType: 'AI',
            channel: 'WHATSAPP',
            body: 'أهلاً بك أستاذ محمد! نعم الساعة متوفرة بضمان سنتين شامل، والتوصيل متاح خلال 24-48 ساعة.',
          },
          {
            senderType: 'CONTACT',
            channel: 'WHATSAPP',
            body: 'ممتاز، أريد طلب الساعة ودورة التسويق معاً.',
          },
        ],
      },
    },
  });

  // 12. AI Agent Config
  await prisma.aiAgent.create({
    data: {
      workspaceId: demoWorkspace.id,
      name: 'مساعد الرائدة الذكي',
      role: 'مستشار المبيعات والدعم الفني',
      tone: 'مهني، ودود وسريع الاستجابة',
      businessInfo: 'متجر الرائدة يبيع الساعات الذكية والمنتجات التقنية والدورات الاستشارية والتسويقية.',
      confidenceThreshold: 0.8,
      mode: 'SUGGEST',
      isEnabled: true,
      chunks: {
        create: [
          {
            title: 'سياسة الضمان والاسترجاع',
            content: 'جميع المنتجات المادية تشمل ضمان لمدة 24 شهر مع إمكانية الاستبدال مجاناً خلال 7 أيام من الاستلام.',
          },
          {
            title: 'طرق الدفع المتاحة',
            content: 'نوفر الدفع عبر التحويل البنكي المباشر، مدى، فيزا، وماستركارد.',
          },
        ],
      },
    },
  });

  console.log('✅ OmniFlow Seed complete!');
  console.log('----------------------------------------------------');
  console.log(`🔑 Super Admin: ${superAdminEmail} / [القيمة من SUPERADMIN_PASSWORD]`);
  console.log(`🔑 Demo Merchant: ${demoEmail} / ${demoPassword}`);
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
