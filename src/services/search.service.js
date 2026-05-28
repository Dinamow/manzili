const { prisma } = require('../config/prisma');

async function search({ q, page, limit, skip, userId }) {
  if (!q || !q.trim()) return { products: [], total: 0 };

  const where = {
    is_disabled: { not: true },
    OR: [
      { productname: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ],
  };

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

  // Get wishlisted IDs if logged in
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
      images: p.product_images.filter((i) => i.image_url).map((i) => i.image_url),
      price: p.mrp ? Number(p.mrp) : Number(p.price || 0),
      offerPrice: p.mrp && p.price ? Number(p.price) : null,
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: p.reviewing_and_rating?.length || 0,
      isWishlisted: wishlistedIds.has(p.productid),
      category: p.category?.category_name || '',
      inStock: p.in_stock ?? true,
      store: p.seller ? { id: String(p.seller.sellerid), name: p.seller.storename || '' } : null,
    };
  });

  return { products: mapped, total };
}

module.exports = { search };
