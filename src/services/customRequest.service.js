const { prisma } = require('../config/prisma');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

function mapRequest(r) {
  return {
    id: String(r.requestid),
    itemName: r.itemname,
    description: r.description,
    images: r.image_urls || [],
    visibility: r.visibility ? 'open' : 'private',
    category: r.category?.category_name || '',
    quantity: r.quantity || 1,
    size: r.lenght || r.width || r.hight ? { length: r.lenght, width: r.width, height: r.hight } : null,
    material: r.matrial || null,
    deliveryDate: r.desired_delivery_date?.toISOString() || null,
    voiceMemoUrl: r.voicememo_url || null,
    storeId: r.sellerid ? String(r.sellerid) : null,
    status: r.status,
    createdAt: r.created_at?.toISOString() || null,
  };
}

const requestInclude = { category: true, color_palette: true };

async function listBuyerRequests(personid) {
  const id = parseInt(personid, 10);
  const enduser = await prisma.enduser.findUnique({ where: { personid: id } });
  if (!enduser) return [];

  const requests = await prisma.custom_request.findMany({
    where: { enduserid: enduser.enduserid },
    include: requestInclude,
    orderBy: { created_at: 'desc' },
  });
  return requests.map(mapRequest);
}

async function createRequest(personid, body) {
  const id = parseInt(personid, 10);
  const enduser = await prisma.enduser.findUnique({ where: { personid: id } });
  if (!enduser) throw new NotFoundError('User');

  let categoryid = 1;
  if (body.category) {
    let cat = await prisma.category.findFirst({ where: { category_name: { equals: body.category, mode: 'insensitive' } } });
    if (!cat) cat = await prisma.category.create({ data: { category_name: body.category } });
    categoryid = cat.categoryid;
  }

  const request = await prisma.custom_request.create({
    data: {
      enduserid: enduser.enduserid,
      itemname: body.itemName,
      description: body.description,
      visibility: body.visibility !== 'private',
      categoryid,
      quantity: body.quantity || 1,
      lenght: body.size?.length || null,
      width: body.size?.width || null,
      hight: body.size?.height || null,
      matrial: body.material || null,
      desired_delivery_date: body.deliveryDate ? new Date(body.deliveryDate) : null,
      image_urls: body.images || [],
      voicememo_url: body.voiceMemoUrl || null,
      sellerid: body.storeId ? parseInt(body.storeId, 10) : null,
    },
    include: requestInclude,
  });
  return mapRequest(request);
}

async function getRequestById(personid, requestId) {
  const id = parseInt(personid, 10);
  const rid = parseInt(requestId, 10);
  const request = await prisma.custom_request.findUnique({ where: { requestid: rid }, include: requestInclude });
  if (!request) throw new NotFoundError('Request');

  // Check access: owner, targeted seller, or open visibility
  const enduser = await prisma.enduser.findUnique({ where: { personid: id } });
  const seller = await prisma.seller.findUnique({ where: { personid: id } });
  const isOwner = enduser && request.enduserid === enduser.enduserid;
  const isTargetedSeller = seller && request.sellerid === seller.sellerid;
  const isOpen = request.visibility === true;
  if (!isOwner && !isTargetedSeller && !isOpen) throw new ForbiddenError('Access denied');

  return mapRequest(request);
}

async function updateRequest(personid, requestId, body) {
  const id = parseInt(personid, 10);
  const rid = parseInt(requestId, 10);
  const enduser = await prisma.enduser.findUnique({ where: { personid: id } });
  const request = await prisma.custom_request.findUnique({ where: { requestid: rid } });
  if (!request) throw new NotFoundError('Request');
  if (request.enduserid !== enduser?.enduserid) throw new ForbiddenError('Not your request');

  const data = {};
  if (body.itemName) data.itemname = body.itemName;
  if (body.description) data.description = body.description;
  if (body.visibility !== undefined) data.visibility = body.visibility !== 'private';

  const updated = await prisma.custom_request.update({ where: { requestid: rid }, data, include: requestInclude });
  return mapRequest(updated);
}

