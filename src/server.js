import express from "express";
import Stripe from "stripe";
import bot from "./bot";
import { config } from "./config";
import Order, { STATUS } from "./models/order";
import Profile from "./models/profile";

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
          await Order.update(
            { status: STATUS.PAID, stripe_order_id: session.payment_intent },
            { where: { id: session.metadata.order_id } }
          );
          const profile = await Profile.findOne({
            where: { id: order.profileId }
          });
          const message = `Your order #${order.id} has been paid. \nManager will contact you shortly.`;
          await bot.telegram.sendMessage(profile.userId, message);
          console.log("checkout.session.completed", session.metadata.order_id);
        }
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
        console.log(event.data.object);
    }

    response.send();
  }
);

export { app };
