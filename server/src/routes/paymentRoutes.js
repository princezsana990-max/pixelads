const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const { ROLES } = require('../constants/roles');

router.use(authenticate);
router.use(requireRole(ROLES.ADMIN));

router.get('/summary', paymentController.getPaymentsSummary);
router.put('/orders/:orderId', paymentController.updateOrderPayment);
router.post('/orders/:orderId/manual', paymentController.recordManualPayment);

module.exports = router;
