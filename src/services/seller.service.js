const { prisma } = require('../config/prisma');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

async function getSellerIdFromUser(personid) {
  const id = parseInt(personid, 10);
  const seller = await prisma.seller.findUnique({ where: { personid: id } });
  if (!seller) throw new ForbiddenError('Not a seller');
  return seller.sellerid;
}

async function getDashboard(personid) {
  const sellerid = await getSellerIdFromUser(personid);

  const [totalProducts, totalOrders, ratings] = await Promise.all([
    prisma.products.count({ where: { sellerid, is_disabled: { not: true } } }),
    prisma.store_orders.count({ where: { sellerid } }),
    prisma.reviewing_and_rating.findMany({
      where: { products: { sellerid } },
      select: { rating: true },
    }),
  ]);

  const totalEarnings = await prisma.store_orders.aggregate({
    where: { sellerid, is_paid: true },
    _sum: { total: true },
  });

  const avgRating = ratings.length
    ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
    : 0;

  return {
    totalProducts,
    totalEarnings: Number(totalEarnings._sum.total || 0),
    totalOrders,
    averageRating: Math.round(avgRating * 10) / 10,
    totalReviews: ratings.length,
  };
}

async function listSellerProducts(personid) {
  const sellerid = await getSellerIdFromUser(personid);

  const products = await prisma.products.findMany({
    where: { sellerid, is_disabled: { not: true } },
    include: {
      category: true,
      product_images: { select: { image_url: true }, take: 1 },
      store_order_items: { select: { quantity: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  return {
    products: products.map((p) => ({
      id: String(p.productid),
      name: p.productname,
      mainImage: p.cover_url || p.product_images?.[0]?.image_url || null,
      price: p.mrp ? Number(p.mrp) : Number(p.price || 0),
      offerPrice: p.mrp && p.price ? Number(p.price) : null,
      inStock: p.in_stock ?? true,
      totalSold: p.store_order_items.reduce((s, i) => s + i.quantity, 0),
      category: p.category?.category_name || '',
    })),
    total: products.length,
  };
}

async function createProduct(personid, body) {
  const sellerid = await getSellerIdFromUser(personid);

  let categoryid = null;
  if (body.category) {
    let cat = await prisma.category.findFirst({ where: { category_name: { equals: body.category, mode: 'insensitive' } } });
    if (!cat) {
      cat = await prisma.category.create({ data: { category_name: body.category } });
    }
    categoryid = cat.categoryid;
  }

  const product = await prisma.$transaction(async (tx) => {
    const p = await tx.products.create({
      data: {
        productname: body.name,
        description: body.description,
        price: body.mrp ? body.price : body.price, // sale price
        mrp: body.mrp || null,                       // original price
        stock: body.stock ?? 10,
        in_stock: (body.stock ?? 10) > 0,
        sellerid,
        categoryid,
        cover_url: body.images?.[0] || null,
        shipping_size: body.shippingSize || 'MEDIUM',
        shipping_bulky_category: body.shippingBulkyCategory || 'NORMAL',
      },
    });

    // Create product images
    if (body.images?.length) {
      for (const url of body.images) {
        await tx.product_images.create({
          data: {
            productid: p.productid,
            productimage: Buffer.from(''),
            image_url: url,
          },
        });
      }
    }

    // Create variants
    if (body.variants?.length) {
      for (const v of body.variants) {
        const variant = await tx.product_variants.create({
          data: { productid: p.productid, variant_name: v.name },
        });
        for (const opt of (v.options || [])) {
          await tx.variant_options.create({
            data: { variant_id: variant.variant_id, value: opt.value, stock: opt.stock ?? 0 },
          });
        }
      }
    }

    return p;
  });

  // Fetch full product
  const full = await prisma.products.findUnique({
    where: { productid: product.productid },
    include: {
      category: true,
      seller: true,
      product_images: { select: { image_url: true } },
      product_variants: { include: { options: true } },
    },
  });

  return mapProductDetail(full);
}

async function updateProduct(personid, productId, body) {
  const sellerid = await getSellerIdFromUser(personid);
  const pid = parseInt(productId, 10);

  const product = await prisma.products.findUnique({ where: { productid: pid } });
  if (!product) throw new NotFoundError('Product');
  if (product.sellerid !== sellerid) throw new ForbiddenError('Not your product');

  const data = {};
  if (body.name) data.productname = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.price !== undefined) data.price = body.price;
  if (body.mrp !== undefined) data.mrp = body.mrp;
  if (body.stock !== undefined) {
    data.stock = body.stock;
    data.in_stock = body.stock > 0;
  }
  if (body.images?.[0]) data.cover_url = body.images[0];
  if (body.shippingSize) data.shipping_size = body.shippingSize;

  await prisma.products.update({ where: { productid: pid }, data });

  // Update images if provided
  if (body.images) {
    await prisma.product_images.deleteMany({ where: { productid: pid } });
    for (const url of body.images) {
      await prisma.product_images.create({
        data: { productid: pid, productimage: Buffer.from(''), image_url: url },
      });
    }
  }

  const full = await prisma.products.findUnique({
    where: { productid: pid },
    include: {
      category: true, seller: true,
      product_images: { select: { image_url: true } },
      product_variants: { include: { options: true } },
    },
  });
  return mapProductDetail(full);
}

async function deleteProduct(personid, productId) {
  const sellerid = await getSellerIdFromUser(personid);
  const pid = parseInt(productId, 10);

  const product = await prisma.products.findUnique({ where: { productid: pid } });
  if (!product) throw new NotFoundError('Product');
  if (product.sellerid !== sellerid) throw new ForbiddenError('Not your product');

  await prisma.products.update({ where: { productid: pid }, data: { is_disabled: true } });
  return { message: 'Product deleted' };
}

async function getSellerOrders(personid) {
  const sellerid = await getSellerIdFromUser(personid);

  const storeOrders = await prisma.store_orders.findMany({
    where: { sellerid },
    include: {
      items: true,
      order: {
        include: {
          enduser: { include: { person: { select: { first_name: true, last_name: true } } } },
          address: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  return {
    orders: storeOrders.map((so) => ({
      id: String(so.store_orderid),
      customerName: [so.order.enduser?.person?.first_name, so.order.enduser?.person?.last_name].filter(Boolean).join(' ') || 'Unknown',
      items: so.items.map((i) => ({ name: i.product_name, quantity: i.quantity })),
      total: Number(so.total),
      status: so.status.toLowerCase(),
      createdAt: so.created_at.toISOString(),
      address: so.order.address ? {
        city: so.order.address.city || '',
        district: so.order.address.district || '',
      } : null,
    })),
    total: storeOrders.length,
  };
}

async function updateOrderStatus(personid, storeOrderId, status) {
  const sellerid = await getSellerIdFromUser(personid);
  const soId = parseInt(storeOrderId, 10);

  const so = await prisma.store_orders.findUnique({ where: { store_orderid: soId } });
  if (!so) throw new NotFoundError('Order');
  if (so.sellerid !== sellerid) throw new ForbiddenError('Not your order');

  const statusMap = { pending: 'PENDING_PAYMENT', completed: 'DELIVERED', cancelled: 'CANCELED' };
  const newStatus = statusMap[status] || status.toUpperCase();

  await prisma.store_orders.update({
    where: { store_orderid: soId },
    data: { status: newStatus },
  });

  return { id: String(soId), status };
}

async function getSettings(personid) {
  const id = parseInt(personid, 10);
  const seller = await prisma.seller.findUnique({
    where: { personid: id },
    include: { store_pickup_address: true },
  });
  if (!seller) throw new NotFoundError('Store');

  return {
    name: seller.storename || '',
    logo: seller.logo_url || null,
    description: seller.store_description || '',
    email: seller.email || '',
    phone: seller.phone || '',
    address: seller.address_text || '',
    pickupAddress: seller.store_pickup_address ? {
      firstLine: seller.store_pickup_address.first_line,
      city: seller.store_pickup_address.city,
      phone: seller.store_pickup_address.phone || '',
      contactName: seller.store_pickup_address.contact_name || '',
    } : null,
  };
}

async function updateSettings(personid, body) {
  const id = parseInt(personid, 10);
  const seller = await prisma.seller.findUnique({ where: { personid: id } });
  if (!seller) throw new NotFoundError('Store');

  const data = {};
  if (body.name) data.storename = body.name;
  if (body.description !== undefined) data.store_description = body.description;
  if (body.email) data.email = body.email;
  if (body.phone) data.phone = body.phone;
  if (body.logo) data.logo_url = body.logo;
  if (body.address) data.address_text = body.address;

  await prisma.seller.update({ where: { sellerid: seller.sellerid }, data });

  return getSettings(personid);
}

function mapProductDetail(p) {
  return {
    id: String(p.productid),
    name: p.productname,
    images: p.product_images?.filter((i) => i.image_url).map((i) => ({ src: i.image_url, width: 800, height: 800 })) || [],
    price: p.mrp ? Number(p.mrp) : Number(p.price || 0),
    offerPrice: p.mrp && p.price ? Number(p.price) : null,
    isWishlisted: false,
    category: p.category ? [p.category.category_name] : [],
    description: p.description || '',
    size: [],
    store: p.seller ? { id: String(p.seller.sellerid), name: p.seller.storename || '' } : null,
    variants: p.product_variants?.length
      ? p.product_variants.map((v) => ({
          id: String(v.variant_id),
          name: v.variant_name,
          options: v.options.map((o) => ({ id: String(o.option_id), value: o.value, stock: o.stock })),
        }))
      : null,
  };
}

module.exports = {
  getDashboard, listSellerProducts, createProduct, updateProduct, deleteProduct,
  getSellerOrders, updateOrderStatus, getSettings, updateSettings, getSellerIdFromUser,
};
