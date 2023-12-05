import express from "express";
import Stripe from "stripe";
import { config } from "../config";
import Order, { paid } from "../models/order";
import logger from "../tools/logger";

const stripe = Stripe(config.stripe);

const app = express();

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async function (request, response) {
    const sig = request.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        request.body,
        sig,
        config.stripe_endpointSecret
      );
    } catch (err) {
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const order = await Order.findOne({
          where: { id: session.metadata.order_id }
        });
        if (order) {
          await paid(session.metadata.order_id, session.payment_intent);
          logger.info(
            `checkout.session.completed, ${session.metadata.order_id}`
          );
        }
        break;
      }
      default:
        logger.info(`Unhandled event type ${event.type}`);
        logger.info(event.data.object);
    }

    response.send();
  }
);

export { app };
