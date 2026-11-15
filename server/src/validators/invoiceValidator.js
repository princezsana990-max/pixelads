const { z } = require('zod');
const { INVOICE_STATUS, PAYMENT_METHODS } = require('../constants/roles');

const createInvoiceSchema = z.object({
  order_id: z.string().uuid('Valid Order ID is required'),
  invoice_number: z.string().trim().optional(),
  customer_name: z.string().trim().min(2, 'Customer name is required'),
  invoice_date: z.string().optional(),
  description: z.string().trim().optional().default('Production & Editing Services'),
  amount: z.coerce.number().min(0, 'Amount must be greater than or equal to 0'),
  discount: z.coerce.number().min(0).optional().default(0),
  paid_amount: z.coerce.number().min(0).optional().default(0),
  payment_method: z.string().optional().default('Cash'),
  status: z.enum([INVOICE_STATUS.DRAFT, INVOICE_STATUS.UNPAID, INVOICE_STATUS.PARTIALLY_PAID, INVOICE_STATUS.PAID]).optional().default(INVOICE_STATUS.UNPAID),
  notes: z.string().trim().optional().default('')
});

const updateInvoiceSchema = z.object({
  customer_name: z.string().trim().min(2).optional(),
  invoice_date: z.string().optional(),
  description: z.string().trim().optional(),
  amount: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).optional(),
  paid_amount: z.coerce.number().min(0).optional(),
  payment_method: z.string().optional(),
  status: z.enum([INVOICE_STATUS.DRAFT, INVOICE_STATUS.UNPAID, INVOICE_STATUS.PARTIALLY_PAID, INVOICE_STATUS.PAID]).optional(),
  notes: z.string().trim().optional()
});

const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive('Payment amount must be greater than 0'),
  payment_method: z.string().optional().default('Bank Transfer'),
  transaction_reference: z.string().trim().optional().default(''),
  payment_date: z.string().optional(),
  notes: z.string().trim().optional().default('')
});

module.exports = {
  createInvoiceSchema,
  updateInvoiceSchema,
  recordPaymentSchema
};
