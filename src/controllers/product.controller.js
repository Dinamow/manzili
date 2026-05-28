const productService = require('../services/product.service');
const { success } = require('../utils/apiResponse');
const { parsePagination } = require('../utils/pagination');

async function listProducts(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const result = await productService.listProducts({
      page, limit, skip,
      category: req.query.category,
      sortBy: req.query.sortBy,
      sortDir: req.query.sortDir,
      userId: req.user?.sub,
    });
    return success(res, { products: result.products }, { total: result.total, page: result.page, limit: result.limit });
  } catch (err) { next(err); }
}

async function listFeatured(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const result = await productService.listFeatured({ page, limit, skip, userId: req.user?.sub });
    return success(res, { products: result.products }, { total: result.total, page: result.page, limit: result.limit });
  } catch (err) { next(err); }
}

async function listLatest(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const result = await productService.listLatest({ page, limit, skip, userId: req.user?.sub });
    return success(res, { products: result.products }, { total: result.total, page: result.page, limit: result.limit });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const data = await productService.getProductById(req.params.id, req.user?.sub);
    return success(res, data);
  } catch (err) { next(err); }
}

module.exports = { listProducts, listFeatured, listLatest, getById };
