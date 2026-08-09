import { db } from './db';
import { AppError } from './errors';

export type PlanLimitKey = 'maxUsers' | 'maxContacts' | 'maxMessages' | 'maxCampaigns' | 'aiTokensLimit';

export function isWithinPlanLimit(current: number, increment: number, limit: number) {
  return current + increment <= limit;
}

async function getPlanContext(workspaceId: string) {
  const subscription = await db.subscription.findFirst({
    where: {
      workspaceId,
      status: { in: ['TRIALING', 'ACTIVE'] },
      currentPeriodEnd: { gt: new Date() },
    },
    include: { plan: { include: { entitlements: true } } },
    orderBy: { currentPeriodEnd: 'desc' },
  });

  if (!subscription?.plan.entitlements) {
    throw new AppError('PLAN_NOT_CONFIGURED', 409, 'لا توجد باقة فعالة بحدود مهيأة لهذا النشاط.');
  }
  return { subscription, entitlements: subscription.plan.entitlements };
}

export async function assertWorkspaceLimit(
  workspaceId: string,
  key: PlanLimitKey,
  increment = 1,
) {
  const { subscription, entitlements } = await getPlanContext(workspaceId);
  const limit = entitlements[key];
  let current = 0;

  if (key === 'maxUsers') {
    const [members, invitations] = await Promise.all([
      db.workspaceMember.count({ where: { workspaceId, status: 'ACTIVE' } }),
      db.workspaceInvitation.count({
        where: { workspaceId, status: 'PENDING', expiresAt: { gt: new Date() } },
      }),
    ]);
    current = members + invitations;
  } else if (key === 'maxContacts') {
    current = await db.contact.count({ where: { workspaceId } });
  } else if (key === 'maxMessages') {
    current = await db.message.count({
      where: {
        conversation: { workspaceId },
        createdAt: { gte: subscription.currentPeriodStart },
      },
    });
  } else if (key === 'maxCampaigns') {
    current = await db.campaign.count({
      where: { workspaceId, createdAt: { gte: subscription.currentPeriodStart } },
    });
  } else {
    const usage = await db.aiUsageLog.aggregate({
      where: { workspaceId, createdAt: { gte: subscription.currentPeriodStart } },
      _sum: { inputTokens: true, outputTokens: true },
    });
    current = (usage._sum.inputTokens || 0) + (usage._sum.outputTokens || 0);
  }

  if (!isWithinPlanLimit(current, increment, limit)) {
    throw new AppError(
      'PLAN_LIMIT_REACHED',
      409,
      `تم بلوغ حد الباقة الحالي (${limit}). قم بترقية الباقة أو خفّض الاستخدام للمتابعة.`,
    );
  }

  return { current, limit, remaining: Math.max(0, limit - current - increment) };
}
