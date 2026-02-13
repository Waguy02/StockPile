import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDateForDisplay } from './formatters';
import { savePdf } from './downloadPdf';
import type { Sale, PurchaseOrder, OrderItem } from './data';

const HEADER_TOP_MM = 20; // 2 cm from top
const HEADER_LOGO_WITH_TEXT_WIDTH_MM = 50;
const HEADER_LOGO_WITH_TEXT_HEIGHT_MM = 14;
const HEADER_BG_RGB = { r: 11, g: 17, b: 33 }; // navbar blue #0B1121
const BRAND_COLOR = { r: 67, g: 56, b: 202 }; // indigo-700
const TITLE_H1_FONT_SIZE = 18;

type InvoiceI18n = {
  title: string;
  titleSale: string;
  titlePurchase: string;
  natureSale: string;
  naturePurchase: string;
  reference: string;
  date: string;
  client: string;
  provider: string;
  product: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  total: string;
  amountPaid: string;
  remaining: string;
};

/** Sanitize a string for use in filenames: keep alphanumeric and replace spaces/special with underscore. */
export function sanitizeForFilename(s: string, maxLen = 40): string {
  const cleaned = String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[\s.,;:'"()[\]]+/g, '_')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, maxLen);
  return cleaned || 'Facture';
}

/** Build the sale invoice filename: Facture_vente_[CLIENT]_[REF]_[Date].pdf */
export function getSaleInvoiceFilename(
  sale: { id: string; customerId: string; initiationDate: string },
  getCustomerName: (id: string) => string
): string {
  const client = sanitizeForFilename(getCustomerName(sale.customerId));
  const ref = sale.id.slice(0, 8).toUpperCase();
  const date = formatDateForDisplay(sale.initiationDate) || 'sans-date';
  return `odicam_facture_vente_${client}_${ref}_${date}.pdf`;
}

/** Build the purchase invoice filename: Facture_achat_[FOURNISSEUR]_[REF]_[Date].pdf */
export function getPurchaseInvoiceFilename(
  po: { id: string; providerId: string; initiationDate: string },
  getProviderName: (id: string) => string
): string {
  const fournisseur = sanitizeForFilename(getProviderName(po.providerId));
  const ref = po.id.slice(0, 8).toUpperCase();
  const date = formatDateForDisplay(po.initiationDate) || 'sans-date';
  return `odicam_facture_achat_${fournisseur}_${ref}_${date}.pdf`;
}

/** Load app logo with text (odicam_logo_with_text.png) for PDF header. */
function loadLogoWithTextDataUrl(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.location) {
      resolve(null);
      return;
    }
    const dir = window.location.pathname.replace(/\/[^/]*$/, '') || '/';
    const logoUrl = window.location.origin + dir + (dir.endsWith('/') ? '' : '/') + 'odicam_logo_with_text.png';
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else resolve(null);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = logoUrl;
  });
}

/** Draw invoice header: blue band, logo with text, line, then centered H1 title. Returns new y (mm). */
function drawInvoiceHeader(doc: jsPDF, margin: number, logoDataUrl: string | null, titleH1: string): number {
  const pageW = doc.internal.pageSize.getWidth();
  const rightX = pageW - margin;
  const headerBottomY = HEADER_TOP_MM + HEADER_LOGO_WITH_TEXT_HEIGHT_MM + 8;

  // Same blue background as report header (navbar #0B1121)
  doc.setFillColor(HEADER_BG_RGB.r, HEADER_BG_RGB.g, HEADER_BG_RGB.b);
  doc.rect(0, 0, pageW, headerBottomY, 'F');

  let y = HEADER_TOP_MM;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', margin, y, HEADER_LOGO_WITH_TEXT_WIDTH_MM, HEADER_LOGO_WITH_TEXT_HEIGHT_MM);
    } catch {
      // ignore if image fails
    }
  }
  y = headerBottomY;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, y, rightX, y);
  y += 10;

  // Centered H1 title (e.g. "Facture de vente" / "Facture d'achat")
  doc.setFontSize(TITLE_H1_FONT_SIZE);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(titleH1, pageW / 2, y, { align: 'center' });
  y += 10;
  return y;
}

function getTableRows(
  items: OrderItem[] | undefined,
  getProductName: (id: string) => string
): string[][] {
  if (!items || items.length === 0) return [];
  return items.map((item) => {
    const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
    return [
      getProductName(item.productId),
      String(item.quantity ?? 0),
      formatCurrency(item.unitPrice ?? 0),
      formatCurrency(lineTotal),
    ];
  });
}

