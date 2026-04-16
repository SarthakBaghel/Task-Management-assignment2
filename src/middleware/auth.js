const jwt = require('jsonwebtoken');
const env = require('../config/env');

function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    return next(error);
  }

  const token = header.slice(7).trim();

  if (!token) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    return next(error);
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const userId = Number(payload.sub);

    if (!Number.isInteger(userId)) {
      const error = new Error('Invalid authentication token');
      error.statusCode = 401;
      return next(error);
    }

    req.user = {
      id: userId,
      email: payload.email,
    };

    return next();
  } catch (error) {
    const authError = new Error('Invalid or expired authentication token');
    authError.statusCode = 401;
    return next(authError);
  }
}

module.exports = auth;
