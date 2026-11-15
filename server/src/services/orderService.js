const supabase = require('../config/supabase');
const { ROLES, ORDER_STATUS, FILE_TYPES, PAYMENT_STATUS } = require('../constants/roles');
const emailService = require('./emailService');
const {
  enrichOrderWithAdTracking,
  serializeAdTracking,
  parseAdTracking
} = require('../utils/adTracking');

const generateOrderCode = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('order_code')
    .order('created_at', { ascending: false })
    .limit(100);

  let maxNum = 1111;

  if (!error && data && data.length > 0) {
    for (const row of data) {
      if (!row.order_code) continue;
      const hashMatch = row.order_code.match(/^#?(\d+)$/);
      if (hashMatch) {
        const n = parseInt(hashMatch[1], 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
      const ordMatch = row.order_code.match(/ORD-\d+-(\d+)/);
      if (ordMatch) {
        const n = parseInt(ordMatch[1], 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `#${nextNum}`;
};

const createOrder = async (creatorUser, {
  order_taker_id,
  project_name,
  customer_name = 'Client',
  customer_phone = '',
  customer_email = '',
  script,
  notes = '',
  total_amount = 0,
  advance_amount = 0,
  files = []
}) => {
  const order_code = await generateOrderCode();

  const effectiveOrderTakerId = (creatorUser.role === ROLES.ADMIN && order_taker_id)
    ? order_taker_id
    : creatorUser.id;

  const numTotal = Number(total_amount) || 0;
  const numAdvance = Number(advance_amount) || 0;
  const payment_status = numAdvance >= numTotal && numTotal > 0
    ? PAYMENT_STATUS.PAID
    : numAdvance > 0
      ? PAYMENT_STATUS.PARTIALLY_PAID
      : PAYMENT_STATUS.UNPAID;

  const { data: newOrder, error } = await supabase
    .from('orders')
    .insert([
      {
        order_code,
        order_taker_id: effectiveOrderTakerId,
        project_name,
        customer_name,
        customer_phone,
        customer_email: customer_email || null,
        script,
        notes,
        total_amount: numTotal,
        advance_amount: numAdvance,
        status: ORDER_STATUS.PENDING
      }
    ])
    .select('*, order_taker:users!orders_order_taker_id_fkey(id, name, phone, email, employee_id)')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (files && files.length > 0) {
    const fileRecords = files.map((f) => ({
      order_id: newOrder.id,
      file_type: f.file_type,
      file_url: f.file_url,
      file_name: f.file_name,
      uploaded_by: creatorUser.id
    }));

    await supabase.from('order_files').insert(fileRecords);
  }

  const { data: fullOrder } = await supabase
    .from('orders')
    .select(`
      *,
      order_taker:users!orders_order_taker_id_fkey(id, name, phone, email, employee_id),
      order_files(*)
    `)
    .eq('id', newOrder.id)
    .single();

  await supabase.from('notifications').insert([
    {
      user_id: effectiveOrderTakerId,
      title: 'Order Created',
      message: `Order ${order_code} for project "${project_name}" has been created successfully.`,
      link: `/order-taker/orders/${newOrder.id}/invoice`
    }
  ]);

  await emailService.notifyOrderParticipants({
    order: fullOrder,
    eventType: 'New Order Created',
    eventDescription: `Order ${order_code} has been entered into the system. Total: Rs. ${numTotal.toLocaleString()}, Advance: Rs. ${numAdvance.toLocaleString()}.`,
    actorName: fullOrder.order_taker?.name || 'Order Taker'
  });

  await emailService.notifyAdminsOnNewOrder({
    order: fullOrder,
    orderTakerName: fullOrder.order_taker?.name || creatorUser.name || 'Order Taker'
  });

  return fullOrder;
};

const listOrders = async ({ user, page = 1, limit = 10, status, search, startDate, endDate, employeeId, isDeleted = false }) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('orders')
    .select(`
      id,
      order_code,
      project_name,
      customer_name,
      customer_phone,
      customer_email,
      script,
      notes,
      total_amount,
      advance_amount,
      pending_amount,
      status,
      created_at,
      updated_at,
      order_taker:users!orders_order_taker_id_fkey(id, name, phone, email, employee_id),
      assignments(
        id,
        is_active,
        assigned_at,
        editor:users!assignments_editor_id_fkey(id, name, phone, email, employee_id)
      )
    `, { count: 'exact' });

  if (isDeleted) {
    query = query.eq('notes', '__DELETED_ARCHIVE__');
  } else {
    query = query.neq('notes', '__DELETED_ARCHIVE__');
  }

  if (user.role === ROLES.ORDER_TAKER) {
    query = query.eq('order_taker_id', user.id);
  } else if (user.role === ROLES.EDITOR) {
    const { data: activeAssignments } = await supabase
      .from('assignments')
      .select('order_id')
      .eq('editor_id', user.id)
      .eq('is_active', true);

    const orderIds = (activeAssignments || []).map((a) => a.order_id);
    if (orderIds.length === 0) {
      return {
        orders: [],
        pagination: { total: 0, page, limit, totalPages: 0 }
      };
    }
    query = query.in('id', orderIds);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (employeeId) {
    query = query.eq('order_taker_id', employeeId);
  }

  if (startDate) {
    query = query.gte('created_at', startDate);
  }

  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  if (search) {
    query = query.or(`order_code.ilike.%${search}%,project_name.ilike.%${search}%,customer_name.ilike.%${search}%`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  return {
    orders: (data || []).map(enrichOrderWithAdTracking),
    pagination: {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    }
  };
};

const getOrderById = async (id, user) => {
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_taker:users!orders_order_taker_id_fkey(id, name, phone, email, employee_id, username),
      order_files(*),
      assignments(
        id,
        is_active,
        assigned_at,
        editor:users!assignments_editor_id_fkey(id, name, phone, email, employee_id, username)
      )
    `)
    .eq('id', id)
    .single();

  if (error || !order) {
    throw new Error('Order not found');
  }

  if (user && user.role === ROLES.ORDER_TAKER && order.order_taker_id !== user.id) {
    throw new Error('Access denied to this order');
  }

  if (user && user.role === ROLES.EDITOR) {
    const isAssigned = order.assignments?.some((a) => a.editor?.id === user.id && a.is_active);
    if (!isAssigned) {
      throw new Error('Access denied to this order');
    }
  }

  return enrichOrderWithAdTracking(order);
};

const assignEditor = async (orderId, editorId, adminId) => {
  const { data: editor, error: editorErr } = await supabase
    .from('users')
    .select('id, name, phone, email, username, role')
    .eq('id', editorId)
    .single();

  if (editorErr || !editor || editor.role !== ROLES.EDITOR) {
    throw new Error('Invalid editor selected');
  }

  await supabase
    .from('assignments')
    .update({ is_active: false })
    .eq('order_id', orderId);

  const { error: assignErr } = await supabase
    .from('assignments')
    .insert([
      {
        order_id: orderId,
        editor_id: editorId,
        assigned_by: adminId,
        is_active: true
      }
    ]);

  if (assignErr) {
    throw new Error(assignErr.message);
  }

  const { data: updatedOrder, error: updateErr } = await supabase
    .from('orders')
    .update({ status: ORDER_STATUS.ASSIGNED })
    .eq('id', orderId)
    .select(`
      *,
      order_taker:users!orders_order_taker_id_fkey(id, name, phone, email),
      order_files(*)
    `)
    .single();

  if (updateErr) {
    throw new Error(updateErr.message);
  }

  await supabase.from('notifications').insert([
    {
      user_id: editorId,
      title: 'New Assignment',
      message: `You have been assigned to order ${updatedOrder.order_code}: ${updatedOrder.project_name}.`,
      link: `/editor/orders/${orderId}`
    }
  ]);

  if (updatedOrder.order_taker_id) {
    await supabase.from('notifications').insert([
      {
        user_id: updatedOrder.order_taker_id,
        title: 'Editor Assigned',
        message: `${editor.name} has been assigned to order ${updatedOrder.order_code}.`,
        link: `/order-taker/orders/${orderId}/review`
      }
    ]);
  }

  await emailService.notifyOrderParticipants({
    order: updatedOrder,
    eventType: 'Order Assigned to Editor',
    eventDescription: `${editor.name} (${editor.phone}) has been assigned to edit this project.`,
    actorName: 'Administrator'
  });

  return updatedOrder;
};

const submitWork = async (orderId, editorId, { video_url, video_name, notes }) => {
  const { error: fileErr } = await supabase
    .from('order_files')
    .insert([
      {
        order_id: orderId,
        file_type: FILE_TYPES.EDITED_VIDEO,
        file_url: video_url,
        file_name: video_name,
        uploaded_by: editorId
      }
    ]);

  if (fileErr) {
    throw new Error(fileErr.message);
  }

  const { data: order, error: updateErr } = await supabase
    .from('orders')
    .update({ status: ORDER_STATUS.IN_REVIEW })
    .eq('id', orderId)
    .select('*, order_taker:users!orders_order_taker_id_fkey(id, name, email)')
    .single();

  if (updateErr) {
    throw new Error(updateErr.message);
  }

  if (notes) {
    await supabase.from('messages').insert([
      {
        order_id: orderId,
        sender_id: editorId,
        message_type: 'text',
        content: `Work submitted: ${notes}`
      }
    ]);
  }

  if (order.order_taker_id) {
    await supabase.from('notifications').insert([
      {
        user_id: order.order_taker_id,
        title: 'Completed Work Submitted',
        message: `Edited video submitted for ${order.order_code}. Please review and approve.`,
        link: `/order-taker/orders/${orderId}/review`
      }
    ]);
  }

  await emailService.notifyOrderParticipants({
    order,
    eventType: 'Completed Work Uploaded',
    eventDescription: `The editor has uploaded the completed video cut for ${order.order_code}: "${video_name}".`,
    actorName: 'Editor'
  });

  return order;
};

const requestRevision = async (orderId, orderTakerId, notes) => {
  const { data: order, error } = await supabase
    .from('orders')
    .update({ status: ORDER_STATUS.REVISION })
    .eq('id', orderId)
    .select(`
      *,
      assignments(editor_id, is_active)
    `)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from('messages').insert([
    {
      order_id: orderId,
      sender_id: orderTakerId,
      message_type: 'text',
      content: `Revision requested: ${notes}`
    }
  ]);

  const activeAssignment = order.assignments?.find((a) => a.is_active);
  if (activeAssignment?.editor_id) {
    await supabase.from('notifications').insert([
      {
        user_id: activeAssignment.editor_id,
        title: 'Revision Requested',
        message: `Correction notes on order ${order.order_code}: ${notes}`,
        link: `/editor/orders/${orderId}`
      }
    ]);
  }

  await emailService.notifyOrderParticipants({
    order,
    eventType: 'Revision Requested',
    eventDescription: `Changes requested on order ${order.order_code}: "${notes}".`,
    actorName: 'Order Taker'
  });

  return order;
};

const approveWork = async (orderId, orderTakerId) => {
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      assignments(editor_id, is_active)
    `)
    .eq('id', orderId)
    .single();

  if (error || !order) {
    throw new Error('Order not found');
  }

  const activeAssignment = order.assignments?.find((a) => a.is_active);
  if (activeAssignment?.editor_id) {
    await supabase.from('notifications').insert([
      {
        user_id: activeAssignment.editor_id,
        title: 'Work Approved',
        message: `Your video submission for ${order.order_code} has been approved!`,
        link: `/editor/orders/${orderId}`
      }
    ]);
  }

  const isPaid = Number(order.advance_amount) >= Number(order.total_amount) && Number(order.total_amount) > 0;
  const targetStatus = isPaid ? 'completed' : order.status;

  await supabase
    .from('orders')
    .update({
      status: targetStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);

  await emailService.notifyOrderParticipants({
    order: { ...order, status: targetStatus },
    eventType: isPaid ? 'Order Completed' : 'Work Approved',
    eventDescription: isPaid
      ? `The work for ${order.order_code} has been approved and marked completed.`
      : `The submitted video cut for ${order.order_code} has been formally approved.`,
    actorName: 'Order Taker'
  });

  return { ...order, status: targetStatus };
};

const finalizeOrder = async (orderId, user) => {
  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('*, assignments(editor_id, is_active)')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) {
    throw new Error('Order not found');
  }

  const totalAmount = Number(order.total_amount) || 0;
  const advanceAmount = Number(order.advance_amount) || 0;
  const remainingPending = Math.max(0, totalAmount - advanceAmount);

  if (remainingPending > 0 && user?.role !== ROLES.ADMIN) {
    throw new Error(`Order closing restricted: Remaining balance of Rs. ${remainingPending.toLocaleString()} must be fully paid before this order can be closed.`);
  }

  const { data: updatedOrder, error } = await supabase
    .from('orders')
    .update({ status: ORDER_STATUS.COMPLETED })
    .eq('id', orderId)
    .select('*, assignments(editor_id, is_active)')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const activeAssignment = updatedOrder.assignments?.find((a) => a.is_active);
  if (activeAssignment?.editor_id) {
    await supabase.from('notifications').insert([
      {
        user_id: activeAssignment.editor_id,
        title: 'Order Closed & Completed',
        message: `Order ${updatedOrder.order_code} has been marked completed.`,
        link: `/editor/orders/${orderId}`
      }
    ]);
  }

  await emailService.notifyOrderParticipants({
    order: updatedOrder,
    eventType: 'Order Finalized & Closed',
    eventDescription: `Order ${updatedOrder.order_code} is now marked completed.`,
    actorName: user?.name || 'User'
  });

  return updatedOrder;
};

const updateOrder = async (orderId, user, payload) => {
  const { data: existing, error: fetchErr } = await supabase
    .from('orders')
    .select('order_taker_id, status, order_code, project_name, total_amount, advance_amount')
    .eq('id', orderId)
    .single();

  if (fetchErr || !existing) {
    throw new Error('Order not found');
  }

  if (user.role !== ROLES.ADMIN && existing.order_taker_id !== user.id) {
    throw new Error('Unauthorized');
  }

  if (existing.status === ORDER_STATUS.COMPLETED && user.role !== ROLES.ADMIN) {
    throw new Error('Cannot update a closed order without admin access');
  }

  const sanitized = { ...payload };
  if (user.role !== ROLES.ADMIN) {
    delete sanitized.order_taker_id;
  }

  if (sanitized.total_amount !== undefined || sanitized.advance_amount !== undefined) {
    const tot = sanitized.total_amount !== undefined ? Number(sanitized.total_amount) : Number(existing.total_amount);
    const adv = sanitized.advance_amount !== undefined ? Number(sanitized.advance_amount) : Number(existing.advance_amount);
    sanitized.payment_status = adv >= tot && tot > 0 ? 'paid' : adv > 0 ? 'partially_paid' : 'unpaid';
  }

  const { data: updated, error } = await supabase
    .from('orders')
    .update(sanitized)
    .eq('id', orderId)
    .select('*, order_taker:users!orders_order_taker_id_fkey(id, name, phone, email, employee_id)')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await emailService.notifyOrderParticipants({
    order: updated,
    eventType: 'Order Details Updated',
    eventDescription: `Details for order ${existing.order_code} have been modified by ${user.name}.`,
    actorName: user.name
  });

  return updated;
};

const deleteOrder = async (orderId, user) => {
  const { data: existing, error: fetchErr } = await supabase
    .from('orders')
    .select('id, order_code, order_taker_id, notes')
    .eq('id', orderId)
    .single();

  if (fetchErr || !existing) {
    throw new Error('Order not found');
  }

  if (user.role !== ROLES.ADMIN && existing.order_taker_id !== user.id) {
    throw new Error('Unauthorized to delete this order');
  }

  const newNotes = existing.notes === '__DELETED_ARCHIVE__' ? '' : '__DELETED_ARCHIVE__';
  const { data: updated, error } = await supabase
    .from('orders')
    .update({ notes: newNotes })
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { success: true, isArchived: newNotes === '__DELETED_ARCHIVE__' };
};

const recoverOrder = async (orderId, user) => {
  if (user.role !== ROLES.ADMIN) {
    throw new Error('Only administrator can recover deleted orders');
  }

  const { data: updated, error } = await supabase
    .from('orders')
    .update({ notes: 'Recovered by Admin' })
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return updated;
};

const updateAdStatus = async (orderId, { ad_status, active_days, month_days, month_name, daily_records }) => {
  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) {
    throw new Error('Order not found');
  }

  const existingTracking = parseAdTracking(order.notes, order.created_at);
  const todayStr = new Date().toISOString().slice(0, 10);
  const newStatus = ad_status !== undefined ? (ad_status === 'active' ? 'active' : 'deactive') : existingTracking.ad_status;

  let records = Array.isArray(daily_records) ? [...daily_records] : [...existingTracking.daily_records];

  // If user toggles ad_status without submitting daily_records, update/create today's record
  if (ad_status !== undefined && !daily_records) {
    const todayIndex = records.findIndex(r => r.date === todayStr);
    const todayStatus = newStatus === 'active' ? 'present' : 'absent';
    if (todayIndex >= 0) {
      records[todayIndex] = { ...records[todayIndex], status: todayStatus };
    } else {
      records.push({ date: todayStr, status: todayStatus, note: newStatus === 'active' ? 'Ad turned ON' : 'Ad turned OFF' });
    }
  }

  // Sort records descending by date
  records.sort((a, b) => new Date(b.date) - new Date(a.date));

  let finalActiveDays;
  if (records.length > 0) {
    finalActiveDays = records.filter(r => r.status === 'present').length;
  } else if (active_days !== undefined && active_days !== null && active_days !== '') {
    finalActiveDays = Math.max(0, Number(active_days));
  } else {
    finalActiveDays = existingTracking.active_days || 0;
  }

  let activeDates = records.filter(r => r.status === 'present').map(r => r.date);

  const newNotes = serializeAdTracking(
    order.notes,
    {
      ad_status: newStatus,
      active_days: finalActiveDays,
      active_dates: activeDates,
      daily_records: records,
      month_days: month_days !== undefined ? Number(month_days) : existingTracking.month_days,
      month_name: month_name || existingTracking.month_name
    },
    order.created_at
  );

  const { data: updated, error: updErr } = await supabase
    .from('orders')
    .update({
      notes: newNotes,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .select(`
      *,
      order_taker:users!orders_order_taker_id_fkey(id, name, phone, email, employee_id, username),
      order_files(*),
      assignments(
        id,
        is_active,
        assigned_at,
        editor:users!assignments_editor_id_fkey(id, name, phone, email, employee_id, username)
      )
    `)
    .single();

  if (updErr) {
    throw new Error(updErr.message);
  }

  return enrichOrderWithAdTracking(updated);
};

module.exports = {
  createOrder,
  listOrders,
  getOrderById,
  assignEditor,
  submitWork,
  requestRevision,
  approveWork,
  finalizeOrder,
  updateOrder,
  deleteOrder,
  recoverOrder,
  updateAdStatus
};
