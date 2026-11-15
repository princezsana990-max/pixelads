const supabase = require('../config/supabase');
const { comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');

const login = async ({ username, password }) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, employee_id, name, phone, username, password_hash, role, is_blocked, created_at')
    .eq('username', username)
    .single();

  if (error || !user) {
    throw new Error('Invalid username or password');
  }

  if (user.is_blocked) {
    throw new Error('This account is blocked. Please contact the administrator.');
  }

  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) {
    throw new Error('Invalid username or password');
  }

  const token = generateToken({
    id: user.id,
    role: user.role,
    employee_id: user.employee_id
  });

  const { password_hash, ...safeUser } = user;

  return {
    user: safeUser,
    token
  };
};

module.exports = {
  login
};
