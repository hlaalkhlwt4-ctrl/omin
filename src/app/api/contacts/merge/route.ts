import { NextResponse } from 'next/server';
import { requireWritableWorkspaceContext } from '@/lib/auth';
import { db } from '@/lib/db';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { toErrorResponse } from '@/lib/errors';

export async function POST(request: Request) {
  try {
    const { workspaceId, user, role } = await requireWritableWorkspaceContext();
    enforcePermission(role as WorkspaceRole, 'contacts:update');
    const { primaryContactId, secondaryContactId } = await request.json();

    if (!primaryContactId || !secondaryContactId || primaryContactId === secondaryContactId) {
      return NextResponse.json({ error: 'يرجى تحديد عميلين مختلفين لإتمام الدمج.' }, { status: 400 });
    }

    const primary = await db.contact.findFirst({
      where: { id: primaryContactId, workspaceId },
    });

    const secondary = await db.contact.findFirst({
      where: { id: secondaryContactId, workspaceId },
    });

    if (!primary || !secondary) {
      return NextResponse.json({ error: 'تعذر العثور على سجلات العملاء.' }, { status: 404 });
    }

    // Move secondary contact orders & conversations to primary
    await db.order.updateMany({
      where: { contactId: secondaryContactId, workspaceId },
      data: { contactId: primaryContactId },
    });

    await db.conversation.updateMany({
      where: { contactId: secondaryContactId, workspaceId },
      data: { contactId: primaryContactId },
    });

    // Update primary contact totals
    await db.contact.update({
      where: { id: primaryContactId },
      data: {
        totalSpent: primary.totalSpent + secondary.totalSpent,
        notes: `${primary.notes || ''}\n[تم الدمج مع العميل: ${secondary.fullName} - ${secondary.phone || secondary.email || ''}]`,
      },
    });

    // Delete secondary contact
    await db.contact.delete({
      where: { id: secondaryContactId },
    });

    // Record Audit Log
    await db.auditLog.create({
      data: {
        workspaceId,
        actorId: user.id,
        action: 'CONTACT_MERGE',
        targetType: 'CONTACT',
        targetId: primaryContactId,
        metadata: JSON.stringify({ primaryName: primary.fullName, mergedName: secondary.fullName }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return toErrorResponse(error, 'تعذر دمج العميلين.');
  }
}
