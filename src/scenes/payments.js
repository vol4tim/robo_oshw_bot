import { Markup, Scenes } from "telegraf";
import Order, { STATUS } from "../models/order";

const paymentsScene = new Scenes.BaseScene("payments");
paymentsScene.enter(async (ctx) => {
  const id = ctx.payments;
  const order = await Order.findOne({ where: { id: id } });
  if (order) {
    if (order.status === STATUS.NEW) {
      await ctx.reply(
        "For payment donate in DOT/KSM",
        // "Select Stripe for payment or donate in DOT/KSM",
        // `Select payment method for order #${id}`,
        Markup.inlineKeyboard([
          Markup.button.callback("Polkadot / Kusama", `pay-crypto-${id}`)
          // Markup.button.callback("Stripe", `pay-card-${id}`)
        ])
      );
    } else {
      await ctx.reply("Order has been paid");
    }
  } else {
    await ctx.reply("Order not found");
  }
  ctx.payments = null;
});
paymentsScene.on("message", async (ctx) => {
  const id = ctx.payments;
  if (id) {
    return await ctx.reply(
      "Select payment method",
      Markup.inlineKeyboard([
        Markup.button.callback("Polkadot / Kusama", `pay-crypto-${id}`),
        Markup.button.callback("Cancel", "cancel")
      ])
    );
  }
  return await ctx.reply(
    "Select payment method",
    Markup.inlineKeyboard([Markup.button.callback("Cancel", "cancel")])
  );
});
paymentsScene.action("cancel", async (ctx, next) => {
  await ctx.deleteMessage();
  await ctx.scene.leave();
  await next();
});
paymentsScene.action(/^pay-card-(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const id = ctx.match[1];
  await Order.update({ payment: "card" }, { where: { id: id } });
  paymentsScene.leave();
  ctx.checkout = id;
  ctx.scene.enter("checkout");
});
paymentsScene.action(/^pay-crypto-(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const id = ctx.match[1];
  await Order.update({ payment: "crypto" }, { where: { id: id } });
  paymentsScene.leave();
  ctx.checkout = id;
  ctx.scene.enter("checkout");
});

export { paymentsScene };
