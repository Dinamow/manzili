const { Router } = require('express');
const { auth } = require('../middleware/auth');
const { success, fail } = require('../utils/apiResponse');
const { env } = require('../config/env');

const router = Router();

// POST /v1/checkout - Create Stripe Checkout Session
router.post('/', auth, async (req, res, next) => {
  try {
    if (!env.STRIPE_SECRET_KEY) {
      return fail(res, 'Stripe not configured', 503);
    }
    const stripe = require('stripe')(env.STRIPE_SECRET_KEY);

    const orderService = require('../services/order.service');
    const order = await orderService.createOrder(req.user.sub, {
      ...req.body,
      paymentMethod: 'STRIPE',
    });

    let session;
    try {
      const lineItems = req.body.items.map((item) => ({
        price_data: {
          currency: env.STRIPE_CURRENCY,
          product_data: { name: item.name || `Product ${item.productId}` },
          unit_amount: Math.round((item.price || 0) * 100),
        },
        quantity: item.quantity,
      }));

      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${env.APP_URL}/orders/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.APP_URL}/cart`,
        metadata: { orderId: order.id },
      });
    } catch (stripeErr) {
      // Clean up orphaned order by marking it canceled
      const { prisma } = require('../config/prisma');
      await prisma.orders.update({ where: { orderid: parseInt(order.id, 10) }, data: { status: 5 } });
      await prisma.store_orders.updateMany({ where: { orderid: parseInt(order.id, 10) }, data: { status: 'CANCELED' } });
      throw stripeErr;
    }

    return success(res, { url: session.url, sessionId: session.id, orderId: order.id });
  } catch (err) { next(err); }
});

module.exports = router;