export async function generateSaleInvoicePdf(
  sale: Sale,
  i18n: InvoiceI18n,
  getCustomerName: (id: string) => string,
  getProductName: (id: string) => string
): Promise<void> {
  const doc = new jsPDF();
  const margin = 20;
  const pageW = doc.internal.pageSize.getWidth();
  let y = margin;

  const logoDataUrl = await loadLogoWithTextDataUrl();
  y = drawInvoiceHeader(doc, margin, logoDataUrl, i18n.titleSale);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`${i18n.reference}: #${sale.id.slice(0, 8).toUpperCase()}`, margin, y);
  y += 7;
  doc.text(`${i18n.date}: ${formatDateForDisplay(sale.initiationDate)}`, margin, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`${i18n.client}: ${getCustomerName(sale.customerId)}`, margin, y);
  doc.setFont('helvetica', 'normal');
  y += 14;

  const headers = [i18n.product, i18n.quantity, i18n.unitPrice, i18n.lineTotal];
  const rows = getTableRows(sale.items, getProductName);

  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows,
    theme: 'striped',
    headStyles: {
      fillColor: [BRAND_COLOR.r, BRAND_COLOR.g, BRAND_COLOR.b],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: { fontSize: 9 },
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 24, halign: 'right' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 40, halign: 'right' },
    },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;

  const total = Number(sale.totalAmount) || 0;
  const amountPaid = Number(sale.amountPaid) || 0;
  const remaining = Math.max(0, total - amountPaid);

  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.line(margin, y - 4, pageW - margin, y - 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${i18n.total}: ${formatCurrency(total)}`, margin, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${i18n.amountPaid}: ${formatCurrency(amountPaid)}`, margin, y);
  y += 6;
  doc.text(`${i18n.remaining}: ${formatCurrency(remaining)}`, margin, y);

  doc.setFontSize(10);
  doc.setTextColor(140, 140, 140);
  doc.text(`Odicam — ${i18n.title}`, margin, doc.internal.pageSize.getHeight() - 10);
  doc.text(`#${sale.id.slice(0, 8).toUpperCase()}`, pageW - margin, doc.internal.pageSize.getHeight() - 10, { align: 'right' });

  await savePdf(doc, getSaleInvoiceFilename(sale, getCustomerName));
}

export async function generatePurchaseInvoicePdf(
  po: PurchaseOrder,
  i18n: InvoiceI18n,
  getProviderName: (id: string) => string,
  getProductName: (id: string) => string
): Promise<void> {
  const doc = new jsPDF();
  const margin = 20;
  const pageW = doc.internal.pageSize.getWidth();
  let y = margin;

  const logoDataUrl = await loadLogoWithTextDataUrl();
  y = drawInvoiceHeader(doc, margin, logoDataUrl, i18n.titlePurchase);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`${i18n.reference}: #${po.id.slice(0, 8).toUpperCase()}`, margin, y);
  y += 7;
  doc.text(`${i18n.date}: ${formatDateForDisplay(po.initiationDate)}`, margin, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`${i18n.provider}: ${getProviderName(po.providerId)}`, margin, y);
  doc.setFont('helvetica', 'normal');
  y += 14;

  const headers = [i18n.product, i18n.quantity, i18n.unitPrice, i18n.lineTotal];
  const rows = getTableRows(po.items, getProductName);

  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows,
    theme: 'striped',
    headStyles: {
      fillColor: [BRAND_COLOR.r, BRAND_COLOR.g, BRAND_COLOR.b],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: { fontSize: 9 },
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 24, halign: 'right' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 40, halign: 'right' },
    },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;

  const total = Number(po.totalAmount) || 0;
  const amountPaid = Number(po.amountPaid) || 0;
  const remaining = Math.max(0, total - amountPaid);

  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.line(margin, y - 4, pageW - margin, y - 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`${i18n.total}: ${formatCurrency(total)}`, margin, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${i18n.amountPaid}: ${formatCurrency(amountPaid)}`, margin, y);
  y += 6;
  doc.text(`${i18n.remaining}: ${formatCurrency(remaining)}`, margin, y);

  doc.setFontSize(10);
  doc.setTextColor(140, 140, 140);
  doc.text(`Odicam — ${i18n.title}`, margin, doc.internal.pageSize.getHeight() - 10);
  doc.text(`#${po.id.slice(0, 8).toUpperCase()}`, pageW - margin, doc.internal.pageSize.getHeight() - 10, { align: 'right' });

  await savePdf(doc, getPurchaseInvoiceFilename(po, getProviderName));
}
