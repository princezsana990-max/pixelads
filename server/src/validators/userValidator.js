const { z } = require('zod');
const { ROLES } = require('../constants/roles');

const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  phone: z.string().trim().min(5, 'Valid phone number is required'),
  email: z.string().trim().email('Valid email is required').optional().or(z.literal('')),
  username: z.string().trim().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum([ROLES.ORDER_TAKER, ROLES.EDITOR, ROLES.ADMIN])
});

const updateUserSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').optional(),
  phone: z.string().trim().min(5, 'Valid phone number is required').optional(),
  email: z.string().trim().email('Valid email is required').optional().or(z.literal('')),
  role: z.enum([ROLES.ORDER_TAKER, ROLES.EDITOR, ROLES.ADMIN]).optional()
});

const updateCredentialsSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional()
});

const updateStatusSchema = z.object({
  is_blocked: z.boolean()
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  updateCredentialsSchema,
  updateStatusSchema
};
