const supabase = require('../config/supabase');
const emailService = require('./emailService');

const generateInvoiceNumber = async (orderCode) => {
  const cleanCode = (orderCode || 'ORD').replace(/[^a-zA-Z0-9]/g, '');
  const rand = Math.floor(100 + Math.random() * 900);
  return `INV-${cleanCode}-${rand}`;
};

const createInvoice = async (userId, data) => {
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, order_code, project_name, customer_name, total_amount, advance_amount, order_taker_id')
    .eq('id', data.order_id)
    .single();

  if (orderErr || !order) {
    throw new Error('Order not found');
  }

  const invoiceNumber = data.invoice_number || (await generateInvoiceNumber(order.order_code));

  const amount = Number(data.amount) || 0;
  const discount = Number(data.discount) || 0;
  const totalAmount = Math.max(0, amount - discount);
  const paidAmount = Number(data.paid_amount) || 0;
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  let status = data.status || 'unpaid';
  if (status !== 'draft') {
    if (remainingAmount === 0 && totalAmount > 0) {
      status = 'paid';
    } else if (paidAmount > 0) {
      status = 'partially_paid';
    } else {
      status = 'unpaid';
    }
  }

  const payload = {
    invoice_number: invoiceNumber,
    order_id: data.order_id,
    customer_name: data.customer_name || order.customer_name || 'Client',
    invoice_date: data.invoice_date || new Date().toISOString().split('T')[0],
    description: data.description || `Production & Editing for ${order.project_name}`,
    amount,
    discount,
    total_amount: totalAmount,
    paid_amount: paidAmount,
    remaining_amount: remainingAmount,
    payment_method: data.payment_method || 'Cash',
    status,
    notes: data.notes || '',
    created_by: userId
  };

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert([payload])
    .select('*, order:orders(id, order_code, project_name)')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (paidAmount > 0) {
    try {
      await supabase.from('payments').insert([
        {
          order_id: data.order_id,
          invoice_id: invoice.id,
          amount: paidAmount,
          payment_method: data.payment_method || 'Cash',
          transaction_reference: `INV-INIT-${invoiceNumber}`,
          notes: 'Initial payment recorded during invoice generation',
          recorded_by: userId
        }
      ]);
    } catch (e) {
    }

    try {
      const currentAdvance = Number(order.advance_amount) || 0;
      const newAdvance = currentAdvance + paidAmount;
      const orderTotal = Number(order.total_amount) || 0;
      const newPaymentStatus = newAdvance >= orderTotal ? 'paid' : 'partially_paid';

      await supabase
        .from('orders')
        .update({
          advance_amount: newAdvance,
          payment_status: newPaymentStatus
        })
        .eq('id', order.id);
    } catch (e) {
    }
  }

  await emailService.notifyOrderParticipants({
    order,
    eventType: 'Invoice Generated',
    eventDescription: `Invoice #${invoiceNumber} for Rs. ${totalAmount.toLocaleString()} has been created for order ${order.order_code}. Paid: Rs. ${paidAmount.toLocaleString()}, Balance: Rs. ${remainingAmount.toLocaleString()}.`,
    actorName: 'Staff Member'
  });

  return invoice;
};

const listInvoices = async ({ order_id, status, search, page = 1, limit = 10 } = {}) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('invoices')
    .select(`
      *,
      order:orders(id, order_code, project_name, total_amount, advance_amount, pending_amount, status)
    `, { count: 'exact' });

  if (order_id) {
    query = query.eq('order_id', order_id);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(`invoice_number.ilike.%${search}%,customer_name.ilike.%${search}%`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return {
      invoices: [],
      pagination: { total: 0, page, limit, totalPages: 0 }
    };
  }

  return {
    invoices: data || [],
    pagination: {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    }
  };
};

const getInvoiceById = async (id) => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      order:orders(id, order_code, project_name, script, notes, total_amount, advance_amount, pending_amount, status, created_at, order_taker:users!orders_order_taker_id_fkey(name, phone, email, employee_id))
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new Error('Invoice not found');
  }

  return data;
};

