const storeService = require('../services/store.service');
const { success } = require('../utils/apiResponse');
const { parsePagination } = require('../utils/pagination');

async function getById(req, res, next) {
  try { return success(res, await storeService.getStoreById(req.params.id)); }
  catch (err) { next(err); }
}

async function getProducts(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const result = await storeService.getStoreProducts(req.params.id, { page, limit, skip, userId: req.user?.sub });
    return success(res, { products: result.products }, { total: result.total, page: result.page, limit: result.limit });
  } catch (err) { next(err); }
}

async function apply(req, res, next) {
  try {
      const result = await storeService.applyForStore(req.user.sub, req.body);
      return success(res, null, { message: result.message }, 201);
    }
  catch (err) { next(err); }
}

module.exports = { getById, getProducts, apply };
