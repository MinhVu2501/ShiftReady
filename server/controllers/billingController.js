import "dotenv/config";
import Stripe from "stripe";
import { query } from "../db/client.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

export const createCheckout = async (req, res, next) => {
  try {
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return res.status(500).json({ message: "Stripe price not configured" });
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL}/dashboard?checkout=success`
        : "http://localhost:5173/dashboard?checkout=success",
      cancel_url: process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL}/pricing?checkout=cancel`
        : "http://localhost:5173/pricing?checkout=cancel",
      metadata: {
        userId: req.user.id,
      },
    });
    return res.json({ checkoutUrl: session.url });
  } catch (err) {
    return next(err);
  }
};

export const handleWebhook = async (req, res, next) => {
  try {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      return res.status(400).json({ message: `Webhook signature verification failed: ${err.message}` });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      if (userId) {
        await query(
          "UPDATE entitlements SET plan='paid', status='active', updated_at=NOW() WHERE user_id=$1",
          [userId]
        );
      }
    }

    res.json({ received: true });
  } catch (err) {
    return next(err);
  }
};

