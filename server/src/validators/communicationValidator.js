const { z } = require('zod');

const logCommunicationSchema = z.object({
  type: z.enum(['call', 'sms']),
  direction: z.enum(['incoming', 'outgoing']),
  phone_number: z.string().trim().min(5, 'Phone number is required'),
  customer_name: z.string().trim().optional().default(''),
  order_id: z.string().uuid().optional().nullable(),
  message: z.string().trim().optional().default(''),
  duration_seconds: z.coerce.number().min(0).optional().default(0),
  status: z.string().optional().default('completed')
});

module.exports = {
  logCommunicationSchema
};
