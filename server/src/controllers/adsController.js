const adsService = require('../services/adsService');
const { sendSuccess, sendError } = require('../utils/response');

const getStatus = async (req, res) => {
  try {
    const targetUserId = req.query.userId && req.user.role === 'admin' ? req.query.userId : req.user.id;
    const status = await adsService.getLiveStatus(targetUserId);
    return sendSuccess(res, status);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const toggleAds = async (req, res) => {
  try {
    const targetUserId = req.body.userId && req.user.role === 'admin' ? req.body.userId : req.user.id;
    const result = await adsService.toggleAds(targetUserId);
    return sendSuccess(res, result, `Ads turned ${result.isOnline ? 'ON' : 'OFF'}`);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const getAttendance = async (req, res) => {
  try {
    const year = parseInt(req.query.year || new Date().getFullYear(), 10);
    const month = parseInt(req.query.month || new Date().getMonth() + 1, 10);

    const summary = await adsService.getAttendanceSummary(year, month);
    return sendSuccess(res, summary);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const markAttendance = async (req, res) => {
  try {
    const { userId, date, status } = req.body;
    const result = await adsService.markManualAttendance({ userId, date, status });
    return sendSuccess(res, result, 'Attendance updated successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await adsService.deleteAttendanceRecord(id);
    return sendSuccess(res, result, 'Attendance record deleted');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

module.exports = {
  getStatus,
  toggleAds,
  getAttendance,
  markAttendance,
  deleteAttendance
};
