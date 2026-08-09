import { NextResponse } from 'next/server';
import { requireWritableWorkspaceContext } from '@/lib/auth';
import { db } from '@/lib/db';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { toErrorResponse } from '@/lib/errors';
import { assertWorkspaceLimit } from '@/lib/plan-limits';

export async function POST(request: Request) {
  try {
    const { workspaceId, role } = await requireWritableWorkspaceContext();
    enforcePermission(role as WorkspaceRole, 'contacts:create');
    const { contacts } = await request.json();

    if (!Array.isArray(contacts) || contacts.length === 0 || contacts.length > 1000) {
      return NextResponse.json({ error: 'لم يتم توفير سجلات صالحة للاستيراد.' }, { status: 400 });
    }

    await assertWorkspaceLimit(workspaceId, 'maxContacts', contacts.length);

    let createdCount = 0;
    let skippedCount = 0;

    for (const c of contacts) {
      if (!c.fullName && !c.phone && !c.email) {
        skippedCount++;
        continue;
      }

      // Deduplication check by phone or email
      const existing = await db.contact.findFirst({
        where: {
          workspaceId,
          OR: [
            c.phone ? { phone: c.phone } : undefined,
            c.email ? { email: c.email } : undefined,
          ].filter(Boolean) as any,
        },
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      await db.contact.create({
        data: {
          workspaceId,
          fullName: c.fullName || c.phone || c.email || 'عميل مستورد',
          phone: c.phone || null,
          email: c.email || null,
          source: 'CSV_IMPORT',
          stage: c.stage || 'LEAD',
          notes: c.notes || null,
        },
      });
      createdCount++;
    }

    return NextResponse.json({
      success: true,
      createdCount,
      skippedCount,
      totalProcessed: contacts.length,
    });
  } catch (error: unknown) {
    return toErrorResponse(error, 'تعذر استيراد العملاء.');
  }
}
