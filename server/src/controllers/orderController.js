const orderService = require('../services/orderService');
const { sendSuccess, sendError } = require('../utils/response');

const createOrder = async (req, res) => {
  try {
    const order = await orderService.createOrder(req.user, req.body);
    return sendSuccess(res, order, 'Order created successfully', 201);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

const listOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const status = req.query.status || undefined;
    const search = req.query.search || undefined;
    const startDate = req.query.startDate || undefined;
    const endDate = req.query.endDate || undefined;
    const employeeId = req.query.employeeId || undefined;
    const isDeleted = req.query.isDeleted === 'true';

    const result = await orderService.listOrders({
      user: req.user,
      page,
      limit,
      status,
      search,
      startDate,
      endDate,
      employeeId,
      isDeleted
    });

    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id, req.user);
    return sendSuccess(res, order);
  } catch (err) {
    return sendError(res, err.message, 404);
  }
};

const assignEditor = async (req, res) => {
  try {
    const order = await orderService.assignEditor(req.params.id, req.body.editor_id, req.user.id);
    return sendSuccess(res, order, 'Order assigned to editor successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

const submitWork = async (req, res) => {
  try {
    const order = await orderService.submitWork(req.params.id, req.user.id, req.body);
    return sendSuccess(res, order, 'Work submitted successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

const requestRevision = async (req, res) => {
  try {
    const order = await orderService.requestRevision(req.params.id, req.user.id, req.body.notes);
    return sendSuccess(res, order, 'Revision request sent');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

const approveWork = async (req, res) => {
  try {
    const order = await orderService.approveWork(req.params.id, req.user.id);
    return sendSuccess(res, order, 'Work approved successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

const finalizeOrder = async (req, res) => {
  try {
    const order = await orderService.finalizeOrder(req.params.id, req.user);
    return sendSuccess(res, order, 'Order finalized and completed');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

const updateOrder = async (req, res) => {
  try {
    const order = await orderService.updateOrder(req.params.id, req.user, req.body);
    return sendSuccess(res, order, 'Order updated successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

const deleteOrder = async (req, res) => {
  try {
    const result = await orderService.deleteOrder(req.params.id, req.user);
    return sendSuccess(res, result, 'Order removed/archived successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

const recoverOrder = async (req, res) => {
  try {
    const result = await orderService.recoverOrder(req.params.id, req.user);
    return sendSuccess(res, result, 'Order recovered successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

const updateAdStatus = async (req, res) => {
  try {
    const updated = await orderService.updateAdStatus(req.params.id, req.body);
    return sendSuccess(res, updated, 'Ad status updated successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

module.exports = {
  createOrder,
  listOrders,
  getOrderById,
  assignEditor,
  submitWork,
  requestRevision,
  approveWork,
  finalizeOrder,
  updateOrder,
  deleteOrder,
  recoverOrder,
  updateAdStatus
};
