const ORDER_STATUS = {
  0: 'PENDING_PAYMENT',
  1: 'ORDER_PLACED',
  2: 'PROCESSING',
  3: 'SHIPPED',
  4: 'DELIVERED',
  5: 'CANCELED',
  6: 'RETURNED',
};

const ORDER_STATUS_REVERSE = Object.fromEntries(
  Object.entries(ORDER_STATUS).map(([k, v]) => [v, Number(k)])
);

const PAYMENT_METHOD = {
  0: 'COD',
  1: 'STRIPE',
};

const PAYMENT_METHOD_REVERSE = Object.fromEntries(
  Object.entries(PAYMENT_METHOD).map(([k, v]) => [v, Number(k)])
);

const PAYMENT_STATUS = {
  0: 'PENDING',
  1: 'PAID',
  2: 'FAILED',
  3: 'REFUNDED',
};

const SHIPMENT_STATUS = {
  0: 'CREATED',
  1: 'PICKED_UP',
  2: 'IN_TRANSIT',
  3: 'DELIVERED',
  4: 'FAILED',
  5: 'CANCELED',
  6: 'UNKNOWN',
};

// DB check constraint: scope IN (0, 10, 11, 20, 21)
const COUPON_SCOPE = {
  0: 'GLOBAL',
  10: 'STORE',
  11: 'STORE',
  20: 'PRODUCTS',
  21: 'PRODUCTS',
};

// For creating coupons, use these canonical values
const COUPON_SCOPE_CREATE = {
  GLOBAL: 0,
  STORE: 10,
  PRODUCTS: 20,
};

const COUPON_SCOPE_REVERSE = Object.fromEntries(
  Object.entries(COUPON_SCOPE).map(([k, v]) => [v, Number(k)])
);

const STORE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

module.exports = {
  ORDER_STATUS, ORDER_STATUS_REVERSE,
  PAYMENT_METHOD, PAYMENT_METHOD_REVERSE,
  PAYMENT_STATUS,
  SHIPMENT_STATUS,
  COUPON_SCOPE, COUPON_SCOPE_REVERSE, COUPON_SCOPE_CREATE,
  STORE_STATUS,
};
