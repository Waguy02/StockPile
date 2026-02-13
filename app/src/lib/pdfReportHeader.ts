import type jsPDF from 'jspdf';

const HEADER_TOP_MM = 20; // 2 cm from top
const LOGO_WITH_TEXT_WIDTH_MM = 50;
const LOGO_WITH_TEXT_HEIGHT_MM = 14;

/** Load logo with text (odicam_logo_with_text.png) as base64 data URL for PDF. */
export function loadLogoWithTextDataUrl(): Promise<string | null> {
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

// Navbar blue #0B1121 for header background (logo with text stays readable)
const HEADER_BG_RGB = { r: 11, g: 17, b: 33 };

/**
 * Draw report header: full-width blue band (navbar color), logo with text on top, then a line.
 * Returns the y position (in mm) after the header for content.
 */
export function drawPdfHeader(doc: jsPDF, logoDataUrl: string | null): number {
  const margin = 10;
  const pageW = doc.internal.pageSize.getWidth();
  const rightX = pageW - margin;
  const headerBottomY = HEADER_TOP_MM + LOGO_WITH_TEXT_HEIGHT_MM + 8;

  // Full header band in navbar blue
  doc.setFillColor(HEADER_BG_RGB.r, HEADER_BG_RGB.g, HEADER_BG_RGB.b);
  doc.rect(0, 0, pageW, headerBottomY, 'F');

  let y = HEADER_TOP_MM;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', margin, y, LOGO_WITH_TEXT_WIDTH_MM, LOGO_WITH_TEXT_HEIGHT_MM);
    } catch {
      // ignore if image fails
    }
  }
  y = headerBottomY;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, y, rightX, y);
  y += 6;
  return y;
}
