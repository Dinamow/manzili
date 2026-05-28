const authService = require('../services/auth.service');
const { success } = require('../utils/apiResponse');

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    return success(res, result.data, { token: result.token, refreshToken: result.refreshToken }, 201);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    return success(res, result.data, { token: result.token, refreshToken: result.refreshToken });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const result = await authService.refresh(req.body);
    return success(res, null, { token: result.token, refreshToken: result.refreshToken });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh };
