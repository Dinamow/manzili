const { prisma } = require('../config/prisma');
const { NotFoundError } = require('../utils/errors');

async function getStats() {
  const [stores, products, orders, pendingReports] = await Promise.all([
    prisma.seller.count(),
    prisma.products.count({ where: { is_disabled: { not: true } } }),
    prisma.store_orders.count(),
    prisma.reports.count({ where: { status: 'PENDING' } }),
  ]);

  const revenue = await prisma.store_orders.aggregate({
    where: { is_paid: true },
    _sum: { total: true },
  });

  return { stores, products, orders, pendingReports, revenue: Number(revenue._sum.total || 0) };
}

async function listOrders({ page, limit, skip }) {
  const [orders, total] = await Promise.all([
    prisma.store_orders.findMany({
      include: {
        items: true,
        seller: { select: { storename: true } },
        order: { include: { address: true, enduser: { include: { person: { select: { first_name: true, last_name: true } } } } } },
      },
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
    }),
    prisma.store_orders.count(),
  ]);

  return {
    orders: orders.map((so) => ({
      id: String(so.store_orderid),
      storeName: so.seller?.storename || '',
      customerName: [so.order?.enduser?.person?.first_name, so.order?.enduser?.person?.last_name].filter(Boolean).join(' '),
      items: so.items.map((i) => ({ name: i.product_name, quantity: i.quantity })),
      total: Number(so.total),
      status: so.status,
      createdAt: so.created_at.toISOString(),
    })),
    total,
  };
}

async function listProducts({ page, limit, skip }) {
  const [products, total] = await Promise.all([
    prisma.products.findMany({
      include: { seller: { select: { storename: true } }, category: true },
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
    }),
    prisma.products.count(),
  ]);

  return {
    products: products.map((p) => ({
      id: String(p.productid),
      name: p.productname,
      price: Number(p.price || 0),
      category: p.category?.category_name || '',
      storeName: p.seller?.storename || '',
      inStock: p.in_stock ?? true,
      isDisabled: p.is_disabled ?? false,
    })),
    total,
  };
}

async function listStores({ status }) {
  const where = {};
  if (status) where.store_status = status;

  const sellers = await prisma.seller.findMany({
    where,
    include: { person: { select: { email: true, first_name: true, last_name: true } } },
    orderBy: { created_at: 'desc' },
  });

  return sellers.map((s) => ({
    id: String(s.sellerid),
    name: s.storename || '',
    ownerName: [s.person.first_name, s.person.last_name].filter(Boolean).join(' '),
    ownerEmail: s.person.email,
    status: s.store_status || 'pending',
    isActive: s.is_active ?? false,
    createdAt: s.created_at?.toISOString() || null,
  }));
}

async function updateStoreStatus(storeId, { action }) {
  const id = parseInt(storeId, 10);
  const seller = await prisma.seller.findUnique({ where: { sellerid: id } });
  if (!seller) throw new NotFoundError('Store');

  const data = {};
  if (action === 'approve') { data.store_status = 'approved'; data.is_active = true; }
  else if (action === 'reject') { data.store_status = 'rejected'; data.is_active = false; }
  else if (action === 'disable') { data.is_active = false; }
  else if (action === 'enable') { data.is_active = true; }

  await prisma.seller.update({ where: { sellerid: id }, data });
  return { id: String(id), status: data.store_status || seller.store_status, isActive: data.is_active ?? seller.is_active };
}

async function listReports({ page, limit, skip }) {
  const [reports, total] = await Promise.all([
    prisma.reports.findMany({ skip, take: limit, orderBy: { created_at: 'desc' } }),
    prisma.reports.count(),
  ]);
  return {
    reports: reports.map((r) => ({
      id: String(r.report_id),
      type: r.type,
      reason: r.reason,
      description: r.description || '',
      status: r.status,
      adminNote: r.admin_note || '',
      createdAt: r.created_at.toISOString(),
    })),
    total,
  };
}

async function handleReport(reportId, { action, adminNote }) {
  const id = parseInt(reportId, 10);
  const report = await prisma.reports.findUnique({ where: { report_id: id } });
  if (!report) throw new NotFoundError('Report');

  const statusMap = { review: 'REVIEWED', resolve: 'RESOLVED', dismiss: 'DISMISSED' };
  await prisma.reports.update({
    where: { report_id: id },
    data: {
      status: statusMap[action] || 'REVIEWED',
      admin_note: adminNote || null,
      resolved_at: ['resolve', 'dismiss'].includes(action) ? new Date() : null,
    },
  });
  return { id: String(id), status: statusMap[action] };
}

async function listRequests() {
  const requests = await prisma.custom_request.findMany({
    include: { category: true },
    orderBy: { created_at: 'desc' },
  });
  return requests.map((r) => ({
    id: String(r.requestid),
    itemName: r.itemname,
    description: r.description,
    category: r.category?.category_name || '',
    status: r.status,
    createdAt: r.created_at?.toISOString() || null,
  }));
}

module.exports = { getStats, listOrders, listProducts, listStores, updateStoreStatus, listReports, handleReport, listRequests };
