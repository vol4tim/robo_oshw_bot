import { escapers } from "@telegraf/entity";
import bot from "../bot";
import { config } from "../config";
import Order, { STATUS_STRING } from "../models/order";
import Profile from "../models/profile";
import { products } from "../products";
import { amountCart } from "../utils";

export function orders() {
  bot.command("orders", async (ctx) => {
    if (!config.admins.includes(ctx.from.id.toString())) {
      return;
    }
    const orders = await Order.findAll();
    if (orders.length) {
      for (const order of orders) {
        const cart = JSON.parse(order.products);
        const product = products.find((item) => item.id === cart[0].id);
        const user = await Profile.findOne({ where: { id: order.profileId } });
        // Name: ${escapers.MarkdownV2(order.fio.toString())}
        // Email: ${escapers.MarkdownV2(order.email.toString())}
        // Phone: ${escapers.MarkdownV2(order.phone.toString())}
        // Address: ${escapers.MarkdownV2(order.address.toString())}
        const message = `
*Order \\#${order.id} total ${amountCart(cart)} $*
Tg: @${escapers.MarkdownV2(user.username.toString())}
Comment: ${order.comment ? escapers.MarkdownV2(order.comment.toString()) : ""}
Status: ${STATUS_STRING[order.status]}
Payment: ${order.payment}
Product: ${escapers.MarkdownV2(product.title)} \\| ${
          cart[0].count
        } pcs \\| ${escapers.MarkdownV2(cart[0].price.toString())}$
`;
        await ctx.replyWithMarkdownV2(message);
      }
    } else {
      await ctx.reply("No orders");
    }
  });
}
