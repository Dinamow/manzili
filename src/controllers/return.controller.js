const returnService = require('../services/return.service');
const { success } = require('../utils/apiResponse');

async function listReturns(req, res, next) {
  try { return success(res, await returnService.listReturns(req.user.sub)); }
  catch (err) { next(err); }
}

async function processReturn(req, res, next) {
  try { return success(res, await returnService.processReturn(req.user.sub, req.params.id, req.body)); }
  catch (err) { next(err); }
}

module.exports = { listReturns, processReturn };
