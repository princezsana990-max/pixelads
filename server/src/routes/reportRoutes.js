const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const { ROLES } = require('../constants/roles');

router.use(authenticate);
router.use(requireRole(ROLES.ADMIN));

router.get('/export', reportController.exportReport);

module.exports = router;
