const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');
const {
  createOrderSchema,
  updateOrderSchema,
  assignOrderSchema,
  submitWorkSchema,
  revisionOrderSchema
} = require('../validators/orderValidator');
const { createMessageSchema } = require('../validators/messageValidator');
const { ROLES } = require('../constants/roles');

router.use(authenticate);

router.post('/', requireRole(ROLES.ORDER_TAKER, ROLES.ADMIN), validate(createOrderSchema), orderController.createOrder);
router.get('/', orderController.listOrders);
router.get('/:id', orderController.getOrderById);
router.put('/:id', validate(updateOrderSchema), orderController.updateOrder);
router.delete('/:id', orderController.deleteOrder);
router.post('/:id/recover', requireRole(ROLES.ADMIN), orderController.recoverOrder);
router.patch('/:id/ad-status', requireRole(ROLES.ADMIN, ROLES.ORDER_TAKER), orderController.updateAdStatus);
router.put('/:id/ad-status', requireRole(ROLES.ADMIN, ROLES.ORDER_TAKER), orderController.updateAdStatus);

router.post('/:id/assign', requireRole(ROLES.ADMIN), validate(assignOrderSchema), orderController.assignEditor);
router.post('/:id/submit-work', requireRole(ROLES.EDITOR), validate(submitWorkSchema), orderController.submitWork);
router.post('/:id/revision', requireRole(ROLES.ORDER_TAKER, ROLES.ADMIN), validate(revisionOrderSchema), orderController.requestRevision);
router.post('/:id/approve', requireRole(ROLES.ORDER_TAKER, ROLES.ADMIN), orderController.approveWork);
router.post('/:id/finalize', requireRole(ROLES.ORDER_TAKER, ROLES.ADMIN), orderController.finalizeOrder);

router.get('/:id/messages', messageController.listMessages);
router.post('/:id/messages', validate(createMessageSchema), messageController.sendMessage);
router.patch('/:id/messages/delivered', messageController.markAsDelivered);
router.patch('/:id/messages/read', messageController.markAsRead);

module.exports = router;
