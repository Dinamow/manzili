const { prisma } = require('../config/prisma');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { ORDER_STATUS, PAYMENT_METHOD_REVERSE } = require('../utils/statusMaps');

function mapOrderSummary(order) {
  const itemCount = order.store_orders?.reduce((sum, so) => sum + (so.items?.length || 0), 0) || 0;
  return {
    id: String(order.orderid),
    status: ORDER_STATUS[order.status] || 'UNKNOWN',
    itemCount,
    total: Number(order.totalamount || 0),
    createdAt: (order.created_at || order.paid_at)?.toISOString() || null,
  };
}

function mapOrderDetail(order) {
  const items = [];
  for (const so of (order.store_orders || [])) {
    for (const item of (so.items || [])) {
      items.push({
        productId: String(item.productid),
        name: item.product_name,
        quantity: item.quantity,
        unitPrice: Number(item.price_at_purchase),
        totalPrice: Number(item.price_at_purchase) * item.quantity,
      });
    }
  }

  return {
    id: String(order.orderid),
    status: ORDER_STATUS[order.status] || 'UNKNOWN',
    items,
    subtotal: items.reduce((s, i) => s + i.totalPrice, 0),
    discount: order.coupon_snapshot ? Number(order.coupon_snapshot.discountAmount || 0) : null,
    total: Number(order.totalamount || 0),
    paymentMethod: order.paymentmethod === 0 ? 'COD' : 'STRIPE',
    address: order.address ? {
      id: String(order.address.id),
      name: order.address.name || '',
      phone: order.address.phone || '',
      city: order.address.city || '',
      zone: order.address.zone || '',
      district: order.address.district || '',
      street: order.address.street || '',
      building: order.address.buildingnumber || '',
      floor: order.address.floor || '',
      apartment: order.address.apartmentnumber || '',
      postalCode: order.address.postalcode || '',
    } : null,
    createdAt: (order.created_at || order.paid_at)?.toISOString() || null,
  };
}

async function createOrder(personid, { items, addressId, paymentMethod, coupon }) {
  const userId = parseInt(personid, 10);
  const enduser = await prisma.enduser.findUnique({ where: { personid: userId } });
  if (!enduser) throw new NotFoundError('User');

  const addrId = parseInt(addressId, 10);
  const address = await prisma.addresses.findUnique({ where: { id: addrId } });
  if (!address || address.personid !== userId) throw new ValidationError('Invalid address');

  // Validate products and group by seller
  const productIds = items.map((i) => parseInt(i.productId, 10));
  const products = await prisma.products.findMany({
    where: { productid: { in: productIds } },
    include: { seller: true },
  });
  const productMap = new Map(products.map((p) => [p.productid, p]));

  // Group by seller
  const sellerGroups = new Map();
  let subtotal = 0;
  for (const item of items) {
    const pid = parseInt(item.productId, 10);
    const product = productMap.get(pid);
    if (!product) throw new ValidationError(`Product ${item.productId} not found`);
    if (!product.in_stock) throw new ValidationError(`Product ${product.productname} is out of stock`);

    const selId = product.sellerid || 0;
    if (!sellerGroups.has(selId)) sellerGroups.set(selId, []);
    sellerGroups.get(selId).push({ ...item, product, productid: pid });
    subtotal += Number(product.price || item.price) * item.quantity;
  }

  if (!['COD', 'STRIPE'].includes(paymentMethod)) {
    throw new ValidationError('Invalid payment method. Must be COD or STRIPE');
  }
  const paymentMethodInt = PAYMENT_METHOD_REVERSE[paymentMethod];
  const discountAmount = coupon?.discountAmount || 0;
  const totalAmount = Math.max(0, subtotal - discountAmount);

  // Create order in transaction
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.orders.create({
      data: {
        enduserid: enduser.enduserid,
        status: paymentMethod === 'STRIPE' ? 0 : 1, // PENDING_PAYMENT or ORDER_PLACED
        totalamount: totalAmount,
        shippingcost: 0,
        paymentid: 0,
        paymentmethod: paymentMethodInt,
        paymentstatus: paymentMethod === 'COD' ? 0 : 0,
        paid_at: new Date(),
        is_paid: paymentMethod === 'COD' ? false : false,
        address_id: addrId,
        coupon_snapshot: coupon || undefined,
      },
    });

    // Create store orders
    for (const [selId, sellerItems] of sellerGroups) {
      const soSubtotal = sellerItems.reduce((s, i) => s + Number(i.product.price || i.price) * i.quantity, 0);
      const soDiscountRatio = subtotal > 0 ? soSubtotal / subtotal : 0;
      const soDiscount = Math.round(discountAmount * soDiscountRatio * 100) / 100;

      const storeOrder = await tx.store_orders.create({
        data: {
          orderid: newOrder.orderid,
          sellerid: selId,
          subtotal: soSubtotal,
          discount_total: soDiscount,
          shipping_total: 0,
          total: Math.max(0, soSubtotal - soDiscount),
          status: paymentMethod === 'STRIPE' ? 'PENDING_PAYMENT' : 'ORDER_PLACED',
          is_paid: false,
          payment_method: paymentMethod,
        },
      });

      for (const item of sellerItems) {
        await tx.store_order_items.create({
          data: {
            store_orderid: storeOrder.store_orderid,
            productid: item.productid,
            quantity: item.quantity,
            price_at_purchase: Number(item.product.price || item.price),
            product_name: item.product.productname,
            product_image_url: item.product.cover_url || null,
            shipping_size: item.product.shipping_size || null,
            shipping_bulky_cat: item.product.shipping_bulky_category || null,
          },
        });

        // Decrement stock
        await tx.products.update({
          where: { productid: item.productid },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    return newOrder;
  });

  // Fetch full order with relations
  const fullOrder = await prisma.orders.findUnique({
    where: { orderid: order.orderid },
    include: {
      address: true,
      store_orders: { include: { items: true } },
    },
  });

  return mapOrderDetail(fullOrder);
}

async function listOrders(personid) {
  const userId = parseInt(personid, 10);
  const enduser = await prisma.enduser.findUnique({ where: { personid: userId } });
  if (!enduser) return { orders: [], total: 0 };

  const orders = await prisma.orders.findMany({
    where: { enduserid: enduser.enduserid },
    include: { store_orders: { include: { items: true } } },
    orderBy: { orderid: 'desc' },
  });

  return {
    orders: orders.map(mapOrderSummary),
    total: orders.length,
  };
}

async function getOrderById(personid, orderId) {
  const userId = parseInt(personid, 10);
  const enduser = await prisma.enduser.findUnique({ where: { personid: userId } });
  const id = parseInt(orderId, 10);

  const order = await prisma.orders.findUnique({
    where: { orderid: id },
    include: {
      address: true,
      store_orders: { include: { items: true } },
    },
  });

  if (!order) throw new NotFoundError('Order');
  if (order.enduserid !== enduser?.enduserid) throw new NotFoundError('Order');

  return mapOrderDetail(order);
}

module.exports = { createOrder, listOrders, getOrderById };
