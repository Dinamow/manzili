const { prisma } = require('../config/prisma');
const { NotFoundError, ConflictError } = require('../utils/errors');

async function getStoreById(storeId) {
  const id = parseInt(storeId, 10);
  const seller = await prisma.seller.findUnique({
    where: { sellerid: id },
    include: {
      products: { where: { is_disabled: { not: true } }, select: { productid: true } },
      _count: { select: { products: true } },
    },
  });
  if (!seller) throw new NotFoundError('Store');

  const ratings = await prisma.reviewing_and_rating.findMany({
    where: { products: { sellerid: id } },
    select: { rating: true },
  });
  const avgRating = ratings.length
    ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
    : 0;

  return {
    id: String(seller.sellerid),
    name: seller.storename || '',
    logo: seller.logo_url || null,
    description: seller.store_description || '',
    location: seller.address_text || '',
    email: seller.email || '',
    phone: seller.phone || '',
    rating: Math.round(avgRating * 10) / 10,
    totalProducts: seller.products.length,
    totalReviews: ratings.length,
  };
}

async function getStoreProducts(storeId, { page, limit, skip, userId }) {
  const id = parseInt(storeId, 10);
  const where = { sellerid: id, is_disabled: { not: true } };

  const [products, total] = await Promise.all([
    prisma.products.findMany({
      where,
      include: {
        category: true,
        seller: true,
        product_images: { select: { image_url: true }, take: 1 },
        reviewing_and_rating: { select: { rating: true } },
      },
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
    }),
    prisma.products.count({ where }),
  ]);

  // Get wishlisted IDs
  let wishlistedIds = new Set();
  if (userId) {
    const personid = parseInt(userId, 10);
    const enduser = await prisma.enduser.findUnique({ where: { personid } });
    if (enduser?.wichlistid) {
      const items = await prisma.whishlist_contain.findMany({
        where: { wichlistid: enduser.wichlistid },
        select: { productid: true },
      });
      wishlistedIds = new Set(items.map((i) => i.productid));
    }
  }

  const mapped = products.map((p) => {
    const mainImage = p.cover_url || p.product_images?.[0]?.image_url || null;
    const avgRating = p.reviewing_and_rating?.length
      ? p.reviewing_and_rating.reduce((s, r) => s + r.rating, 0) / p.reviewing_and_rating.length
      : 0;
    return {
      id: String(p.productid),
      name: p.productname,
      mainImage: mainImage ? { src: mainImage, width: 400, height: 400 } : null,
      price: p.mrp ? Number(p.mrp) : Number(p.price || 0),
      offerPrice: p.mrp && p.price ? Number(p.price) : null,
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: p.reviewing_and_rating?.length || 0,
      isWishlisted: wishlistedIds.has(p.productid),
      category: p.category ? [p.category.category_name] : [],
      inStock: p.in_stock ?? true,
      store: p.seller ? { id: String(p.seller.sellerid), name: p.seller.storename || '' } : null,
    };
  });

  return { products: mapped, total, page, limit };
}

async function applyForStore(personid, body) {
  const id = parseInt(personid, 10);
  const existing = await prisma.seller.findUnique({ where: { personid: id } });
  if (existing) throw new ConflictError('Already have a store application');

  await prisma.seller.create({
    data: {
      personid: id,
      storename: body.name,
      store_description: body.description,
      email: body.email,
      phone: body.phone,
      logo_url: body.logo,
      address_text: body.address,
      store_status: 'pending',
      is_active: false,
    },
  });

  return { message: 'Application submitted, pending admin review' };
}

module.exports = { getStoreById, getStoreProducts, applyForStore };
