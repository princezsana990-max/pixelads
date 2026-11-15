const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');
const { updateSettingsSchema } = require('../validators/settingsValidator');
const { ROLES } = require('../constants/roles');

router.use(authenticate);

router.get('/', settingsController.getSettings);
router.put('/', requireRole(ROLES.ADMIN), validate(updateSettingsSchema), settingsController.updateSettings);
router.get('/dashboard-stats', requireRole(ROLES.ADMIN), settingsController.getDashboardStats);

module.exports = router;
