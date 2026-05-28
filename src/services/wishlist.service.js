const { prisma } = require('../config/prisma');
const { NotFoundError } = require('../utils/errors');

async function ensureWishlist(personid) {
  const id = parseInt(personid, 10);
  const enduser = await prisma.enduser.findUnique({ where: { personid: id } });
  if (!enduser) throw new NotFoundError('User');

  if (enduser.wichlistid) return enduser.wichlistid;

  const wishlist = await prisma.wishlist.create({ data: { numberofproducts: 0 } });
  await prisma.enduser.update({
    where: { enduserid: enduser.enduserid },
    data: { wichlistid: wishlist.wichlistid },
  });
  return wishlist.wichlistid;
}

async function getWishlist(personid) {
  const id = parseInt(personid, 10);
  const enduser = await prisma.enduser.findUnique({ where: { personid: id } });
  if (!enduser?.wichlistid) return { wishlistCards: [], total: 0 };

  const items = await prisma.whishlist_contain.findMany({
    where: { wichlistid: enduser.wichlistid },
    include: {
      products: {
        include: {
          category: true,
          seller: true,
          product_images: { select: { image_url: true }, take: 1 },
          reviewing_and_rating: { select: { rating: true } },
        },
      },
    },
  });

  const wishlistCards = items.map((item) => {
    const p = item.products;
    const avgRating = p.reviewing_and_rating?.length
      ? p.reviewing_and_rating.reduce((s, r) => s + r.rating, 0) / p.reviewing_and_rating.length
      : 0;
    const mainImage = p.cover_url || p.product_images?.[0]?.image_url || null;

    return {
      id: String(p.productid),
      name: p.productname,
      mainImage: mainImage ? { src: mainImage, width: 400, height: 400 } : null,
      price: p.mrp ? Number(p.mrp) : Number(p.price || 0),
      offerPrice: p.mrp && p.price ? Number(p.price) : null,
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: p.reviewing_and_rating?.length || 0,
      isWishlisted: true,
      category: p.category ? [p.category.category_name] : [],
      inStock: p.in_stock ?? true,
      store: p.seller ? { id: String(p.seller.sellerid), name: p.seller.storename || '' } : null,
    };
  });

  return { wishlistCards, total: wishlistCards.length };
}

async function addToWishlist(personid, productId) {
  const wichlistid = await ensureWishlist(personid);
  const productid = parseInt(productId, 10);

  const exists = await prisma.products.findUnique({ where: { productid } });
  if (!exists) throw new NotFoundError('Product');

  await prisma.whishlist_contain.upsert({
    where: { wichlistid_productid: { wichlistid, productid } },
    create: { wichlistid, productid },
    update: {},
  });

  return { message: 'Added to wishlist' };
}

async function removeFromWishlist(personid, productId) {
  const id = parseInt(personid, 10);
  const productid = parseInt(productId, 10);
  const enduser = await prisma.enduser.findUnique({ where: { personid: id } });
  if (!enduser?.wichlistid) return { message: 'Removed from wishlist' };

  await prisma.whishlist_contain.deleteMany({
    where: { wichlistid: enduser.wichlistid, productid },
  });
  return { message: 'Removed from wishlist' };
}

async function clearWishlist(personid) {
  const id = parseInt(personid, 10);
  const enduser = await prisma.enduser.findUnique({ where: { personid: id } });
  if (!enduser?.wichlistid) return { message: 'Wishlist cleared' };

  await prisma.whishlist_contain.deleteMany({
    where: { wichlistid: enduser.wichlistid },
  });
  return { message: 'Wishlist cleared' };
}

module.exports = { getWishlist, addToWishlist, removeFromWishlist, clearWishlist };
