import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { issueSession, requireAuthContext, revokeSession, setSessionCookie } from '@/lib/auth';
import { z } from 'zod';
import { toErrorResponse } from '@/lib/errors';
import { getClientAddress } from '@/lib/rate-limit';
import { isSupportedCurrency } from '@/lib/currencies';

const workspaceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  businessType: z.enum(['PHYSICAL', 'DIGITAL', 'SERVICE', 'SUBSCRIPTION', 'COURSE', 'BOOKING']).default('PHYSICAL'),
  country: z.string().trim().min(2).max(2).default('SA'),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).refine(isSupportedCurrency, 'Unsupported currency').default('SAR'),
  timezone: z.string().trim().max(80).default('Asia/Riyadh'),
  taxRate: z.coerce.number().min(0).max(100).default(15),
  firstProductTitle: z.string().trim().max(160).optional().or(z.literal('')),
  firstProductPrice: z.union([z.coerce.number().positive(), z.literal('')]).optional(),
  aiInfo: z.string().trim().max(4000).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireAuthContext();
    const parsed = workspaceSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'تحقق من بيانات النشاط والعملة والضريبة.' }, { status: 400 });
    }
    const { name, businessType, country, currency, timezone, taxRate, firstProductTitle, firstProductPrice, aiInfo } = parsed.data;

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `ws-${Date.now()}`;

    // Get default starter plan
    const starterPlan = await db.plan.findFirst({
      orderBy: { sortingOrder: 'asc' },
    });

    const workspace = await db.workspace.create({
      data: {
        name,
        slug,
        businessType: businessType || 'PHYSICAL',
        country: country || 'SA',
        currency: currency || 'SAR',
        timezone: timezone || 'Asia/Riyadh',
        taxRate,
        status: 'ACTIVE',
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
            status: 'ACTIVE',
          },
        },
        subscriptions: starterPlan
          ? {
              create: {
                planId: starterPlan.id,
                status: 'TRIALING',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
              },
            }
          : undefined,
        pipelines: {
          create: {
            name: 'مسار المبيعات الرئيسي',
            isDefault: true,
            stages: {
              create: [
                { name: 'جديد', color: '#3b82f6', sortingOrder: 1 },
                { name: 'تم التواصل', color: '#8b5cf6', sortingOrder: 2 },
                { name: 'بانتظار الدفع', color: '#f59e0b', sortingOrder: 3 },
                { name: 'مدفوع', color: '#10b981', sortingOrder: 4 },
                { name: 'قيد التنفيذ', color: '#06b6d4', sortingOrder: 5 },
                { name: 'مكتمل', color: '#22c55e', sortingOrder: 6 },
              ],
            },
          },
        },
      },
    });

    // Create Dev Mock Channel
    await db.channel.create({
      data: {
        workspaceId: workspace.id,
        provider: 'DEV_MOCK',
        name: 'القناة المحاكية التطويرية (Development Mock)',
        isActive: true,
        healthStatus: 'CONNECTED',
      },
    });

    // Add First Product if provided
    if (firstProductTitle && firstProductPrice) {
      await db.product.create({
        data: {
          workspaceId: workspace.id,
          title: firstProductTitle,
          price: Number(firstProductPrice),
          currency,
          type: businessType || 'PHYSICAL',
        },
      });
    }

    // Configure Initial AI Agent
    await db.aiAgent.create({
      data: {
        workspaceId: workspace.id,
        name: `مساعد ${workspace.name}`,
        role: 'ممثل المبيعات والدعم الفني',
        tone: 'مهني وودود',
        businessInfo: aiInfo || `نشاط ${workspace.name} يعمل في مجال ${businessType}.`,
        mode: 'SUGGEST',
        isEnabled: true,
      },
    });

    // Update Token with active workspace ID
    await revokeSession();
    const newToken = await issueSession(
      { userId: user.id, email: user.email, isSuperAdmin: user.isSuperAdmin, activeWorkspaceId: workspace.id },
      { ipAddress: getClientAddress(request), userAgent: request.headers.get('user-agent') || undefined },
    );

    const response = NextResponse.json({ success: true, workspaceId: workspace.id });
    setSessionCookie(response, newToken);

    return response;
  } catch (error: unknown) {
    return toErrorResponse(error, 'فشل إنشاء النشاط.');
  }
}
