const { prisma } = require('../config/prisma');
const { NotFoundError } = require('../utils/errors');

function mapProductCard(product, wishlistedIds = new Set()) {
  const mainImage = product.cover_url
    || product.product_images?.[0]?.image_url
    || null;

  const avgRating = product.reviewing_and_rating?.length
    ? product.reviewing_and_rating.reduce((sum, r) => sum + r.rating, 0) / product.reviewing_and_rating.length
    : 0;

  return {
    id: String(product.productid),
    name: product.productname,
    mainImage: mainImage ? { src: mainImage, width: 400, height: 400 } : null,
    price: product.mrp ? Number(product.mrp) : Number(product.price || 0),
    offerPrice: product.mrp && product.price ? Number(product.price) : null,
    rating: Math.round(avgRating * 10) / 10,
    reviewCount: product.reviewing_and_rating?.length || 0,
    isWishlisted: wishlistedIds.has(product.productid),
    category: product.category ? [product.category.category_name] : [],
    inStock: product.in_stock ?? true,
    store: product.seller
      ? { id: String(product.seller.sellerid), name: product.seller.storename || '' }
      : null,
  };
}

const productInclude = {
  category: true,
  seller: true,
  product_images: { select: { image_url: true }, take: 5 },
  reviewing_and_rating: { select: { rating: true } },
};

async function getWishlistedIds(userId) {
  if (!userId) return new Set();
  const personid = parseInt(userId, 10);
  const enduser = await prisma.enduser.findUnique({ where: { personid } });
  if (!enduser?.wichlistid) return new Set();
  const items = await prisma.whishlist_contain.findMany({
    where: { wichlistid: enduser.wichlistid },
    select: { productid: true },
  });
  return new Set(items.map((i) => i.productid));
}

async function listProducts({ page, limit, skip, category, sortBy, sortDir, userId }) {
  const effectiveSortBy = sortBy || 'created_at';
  const effectiveSortDir = sortDir === 'asc' ? 'asc' : 'desc';

  const where = { is_disabled: { not: true } };
  if (category) {
    where.category = { category_name: { equals: category, mode: 'insensitive' } };
  }

  const orderBy = {};
  if (effectiveSortBy === 'price') orderBy.price = effectiveSortDir;
  else orderBy.created_at = effectiveSortDir;

  const [products, total] = await Promise.all([
    prisma.products.findMany({ where, include: productInclude, skip, take: limit, orderBy }),
    prisma.products.count({ where }),
  ]);

  const wishlistedIds = await getWishlistedIds(userId);
  return {
    products: products.map((p) => mapProductCard(p, wishlistedIds)),
    total,
    page,
    limit,
  };
}

async function listFeatured({ page, limit, skip, userId }) {
  const products = await prisma.products.findMany({
    where: { is_disabled: { not: true } },
    include: productInclude,
    skip,
    take: limit,
    orderBy: { created_at: 'desc' },
  });

  // Sort by rating in-memory (no direct aggregate orderBy in Prisma for relations)
  products.sort((a, b) => {
    const avgA = a.reviewing_and_rating.length ? a.reviewing_and_rating.reduce((s, r) => s + r.rating, 0) / a.reviewing_and_rating.length : 0;
    const avgB = b.reviewing_and_rating.length ? b.reviewing_and_rating.reduce((s, r) => s + r.rating, 0) / b.reviewing_and_rating.length : 0;
    return avgB - avgA;
  });

  const total = await prisma.products.count({ where: { is_disabled: { not: true } } });
  const wishlistedIds = await getWishlistedIds(userId);

  return {
    products: products.map((p) => mapProductCard(p, wishlistedIds)),
    total,
    page,
    limit,
  };
}

async function listLatest({ page, limit, skip, userId }) {
  const where = { is_disabled: { not: true } };
  const [products, total] = await Promise.all([
    prisma.products.findMany({ where, include: productInclude, skip, take: limit, orderBy: { created_at: 'desc' } }),
    prisma.products.count({ where }),
  ]);

  const wishlistedIds = await getWishlistedIds(userId);
  return {
    products: products.map((p) => mapProductCard(p, wishlistedIds)),
    total,
    page,
    limit,
  };
}

async function getProductById(productId, userId) {
  const id = parseInt(productId, 10);
  const product = await prisma.products.findUnique({
    where: { productid: id },
    include: {
      category: true,
      seller: true,
      product_images: { select: { image_url: true } },
      reviewing_and_rating: {
        include: { enduser: { include: { person: { select: { first_name: true, last_name: true } } } } },
        orderBy: { created_at: 'desc' },
      },
      product_variants: { include: { options: true } },
    },
  });

  if (!product || product.is_disabled) throw new NotFoundError('Product');

  const wishlistedIds = await getWishlistedIds(userId);
  const reviews = product.reviewing_and_rating || [];
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  return {
    id: String(product.productid),
    name: product.productname,
    images: product.product_images
      .filter((i) => i.image_url)
      .map((i) => ({ src: i.image_url, width: 800, height: 800 })),
    price: product.mrp ? Number(product.mrp) : Number(product.price || 0),
    offerPrice: product.mrp && product.price ? Number(product.price) : null,
    isWishlisted: wishlistedIds.has(product.productid),
    category: product.category ? [product.category.category_name] : [],
    description: product.description || '',
    size: [],
    store: product.seller
      ? { id: String(product.seller.sellerid), name: product.seller.storename || '' }
      : null,
    variants: product.product_variants.length
      ? product.product_variants.map((v) => ({
          id: String(v.variant_id),
          name: v.variant_name,
          options: v.options.map((o) => ({
            id: String(o.option_id),
            value: o.value,
            stock: o.stock,
          })),
        }))
      : null,
    reviews: {
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviews: reviews.length,
      items: reviews.map((r) => ({
        id: `${r.enduserid}_${r.productid}`,
        rating: r.rating,
        text: r.comment || '',
        userName: [r.enduser?.person?.first_name, r.enduser?.person?.last_name].filter(Boolean).join(' ') || 'Anonymous',
        date: r.created_at.toISOString(),
      })),
    },
  };
}

module.exports = { listProducts, listFeatured, listLatest, getProductById };
