const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const { validate } = require('../middleware/validate');
const {
  createUserSchema,
  updateUserSchema,
  updateCredentialsSchema,
  updateStatusSchema
} = require('../validators/userValidator');
const { ROLES } = require('../constants/roles');

router.use(authenticate);
router.use(requireRole(ROLES.ADMIN));

router.post('/', validate(createUserSchema), userController.createUser);
router.get('/', userController.listUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', validate(updateUserSchema), userController.updateUser);
router.patch('/:id/credentials', validate(updateCredentialsSchema), userController.updateCredentials);
router.patch('/:id/status', validate(updateStatusSchema), userController.updateStatus);
router.delete('/:id', userController.deleteUser);

module.exports = router;
