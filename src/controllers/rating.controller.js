const ratingService = require('../services/rating.service');
const { success } = require('../utils/apiResponse');

async function create(req, res, next) {
  try { return success(res, await ratingService.createRating(req.user.sub, req.body), {}, 201); }
  catch (err) { next(err); }
}

async function list(req, res, next) {
  try {
    if (!req.query.productId) {
      return res.status(400).json({ success: false, error: { message: 'productId query parameter is required', code: 'VALIDATION_ERROR' } });
    }
    return success(res, await ratingService.listRatings(req.query.productId));
  } catch (err) { next(err); }
}

module.exports = { create, list };
