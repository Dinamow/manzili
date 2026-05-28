const { fail } = require('../utils/apiResponse');

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    }
    if (!roles.includes(req.user.role)) {
      return fail(res, 'Forbidden: insufficient role', 403, 'FORBIDDEN');
    }
    next();
  };
}

module.exports = { requireRole };
