const sellerService = require('../services/seller.service');
const { success } = require('../utils/apiResponse');

async function getDashboard(req, res, next) {
  try { return success(res, await sellerService.getDashboard(req.user.sub)); }
  catch (err) { next(err); }
}

async function listProducts(req, res, next) {
  try {
    const result = await sellerService.listSellerProducts(req.user.sub);
    return success(res, { products: result.products }, { total: result.total });
  } catch (err) { next(err); }
}

async function createProduct(req, res, next) {
  try { return success(res, await sellerService.createProduct(req.user.sub, req.body), {}, 201); }
  catch (err) { next(err); }
}

async function updateProduct(req, res, next) {
  try { return success(res, await sellerService.updateProduct(req.user.sub, req.params.id, req.body)); }
  catch (err) { next(err); }
}

async function deleteProduct(req, res, next) {
  try {
      const result = await sellerService.deleteProduct(req.user.sub, req.params.id);
      return success(res, null, { message: result.message });
    }
  catch (err) { next(err); }
}

async function getOrders(req, res, next) {
  try {
    const result = await sellerService.getSellerOrders(req.user.sub);
    return success(res, { orders: result.orders }, { total: result.total });
  } catch (err) { next(err); }
}

async function updateOrderStatus(req, res, next) {
  try { return success(res, await sellerService.updateOrderStatus(req.user.sub, req.params.id, req.body.status)); }
  catch (err) { next(err); }
}

async function getSettings(req, res, next) {
  try { return success(res, await sellerService.getSettings(req.user.sub)); }
  catch (err) { next(err); }
}

async function updateSettings(req, res, next) {
  try { return success(res, await sellerService.updateSettings(req.user.sub, req.body)); }
  catch (err) { next(err); }
}

module.exports = { getDashboard, listProducts, createProduct, updateProduct, deleteProduct, getOrders, updateOrderStatus, getSettings, updateSettings };
