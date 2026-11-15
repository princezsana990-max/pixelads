const authService = require('../services/authService');
const { sendSuccess, sendError } = require('../utils/response');

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const { user, token } = await authService.login({ username, password });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return sendSuccess(res, { user, token }, 'Logged in successfully');
  } catch (err) {
    return sendError(res, err.message, 401);
  }
};

const logout = async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });
  return sendSuccess(res, null, 'Logged out successfully');
};

const me = async (req, res) => {
  return sendSuccess(res, { user: req.user }, 'Current user profile');
};

module.exports = {
  login,
  logout,
  me
};
