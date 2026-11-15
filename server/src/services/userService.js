const supabase = require('../config/supabase');
const { hashPassword } = require('../utils/password');

const generateNextEmployeeId = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('employee_id')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data || data.length === 0) {
    return 'EMP-1001';
  }

  const numbers = data
    .map((u) => {
      const match = u.employee_id && u.employee_id.match(/EMP-(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((num) => num !== null && !isNaN(num));

  const maxNum = numbers.length > 0 ? Math.max(...numbers) : 1000;
  return `EMP-${maxNum + 1}`;
};

const createUser = async ({ name, phone, email, username, password, role }) => {
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single();

  if (existingUser) {
    throw new Error('Username is already taken');
  }

  const employee_id = await generateNextEmployeeId();
  const password_hash = await hashPassword(password);

  const payload = {
    employee_id,
    name,
    phone,
    username,
    password_hash,
    role,
    is_blocked: false
  };

  if (email) {
    payload.email = email;
  }

  const { data: newUser, error } = await supabase
    .from('users')
    .insert([payload])
    .select('id, employee_id, name, phone, email, username, role, is_blocked, created_at')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return newUser;
};

const listUsers = async ({ page = 1, limit = 10, role, is_blocked, search } = {}) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('users')
    .select('id, employee_id, name, phone, email, username, role, is_blocked, created_at', { count: 'exact' });

  if (role) {
    query = query.eq('role', role);
  }

  if (typeof is_blocked === 'boolean') {
    query = query.eq('is_blocked', is_blocked);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,username.ilike.%${search}%,employee_id.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  return {
    users: data || [],
    pagination: {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    }
  };
};

const getUserById = async (id) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, employee_id, name, phone, email, username, role, is_blocked, created_at')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new Error('User not found');
  }

  return data;
};

const updateUser = async (id, updateData) => {
  const payload = {};
  if (updateData.name !== undefined) payload.name = updateData.name;
  if (updateData.phone !== undefined) payload.phone = updateData.phone;
  if (updateData.email !== undefined) payload.email = updateData.email;
  if (updateData.role !== undefined) payload.role = updateData.role;

  const { data, error } = await supabase
    .from('users')
    .update(payload)
    .eq('id', id)
    .select('id, employee_id, name, phone, email, username, role, is_blocked, created_at')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

const updateCredentials = async (id, { username, password }) => {
  const payload = {};

  if (username) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .neq('id', id)
      .single();

    if (existing) {
      throw new Error('Username is already taken');
    }
    payload.username = username;
  }

  if (password) {
    payload.password_hash = await hashPassword(password);
  }

  const { data, error } = await supabase
    .from('users')
    .update(payload)
    .eq('id', id)
    .select('id, employee_id, name, phone, email, username, role, is_blocked, created_at')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

const updateStatus = async (id, is_blocked) => {
  const { data, error } = await supabase
    .from('users')
    .update({ is_blocked })
    .eq('id', id)
    .select('id, employee_id, name, phone, email, username, role, is_blocked, created_at')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

const deleteUser = async (id) => {
  const { count: orderCount, error: countErr } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('order_taker_id', id);

  if (countErr) {
    throw new Error(countErr.message);
  }

  if (orderCount && orderCount > 0) {
    throw new Error(
      `Cannot delete this employee because they have created ${orderCount} order(s). To preserve order records and financial history, block the employee instead.`
    );
  }

  const { count: assignmentCount } = await supabase
    .from('assignments')
    .select('id', { count: 'exact', head: true })
    .eq('editor_id', id);

  if (assignmentCount && assignmentCount > 0) {
    throw new Error(
      `Cannot delete this employee because they are assigned to ${assignmentCount} project(s). Reassign their orders or block the employee instead.`
    );
  }

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) {
    if (error.message && error.message.includes('foreign key constraint')) {
      throw new Error(
        'This employee has active orders, files, or messages associated with their account. Please block the employee instead of deleting to keep project records intact.'
      );
    }
    throw new Error(error.message);
  }

  return true;
};

module.exports = {
  createUser,
  listUsers,
  getUserById,
  updateUser,
  updateCredentials,
  updateStatus,
  deleteUser
};
