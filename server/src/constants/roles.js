const ROLES = {
  ADMIN: 'admin',
  ORDER_TAKER: 'order_taker',
  EDITOR: 'editor'
};

const ORDER_STATUS = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_REVIEW: 'in_review',
  REVISION: 'revision',
  COMPLETED: 'completed'
};

const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid'
};

const INVOICE_STATUS = {
  DRAFT: 'draft',
  UNPAID: 'unpaid',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid'
};

const FILE_TYPES = {
  VIDEO: 'video',
  IMAGE: 'image',
  EDITED_VIDEO: 'edited_video',
  AUDIO: 'audio',
  ATTACHMENT: 'attachment'
};

const PAYMENT_METHODS = [
  'Cash',
  'Bank Transfer',
  'JazzCash',
  'EasyPaisa',
  'Raast',
  'Credit/Debit Card'
];

module.exports = {
  ROLES,
  ORDER_STATUS,
  PAYMENT_STATUS,
  INVOICE_STATUS,
  FILE_TYPES,
  PAYMENT_METHODS
};
