const express = require('express');
const router = express.Router();
const storageController = require('../controllers/storageController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/sign-url', storageController.getSignedUploadUrl);
router.get('/read-url', storageController.getSignedReadUrl);

module.exports = router;
