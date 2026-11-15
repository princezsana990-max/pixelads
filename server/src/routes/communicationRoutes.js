const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');
const { logCommunicationSchema } = require('../validators/communicationValidator');
const ctrl = require('../controllers/communicationController');

router.post('/webhook', ctrl.handleWebhook);
router.use(authenticate);
router.get('/lookup', ctrl.lookupCustomer);
router.post('/', validate(logCommunicationSchema), ctrl.logCommunication);
router.get('/', requireRole('admin'), ctrl.listCommunications);

module.exports = router;
