const supabase = require('../config/supabase');

const lookupCustomerByPhone = async (phoneNumber) => {
  if (!phoneNumber) return null;

  const clean = phoneNumber.replace(/[^0-9]/g, '');

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      order_code,
      project_name,
      customer_name,
      customer_phone,
      total_amount,
      advance_amount,
      pending_amount,
      status,
      created_at,
      order_taker:users!orders_order_taker_id_fkey(name, phone)
    `)
    .or(`customer_phone.ilike.%${clean}%,customer_phone.ilike.%${phoneNumber}%`)
    .order('created_at', { ascending: false });

  const { data: previousComm } = await supabase
    .from('communications')
    .select('customer_name')
    .or(`phone_number.ilike.%${clean}%,phone_number.ilike.%${phoneNumber}%`)
    .not('customer_name', 'is', null)
    .limit(1);

  const matchedCustomerName = orders && orders.length > 0
    ? orders[0].customer_name
    : previousComm && previousComm.length > 0
      ? previousComm[0].customer_name
      : null;

  return {
    phone_number: phoneNumber,
    customer_name: matchedCustomerName,
    is_existing_customer: Boolean(orders && orders.length > 0),
    orders_count: orders?.length || 0,
    associated_orders: orders || [],
    latest_order: orders && orders.length > 0 ? orders[0] : null
  };
};

const logCommunication = async (userId, data) => {
  let customerName = data.customer_name;
  let orderId = data.order_id;

  if (!customerName || !orderId) {
    const customerInfo = await lookupCustomerByPhone(data.phone_number);
    if (customerInfo) {
      if (!customerName && customerInfo.customer_name) {
        customerName = customerInfo.customer_name;
      }
      if (!orderId && customerInfo.latest_order) {
        orderId = customerInfo.latest_order.id;
      }
    }
  }

  const payload = {
    type: data.type,
    direction: data.direction,
    phone_number: data.phone_number,
    customer_name: customerName || null,
    order_id: orderId || null,
    message: data.message || '',
    duration_seconds: data.duration_seconds || 0,
    status: data.status || 'completed',
    employee_id: userId || null
  };

  const { data: record, error } = await supabase
    .from('communications')
    .insert([payload])
    .select('*, order:orders(id, order_code, project_name)')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return record;
};

const listCommunications = async ({ type, direction, search, order_id, page = 1, limit = 20 } = {}) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('communications')
    .select(`
      *,
      order:orders(id, order_code, project_name, status),
      employee:users!communications_employee_id_fkey(id, name, employee_id)
    `, { count: 'exact' });

  if (type) query = query.eq('type', type);
  if (direction) query = query.eq('direction', direction);
  if (order_id) query = query.eq('order_id', order_id);

  if (search) {
    query = query.or(`phone_number.ilike.%${search}%,customer_name.ilike.%${search}%,message.ilike.%${search}%`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return {
      communications: [],
      pagination: { total: 0, page, limit, totalPages: 0 }
    };
  }

  return {
    communications: data || [],
    pagination: {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    }
  };
};

const handleTelephonyWebhook = async (payload) => {
  const from = payload.From || payload.from || payload.caller || payload.phone;
  const to = payload.To || payload.to;
  const body = payload.Body || payload.body || payload.message || '';
  const callSid = payload.CallSid || payload.MessageSid || payload.id;
  const isCall = Boolean(payload.CallSid || payload.call_status || payload.duration !== undefined);

  if (!from) {
    return { received: false, reason: 'Missing caller/sender phone number' };
  }

  const customerInfo = await lookupCustomerByPhone(from);

  const commData = {
    type: isCall ? 'call' : 'sms',
    direction: 'incoming',
    phone_number: from,
    customer_name: customerInfo?.customer_name || 'Incoming Caller',
    order_id: customerInfo?.latest_order?.id || null,
    message: body || (isCall ? 'Incoming phone call' : ''),
    duration_seconds: parseInt(payload.CallDuration || payload.duration || '0', 10),
    status: 'completed',
    external_id: callSid
  };

  const { data: record, error } = await supabase
    .from('communications')
    .insert([commData])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { data: adminUsers } = await supabase
    .from('users')
    .select('id')
    .in('role', ['admin', 'order_taker']);

  if (adminUsers && adminUsers.length > 0) {
    const notifs = adminUsers.map((u) => ({
      user_id: u.id,
      title: isCall ? `Incoming Call: ${from}` : `Incoming SMS: ${from}`,
      message: customerInfo?.customer_name
        ? `From existing customer: ${customerInfo.customer_name} (${customerInfo.orders_count} orders)`
        : body || `Incoming ${isCall ? 'voice call' : 'text message'}`,
      link: customerInfo?.latest_order ? `/order-taker/orders/${customerInfo.latest_order.id}/review` : '/admin/reports'
    }));

    await supabase.from('notifications').insert(notifs);
  }

  return {
    received: true,
    record,
    customerInfo
  };
};

module.exports = {
  lookupCustomerByPhone,
  logCommunication,
  listCommunications,
  handleTelephonyWebhook
};
