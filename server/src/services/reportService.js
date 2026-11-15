const ExcelJS = require('exceljs');
const supabase = require('../config/supabase');
const adsService = require('./adsService');

const exportOrders = async ({ format = 'csv', status, startDate, endDate }) => {
  let query = supabase
    .from('orders')
    .select(`
      order_code,
      project_name,
      customer_name,
      customer_phone,
      status,
      total_amount,
      advance_amount,
      pending_amount,
      created_at,
      order_taker:users!orders_order_taker_id_fkey(name, employee_id)
    `);

  if (status) query = query.eq('status', status);
  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Orders');

  sheet.columns = [
    { header: 'Order Code', key: 'order_code', width: 16 },
    { header: 'Project Name', key: 'project_name', width: 28 },
    { header: 'Customer', key: 'customer_name', width: 20 },
    { header: 'Phone', key: 'customer_phone', width: 16 },
    { header: 'Order Taker', key: 'order_taker', width: 22 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Total (PKR)', key: 'total_amount', width: 16 },
    { header: 'Advance (PKR)', key: 'advance_amount', width: 16 },
    { header: 'Pending (PKR)', key: 'pending_amount', width: 16 },
    { header: 'Created Date', key: 'created_at', width: 20 }
  ];

  (data || []).forEach((row) => {
    sheet.addRow({
      order_code: row.order_code,
      project_name: row.project_name,
      customer_name: row.customer_name || 'N/A',
      customer_phone: row.customer_phone || 'N/A',
      order_taker: row.order_taker ? `${row.order_taker.name} (${row.order_taker.employee_id})` : 'N/A',
      status: (row.status || '').toUpperCase(),
      total_amount: Number(row.total_amount),
      advance_amount: Number(row.advance_amount),
      pending_amount: Number(row.pending_amount),
      created_at: new Date(row.created_at).toLocaleString()
    });
  });

  if (format === 'xlsx') {
    return workbook.xlsx.writeBuffer();
  }
  return workbook.csv.writeBuffer();
};

const exportPayments = async ({ format = 'csv', startDate, endDate }) => {
  let query = supabase
    .from('orders')
    .select(`
      order_code,
      project_name,
      customer_name,
      total_amount,
      advance_amount,
      pending_amount,
      status,
      created_at,
      order_taker:users!orders_order_taker_id_fkey(name, employee_id)
    `);

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Payments');

  sheet.columns = [
    { header: 'Order Code', key: 'order_code', width: 16 },
    { header: 'Customer Name', key: 'customer_name', width: 20 },
    { header: 'Order Taker', key: 'order_taker', width: 22 },
    { header: 'Project Name', key: 'project_name', width: 28 },
    { header: 'Total (PKR)', key: 'total_amount', width: 18 },
    { header: 'Advance (PKR)', key: 'advance_amount', width: 18 },
    { header: 'Pending (PKR)', key: 'pending_amount', width: 18 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Date', key: 'created_at', width: 20 }
  ];

  let sumTotal = 0;
  let sumAdvance = 0;
  let sumPending = 0;

  (data || []).forEach((row) => {
    const tot = Number(row.total_amount);
    const adv = Number(row.advance_amount);
    const pen = Number(row.pending_amount);
    sumTotal += tot;
    sumAdvance += adv;
    sumPending += pen;

    sheet.addRow({
      order_code: row.order_code,
      customer_name: row.customer_name || 'Client',
      order_taker: row.order_taker ? `${row.order_taker.name} (${row.order_taker.employee_id})` : 'N/A',
      project_name: row.project_name,
      total_amount: tot,
      advance_amount: adv,
      pending_amount: pen,
      status: (row.status || '').toUpperCase(),
      created_at: new Date(row.created_at).toLocaleDateString()
    });
  });

  sheet.addRow({});
  sheet.addRow({
    order_code: 'TOTAL (PKR)',
    total_amount: sumTotal,
    advance_amount: sumAdvance,
    pending_amount: sumPending
  });

  if (format === 'xlsx') {
    return workbook.xlsx.writeBuffer();
  }
  return workbook.csv.writeBuffer();
};

const exportAttendance = async ({ format = 'csv', year, month }) => {
  const summary = await adsService.getAttendanceSummary(year, month);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Attendance');

  sheet.columns = [
    { header: 'Employee ID', key: 'employee_id', width: 16 },
    { header: 'Employee Name', key: 'name', width: 24 },
    { header: 'Role', key: 'role', width: 16 },
    { header: 'Present Days', key: 'present_days', width: 16 },
    { header: 'Absent Days', key: 'absent_days', width: 16 },
    { header: 'Total Days Evaluated', key: 'total_days', width: 22 },
    { header: 'Account Status', key: 'status', width: 16 }
  ];

  summary.forEach((row) => {
    sheet.addRow({
      employee_id: row.employee_id,
      name: row.name,
      role: row.role,
      present_days: row.present_days,
      absent_days: row.absent_days,
      total_days: row.total_days,
      status: row.is_blocked ? 'BLOCKED' : 'ACTIVE'
    });
  });

  if (format === 'xlsx') {
    return workbook.xlsx.writeBuffer();
  }
  return workbook.csv.writeBuffer();
};

module.exports = {
  exportOrders,
  exportPayments,
  exportAttendance
};
