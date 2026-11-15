const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');
const { createInvoiceSchema, updateInvoiceSchema, recordPaymentSchema } = require('../validators/invoiceValidator');
const ctrl = require('../controllers/invoiceController');

router.use(authenticate);
router.get('/', ctrl.listInvoices);
router.post('/', requireRole('admin', 'order_taker'), validate(createInvoiceSchema), ctrl.createInvoice);
router.get('/:id', ctrl.getInvoiceById);
router.put('/:id', requireRole('admin', 'order_taker'), validate(updateInvoiceSchema), ctrl.updateInvoice);
router.post('/:id/payment', requireRole('admin', 'order_taker'), validate(recordPaymentSchema), ctrl.recordPayment);
router.delete('/:id', requireRole('admin'), ctrl.deleteInvoice);

module.exports = router;
