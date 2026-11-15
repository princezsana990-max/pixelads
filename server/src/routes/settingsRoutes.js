const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');
const { updateSettingsSchema } = require('../validators/settingsValidator');
const { ROLES } = require('../constants/roles');

// Public endpoint for company branding (logo, company name)
router.get('/', settingsController.getSettings);

// Authenticated & Admin-only routes
router.put('/', authenticate, requireRole(ROLES.ADMIN), validate(updateSettingsSchema), settingsController.updateSettings);
router.get('/dashboard-stats', authenticate, requireRole(ROLES.ADMIN), settingsController.getDashboardStats);

module.exports = router;
