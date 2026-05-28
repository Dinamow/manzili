const couponService = require('../services/coupon.service');
const { success } = require('../utils/apiResponse');

async function listCoupons(req, res, next) {
  try { return success(res, await couponService.listCoupons(req.user.sub)); }
  catch (err) { next(err); }
}

async function createCoupon(req, res, next) {
  try { return success(res, await couponService.createCoupon(req.user.sub, req.body), {}, 201); }
  catch (err) { next(err); }
}

async function deleteCoupon(req, res, next) {
  try {
      const result = await couponService.deleteCoupon(req.user.sub, req.params.id);
      return success(res, null, { message: result.message });
    }
  catch (err) { next(err); }
}

async function validateCoupon(req, res, next) {
  try { return success(res, await couponService.validateCoupon(req.body)); }
  catch (err) { next(err); }
}

module.exports = { listCoupons, createCoupon, deleteCoupon, validateCoupon };
