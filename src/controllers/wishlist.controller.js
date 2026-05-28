const wishlistService = require('../services/wishlist.service');
const { success } = require('../utils/apiResponse');

async function getWishlist(req, res, next) {
  try {
    const data = await wishlistService.getWishlist(req.user.sub);
    return success(res, data, { total: data.total });
  } catch (err) { next(err); }
}

async function addToWishlist(req, res, next) {
  try {
    const data = await wishlistService.addToWishlist(req.user.sub, req.params.productId);
    return success(res, null, { message: data.message });
  } catch (err) { next(err); }
}

async function removeFromWishlist(req, res, next) {
  try {
    const data = await wishlistService.removeFromWishlist(req.user.sub, req.params.productId);
    return success(res, null, { message: data.message });
  } catch (err) { next(err); }
}

async function clearWishlist(req, res, next) {
  try {
    const data = await wishlistService.clearWishlist(req.user.sub);
    return success(res, null, { message: data.message });
  } catch (err) { next(err); }
}

module.exports = { getWishlist, addToWishlist, removeFromWishlist, clearWishlist };
