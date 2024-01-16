import { escapers } from "@telegraf/entity";
import { Markup } from "telegraf";
import bot from "../bot";
import db from "../models/db";
import Order, { STATUS, STATUS_STRING } from "../models/order";
import Profile from "../models/profile";
import { products } from "../products";

export function myOrders() {
  bot.command("my_orders", async (ctx) => {
    const profile = await Profile.findOne({
      where: { userId: ctx.from.id.toString() }
    });
    const orders = await Order.findAll({
      where: {
        profileId: profile.id,
        status: { [db.Sequelize.Op.ne]: STATUS.CANCEL }
      }
    });
    if (orders.length) {
      for (const order of orders) {
        const cart = JSON.parse(order.products);
        const product = products.find((item) => item.id === cart[0].id);
        if (order.status === STATUS.NEW) {
          const message = `
*Your order \\#${order.id} total ${order.amount} $*
Status: ${STATUS_STRING[order.status]}
Payment: ${order.payment}
Product: ${escapers.MarkdownV2(product.title)} \\| ${
            cart[0].count
          } pcs \\| ${escapers.MarkdownV2(cart[0].price.toString())}$
`;
          const buttons = [];
          if (order.payment) {
            buttons.push(
              Markup.button.callback("Checkout", `checkout-${order.id}`)
            );
          }
          buttons.push(
            Markup.button.callback(
              "Сhange payment method",
              `change-payment-${order.id}`
            )
          );
          await ctx.replyWithMarkdownV2(
            message,
            Markup.inlineKeyboard(buttons)
          );
        } else {
          const message = `
*Your order \\#${order.id} totals ${order.amount} $*
Status: ${STATUS_STRING[order.status]}
Product: ${escapers.MarkdownV2(product.title)} \\| ${
            cart[0].count
          } pcs \\| ${escapers.MarkdownV2(cart[0].price.toString())}$
`;
          await ctx.replyWithMarkdownV2(message);
        }
      }
    } else {
      await ctx.reply("You have no orders");
    }
  });

  bot.action(/^checkout-(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const id = ctx.match[1];
    const order = await Order.findOne({ where: { id: id } });
    if (order) {
      if (order.status === STATUS.NEW) {
        ctx.checkout = id;
        await ctx.scene.enter("checkout");
        return;
      } else {
        await ctx.reply("Order has been paid");
      }
    } else {
      await ctx.reply("Order not found");
    }
  });
  bot.action(/^change-payment-(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const id = ctx.match[1];
    const order = await Order.findOne({ where: { id: id } });
    if (order) {
      if (order.status === STATUS.NEW) {
        ctx.payments = id;
        await ctx.scene.enter("payments");
        return;
      } else {
        await ctx.reply("Order has been paid");
      }
    } else {
      await ctx.reply("Order not found");
    }
  });
}
