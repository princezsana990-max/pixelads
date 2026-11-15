const supabase = require('../config/supabase');
const { sendSuccess, sendError } = require('../utils/response');
const { enrichOrderWithAdTracking } = require('../utils/adTracking');

const getPaymentsSummary = async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const startDate = req.query.startDate || undefined;
    const endDate = req.query.endDate || undefined;
    const employeeId = req.query.employeeId || undefined;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let aggregateQuery = supabase
      .from('orders')
      .select('total_amount, advance_amount, pending_amount, status, notes')
      .neq('notes', '__DELETED_ARCHIVE__');

    if (startDate) aggregateQuery = aggregateQuery.gte('created_at', startDate);
    if (endDate) aggregateQuery = aggregateQuery.lte('created_at', endDate);
    if (employeeId) aggregateQuery = aggregateQuery.eq('order_taker_id', employeeId);

    const { data: allOrders, error: aggErr } = await aggregateQuery;
    if (aggErr) throw new Error(aggErr.message);

    const totals = (allOrders || []).reduce(
      (acc, curr) => {
        acc.total_amount += Number(curr.total_amount || 0);
        acc.advance_amount += Number(curr.advance_amount || 0);
        acc.pending_amount += Number(curr.pending_amount || 0);
        if (curr.status === 'completed') acc.completed_count++;
        return acc;
      },
      { total_amount: 0, advance_amount: 0, pending_amount: 0, completed_count: 0 }
    );

    let listQuery = supabase
      .from('orders')
      .select(`
        id,
        order_code,
        project_name,
        customer_name,
        total_amount,
        advance_amount,
        pending_amount,
        status,
        notes,
        created_at,
        order_taker:users!orders_order_taker_id_fkey(id, name, employee_id)
      `, { count: 'exact' })
      .neq('notes', '__DELETED_ARCHIVE__');

    if (startDate) listQuery = listQuery.gte('created_at', startDate);
    if (endDate) listQuery = listQuery.lte('created_at', endDate);
    if (employeeId) listQuery = listQuery.eq('order_taker_id', employeeId);

    const { data: pagedOrders, error: listErr, count } = await listQuery
      .order('created_at', { ascending: false })
      .range(from, to);

    if (listErr) throw new Error(listErr.message);

    return sendSuccess(res, {
      totals,
      orders: (pagedOrders || []).map(enrichOrderWithAdTracking),
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const updateOrderPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { total_amount, advance_amount } = req.body;

    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('id, order_code, total_amount, advance_amount')
      .eq('id', orderId)
      .single();

    if (fetchErr || !order) {
      return sendError(res, 'Order not found', 404);
    }

    const newTotal = total_amount !== undefined ? Number(total_amount) : Number(order.total_amount);
    const newAdvance = advance_amount !== undefined ? Number(advance_amount) : Number(order.advance_amount);
    const payment_status = newAdvance >= newTotal && newTotal > 0 ? 'paid' : newAdvance > 0 ? 'partially_paid' : 'unpaid';

    const { data: updated, error: updErr } = await supabase
      .from('orders')
      .update({
        total_amount: newTotal,
        advance_amount: newAdvance,
        payment_status
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updErr) throw new Error(updErr.message);

    return sendSuccess(res, updated, 'Payment amounts updated successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

const recordManualPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { amount, action = 'add' } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return sendError(res, 'Valid amount is required', 400);
    }

    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('id, total_amount, advance_amount')
      .eq('id', orderId)
      .single();

    if (fetchErr || !order) {
      return sendError(res, 'Order not found', 404);
    }

    const currentAdv = Number(order.advance_amount) || 0;
    const currentTot = Number(order.total_amount) || 0;
    let newAdv = currentAdv;

    if (action === 'add') {
      newAdv = currentAdv + numAmount;
    } else if (action === 'set') {
      newAdv = numAmount;
    } else if (action === 'reset') {
      newAdv = 0;
    }

    const payment_status = newAdv >= currentTot && currentTot > 0 ? 'paid' : newAdv > 0 ? 'partially_paid' : 'unpaid';

    const { data: updated, error: updErr } = await supabase
      .from('orders')
      .update({
        advance_amount: newAdv,
        payment_status
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updErr) throw new Error(updErr.message);

    return sendSuccess(res, updated, 'Manual payment processed successfully');
  } catch (err) {
    return sendError(res, err.message, 400);
  }
};

module.exports = {
  getPaymentsSummary,
  updateOrderPayment,
  recordManualPayment
};
