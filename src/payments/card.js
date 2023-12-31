import Stripe from "stripe";
import { config } from "../config";
import { products } from "../products";

const stripe = Stripe(config.stripe);

export async function card(order) {
  const cart = JSON.parse(order.products);
  const line_items = [];
  for (const item of cart) {
    const product = products.find((i) => i.id === item.id);
    line_items.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: product.title,
          images: [product.image]
        },
        unit_amount: item.price * 100
      },
      quantity: item.count
    });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: line_items,
    mode: "payment",
    metadata: { order_id: order.id },
    success_url: config.bot.link,
    cancel_url: config.bot.link,
    automatic_tax: { enabled: true }
  });

  return `[Go to checkout](${session.url})`;
}
