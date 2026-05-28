const { prisma } = require('../config/prisma');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

function mapAddress(a) {
  return {
    id: String(a.id),
    name: a.name || '',
    phone: a.phone || '',
    city: a.city || '',
    zone: a.zone || '',
    district: a.district || '',
    street: a.street || '',
    building: a.buildingnumber || '',
    floor: a.floor || '',
    apartment: a.apartmentnumber || '',
    postalCode: a.postalcode || a.zipcode || '',
    bostaCityId: a.bosta_city_id || null,
    bostaZoneId: a.bosta_zone_id || null,
    bostaDistrictId: a.bosta_district_id || null,
  };
}

async function listAddresses(personid) {
  const id = parseInt(personid, 10);
  const addresses = await prisma.addresses.findMany({ where: { personid: id } });
  return addresses.map(mapAddress);
}

async function createAddress(personid, body) {
  const id = parseInt(personid, 10);
  const address = await prisma.addresses.create({
    data: {
      personid: id,
      name: body.name,
      phone: body.phone,
      city: body.city,
      zone: body.zone,
      district: body.district,
      street: body.street,
      buildingnumber: body.building,
      floor: body.floor,
      apartmentnumber: body.apartment,
      postalcode: body.postalCode,
      bosta_city_id: body.bostaCityId,
      bosta_zone_id: body.bostaZoneId,
      bosta_district_id: body.bostaDistrictId,
    },
  });
  return mapAddress(address);
}

async function deleteAddress(personid, addressId) {
  const id = parseInt(personid, 10);
  const addrId = parseInt(addressId, 10);
  const address = await prisma.addresses.findUnique({ where: { id: addrId } });
  if (!address) throw new NotFoundError('Address');
  if (address.personid !== id) throw new ForbiddenError('Not your address');
  await prisma.addresses.delete({ where: { id: addrId } });
}

module.exports = { listAddresses, createAddress, deleteAddress };
