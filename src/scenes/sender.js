import { Composer, Markup, Scenes } from "telegraf";
import bot from "../bot";
import Order, { STATUS } from "../models/order";
import Profile from "../models/profile";

const stepHandler = new Composer();

stepHandler.action(/^status-([a-z]+)$/, async (ctx) => {
  if (ctx.scene.session.remove_message_id) {
    await ctx.deleteMessage(ctx.scene.session.remove_message_id);
    ctx.scene.session.remove_message_id = undefined;
  }

  const status = ctx.match[1].toUpperCase();

  if (!Object.keys(STATUS).includes(status)) {
    const message = await ctx.reply(
      "⚠️ Не верный статус заказа",
      Markup.inlineKeyboard([Markup.button.callback("❌ Отменить", "cancel")])
    );
    ctx.scene.session.remove_message_id = message.message_id;
    return;
  }

  const count = await Order.count({ where: { status: STATUS[status] } });
  if (count === 0) {
    const message = await ctx.reply(
      "⚠️ Заказов с таким статусом не найдено.",
      Markup.inlineKeyboard([Markup.button.callback("❌ Отменить", "cancel")])
    );
    ctx.scene.session.remove_message_id = message.message_id;
    return;
  }

  ctx.scene.session.status = status;

  await ctx.deleteMessage();
  ctx.scene.session.message_id = undefined;

  await ctx.reply(
    "Напишите сообщение для рассылки",
    Markup.inlineKeyboard([Markup.button.callback("❌ Отменить", "cancel")])
  );

  return ctx.wizard.next();
});

stepHandler.use(() => {
  return;
});

const senderWizard = new Scenes.WizardScene(
  "sender",
  async (ctx) => {
    const message = await ctx.replyWithMarkdownV2(
      "Рассылка сообщений по заказам: Выберите статус",
      Markup.inlineKeyboard([
        [
          Markup.button.callback("Новый", `status-new`),
          Markup.button.callback("Оплачен", `status-paid`)
        ],
        [
          Markup.button.callback("Готовится к отправке", `status-process`),
          Markup.button.callback("Доставляется", `status-deliver`)
        ],
        [
          Markup.button.callback("Готов", `status-ready`),
          Markup.button.callback("Отменен", `status-cancel`)
        ],
        [Markup.button.callback("❌ Отменить рассылку", `cancel`)]
      ]).resize()
    );
    ctx.scene.session.message_id = message.message_id;
    return ctx.wizard.next();
  },
  stepHandler,
  async (ctx) => {
    const message = ctx.message;
    const users = [];
    const orders = await Order.findAll({
      where: { status: STATUS[ctx.scene.session.status] }
    });
    if (orders.length) {
      for (const order of orders) {
        const profile = await Profile.findOne({
          where: { id: order.profileId }
        });
        if (!users.includes(profile.userId)) {
          users.push(profile.userId);
        }
      }
    }
    for (const user of users) {
      await ctx.telegram.sendMessage(user, message);
    }
    await ctx.reply("Done");
    return await ctx.scene.leave();
  }
);

senderWizard.action("cancel", async (ctx) => {
  await ctx.deleteMessage();
  if (ctx.scene.session.message_id) {
    try {
      await ctx.deleteMessage(ctx.scene.session.message_id);
    } catch (error) {
      console.log(error);
    }
  }
  await ctx.reply("Выход");
  return await ctx.scene.leave();
});

export { senderWizard };

export function sender() {
  bot.command("sender", async (ctx) => {
    await ctx.scene.enter("sender");
  });
}
