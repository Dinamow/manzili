const { verifyAccessToken } = require('../utils/jwt');
const { fail } = require('../utils/apiResponse');

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return fail(res, 'Missing or invalid authorization header', 401, 'UNAUTHORIZED');
  }
  try {
    const token = header.split(' ')[1];
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return fail(res, 'Token expired', 401, 'TOKEN_EXPIRED');
    }
    return fail(res, 'Invalid token', 401, 'UNAUTHORIZED');
  }
}

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = verifyAccessToken(header.split(' ')[1]);
    } catch {
      // ignore invalid tokens for optional auth
    }
  }
  next();
}

module.exports = { auth, optionalAuth };
