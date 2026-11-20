const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const { ROLES } = require('../constants/roles');

router.use(authenticate);

router.post(
  '/video-url',
  requireRole(ROLES.ORDER_TAKER, ROLES.EDITOR, ROLES.ADMIN),
  uploadController.createVideoUploadUrl
);

router.get(
  '/video-read-url',
  requireRole(ROLES.ORDER_TAKER, ROLES.EDITOR, ROLES.ADMIN),
  uploadController.getVideoReadUrl
);

// Multipart Upload Endpoints for large 1GB+ files
router.post(
  '/multipart/initiate',
  requireRole(ROLES.ORDER_TAKER, ROLES.EDITOR, ROLES.ADMIN),
  uploadController.initiateMultipartUpload
);

router.post(
  '/multipart/part-url',
  requireRole(ROLES.ORDER_TAKER, ROLES.EDITOR, ROLES.ADMIN),
  uploadController.getMultipartPartUrl
);

router.post(
  '/multipart/complete',
  requireRole(ROLES.ORDER_TAKER, ROLES.EDITOR, ROLES.ADMIN),
  uploadController.completeMultipartUpload
);

router.post(
  '/multipart/abort',
  requireRole(ROLES.ORDER_TAKER, ROLES.EDITOR, ROLES.ADMIN),
  uploadController.abortMultipartUpload
);

module.exports = router;
