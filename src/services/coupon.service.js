const { prisma } = require('../config/prisma');
const { NotFoundError, ForbiddenError, ValidationError } = require('../utils/errors');
const { COUPON_SCOPE, COUPON_SCOPE_CREATE } = require('../utils/statusMaps');

function mapCoupon(c) {
  return {
    id: String(c.couponid),
    code: c.code || '',
    discount: Number(c.discount_percentage || 0),
    description: c.description || '',
    scope: COUPON_SCOPE[c.scope] || 'STORE',
    maxUsers: c.max_users || 100,
    usedCount: c.used_count || 0,
    expiryDate: c.expired_date?.toISOString() || null,
    isActive: c.status ?? true,
  };
}

async function listCoupons(personid) {
  const id = parseInt(personid, 10);
  const seller = await prisma.seller.findUnique({ where: { personid: id } });
  if (!seller) throw new ForbiddenError('Not a seller');

  const coupons = await prisma.coupons.findMany({
    where: { storeid: seller.sellerid },
    orderBy: { created_at: 'desc' },
  });
  return { coupons: coupons.map(mapCoupon) };
}

async function createCoupon(personid, body) {
  const id = parseInt(personid, 10);
  const seller = await prisma.seller.findUnique({ where: { personid: id } });
  if (!seller) throw new ForbiddenError('Not a seller');

  const scopeInt = COUPON_SCOPE_CREATE[body.scope?.toUpperCase()] ?? 10;

  const coupon = await prisma.coupons.create({
    data: {
      code: body.code,
      description: body.description || '',
      discount_percentage: body.discount,
      scope: scopeInt,
      creatorid: id,
      storeid: seller.sellerid,
      max_users: body.maxUsers || 100,
      expired_date: body.expiryDate ? new Date(body.expiryDate) : null,
    },
  });

  // Link products if scope is PRODUCTS
  if (body.productIds?.length) {
    for (const pid of body.productIds) {
      await prisma.coupon_product.create({
        data: { couponid: coupon.couponid, productid: parseInt(pid, 10) },
      });
    }
  }

  return mapCoupon(coupon);
}

async function deleteCoupon(personid, couponId) {
  const id = parseInt(personid, 10);
  const cid = parseInt(couponId, 10);
  const seller = await prisma.seller.findUnique({ where: { personid: id } });
  const coupon = await prisma.coupons.findUnique({ where: { couponid: cid } });
  if (!coupon) throw new NotFoundError('Coupon');
  if (coupon.storeid !== seller?.sellerid) throw new ForbiddenError('Not your coupon');

  await prisma.coupons.delete({ where: { couponid: cid } });
  return { message: 'Coupon deleted' };
}

async function validateCoupon(body) {
  const coupon = await prisma.coupons.findFirst({
    where: { code: body.code, status: true },
    include: { coupon_product: { select: { productid: true } } },
  });

  if (!coupon) throw new ValidationError('Invalid coupon code');
  if (coupon.expired_date && coupon.expired_date < new Date()) throw new ValidationError('Coupon expired');
  if (coupon.max_users && coupon.used_count >= coupon.max_users) throw new ValidationError('Coupon usage limit reached');

  return {
    valid: true,
    code: coupon.code,
    discount: Number(coupon.discount_percentage || 0),
    scope: COUPON_SCOPE[coupon.scope] || 'STORE',
    productIds: coupon.coupon_product.map((cp) => String(cp.productid)),
    expiryDate: coupon.expired_date?.toISOString() || null,
    maxUsers: coupon.max_users || 100,
  };
}

module.exports = { listCoupons, createCoupon, deleteCoupon, validateCoupon };
