const walletService = require('../services/wallet.service');
const { success } = require('../utils/apiResponse');

async function getWallet(req, res, next) {
  try { return success(res, await walletService.getWallet(req.user.sub)); }
  catch (err) { next(err); }
}

async function requestPayout(req, res, next) {
  try { return success(res, await walletService.requestPayout(req.user.sub, req.body)); }
  catch (err) { next(err); }
}

async function updateBankDetails(req, res, next) {
  try { return success(res, await walletService.updateBankDetails(req.user.sub, req.body)); }
  catch (err) { next(err); }
}

module.exports = { getWallet, requestPayout, updateBankDetails };