const updateInvoice = async (id, updateData) => {
  const { data: existing, error: fetchErr } = await supabase
    .from('invoices')
    .select('*, order:orders(id, order_code, project_name, advance_amount, total_amount)')
    .eq('id', id)
    .single();

  if (fetchErr || !existing) {
    throw new Error('Invoice not found');
  }

  const amount = updateData.amount !== undefined ? Number(updateData.amount) : Number(existing.amount);
  const discount = updateData.discount !== undefined ? Number(updateData.discount) : Number(existing.discount);
  const totalAmount = Math.max(0, amount - discount);
  const paidAmount = updateData.paid_amount !== undefined ? Number(updateData.paid_amount) : Number(existing.paid_amount);
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  let status = updateData.status || existing.status;
  if (status !== 'draft') {
    if (remainingAmount === 0 && totalAmount > 0) {
      status = 'paid';
    } else if (paidAmount > 0) {
      status = 'partially_paid';
    } else {
      status = 'unpaid';
    }
  }

  const payload = {
    ...updateData,
    amount,
    discount,
    total_amount: totalAmount,
    paid_amount: paidAmount,
    remaining_amount: remainingAmount,
    status
  };

  const { data: updated, error } = await supabase
    .from('invoices')
    .update(payload)
    .eq('id', id)
    .select('*, order:orders(id, order_code, project_name)')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return updated;
};

const recordInvoicePayment = async (invoiceId, userId, { amount, payment_method, transaction_reference, payment_date, notes }) => {
  const invoice = await getInvoiceById(invoiceId);

  const payAmount = Number(amount);
  if (isNaN(payAmount) || payAmount <= 0) {
    throw new Error('Invalid payment amount');
  }

  const newPaid = Number(invoice.paid_amount) + payAmount;
  const newRemaining = Math.max(0, Number(invoice.total_amount) - newPaid);
  const newStatus = newRemaining === 0 ? 'paid' : 'partially_paid';

  try {
    await supabase.from('payments').insert([
      {
        order_id: invoice.order_id,
        invoice_id: invoiceId,
        amount: payAmount,
        payment_method: payment_method || 'Bank Transfer',
        transaction_reference: transaction_reference || '',
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        notes: notes || '',
        recorded_by: userId
      }
    ]);
  } catch (e) {
  }

  const { data: updatedInvoice, error: invErr } = await supabase
    .from('invoices')
    .update({
      paid_amount: newPaid,
      remaining_amount: newRemaining,
      status: newStatus
    })
    .eq('id', invoiceId)
    .select('*, order:orders(id, order_code, project_name)')
    .single();

  if (invErr) {
    throw new Error(invErr.message);
  }

  try {
    const { data: order } = await supabase
      .from('orders')
      .select('id, total_amount, advance_amount')
      .eq('id', invoice.order_id)
      .single();

    if (order) {
      const orderAdvance = Number(order.advance_amount) + payAmount;
      const orderTotal = Number(order.total_amount);
      const payment_status = orderAdvance >= orderTotal ? 'paid' : 'partially_paid';

      await supabase
        .from('orders')
        .update({
          advance_amount: orderAdvance,
          payment_status
        })
        .eq('id', order.id);
    }
  } catch (e) {
  }

  if (invoice.order) {
    await emailService.notifyOrderParticipants({
      order: invoice.order,
      eventType: 'Payment Received',
      eventDescription: `Payment of Rs. ${payAmount.toLocaleString()} received via ${payment_method || 'Bank Transfer'} for Invoice #${invoice.invoice_number}. New remaining balance: Rs. ${newRemaining.toLocaleString()}.`,
      actorName: 'Accounts'
    });
  }

  return updatedInvoice;
};

const deleteInvoice = async (id) => {
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
};

module.exports = {
  createInvoice,
  listInvoices,
  getInvoiceById,
  updateInvoice,
  recordInvoicePayment,
  deleteInvoice
};
