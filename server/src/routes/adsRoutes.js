const express = require('express');
const router = express.Router();
const adsController = require('../controllers/adsController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const { ROLES } = require('../constants/roles');

router.use(authenticate);

router.get('/status', adsController.getStatus);
router.post('/toggle', adsController.toggleAds);
router.get('/attendance', requireRole(ROLES.ADMIN), adsController.getAttendance);
router.post('/attendance/mark', requireRole(ROLES.ADMIN), adsController.markAttendance);
router.delete('/attendance/:id', requireRole(ROLES.ADMIN), adsController.deleteAttendance);

module.exports = router;
