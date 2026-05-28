const { prisma } = require('../config/prisma');
const { hashPassword, comparePassword } = require('../utils/password');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { ConflictError, UnauthorizedError, NotFoundError } = require('../utils/errors');

async function determineRole(personid) {
  const [admin, sellerRow] = await Promise.all([
    prisma.systemadmin.findUnique({ where: { personid } }),
    prisma.seller.findUnique({ where: { personid } }),
  ]);
  if (admin) return { role: 'admin', sellerId: null };
  if (sellerRow) return { role: 'seller', sellerId: sellerRow.sellerid };
  return { role: 'buyer', sellerId: null };
}

function buildTokenPayload(person, role, sellerId) {
  return {
    sub: String(person.personid),
    email: person.email,
    role,
    sellerId: sellerId ? String(sellerId) : null,
  };
}

async function register({ name, email, password }) {
  const existing = await prisma.person.findUnique({ where: { email } });
  if (existing) throw new ConflictError('Email already registered');

  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || null;

  const hashed = await hashPassword(password);

  const person = await prisma.$transaction(async (tx) => {
    const p = await tx.person.create({
      data: {
        email,
        password: hashed,
        first_name: firstName,
        last_name: lastName,
      },
    });
    await tx.enduser.create({ data: { personid: p.personid } });
    return p;
  });

  const payload = buildTokenPayload(person, 'buyer', null);
  const token = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.person.update({
    where: { personid: person.personid },
    data: { refresh_token: refreshToken },
  });

  return {
    data: {
      id: String(person.personid),
      name: [person.first_name, person.last_name].filter(Boolean).join(' '),
      email: person.email,
    },
    token,
    refreshToken,
  };
}

async function login({ email, password }) {
  const person = await prisma.person.findUnique({ where: { email } });
  if (!person) throw new UnauthorizedError('Invalid email or password');

  const valid = await comparePassword(password, person.password);
  if (!valid) throw new UnauthorizedError('Invalid email or password');

  const { role, sellerId } = await determineRole(person.personid);
  const payload = buildTokenPayload(person, role, sellerId);
  const token = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.person.update({
    where: { personid: person.personid },
    data: { refresh_token: refreshToken },
  });

  return {
    data: {
      user: {
        id: String(person.personid),
        name: [person.first_name, person.last_name].filter(Boolean).join(' '),
        email: person.email,
        role,
        ...(sellerId && { storeId: String(sellerId) }),
      },
    },
    token,
    refreshToken,
  };
}

async function refresh({ refreshToken }) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const personid = parseInt(decoded.sub, 10);
  const person = await prisma.person.findUnique({ where: { personid } });
  if (!person || person.refresh_token !== refreshToken) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const { role, sellerId } = await determineRole(personid);
  const payload = buildTokenPayload(person, role, sellerId);
  const newToken = signAccessToken(payload);
  const newRefresh = signRefreshToken(payload);

  await prisma.person.update({
    where: { personid },
    data: { refresh_token: newRefresh },
  });

  return { token: newToken, refreshToken: newRefresh };
}

module.exports = { register, login, refresh };
