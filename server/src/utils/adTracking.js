const getDaysInBillingMonth = (dateStr) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) return 30;
  const year = d.getFullYear();
  const month = d.getMonth();
  return new Date(year, month + 1, 0).getDate();
};

const getBillingMonthName = (dateStr) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) return 'Current Month';
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

const parseAdTracking = (notes, orderCreatedAt) => {
  const defaultMonthDays = getDaysInBillingMonth(orderCreatedAt);
  const monthName = getBillingMonthName(orderCreatedAt);

  let tracking = {
    ad_status: 'deactive',
    active_days: 0,
    active_dates: [],
    daily_records: [], // array of { date: 'YYYY-MM-DD', status: 'present' | 'absent', note: '' }
    month_days: defaultMonthDays,
    month_name: monthName,
    present_days: 0,
    absent_days: defaultMonthDays,
    clean_notes: notes || '',
    order_type: 'video_editing'
  };

  if (!notes || typeof notes !== 'string') return tracking;

  // Extract ORDER_TYPE if embedded: <!--ORDER_TYPE:video_editing-->
  const typeMatch = notes.match(/<!--ORDER_TYPE:(.*?)-->/);
  if (typeMatch) {
    tracking.order_type = typeMatch[1].trim();
  }

  const match = notes.match(/<!--AD_TRACKING:(\{.*?\})-->/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      tracking.ad_status = parsed.status === 'active' ? 'active' : 'deactive';
      tracking.active_dates = Array.isArray(parsed.active_dates) ? parsed.active_dates : [];
      tracking.daily_records = Array.isArray(parsed.daily_records) ? parsed.daily_records : [];
      tracking.month_days = Number(parsed.month_days) || defaultMonthDays;
      tracking.month_name = parsed.month_name || monthName;
      if (parsed.order_type) {
        tracking.order_type = parsed.order_type;
      }

      // Calculate present and absent days from daily_records if available
      if (tracking.daily_records.length > 0) {
        const presentCount = tracking.daily_records.filter(r => r.status === 'present').length;
        const absentCount = tracking.daily_records.filter(r => r.status === 'absent').length;
        tracking.present_days = presentCount;
        tracking.absent_days = absentCount > 0 ? absentCount : Math.max(0, tracking.month_days - presentCount);
        tracking.active_days = presentCount;
      } else {
        tracking.active_days = parsed.active_days !== undefined
          ? Number(parsed.active_days)
          : tracking.active_dates.length;
        tracking.present_days = tracking.active_days;
        tracking.absent_days = Math.max(0, tracking.month_days - tracking.present_days);
      }
    } catch {
    }
  }

  // Clean raw notes from any internal system markers
  tracking.clean_notes = notes
    .replace(/<!--AD_TRACKING:(\{.*?\})-->/g, '')
    .replace(/<!--ORDER_TYPE:(.*?)-->/g, '')
    .trim();

  return tracking;
};

const serializeAdTracking = (existingNotes, newTracking, orderCreatedAt) => {
  const clean = (existingNotes || '')
    .replace(/<!--AD_TRACKING:(\{.*?\})-->/g, '')
    .replace(/<!--ORDER_TYPE:(.*?)-->/g, '')
    .trim();

  const defaultMonthDays = getDaysInBillingMonth(orderCreatedAt);
  const monthName = getBillingMonthName(orderCreatedAt);

  const daily_records = Array.isArray(newTracking.daily_records) ? newTracking.daily_records : [];
  let present_days = 0;
  if (daily_records.length > 0) {
    present_days = daily_records.filter(r => r.status === 'present').length;
  } else {
    present_days = Number(newTracking.active_days !== undefined ? newTracking.active_days : 0);
  }

  const orderType = newTracking.order_type || 'video_editing';

  const trackingObj = {
    status: newTracking.ad_status === 'active' ? 'active' : 'deactive',
    active_days: present_days,
    active_dates: Array.isArray(newTracking.active_dates) ? newTracking.active_dates : [],
    daily_records: daily_records,
    month_days: Number(newTracking.month_days) || defaultMonthDays,
    month_name: newTracking.month_name || monthName,
    order_type: orderType,
    updated_at: new Date().toISOString()
  };

  const adTag = `<!--AD_TRACKING:${JSON.stringify(trackingObj)}-->`;
  const typeTag = `<!--ORDER_TYPE:${orderType}-->`;
  return clean ? `${clean}\n${typeTag}\n${adTag}` : `${typeTag}\n${adTag}`;
};

const enrichOrderWithAdTracking = (order) => {
  if (!order) return order;
  const tracking = parseAdTracking(order.notes, order.created_at);

  return {
    ...order,
    ad_status: tracking.ad_status,
    ad_active_days: tracking.present_days,
    ad_active_dates: tracking.active_dates,
    ad_daily_records: tracking.daily_records,
    ad_month_days: tracking.month_days,
    ad_month_name: tracking.month_name,
    ad_present_days: tracking.present_days,
    ad_absent_days: tracking.absent_days,
    clean_notes: tracking.clean_notes,
    order_type: tracking.order_type
  };
};

module.exports = {
  getDaysInBillingMonth,
  getBillingMonthName,
  parseAdTracking,
  serializeAdTracking,
  enrichOrderWithAdTracking
};
