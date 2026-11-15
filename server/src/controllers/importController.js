const importService = require('../services/importService');
const { sendSuccess, sendError } = require('../utils/response');

const importBulk = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }

    const { type } = req.body;
    let result;

    if (type === 'employees') {
      result = await importService.importEmployees(req.file.buffer, req.file.originalname);
    } else if (type === 'orders') {
      result = await importService.importOrders(req.file.buffer, req.file.originalname, req.user.id);
    } else {
      return sendError(res, 'Invalid import type. Must be employees or orders', 400);
    }

    return sendSuccess(res, result, 'Import processed successfully');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

module.exports = {
  importBulk
};
