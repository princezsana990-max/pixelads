const ExcelJS = require('exceljs');
const { createUserSchema } = require('../validators/userValidator');
const userService = require('./userService');
const orderService = require('./orderService');
const supabase = require('../config/supabase');

const parseBuffer = async (buffer, filename = '') => {
  const workbook = new ExcelJS.Workbook();
  if (filename.endsWith('.csv') || !filename.endsWith('.xlsx')) {
    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    await workbook.csv.read(bufferStream);
  } else {
    await workbook.xlsx.load(buffer);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No worksheet found in uploaded file');
  }

  const rows = [];
  let headers = [];

  worksheet.eachRow((row, rowNumber) => {
    const values = Array.isArray(row.values) ? row.values.slice(1) : Object.values(row.values);
    if (rowNumber === 1) {
      headers = values.map((v) => String(v || '').trim().toLowerCase().replace(/\s+/g, '_'));
    } else {
      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] !== undefined ? values[idx] : '';
      });
      rows.push({ rowNumber, data: rowObj });
    }
  });

  return rows;
};

const importEmployees = async (fileBuffer, filename) => {
  const parsedRows = await parseBuffer(fileBuffer, filename);
  let successCount = 0;
  const errors = [];

  for (const item of parsedRows) {
    const row = item.data;
    try {
      const validated = createUserSchema.parse({
        name: String(row.name || ''),
        phone: String(row.phone || ''),
        username: String(row.username || ''),
        password: String(row.password || 'Temp123456'),
        role: String(row.role || 'order_taker').toLowerCase()
      });

      await userService.createUser(validated);
      successCount++;
    } catch (err) {
      errors.push({
        row: item.rowNumber,
        identifier: row.username || row.name || `Row ${item.rowNumber}`,
        error: err.errors ? err.errors.map((e) => e.message).join(', ') : err.message
      });
    }
  }

  return {
    totalRows: parsedRows.length,
    successCount,
    failedCount: errors.length,
    errors
  };
};

const importOrders = async (fileBuffer, filename, adminId) => {
  const parsedRows = await parseBuffer(fileBuffer, filename);
  let successCount = 0;
  const errors = [];

  for (const item of parsedRows) {
    const row = item.data;
    try {
      let orderTakerId = adminId;
      if (row.order_taker_username) {
        const { data: ot } = await supabase
          .from('users')
          .select('id')
          .eq('username', String(row.order_taker_username).trim())
          .single();
        if (ot) {
          orderTakerId = ot.id;
        }
      }

      await orderService.createOrder(orderTakerId, {
        project_name: String(row.project_name || `Project Row ${item.rowNumber}`),
        script: String(row.script || 'Standard video script'),
        notes: String(row.notes || ''),
        total_amount: Number(row.total_amount || 0),
        advance_amount: Number(row.advance_amount || 0),
        files: []
      });

      successCount++;
    } catch (err) {
      errors.push({
        row: item.rowNumber,
        identifier: row.project_name || `Row ${item.rowNumber}`,
        error: err.message
      });
    }
  }

  return {
    totalRows: parsedRows.length,
    successCount,
    failedCount: errors.length,
    errors
  };
};

module.exports = {
  importEmployees,
  importOrders
};
