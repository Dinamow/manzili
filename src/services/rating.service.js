const { prisma } = require('../config/prisma');
const { NotFoundError, ConflictError } = require('../utils/errors');

async function createRating(personid, { productId, rating, review }) {
  const pid = parseInt(personid, 10);
  const productid = parseInt(productId, 10);

  const enduser = await prisma.enduser.findUnique({ where: { personid: pid } });
  if (!enduser) throw new NotFoundError('User');

  const product = await prisma.products.findUnique({ where: { productid } });
  if (!product) throw new NotFoundError('Product');

  const existing = await prisma.reviewing_and_rating.findUnique({
    where: { enduserid_productid: { enduserid: enduser.enduserid, productid } },
  });
  if (existing) throw new ConflictError('Already reviewed this product');

  const created = await prisma.reviewing_and_rating.create({
    data: {
      enduserid: enduser.enduserid,
      productid,
      rating,
      comment: review || null,
    },
    include: { enduser: { include: { person: { select: { first_name: true, last_name: true } } } } },
  });

  return {
    id: `${created.enduserid}_${created.productid}`,
    rating: created.rating,
    text: created.comment || '',
    userName: [created.enduser?.person?.first_name, created.enduser?.person?.last_name].filter(Boolean).join(' '),
    date: created.created_at.toISOString(),
  };
}

async function listRatings(productId) {
  const pid = parseInt(productId, 10);
  const ratings = await prisma.reviewing_and_rating.findMany({
    where: { productid: pid },
    include: { enduser: { include: { person: { select: { first_name: true, last_name: true } } } } },
    orderBy: { created_at: 'desc' },
  });

  return ratings.map((r) => ({
    id: `${r.enduserid}_${r.productid}`,
    rating: r.rating,
    text: r.comment || '',
    userName: [r.enduser?.person?.first_name, r.enduser?.person?.last_name].filter(Boolean).join(' '),
    date: r.created_at.toISOString(),
  }));
}

module.exports = { createRating, listRatings };
