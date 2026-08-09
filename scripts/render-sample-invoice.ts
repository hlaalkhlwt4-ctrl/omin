import { mkdir, writeFile } from 'node:fs/promises';
import { generateArabicInvoicePdf } from '../src/lib/adapters/pdf';

async function main() {
  await mkdir('tmp/pdfs', { recursive: true });
  const pdf = await generateArabicInvoicePdf({
  invoiceNumber: 'INV-2026-000001',
  issueDate: '2026-08-08',
  issueTimestamp: new Date().toISOString(),
  businessName: 'متجر الرائدة للمنتجات الفاخرة',
  businessAddress: 'الرياض، المملكة العربية السعودية',
  taxNumber: '310123456700003',
  customerName: 'محمد الشهري',
  customerPhone: '+966500000000',
  items: [
    { title: 'ساعة ذكية فاخرة VIP', quantity: 1, price: 739.13, total: 739.13 },
    { title: 'خدمة إعداد وتسويق', quantity: 1, price: 300, total: 300 },
  ],
  totalAmount: 1039.13,
  taxAmount: 155.87,
  grandTotal: 1195,
  currency: 'ر.س',
  });
  await writeFile('tmp/pdfs/invoice-sample.pdf', pdf);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
