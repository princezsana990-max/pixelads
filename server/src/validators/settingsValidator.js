const { z } = require('zod');

const updateSettingsSchema = z.object({
  company_name: z.string().trim().min(2, 'Company name is required'),
  company_logo_url: z.string().trim().optional().default(''),
  company_address: z.string().trim().min(5, 'Company address is required'),
  company_phone: z.string().trim().min(5, 'Company phone is required'),
  company_email: z.string().email('Valid email is required'),
  invoice_footer_notes: z.string().trim().optional().default('')
});

module.exports = {
  updateSettingsSchema
};