async function deleteRequest(personid, requestId) {
  const id = parseInt(personid, 10);
  const rid = parseInt(requestId, 10);
  const enduser = await prisma.enduser.findUnique({ where: { personid: id } });
  const request = await prisma.custom_request.findUnique({ where: { requestid: rid } });
  if (!request) throw new NotFoundError('Request');
  if (request.enduserid !== enduser?.enduserid) throw new ForbiddenError('Not your request');

  await prisma.custom_request.delete({ where: { requestid: rid } });
  return { message: 'Request deleted' };
}

async function listOffers(requestId) {
  const rid = parseInt(requestId, 10);
  const offers = await prisma.offers.findMany({
    where: { requestid: rid },
    include: { seller: { select: { sellerid: true, storename: true } } },
    orderBy: { created_at: 'desc' },
  });
  return offers.map((o) => ({
    id: String(o.offer_id),
    sellerId: String(o.sellerid),
    storeName: o.seller.storename || '',
    price: Number(o.price),
    description: o.description || '',
    status: o.status,
    createdAt: o.created_at.toISOString(),
  }));
}

async function getActiveOffer(requestId) {
  const rid = parseInt(requestId, 10);
  const activeStatuses = ['accepted', 'first_paid', 'progress_uploaded', 'second_paid', 'ready_to_ship', 'paid'];
  const offer = await prisma.offers.findFirst({
    where: { requestid: rid, status: { in: activeStatuses } },
    include: { seller: { select: { sellerid: true, storename: true } }, offer_payments: true },
    orderBy: { updated_at: 'desc' },
  });
  if (!offer) return null;

  return {
    id: String(offer.offer_id),
    sellerId: String(offer.sellerid),
    storeName: offer.seller.storename || '',
    price: Number(offer.price),
    status: offer.status,
    payments: offer.offer_payments.map((p) => ({
      milestone: p.milestone,
      amount: Number(p.amount),
      paidAt: p.paid_at.toISOString(),
    })),
  };
}

async function listSellerRequests(personid) {
  const id = parseInt(personid, 10);
  const seller = await prisma.seller.findUnique({ where: { personid: id } });
  if (!seller) throw new ForbiddenError('Not a seller');

  const requests = await prisma.custom_request.findMany({
    where: {
      OR: [
        { visibility: true },
        { sellerid: seller.sellerid },
      ],
    },
    include: requestInclude,
    orderBy: { created_at: 'desc' },
  });
  return requests.map(mapRequest);
}

async function getOfferMessages(offerId) {
  const oid = parseInt(offerId, 10);
  const messages = await prisma.offer_messages.findMany({
    where: { offer_id: oid },
    orderBy: { created_at: 'asc' },
  });
  return messages.map((m) => ({
    id: String(m.message_id),
    author: m.author_type,
    text: m.text,
    createdAt: m.created_at.toISOString(),
  }));
}

async function sendOfferMessage(personid, offerId, body) {
  const oid = parseInt(offerId, 10);
  const pid = parseInt(personid, 10);

  const offer = await prisma.offers.findUnique({ where: { offer_id: oid } });
  if (!offer) throw new NotFoundError('Offer');

  // Determine author type
  const seller = await prisma.seller.findUnique({ where: { personid: pid } });
  const authorType = seller && seller.sellerid === offer.sellerid ? 'seller' : 'buyer';

  const message = await prisma.offer_messages.create({
    data: {
      offer_id: oid,
      author_type: authorType,
      author_id: pid,
      text: body.text,
      image_url: body.image || null,
    },
  });

  return {
    id: String(message.message_id),
    author: message.author_type,
    text: message.text,
    createdAt: message.created_at.toISOString(),
  };
}

module.exports = {
  listBuyerRequests, createRequest, getRequestById, updateRequest, deleteRequest,
  listOffers, getActiveOffer, listSellerRequests, getOfferMessages, sendOfferMessage,
};
