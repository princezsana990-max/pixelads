const uploadService = require('../services/uploadService');
const { sendSuccess, sendError } = require('../utils/response');

const createVideoUploadUrl = async (req, res) => {
  try {
    const { orderId, fileName, mimeType, fileSize } = req.body;
    const result = await uploadService.createVideoSignedUploadUrl({
      orderId,
      fileName,
      mimeType,
      fileSize,
      userRole: req.user.role
    });

    return sendSuccess(res, {
      path: result.path,
      token: result.token,
      signedUrl: result.signedUrl,
      provider: result.provider,
      bucket: result.bucket
    });
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
};

const getVideoReadUrl = async (req, res) => {
  try {
    const { path } = req.query;
    const signedUrl = await uploadService.createVideoSignedReadUrl(path);
    return sendSuccess(res, { signedUrl });
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
};

const initiateMultipartUpload = async (req, res) => {
  try {
    const { orderId, fileName, mimeType, fileSize } = req.body;
    const result = await uploadService.initiateMultipartUpload({
      orderId,
      fileName,
      mimeType,
      fileSize,
      userRole: req.user.role
    });
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
};

const getMultipartPartUrl = async (req, res) => {
  try {
    const { key, uploadId, partNumber } = req.body;
    const result = await uploadService.getMultipartPartUrl({
      key,
      uploadId,
      partNumber
    });
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
};

const completeMultipartUpload = async (req, res) => {
  try {
    const { key, uploadId, parts } = req.body;
    const result = await uploadService.completeMultipartUpload({
      key,
      uploadId,
      parts
    });
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
};

const abortMultipartUpload = async (req, res) => {
  try {
    const { key, uploadId } = req.body;
    const result = await uploadService.abortMultipartUpload({
      key,
      uploadId
    });
    return sendSuccess(res, result);
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
};

module.exports = {
  createVideoUploadUrl,
  getVideoReadUrl,
  initiateMultipartUpload,
  getMultipartPartUrl,
  completeMultipartUpload,
  abortMultipartUpload
};
