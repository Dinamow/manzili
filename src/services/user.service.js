const { prisma } = require('../config/prisma');
const { NotFoundError } = require('../utils/errors');

async function getProfile(personid) {
  const id = parseInt(personid, 10);
  const person = await prisma.person.findUnique({
    where: { personid: id },
    include: { seller: { select: { sellerid: true } } },
  });
  if (!person) throw new NotFoundError('User');

  return {
    id: String(person.personid),
    name: [person.first_name, person.last_name].filter(Boolean).join(' '),
    email: person.email,
    hasStore: !!person.seller,
    createdAt: person.created_at?.toISOString() || null,
  };
}

async function updateProfile(personid, { name, email }) {
  const id = parseInt(personid, 10);
  const data = {};
  if (name) {
    const parts = name.trim().split(/\s+/);
    data.first_name = parts[0];
    data.last_name = parts.slice(1).join(' ') || null;
  }
  if (email) data.email = email;

  const person = await prisma.person.update({
    where: { personid: id },
    data,
    include: { seller: { select: { sellerid: true } } },
  });

  return {
    id: String(person.personid),
    name: [person.first_name, person.last_name].filter(Boolean).join(' '),
    email: person.email,
    hasStore: !!person.seller,
    createdAt: person.created_at?.toISOString() || null,
  };
}

module.exports = { getProfile, updateProfile };
