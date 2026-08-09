import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';

const fontBytesPromise = readFile(resolve('src/assets/fonts/NotoSansArabic.ttf'));

export interface InvoicePdfData {
  invoiceNumber: string;
  issueDate: string;
  issueTimestamp: string;
  businessName: string;
  businessAddress?: string;
  taxNumber?: string;
  customerName: string;
  customerPhone?: string;
  items: Array<{ title: string; quantity: number; price: number; total: number }>;
  totalAmount: number;
  taxAmount: number;
  grandTotal: number;
  currency: string;
}

function zatcaTlv(data: InvoicePdfData) {
  const fields = [[1, data.businessName], [2, data.taxNumber || ''], [3, data.issueTimestamp], [4, data.grandTotal.toFixed(2)], [5, data.taxAmount.toFixed(2)]] as const;
  return Buffer.concat(fields.map(([tag, value]) => {
    const encoded = Buffer.from(value, 'utf8');
    return Buffer.concat([Buffer.from([tag, Math.min(encoded.length, 255)]), encoded.subarray(0, 255)]);
  })).toString('base64');
}

function fitText(font: PDFFont, value: string, size: number, maxWidth: number) {
  let text = value;
  while (text.length > 1 && font.widthOfTextAtSize(text, size) > maxWidth) text = `${text.slice(0, -2)}…`;
  return text;
}

function drawRight(page: PDFPage, font: PDFFont, value: string, y: number, size = 11, right = 555) {
  const text = fitText(font, value, size, right - 40);
  page.drawText(text, { x: right - font.widthOfTextAtSize(text, size), y, size, font, color: rgb(0.08, 0.12, 0.2) });
}

function drawLabelValue(page: PDFPage, font: PDFFont, label: string, value: string, y: number, size = 11, right = 555) {
  const labelWidth = font.widthOfTextAtSize(label, size);
  page.drawText(label, { x: right - labelWidth, y, size, font, color: rgb(0.08, 0.12, 0.2) });
  const valueWidth = font.widthOfTextAtSize(value, size);
  page.drawText(value, { x: right - labelWidth - valueWidth - 8, y, size, font, color: rgb(0.08, 0.12, 0.2) });
}

function drawLabelAmount(page: PDFPage, font: PDFFont, label: string, amount: number, currency: string, y: number, size = 11, right = 555) {
  const labelWidth = font.widthOfTextAtSize(label, size);
  page.drawText(label, { x: right - labelWidth, y, size, font, color: rgb(0.08, 0.12, 0.2) });
  let cursor = right - labelWidth - 8;
  const amountText = amount.toFixed(2);
  const amountWidth = font.widthOfTextAtSize(amountText, size);
  page.drawText(amountText, { x: cursor - amountWidth, y, size, font, color: rgb(0.08, 0.12, 0.2) });
  cursor -= amountWidth + 5;
  const currencyWidth = font.widthOfTextAtSize(currency, size);
  page.drawText(currency, { x: cursor - currencyWidth, y, size, font, color: rgb(0.08, 0.12, 0.2) });
}

function drawMixedRight(page: PDFPage, font: PDFFont, value: string, y: number, size = 10, right = 555) {
  const parts = value.split(/([A-Za-z0-9][A-Za-z0-9.,/+:-]*)/g).filter(Boolean);
  let cursor = right;
  for (const part of parts) {
    const width = font.widthOfTextAtSize(part, size);
    page.drawText(part, { x: cursor - width, y, size, font, color: rgb(0.08, 0.12, 0.2) });
    cursor -= width;
  }
}

export async function generateArabicInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await fontBytesPromise, { subset: true });
  const page = pdf.addPage([595.28, 841.89]);
  const { width } = page.getSize();
  page.drawRectangle({ x: 0, y: 760, width, height: 82, color: rgb(0.02, 0.52, 0.76) });
  const title = 'فاتورة ضريبية';
  page.drawText(title, { x: width - 40 - font.widthOfTextAtSize(title, 24), y: 798, size: 24, font, color: rgb(1, 1, 1) });
  page.drawText(data.invoiceNumber, { x: 40, y: 801, size: 12, font, color: rgb(1, 1, 1) });
  drawRight(page, font, `المنشأة: ${data.businessName}`, 730, 13);
  drawLabelValue(page, font, 'الرقم الضريبي:', data.taxNumber || 'غير مسجل', 708);
  drawRight(page, font, `العنوان: ${data.businessAddress || 'غير محدد'}`, 688);
  drawRight(page, font, `العميل: ${data.customerName}`, 650, 12);
  drawLabelValue(page, font, 'تاريخ الإصدار:', data.issueDate, 630);
  page.drawLine({ start: { x: 40, y: 606 }, end: { x: 555, y: 606 }, thickness: 1, color: rgb(0.8, 0.84, 0.88) });
  const headers = [{ text: 'الإجمالي', x: 50 }, { text: 'السعر', x: 150 }, { text: 'الكمية', x: 250 }, { text: 'الوصف', x: 350 }];
  for (const header of headers) page.drawText(header.text, { x: header.x, y: 582, size: 10, font, color: rgb(0.25, 0.3, 0.38) });
  let y = 554;
  for (const item of data.items.slice(0, 18)) {
    page.drawText(`${item.total.toFixed(2)}`, { x: 50, y, size: 10, font });
    page.drawText(`${item.price.toFixed(2)}`, { x: 150, y, size: 10, font });
    page.drawText(`${item.quantity}`, { x: 260, y, size: 10, font });
    const description = fitText(font, item.title, 10, 200);
    drawMixedRight(page, font, description, y, 10);
    page.drawLine({ start: { x: 40, y: y - 10 }, end: { x: 555, y: y - 10 }, thickness: 0.5, color: rgb(0.9, 0.92, 0.94) });
    y -= 28;
  }
  const summaryY = Math.min(y - 20, 240);
  drawLabelAmount(page, font, 'المجموع قبل الضريبة:', data.totalAmount, data.currency, summaryY);
  drawLabelAmount(page, font, 'ضريبة القيمة المضافة:', data.taxAmount, data.currency, summaryY - 24);
  drawLabelAmount(page, font, 'الإجمالي شامل الضريبة:', data.grandTotal, data.currency, summaryY - 54, 15);
  const qrBuffer = await QRCode.toBuffer(zatcaTlv(data), { type: 'png', margin: 1, width: 180 });
  const qr = await pdf.embedPng(qrBuffer);
  page.drawImage(qr, { x: 40, y: summaryY - 85, width: 105, height: 105 });
  page.drawText('QR TLV', { x: 70, y: summaryY - 98, size: 8, font, color: rgb(0.4, 0.45, 0.5) });
  const footer = 'تم إنشاء هذه الفاتورة إلكترونيًا عبر منصة أومني فلو';
  page.drawText(footer, { x: (width - font.widthOfTextAtSize(footer, 9)) / 2, y: 35, size: 9, font, color: rgb(0.45, 0.5, 0.56) });
  return Buffer.from(await pdf.save());
}
