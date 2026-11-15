const reportService = require('../services/reportService');
const { sendError } = require('../utils/response');

const exportReport = async (req, res) => {
  try {
    const { type, format = 'csv', status, startDate, endDate, year, month } = req.query;

    let buffer;
    let filename;
    const contentType = format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv';

    if (type === 'orders') {
      buffer = await reportService.exportOrders({ format, status, startDate, endDate });
      filename = `orders_export_${Date.now()}.${format}`;
    } else if (type === 'payments') {
      buffer = await reportService.exportPayments({ format, startDate, endDate });
      filename = `payments_export_${Date.now()}.${format}`;
    } else if (type === 'attendance') {
      buffer = await reportService.exportAttendance({
        format,
        year: parseInt(year || new Date().getFullYear(), 10),
        month: parseInt(month || new Date().getMonth() + 1, 10)
      });
      filename = `attendance_export_${Date.now()}.${format}`;
    } else {
      return sendError(res, 'Invalid report type requested', 400);
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

module.exports = {
  exportReport
};
