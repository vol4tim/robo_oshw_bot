import { Scenes } from "telegraf";
import bot from "../bot";
import Order, { STATUS } from "../models/order";
import { card } from "../payments/card";
import { crypto } from "../payments/crypto";

const checkoutScene = new Scenes.BaseScene("checkout");
checkoutScene.enter(async (ctx) => {
  const id = ctx.checkout;
  const order = await Order.findOne({ where: { id: id } });
  if (order) {
    if (order.status === STATUS.NEW) {
      let msg;
      if (order.payment === "crypto") {
        msg = await crypto(order);
      } else {
        msg = await card(order);
      }
      await ctx.replyWithMarkdownV2(msg);
    } else {
      await ctx.reply("Order has been paid");
    }
  } else {
    await ctx.reply("Order not found");
  }
  ctx.checkout = null;
  checkoutScene.leave();
});

export { checkoutScene };

export function checkout() {
  bot.command("checkout", async (ctx) => {
    ctx.checkout = 2;
    ctx.scene.enter("checkout");
  });
}
