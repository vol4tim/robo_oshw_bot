import { Markup, Scenes } from "telegraf";
import { config } from "../config";
import { saveOrder } from "../models/order";
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
      await ctx.reply("Error. Count is incorrect");
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

    const id = await saveOrder(ctx.from.id, ctx.session);
    ctx.session.cart = {};
    ctx.session.order = {};

    await ctx.reply(
      "Worldwide free shipping. \n\nAfter payment, a manager will contact you to clarify your order. \n\nGreat news! We offer worldwide free shipping. The next shipping date is on the 15th of December. The estimated time for worldwide delivery is between 15 to 30 days. Once you make the payment, one of our engineers will reach out to you regarding the details of your order."
    );
    for (const admin of config.admins) {
      await ctx.telegram.sendMessage(admin, `Поступил новый заказ #${id}`);
    }

    await ctx.scene.leave();
    ctx.payments = id;
    await ctx.scene.enter("payments");
    return;
  }
);

orderWizard.command("skip", async (ctx) => {
  return ctx.wizard.next();
});
orderWizard.command("cancel", async (ctx) => {
  return await ctx.scene.leave();
});

export { orderWizard };
