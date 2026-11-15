const { z } = require('zod');

const createMessageSchema = z.object({
  message_type: z.enum(['text', 'voice', 'image', 'video', 'file']).default('text'),
  content: z.string().trim().optional().default(''),
  audio_url: z.string().url().optional().nullable(),
  audio_duration: z.coerce.number().optional().default(0),
  file_url: z.string().url().optional().nullable(),
  file_name: z.string().optional().nullable(),
  file_size: z.coerce.number().optional().default(0),
  file_type: z.string().optional().nullable(),
  reply_to_id: z.string().uuid().optional().nullable()
}).refine((data) => {
  if (data.message_type === 'text') {
    return Boolean(data.content && data.content.length > 0);
  }
  if (data.message_type === 'voice') {
    return Boolean(data.audio_url);
  }
  if (['image', 'video', 'file'].includes(data.message_type)) {
    return Boolean(data.file_url);
  }
  return true;
}, {
  message: 'Content or media URL required for message'
});

module.exports = {
  createMessageSchema
};
