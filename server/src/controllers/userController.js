const userService = require('../services/userService');
const { sendSuccess, sendError } = require('../utils/response');

const createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);
    return sendSuccess(res, user, 'Employee created successfully', 201);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

const listUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const role = req.query.role || undefined;
    const is_blocked = req.query.is_blocked !== undefined ? req.query.is_blocked === 'true' : undefined;
    const search = req.query.search || undefined;

    const result = await userService.listUsers({ page, limit, role, is_blocked, search });
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    return sendSuccess(res, user);
  } catch (err) {
    return sendError(res, err.message, 404);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    return sendSuccess(res, user, 'Employee updated successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

const updateCredentials = async (req, res, next) => {
  try {
    const user = await userService.updateCredentials(req.params.id, req.body);
    return sendSuccess(res, user, 'Credentials updated successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const user = await userService.updateStatus(req.params.id, req.body.is_blocked);
    const statusText = req.body.is_blocked ? 'blocked' : 'unblocked';
    return sendSuccess(res, user, `Employee ${statusText} successfully`);
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id);
    return sendSuccess(res, null, 'Employee deleted successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

module.exports = {
  createUser,
  listUsers,
  getUserById,
  updateUser,
  updateCredentials,
  updateStatus,
  deleteUser
};
