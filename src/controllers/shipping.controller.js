const shippingService = require('../services/shipping.service');
const { success } = require('../utils/apiResponse');

async function listCities(req, res, next) {
  try { return success(res, await shippingService.listCities()); }
  catch (err) { next(err); }
}

async function listZones(req, res, next) {
  try { return success(res, await shippingService.listZones(req.params.cityId)); }
  catch (err) { next(err); }
}

async function listDistricts(req, res, next) {
  try { return success(res, await shippingService.listDistricts(req.params.cityId)); }
  catch (err) { next(err); }
}

async function estimate(req, res, next) {
  try { return success(res, await shippingService.estimateShipping(req.body.items || [])); }
  catch (err) { next(err); }
}

module.exports = { listCities, listZones, listDistricts, estimate };
