const searchService = require('../services/search.service');
const { success } = require('../utils/apiResponse');
const { parsePagination } = require('../utils/pagination');

async function search(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const result = await searchService.search({ q: req.query.q, page, limit, skip, userId: req.user?.sub });
    return success(res, { products: result.products }, { total: result.total });
  } catch (err) { next(err); }
}

module.exports = { search };
