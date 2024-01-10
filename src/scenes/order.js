import { escapers } from "@telegraf/entity";
import { Markup, Scenes } from "telegraf";
import { config } from "../config";
import Order, { saveOrder } from "../models/order";
import Profile from "../models/profile";
import { products } from "../products";

const orderWizard = new Scenes.WizardScene(
  "order",
  async (ctx) => {
    const product = products.find(
      (item) => item.id === ctx.session.cart.products[0].id
    );
    await ctx.reply(`Order "${product.title}"`);
    await ctx.reply("Please enter quantity you would like to order");
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (
      !ctx.message ||
      !ctx.message.text ||
      parseInt(ctx.message.text) <= 0 ||
      isNaN(parseInt(ctx.message.text))
    ) {
      await ctx.reply(
        "Error. Count is incorrect",
        Markup.inlineKeyboard([Markup.button.callback("Cancel", "cancel")])
      );
      return;
    }
    const count = parseInt(ctx.message.text);
    if (count > 3) {
      await ctx.reply("Maximum quantity available 3 pcs");
      return;
    }
    ctx.session.cart.products[0].count = count;
    await ctx.reply(
      "Please your comment to order",
      Markup.inlineKeyboard([Markup.button.callback("Skip", "skip")])
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.session.order.comment = "";
    if (ctx.message && ctx.message.text) {
      ctx.session.order.comment = ctx.message.text;
    }

    const id = await saveOrder(ctx.from.id.toString(), ctx.session);
    ctx.session.cart = {};
    ctx.session.order = {};

    const order = await Order.findOne({ where: { id } });
    const cart = JSON.parse(order.products);
    const product = products.find((item) => item.id === cart[0].id);

    await ctx.reply(`
Hello Robo friend!

Thank you for placing an order on Robonomics devices (https://robonomics.network/devices/). After your payment, one of our engineers will contact you regarding the details of shippment. We aim to dispatch your order within several working days after receiving the payment. If you have any questions, feel free to reach out to me 🙂

ORDER DETAILS

Items:
* ${escapers.MarkdownV2(product.title)}: ${
      cart[0].count
    } pc = ${escapers.MarkdownV2(cart[0].price.toString())}$

Shipping:
Free worldwide shipping

Order Status: Waiting for payment.
    `);

    const user = await Profile.findOne({ where: { id: order.profileId } });
    const message = `
*Поступил новый заказ \\#${id} на сумму ${order.amount} $*
Tg: @${escapers.MarkdownV2(user.username.toString())}
Комментарий: ${
      order.comment ? escapers.MarkdownV2(order.comment.toString()) : ""
    }
Товар: ${escapers.MarkdownV2(product.title)} \\| ${
      cart[0].count
    } pcs \\| ${escapers.MarkdownV2(cart[0].price.toString())}$
`;
    for (const admin of config.admins) {
      await ctx.telegram.sendMessage(admin, message, {
        parse_mode: "MarkdownV2"
      });
    }

    await ctx.scene.leave();
    ctx.payments = id;
    await ctx.scene.enter("payments");
    return;
  }
);

orderWizard.action("skip", async (ctx, next) => {
  await next();
});
orderWizard.action("cancel", async (ctx) => {
  await ctx.deleteMessage();
  return await ctx.scene.leave();
});

export { orderWizard };
