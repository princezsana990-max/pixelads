const { z } = require('zod');

const orderFileSchema = z.object({
  file_type: z.enum(['video', 'image', 'edited_video', 'audio', 'attachment']),
  file_url: z.string().url('Valid file URL required'),
  file_name: z.string().min(1, 'File name required')
});

const createOrderSchema = z.object({
  order_taker_id: z.string().uuid('Valid order taker ID').optional(),
  project_name: z.string().trim().min(2, 'Project name is required'),
  customer_name: z.string().trim().min(2, 'Customer name is required').optional().default('Client'),
  customer_phone: z.string().trim().optional().default(''),
  customer_email: z.string().trim().email().optional().or(z.literal('')),
  script: z.string().trim().min(5, 'Script must be provided'),
  notes: z.string().trim().optional().default(''),
  total_amount: z.coerce.number().min(0, 'Total amount must be greater than or equal to 0'),
  advance_amount: z.coerce.number().min(0, 'Advance amount must be greater than or equal to 0'),
  files: z.array(orderFileSchema).optional().default([])
});

const updateOrderSchema = z.object({
  order_taker_id: z.string().uuid().optional(),
  project_name: z.string().trim().min(2).optional(),
  customer_name: z.string().trim().min(2).optional(),
  customer_phone: z.string().trim().optional(),
  customer_email: z.string().trim().email().optional().or(z.literal('')),
  script: z.string().trim().min(5).optional(),
  notes: z.string().trim().optional(),
  total_amount: z.coerce.number().min(0).optional(),
  advance_amount: z.coerce.number().min(0).optional(),
  status: z.enum(['pending', 'assigned', 'in_review', 'revision', 'completed']).optional()
});

const assignOrderSchema = z.object({
  editor_id: z.string().uuid('Valid editor ID is required')
});

const submitWorkSchema = z.object({
  video_url: z.string().url('Valid video URL required'),
  video_name: z.string().min(1, 'Video name required'),
  notes: z.string().optional()
});

const revisionOrderSchema = z.object({
  notes: z.string().trim().min(2, 'Correction notes are required')
});

module.exports = {
  createOrderSchema,
  updateOrderSchema,
  assignOrderSchema,
  submitWorkSchema,
  revisionOrderSchema
};
