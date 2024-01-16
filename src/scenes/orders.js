import { escapers } from "@telegraf/entity";
import { Markup } from "telegraf";
import bot from "../bot";
import Order, { STATUS, STATUS_STRING, paid } from "../models/order";
import Profile from "../models/profile";
import { products } from "../products";
import { amountCart } from "../tools/utils";

export function orders() {
  bot.command("orders", async (ctx) => {
    await ctx.replyWithMarkdownV2(
      "Фильтр заказов: Выберите статус",
      Markup.inlineKeyboard([
        Markup.button.callback("Новый", `status-new`),
        Markup.button.callback("Оплачен", `status-paid`),
        Markup.button.callback("Готовится к отправке", `status-process`),
        Markup.button.callback("Доставляется", `status-deliver`),
        Markup.button.callback("Готов", `status-ready`),
        Markup.button.callback("Отменен", `status-cancel`)
      ])
    );
  });

  bot.action(/^status-([a-z]+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const status = ctx.match[1].toUpperCase();

    if (!Object.keys(STATUS).includes(status)) {
      await ctx.reply("Не верный статус заказа");
      return;
    }

    const orders = await Order.findAll({ where: { status: STATUS[status] } });
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
    Comment: ${
      order.comment ? escapers.MarkdownV2(order.comment.toString()) : ""
    }
    Status: ${STATUS_STRING[order.status]}
    Payment: ${order.payment}
    Product: ${escapers.MarkdownV2(product.title)} \\| ${
      cart[0].count
    } pcs \\| ${escapers.MarkdownV2(cart[0].price.toString())}$
    `;
        await ctx.replyWithMarkdownV2(
          message,
          Markup.inlineKeyboard([
            Markup.button.callback("Оплачен", `status-paid-${order.id}`),
            Markup.button.callback(
              "Готовится к отправке",
              `status-process-${order.id}`
            ),
            Markup.button.callback(
              "Доставляется",
              `status-deliver-${order.id}`
            ),
            Markup.button.callback("Готов", `status-ready-${order.id}`),
            Markup.button.callback("Отменить", `status-cancel-${order.id}`)
          ])
        );
      }
    } else {
      await ctx.reply("No orders");
    }
  });

  bot.action(/^status-([a-z]+)-(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const status = ctx.match[1].toUpperCase();
    const id = ctx.match[2];
    if (!Object.keys(STATUS).includes(status)) {
      await ctx.reply("Не верный статус заказа");
      return;
    }
    const order = await Order.findOne({ where: { id: id } });
    if (order) {
      if (status === "PAID") {
        await paid(id);
      } else {
        await Order.update({ status: STATUS[status] }, { where: { id: id } });
        await ctx.reply("Статус заказа изменен");
      }
    } else {
      await ctx.reply("Order not found");
    }
  });
}
