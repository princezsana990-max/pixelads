const supabase = require('../config/supabase');

const getLiveStatus = async (userId) => {
  const { data, error } = await supabase
    .from('ad_sessions')
    .select('id, start_time, end_time, session_date')
    .eq('user_id', userId)
    .is('end_time', null)
    .order('start_time', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const isOnline = data && data.length > 0;
  return {
    isOnline,
    activeSession: isOnline ? data[0] : null
  };
};

const toggleAds = async (userId) => {
  const { isOnline, activeSession } = await getLiveStatus(userId);

  if (isOnline && activeSession) {
    const { data: closedSession, error } = await supabase
      .from('ad_sessions')
      .update({ end_time: new Date().toISOString() })
      .eq('id', activeSession.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      isOnline: false,
      session: closedSession
    };
  }

  const { data: newSession, error } = await supabase
    .from('ad_sessions')
    .insert([
      {
        user_id: userId,
        start_time: new Date().toISOString(),
        end_time: null,
        session_date: new Date().toISOString().split('T')[0]
      }
    ])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    isOnline: true,
    session: newSession
  };
};

const getAttendanceSummary = async (year = new Date().getFullYear(), month = new Date().getMonth() + 1) => {
  const padMonth = String(month).padStart(2, '0');
  const startDate = `${year}-${padMonth}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${padMonth}-${String(lastDay).padStart(2, '0')}`;

  const { data: employees, error: empErr } = await supabase
    .from('users')
    .select('id, employee_id, name, role, is_blocked')
    .neq('role', 'admin')
    .order('name', { ascending: true });

  if (empErr) {
    throw new Error(empErr.message);
  }

  const { data: sessions, error: sessErr } = await supabase
    .from('ad_sessions')
    .select('id, user_id, session_date, start_time, end_time, created_at')
    .gte('session_date', startDate)
    .lte('session_date', endDate)
    .order('session_date', { ascending: true });

  if (sessErr) {
    throw new Error(sessErr.message);
  }

  const currentDayOfMonth = (year === new Date().getFullYear() && month === new Date().getMonth() + 1)
    ? new Date().getDate()
    : lastDay;

  const result = employees.map((emp) => {
    const empSessions = (sessions || []).filter((s) => s.user_id === emp.id);
    const uniquePresentDates = new Set(empSessions.map((s) => s.session_date));
    const presentCount = uniquePresentDates.size;
    const absentCount = Math.max(0, currentDayOfMonth - presentCount);
    const isOnlineNow = empSessions.some((s) => s.end_time === null);

    // Build day-by-day record list up to currentDayOfMonth
    const dailyBreakdown = [];
    for (let day = 1; day <= currentDayOfMonth; day++) {
      const dayStr = `${year}-${padMonth}-${String(day).padStart(2, '0')}`;
      const daySessions = empSessions.filter(s => s.session_date === dayStr);
      const isPresent = daySessions.length > 0;
      dailyBreakdown.push({
        date: dayStr,
        day,
        status: isPresent ? 'present' : 'absent',
        sessionCount: daySessions.length,
        sessionIds: daySessions.map(s => s.id)
      });
    }

    return {
      id: emp.id,
      employee_id: emp.employee_id,
      name: emp.name,
      role: emp.role,
      is_blocked: emp.is_blocked,
      present_days: presentCount,
      absent_days: absentCount,
      total_days: currentDayOfMonth,
      is_online_now: isOnlineNow,
      present_dates: Array.from(uniquePresentDates),
      daily_breakdown: dailyBreakdown
    };
  });

  return result;
};

const markManualAttendance = async ({ userId, date, status }) => {
  if (!userId || !date) {
    throw new Error('User ID and date are required');
  }

  if (status === 'present') {
    // Check if session already exists for this date
    const { data: existing } = await supabase
      .from('ad_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('session_date', date);

    if (!existing || existing.length === 0) {
      const { data, error } = await supabase
        .from('ad_sessions')
        .insert([
          {
            user_id: userId,
            session_date: date,
            start_time: `${date}T09:00:00.000Z`,
            end_time: `${date}T18:00:00.000Z`
          }
        ])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { success: true, action: 'marked_present', data };
    }
    return { success: true, action: 'already_present' };
  } else {
    // status === 'absent', delete all sessions for that day
    const { error } = await supabase
      .from('ad_sessions')
      .delete()
      .eq('user_id', userId)
      .eq('session_date', date);

    if (error) throw new Error(error.message);
    return { success: true, action: 'marked_absent' };
  }
};

const deleteAttendanceRecord = async (sessionId) => {
  const { error } = await supabase
    .from('ad_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) throw new Error(error.message);
  return { success: true };
};

module.exports = {
  getLiveStatus,
  toggleAds,
  getAttendanceSummary,
  markManualAttendance,
  deleteAttendanceRecord
};
