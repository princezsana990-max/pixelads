const communicationService = require('../services/communicationService');
const { sendSuccess, sendError } = require('../utils/response');

const lookupCustomer = async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return sendError(res, 'Phone number parameter is required', 400);
    }
    const customerInfo = await communicationService.lookupCustomerByPhone(phone);
    return sendSuccess(res, customerInfo);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const logCommunication = async (req, res) => {
  try {
    const record = await communicationService.logCommunication(req.user?.id, req.body);
    return sendSuccess(res, record, 'Communication logged successfully', 201);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

const listCommunications = async (req, res) => {
  try {
    const { type, direction, search, order_id, page = 1, limit = 20 } = req.query;
    const result = await communicationService.listCommunications({
      type,
      direction,
      search,
      order_id,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10)
    });
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const handleWebhook = async (req, res) => {
  try {
    const result = await communicationService.handleTelephonyWebhook(req.body);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

module.exports = {
  lookupCustomer,
  logCommunication,
  listCommunications,
  handleWebhook
};
