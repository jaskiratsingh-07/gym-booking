const jwt = require('jsonwebtoken');
const { unauthorized, forbidden } = require('./errors');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(unauthorized());
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    next(unauthorized('Invalid or expired token'));
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return next(forbidden('Admin access required'));
  }
  next();
}

module.exports = { requireAuth, requireAdmin };