import { Markup, Scenes } from "telegraf";
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
    if (!ctx.message || !ctx.message.text || Number(ctx.message.text) <= 0) {
      await ctx.reply("Error. Count is incorrect");
      return;
    }
    const count = Number(ctx.message.text);
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
      "Worldwide free shipping. \n\nAfter payment, a manager will contact you to clarify your order."
    );
    await ctx.telegram.sendMessage("277354950", `Поступил новый заказ #${id}`);

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
