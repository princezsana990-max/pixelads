import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateAttendancePdf = ({ attendance, month, year, settings }) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const monthName = new Date(year, month - 1).toLocaleString('en', { month: 'long' });

  // Border frame
  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(2);
  doc.rect(20, 20, pageWidth - 40, pageHeight - 40);

  // Header Title
  doc.setFont('Calibri', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(249, 115, 22);
  doc.text(settings?.company_name || 'PIXEL ADS', 40, 55);

  doc.setFont('Arial', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(settings?.company_address || 'Lahore, Pakistan', 40, 72);
  doc.text(`Phone: ${settings?.company_phone || '+92 370 1627301'} | Email: ${settings?.company_email || 'contact@pixelads.com'}`, 40, 86);

  doc.setFont('Calibri', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('MONTHLY ADS ATTENDANCE REPORT', pageWidth - 320, 55);

  doc.setFont('Arial', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(249, 115, 22);
  doc.text(`Cycle: ${monthName} ${year}`, pageWidth - 320, 75);
  doc.setFont('Arial', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth - 320, 90);

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(1);
  doc.line(40, 105, pageWidth - 40, 105);

  // Summary Table
  const tableData = (attendance || []).map((emp, index) => {
    const present = emp.present_days || 0;
    const absent = emp.absent_days || 0;
    const total = emp.total_days || 0;
    const rate = total > 0 ? ((present / total) * 100).toFixed(1) + '%' : '0%';
    const status = emp.is_online_now ? 'ONLINE' : 'OFFLINE';

    return [
      `#${index + 1}`,
      `${emp.name}\n(${emp.employee_id})`,
      (emp.role || '').toUpperCase().replace('_', ' '),
      `${present} Days`,
      `${absent} Days`,
      `${total} Days`,
      rate,
      status
    ];
  });

  doc.autoTable({
    startY: 120,
    margin: { left: 40, right: 40 },
    head: [['#', 'Employee', 'Role', 'Present', 'Absent', 'Total Cycle', 'Delivery %', 'Live Status']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [249, 115, 22],
      textColor: [255, 255, 255],
      font: 'Calibri',
      fontStyle: 'bold',
      fontSize: 9.5,
      halign: 'left'
    },
    styles: {
      font: 'Arial',
      fontSize: 8.5,
      lineColor: [220, 220, 220],
      lineWidth: 0.8,
      textColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' },
      1: { cellWidth: 110 },
      2: { cellWidth: 85 },
      3: { cellWidth: 60, fontStyle: 'bold', textColor: [22, 163, 74] },
      4: { cellWidth: 60, fontStyle: 'bold', textColor: [220, 38, 38] },
      5: { cellWidth: 65 },
      6: { cellWidth: 60, fontStyle: 'bold' },
      7: { cellWidth: 50, halign: 'center' }
    }
  });

  // Detailed Day-by-Day section for each employee if available
  let currentY = doc.lastAutoTable.finalY + 25;

  (attendance || []).forEach(emp => {
    if (emp.daily_breakdown && emp.daily_breakdown.length > 0) {
      if (currentY > pageHeight - 120) {
        doc.addPage();
        currentY = 40;
      }

      doc.setFont('Calibri', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Daily Attendance Log — ${emp.name} (${emp.employee_id})`, 40, currentY);
      currentY += 10;

      const dailyRows = emp.daily_breakdown.map(day => [
        day.date,
        day.status === 'present' ? 'PRESENT (AD ACTIVE)' : 'ABSENT (AD OFF)',
        day.sessionCount > 0 ? `${day.sessionCount} Session(s)` : 'Off / No Session'
      ]);

      doc.autoTable({
        startY: currentY,
        margin: { left: 40, right: 40 },
        head: [['Date', 'Attendance Status', 'Details']],
        body: dailyRows,
        theme: 'plain',
        headStyles: {
          fillColor: [30, 30, 30],
          textColor: [255, 255, 255],
          font: 'Calibri',
          fontStyle: 'bold',
          fontSize: 8.5
        },
        styles: {
          font: 'Arial',
          fontSize: 8,
          lineColor: [230, 230, 230],
          lineWidth: 0.5,
          textColor: [0, 0, 0]
        },
        columnStyles: {
          0: { cellWidth: 120 },
          1: { cellWidth: 180, fontStyle: 'bold' },
          2: { cellWidth: 215 }
        }
      });

      currentY = doc.lastAutoTable.finalY + 20;
    }
  });

  doc.setFont('Arial', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(settings?.invoice_footer_notes || 'Pixel Ads Official Attendance Record', 40, pageHeight - 35);

  return doc;
};
