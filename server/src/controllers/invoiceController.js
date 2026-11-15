const invoiceService = require('../services/invoiceService');
const { sendSuccess, sendError } = require('../utils/response');

const createInvoice = async (req, res) => {
  try {
    const invoice = await invoiceService.createInvoice(req.user.id, req.body);
    return sendSuccess(res, invoice, 'Invoice generated successfully', 201);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

const listInvoices = async (req, res) => {
  try {
    const { order_id, status, search, page = 1, limit = 10 } = req.query;
    const result = await invoiceService.listInvoices({
      order_id,
      status,
      search,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10)
    });
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id);
    return sendSuccess(res, invoice);
  } catch (err) {
    return sendError(res, err.message, 404);
  }
};

const updateInvoice = async (req, res) => {
  try {
    const invoice = await invoiceService.updateInvoice(req.params.id, req.body);
    return sendSuccess(res, invoice, 'Invoice updated successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

const recordPayment = async (req, res) => {
  try {
    const invoice = await invoiceService.recordInvoicePayment(req.params.id, req.user.id, req.body);
    return sendSuccess(res, invoice, 'Payment recorded successfully against invoice');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

const deleteInvoice = async (req, res) => {
  try {
    await invoiceService.deleteInvoice(req.params.id);
    return sendSuccess(res, null, 'Invoice deleted successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

module.exports = {
  createInvoice,
  listInvoices,
  getInvoiceById,
  updateInvoice,
  recordPayment,
  deleteInvoice
};
