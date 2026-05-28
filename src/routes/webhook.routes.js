const { Router } = require('express');
const { prisma } = require('../config/prisma');
const { env } = require('../config/env');
const crypto = require('crypto');

const router = Router();

// POST /v1/webhooks/stripe - Stripe webhook (raw body from app.js middleware)
router.post('/stripe', async (req, res) => {
  try {
    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }
    const stripe = require('stripe')(env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = parseInt(session.metadata.orderId, 10);

      // Mark order and store orders as paid
      await prisma.orders.update({
        where: { orderid: orderId },
        data: { is_paid: true, paymentstatus: 1, stripe_payment_intent_id: session.payment_intent },
      });
      await prisma.store_orders.updateMany({
        where: { orderid: orderId },
        data: { is_paid: true, status: 'ORDER_PLACED' },
      });
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[stripe-webhook]', err.message);
    res.status(400).json({ error: err.message });
  }
});

// POST /v1/webhooks/bosta - Bosta shipment webhook
router.post('/bosta', async (req, res) => {
  try {
    // Verify webhook auth header if configured
    const authHeaderName = env.BOSTA_WEBHOOK_AUTH_HEADER_NAME;
    const authHeaderValue = env.BOSTA_WEBHOOK_AUTH_HEADER_VALUE;
    if (authHeaderName && authHeaderValue) {
      const received = req.headers[authHeaderName.toLowerCase()];
      if (received !== authHeaderValue) {
        return res.status(401).json({ error: 'Invalid webhook auth header' });
      }
    }

    const payload = req.body;
    const trackingNumber = payload.TrackingNumber || payload.trackingNumber;
    if (!trackingNumber) return res.status(400).json({ error: 'Missing tracking number' });

    const shipment = await prisma.shipment.findFirst({ where: { tracking_number: trackingNumber } });
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });

    // Dedup by payload hash
    const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const existing = await prisma.shipment_events.findFirst({
      where: { shipmentid: shipment.shipmentid, payload_hash: hash },
    });
    if (existing) return res.json({ received: true, duplicate: true });

    // Log event
    await prisma.shipment_events.create({
      data: {
        shipmentid: shipment.shipmentid,
        event_type: payload.CurrentStatus?.state || payload.eventType || 'unknown',
        payload_hash: hash,
        raw_payload: payload,
      },
    });

    // Update shipment status
    const statusText = payload.CurrentStatus?.state || 'UNKNOWN';
    await prisma.shipment.update({
      where: { shipmentid: shipment.shipmentid },
      data: { status_text: statusText },
    });

    res.json({ received: true });
  } catch (err) {
    console.error('[bosta-webhook]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
