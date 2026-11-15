const { verifyToken } = require('../utils/jwt');
const { sendError } = require('../utils/response');
const supabase = require('../config/supabase');

const authenticate = async (req, res, next) => {
  let token = req.cookies?.token;

  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const decoded = verifyToken(token);
    const { data: user, error } = await supabase
      .from('users')
      .select('id, employee_id, name, phone, username, role, is_blocked, created_at')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return sendError(res, 'User not found or session invalid', 401);
    }

    if (user.is_blocked) {
      return sendError(res, 'Your account is blocked. Contact administrator.', 403);
    }

    req.user = user;
    next();
  } catch (err) {
    return sendError(res, 'Invalid or expired authentication token', 401);
  }
};

module.exports = {
  authenticate
};
