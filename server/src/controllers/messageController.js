const messageService = require('../services/messageService');
const { sendSuccess, sendError } = require('../utils/response');

const listMessages = async (req, res) => {
  try {
    const messages = await messageService.listMessages(req.params.id);
    return sendSuccess(res, messages);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const sendMessage = async (req, res) => {
  try {
    const message = await messageService.sendMessage(req.params.id, req.user.id, req.body);
    return sendSuccess(res, message, 'Message sent successfully', 201);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

const markAsDelivered = async (req, res) => {
  try {
    await messageService.markAsDelivered(req.params.id, req.user.id);
    return sendSuccess(res, null, 'Messages marked as delivered');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const markAsRead = async (req, res) => {
  try {
    await messageService.markAsRead(req.params.id, req.user.id);
    return sendSuccess(res, null, 'Messages marked as read');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

module.exports = {
  listMessages,
  sendMessage,
  markAsDelivered,
  markAsRead
};
