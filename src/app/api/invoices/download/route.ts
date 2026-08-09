import { NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateArabicInvoicePdf } from '@/lib/adapters/pdf';
import { enforcePermission, type WorkspaceRole } from '@/lib/permissions';
import { toErrorResponse } from '@/lib/errors';

export async function GET(request: Request) {
  try {
    const { workspaceId, role } = await requireWorkspaceContext();
    enforcePermission(role as WorkspaceRole, 'finance:view');
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('id');

    if (!invoiceId) {
      return NextResponse.json({ error: 'مُعرف الفاتورة مطلوب.' }, { status: 400 });
    }

    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, workspaceId },
      include: {
        order: {
          include: { contact: true, items: true },
        },
        workspace: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'لم يتم العثور على الفاتورة.' }, { status: 404 });
    }

    const pdfBuffer = await generateArabicInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      issueDate: new Date(invoice.issueDate).toISOString().slice(0, 10),
      issueTimestamp: new Date(invoice.issueDate).toISOString(),
      businessName: invoice.workspace.name,
      businessAddress: invoice.workspace.businessAddress || undefined,
      taxNumber: invoice.workspace.taxNumber || undefined,
      customerName: invoice.order.contact.fullName,
      customerPhone: invoice.order.contact.phone || undefined,
      items: invoice.order.items.map((i) => ({
        title: i.title,
        quantity: i.quantity,
        price: i.price,
        total: i.total,
      })),
      totalAmount: invoice.totalAmount,
      taxAmount: invoice.totalAmount * (invoice.workspace.taxRate / 100),
      grandTotal: invoice.totalAmount * (1 + invoice.workspace.taxRate / 100),
      currency: invoice.workspace.currency,
    });

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error: unknown) {
    return toErrorResponse(error, 'تعذر إنشاء ملف الفاتورة.');
  }
}
