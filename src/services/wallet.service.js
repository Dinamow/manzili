const { prisma } = require('../config/prisma');
const { NotFoundError, ValidationError, ForbiddenError } = require('../utils/errors');

async function ensureWallet(sellerid) {
  let wallet = await prisma.seller_wallet.findUnique({ where: { sellerid } });
  if (!wallet) {
    wallet = await prisma.seller_wallet.create({
      data: { sellerid, pending_balance: 0, available_balance: 0 },
    });
  }
  return wallet;
}

async function getWallet(personid) {
  const id = parseInt(personid, 10);
  const seller = await prisma.seller.findUnique({ where: { personid: id } });
  if (!seller) throw new ForbiddenError('Not a seller');

  const wallet = await ensureWallet(seller.sellerid);
  const transactions = await prisma.wallet_transactions.findMany({
    where: { wallet_id: wallet.wallet_id },
    orderBy: { created_at: 'desc' },
    take: 50,
  });

  return {
    pendingBalance: Number(wallet.pending_balance),
    availableBalance: Number(wallet.available_balance),
    currency: wallet.currency,
    transactions: transactions.map((t) => ({
      id: String(t.transaction_id),
      type: t.type,
      bucket: t.bucket,
      amount: Number(t.amount),
      createdAt: t.created_at.toISOString(),
    })),
  };
}

async function postWalletTransaction({ sellerid, type, bucket, amount, currency = 'EGP', idempotencyKey, storeOrderId }) {
  const wallet = await ensureWallet(sellerid);

  // Idempotency check
  const existing = await prisma.wallet_transactions.findFirst({
    where: { wallet_id: wallet.wallet_id, idempotency_key: idempotencyKey },
  });
  if (existing) return { wallet, transaction: existing, applied: false };

  const balanceField = bucket === 'PENDING' ? 'pending_balance' : 'available_balance';

  const [updatedWallet, transaction] = await prisma.$transaction([
    prisma.seller_wallet.update({
      where: { wallet_id: wallet.wallet_id },
      data: { [balanceField]: { increment: amount } },
    }),
    prisma.wallet_transactions.create({
      data: {
        wallet_id: wallet.wallet_id,
        type,
        bucket,
        amount,
        currency,
        idempotency_key: idempotencyKey,
        store_orderid: storeOrderId ? parseInt(storeOrderId, 10) : null,
      },
    }),
  ]);

  return { wallet: updatedWallet, transaction, applied: true };
}

async function requestPayout(personid, { amount }) {
  const id = parseInt(personid, 10);
  const seller = await prisma.seller.findUnique({ where: { personid: id } });
  if (!seller) throw new ForbiddenError('Not a seller');

  const wallet = await ensureWallet(seller.sellerid);
  if (Number(wallet.available_balance) < amount) {
    throw new ValidationError('Insufficient available balance');
  }

  await postWalletTransaction({
    sellerid: seller.sellerid,
    type: 'PAYOUT',
    bucket: 'AVAILABLE',
    amount: -amount,
    idempotencyKey: `payout_${seller.sellerid}_${Date.now()}`,
  });

  await prisma.payout.create({
    data: { sellerid: seller.sellerid, amount, status: 0 },
  });

  return { message: 'Payout requested', amount };
}

async function updateBankDetails(personid, body) {
  const id = parseInt(personid, 10);
  const seller = await prisma.seller.findUnique({ where: { personid: id } });
  if (!seller) throw new ForbiddenError('Not a seller');

  const wallet = await ensureWallet(seller.sellerid);
  await prisma.seller_wallet.update({
    where: { wallet_id: wallet.wallet_id },
    data: {
      bank_name: body.bankName,
      bank_account_holder: body.accountHolder,
      bank_last4: body.accountNumber?.slice(-4) || null,
    },
  });

  return { message: 'Bank details updated' };
}

async function releasePendingFunds(sellerid, holdDays = 7) {
  const wallet = await ensureWallet(sellerid);
  const cutoff = new Date(Date.now() - holdDays * 24 * 60 * 60 * 1000);

  const pendingTxns = await prisma.wallet_transactions.findMany({
    where: {
      wallet_id: wallet.wallet_id,
      bucket: 'PENDING',
      type: 'SALE_CREDIT',
      created_at: { lt: cutoff },
    },
  });

  let released = 0;
  for (const txn of pendingTxns) {
    const releaseKey = `release_${txn.transaction_id}`;
    const exists = await prisma.wallet_transactions.findFirst({
      where: { wallet_id: wallet.wallet_id, idempotency_key: releaseKey },
    });
    if (exists) continue;

    const amt = Number(txn.amount);
    await prisma.$transaction([
      prisma.seller_wallet.update({
        where: { wallet_id: wallet.wallet_id },
        data: { pending_balance: { decrement: amt }, available_balance: { increment: amt } },
      }),
      prisma.wallet_transactions.create({
        data: {
          wallet_id: wallet.wallet_id,
          type: 'RELEASE',
          bucket: 'AVAILABLE',
          amount: amt,
          currency: wallet.currency,
          idempotency_key: releaseKey,
        },
      }),
    ]);
    released += amt;
  }

  return { released, count: pendingTxns.length };
}

module.exports = { getWallet, postWalletTransaction, requestPayout, updateBankDetails, releasePendingFunds, ensureWallet };
