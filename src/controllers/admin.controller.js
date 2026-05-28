const adminService = require('../services/admin.service');
const { success } = require('../utils/apiResponse');
const { parsePagination } = require('../utils/pagination');

async function getStats(req, res, next) {
  try { return success(res, await adminService.getStats()); }
  catch (err) { next(err); }
}
async function listOrders(req, res, next) {
  try {
    const p = parsePagination(req.query);
    const r = await adminService.listOrders(p);
    return success(res, { orders: r.orders }, { total: r.total });
  } catch (err) { next(err); }
}
async function listProducts(req, res, next) {
  try {
    const p = parsePagination(req.query);
    const r = await adminService.listProducts(p);
    return success(res, { products: r.products }, { total: r.total });
  } catch (err) { next(err); }
}
async function listStores(req, res, next) {
  try { return success(res, await adminService.listStores({ status: req.query.status })); }
  catch (err) { next(err); }
}
async function updateStore(req, res, next) {
  try { return success(res, await adminService.updateStoreStatus(req.params.id || req.body.storeId, req.body)); }
  catch (err) { next(err); }
}
async function listReports(req, res, next) {
  try {
    const p = parsePagination(req.query);
    const r = await adminService.listReports(p);
    return success(res, { reports: r.reports }, { total: r.total });
  } catch (err) { next(err); }
}
async function handleReport(req, res, next) {
  try { return success(res, await adminService.handleReport(req.params.id, req.body)); }
  catch (err) { next(err); }
}
async function listRequests(req, res, next) {
  try { return success(res, await adminService.listRequests()); }
  catch (err) { next(err); }
}

module.exports = { getStats, listOrders, listProducts, listStores, updateStore, listReports, handleReport, listRequests };
