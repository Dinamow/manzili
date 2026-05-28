const { prisma } = require('../config/prisma');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

async function listReturns(personid) {
  const id = parseInt(personid, 10);
  const seller = await prisma.seller.findUnique({ where: { personid: id } });
  if (!seller) throw new ForbiddenError('Not a seller');

  const returns = await prisma.returns.findMany({
    where: { store_order: { sellerid: seller.sellerid } },
    include: { store_order: { include: { items: true } } },
    orderBy: { requestdate: 'desc' },
  });

  return returns.map((r) => ({
    id: String(r.returnid),
    reason: r.reason,
    status: r.status,
    refundAmount: r.refund_amount ? Number(r.refund_amount) : null,
    createdAt: r.requestdate.toISOString(),
    items: r.store_order?.items?.map((i) => ({ name: i.product_name, quantity: i.quantity })) || [],
  }));
}

async function processReturn(personid, storeOrderId, { reason }) {
  const id = parseInt(personid, 10);
  const soId = parseInt(storeOrderId, 10);

  const seller = await prisma.seller.findUnique({ where: { personid: id } });
  if (!seller) throw new ForbiddenError('Not a seller');

  const so = await prisma.store_orders.findUnique({ where: { store_orderid: soId } });
  if (!so) throw new NotFoundError('Store order');
  if (so.sellerid !== seller.sellerid) throw new ForbiddenError('Not your order');

  await prisma.store_orders.update({ where: { store_orderid: soId }, data: { status: 'RETURNED' } });

  const returnRecord = await prisma.returns.create({
    data: {
      orderid: so.orderid,
      store_orderid: soId,
      reason: reason || 'Return requested',
      status: 0,
      refund_amount: so.total,
    },
  });

  return {
    id: String(returnRecord.returnid),
    storeOrderId: String(soId),
    refundAmount: Number(so.total),
  };
}

module.exports = { listReturns, processReturn };
