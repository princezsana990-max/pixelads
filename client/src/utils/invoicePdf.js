import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency, formatDate, formatTime, formatCleanNotes } from './formatters';

export const generateInvoicePdf = (order, settings) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.5);
  doc.rect(20, 20, pageWidth - 40, pageHeight - 40);

  doc.setFont('Calibri', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(249, 115, 22);
  doc.text(settings?.company_name || 'PIXEL ADS', 40, 55);

  doc.setFont('Arial', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(settings?.company_address || '123 Business Avenue', 40, 72);
  doc.text(
    `Phone: ${settings?.company_phone || '+1 800 000 0000'} | Email: ${settings?.company_email || 'contact@pixelads.com'}`,
    40, 86
  );

  doc.setFont('Calibri', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text('INVOICE', pageWidth - 140, 55);

  doc.setFont('Arial', 'bold');
  doc.setFontSize(10);
  doc.text(`Invoice #: ${order.order_code}`, pageWidth - 180, 75);
  doc.setFont('Arial', 'normal');
  doc.text(`Date: ${formatDate(order.created_at)}`, pageWidth - 180, 90);
  doc.text(`Time: ${formatTime(order.created_at)}`, pageWidth - 180, 105);

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.5);
  doc.line(40, 120, pageWidth - 40, 120);

  doc.setFont('Calibri', 'bold');
  doc.setFontSize(12);
  doc.text('Order Details', 40, 142);

  doc.setFont('Arial', 'bold');
  doc.setFontSize(9);
  doc.text('Project Name:', 40, 162);
  doc.setFont('Arial', 'normal');
  doc.text(order.project_name || 'N/A', 130, 162);

  doc.setFont('Arial', 'bold');
  doc.text('Customer:', 40, 178);
  doc.setFont('Arial', 'normal');
  doc.text(
    `${order.customer_name || 'N/A'}${order.customer_phone ? '  |  ' + order.customer_phone : ''}`,
    130, 178
  );

  doc.setFont('Arial', 'bold');
  doc.text('Order Status:', 40, 194);
  doc.setFont('Arial', 'normal');
  doc.text((order.status || 'PENDING').replace(/_/g, ' ').toUpperCase(), 130, 194);

  doc.autoTable({
    startY: 215,
    margin: { left: 40, right: 40 },
    head: [['Item Description', 'Project', 'Qty', 'Unit Price', 'Total']],
    body: [
      [
        'Video Production & Editing Services',
        order.project_name,
        '1',
        formatCurrency(order.total_amount),
        formatCurrency(order.total_amount)
      ]
    ],
    theme: 'plain',
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      font: 'Calibri',
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'left'
    },
    styles: {
      font: 'Arial',
      fontSize: 9,
      lineColor: [0, 0, 0],
      lineWidth: 1.5,
      textColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 190 },
      1: { cellWidth: 140 },
      2: { cellWidth: 40, halign: 'center' },
      3: { cellWidth: 70, halign: 'right' },
      4: { cellWidth: 75, halign: 'right' }
    }
  });

  const summaryY = doc.lastAutoTable.finalY + 15;

  doc.autoTable({
    startY: summaryY,
    margin: { left: pageWidth - 250, right: 40 },
    body: [
      ['Total Amount:', formatCurrency(order.total_amount)],
      ['Advance Paid:', formatCurrency(order.advance_amount)],
      ['Balance Due:', formatCurrency(order.pending_amount)]
    ],
    theme: 'plain',
    styles: {
      font: 'Calibri',
      fontSize: 10,
      lineColor: [0, 0, 0],
      lineWidth: 1.5,
      textColor: [0, 0, 0]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 110 },
      1: { halign: 'right', fontStyle: 'bold', textColor: [249, 115, 22] }
    }
  });

  const notesY = doc.lastAutoTable.finalY + 30;
  const cleanNotes = formatCleanNotes(order.clean_notes || order.notes);

  if (cleanNotes) {
    doc.setFont('Calibri', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Notes / Remarks:', 40, notesY);
    doc.setFont('Arial', 'normal');
    doc.setFontSize(8.5);
    const splitNotes = doc.splitTextToSize(cleanNotes, pageWidth - 80);
    doc.text(splitNotes, 40, notesY + 15);
  }

  doc.setFont('Arial', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  doc.text(settings?.invoice_footer_notes || 'Thank you for your business.', 40, pageHeight - 40);

  return doc;
};
