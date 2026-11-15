const supabase = require('../config/supabase');
const { sendSuccess, sendError } = require('../utils/response');

const getSettings = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message);
    }

    const defaultSettings = {
      company_name: 'Pixel Ads',
      company_logo_url: null,
      company_address: '',
      company_phone: '',
      company_email: '',
      invoice_footer_notes: 'Thank you for your business.'
    };

    return sendSuccess(res, data || defaultSettings);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const updateSettings = async (req, res) => {
  try {
    const {
      company_name,
      company_logo_url,
      company_address,
      company_phone,
      company_email,
      invoice_footer_notes
    } = req.body;

    const payload = {
      company_name,
      company_logo_url,
      company_address,
      company_phone,
      company_email,
      invoice_footer_notes,
      updated_at: new Date().toISOString()
    };

    const { data: existing } = await supabase.from('settings').select('id').eq('id', 1).single();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('settings')
        .update(payload)
        .eq('id', 1)
        .select()
        .single();
      if (error) throw new Error(error.message);
      result = data;
    } else {
      const { data, error } = await supabase
        .from('settings')
        .insert([{ id: 1, ...payload }])
        .select()
        .single();
      if (error) throw new Error(error.message);
      result = data;
    }

    return sendSuccess(res, result, 'Settings updated successfully');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;

    let ordersQuery = supabase
      .from('orders')
      .select('id, status, created_at, order_taker_id, total_amount, advance_amount, pending_amount, notes')
      .neq('notes', '__DELETED_ARCHIVE__');

    if (startDate) ordersQuery = ordersQuery.gte('created_at', startDate);
    if (endDate) ordersQuery = ordersQuery.lte('created_at', endDate);
    if (employeeId) ordersQuery = ordersQuery.eq('order_taker_id', employeeId);

    const { data: orders, error: ordErr } = await ordersQuery;
    if (ordErr) throw new Error(ordErr.message);

    const { data: users, error: usrErr } = await supabase
      .from('users')
      .select('id, name, employee_id, role, is_blocked');

    if (usrErr) throw new Error(usrErr.message);

    const totalOrdersCount = (orders || []).length;
    const totalRevenue = (orders || []).reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
    const advanceReceived = (orders || []).reduce((acc, o) => acc + Number(o.advance_amount || 0), 0);
    const pendingBalance = (orders || []).reduce((acc, o) => acc + Number(o.pending_amount || 0), 0);

    // Calculate Average Order Value (AOV)
    const averageOrderValue = totalOrdersCount > 0
      ? Math.round(totalRevenue / totalOrdersCount)
      : 0;

    // Calculate Per-Person Order Counts and Averages
    const orderTakersList = (users || []).filter((u) => u.role === 'order_taker');
    const personAverages = orderTakersList.map((person) => {
      const personOrders = (orders || []).filter((o) => o.order_taker_id === person.id);
      const personOrderCount = personOrders.length;
      const personTotalRevenue = personOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
      const personAdvance = personOrders.reduce((sum, o) => sum + Number(o.advance_amount || 0), 0);
      const personPending = personOrders.reduce((sum, o) => sum + Number(o.pending_amount || 0), 0);
      const personAvg = personOrderCount > 0 ? Math.round(personTotalRevenue / personOrderCount) : 0;
      const shareOfOrders = totalOrdersCount > 0 ? Number(((personOrderCount / totalOrdersCount) * 100).toFixed(1)) : 0;

      return {
        id: person.id,
        name: person.name,
        employee_id: person.employee_id,
        role: person.role,
        order_count: personOrderCount,
        total_revenue: personTotalRevenue,
        advance_received: personAdvance,
        pending_balance: personPending,
        average_order_value: personAvg,
        share_percentage: shareOfOrders
      };
    });

    const stats = {
      orders: {
        total: totalOrdersCount,
        pending: (orders || []).filter((o) => o.status === 'pending').length,
        assigned: (orders || []).filter((o) => o.status === 'assigned').length,
        in_review: (orders || []).filter((o) => o.status === 'in_review').length,
        revision: (orders || []).filter((o) => o.status === 'revision').length,
        completed: (orders || []).filter((o) => o.status === 'completed').length,
        average_order_value: averageOrderValue
      },
      payments: {
        total_amount: totalRevenue,
        advance_amount: advanceReceived,
        pending_amount: pendingBalance,
        average_order_value: averageOrderValue
      },
      employees: {
        total: (users || []).filter((u) => u.role !== 'admin').length,
        order_takers: orderTakersList.length,
        editors: (users || []).filter((u) => u.role === 'editor').length,
        blocked: (users || []).filter((u) => u.is_blocked).length
      },
      averages: {
        total_orders: totalOrdersCount,
        overall_average_value: averageOrderValue,
        person_averages: personAverages
      }
    };

    return sendSuccess(res, stats);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getDashboardStats
};
