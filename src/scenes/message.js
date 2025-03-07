import { Markup, Scenes } from "telegraf";
import bot from "../bot";
import { config } from "../config";
import Profile from "../models/profile";
import logger from "../tools/logger";

const messageWizard = new Scenes.WizardScene(
  "message",
  async (ctx) => {
    if (!config.admins.includes(ctx.from.id.toString())) {
      return;
    }
    const message = await ctx.reply(
      `Укажите имя пользователя которому нужно написать сообщение.
Например: @username`,
      {
        // parse_mode: "MarkdownV2",
        ...Markup.inlineKeyboard([Markup.button.callback("Cancel", "cancel")])
      }
    );
    ctx.wizard.state.message = { message: message.message_id };
    return ctx.wizard.next();
  },
  async (ctx) => {
    try {
      const lastMessageID = ctx.wizard.state.message.message;
      bot.telegram.editMessageReplyMarkup(ctx.from.id, lastMessageID, {
        reply_markup: { remove_keyboard: true }
      });
    } catch (_) {
      console.log("not remove keyboard");
    }

    if (!ctx.message || !ctx.message.text) {
      const message = await ctx.reply(
        "Error. Message is incorrect",
        Markup.inlineKeyboard([Markup.button.callback("Cancel", "cancel")])
      );
      ctx.wizard.state.message = { message: message.message_id };
      return;
    }

    let toNickname = ctx.message.text;
    let toNicknameWithoutAt = toNickname.replace(/^@/, "");

    const user = await Profile.findOne({
      where: { username: toNicknameWithoutAt }
    });
    if (user === null) {
      const message = await ctx.reply(
        "Error. User not found",
        Markup.inlineKeyboard([Markup.button.callback("Cancel", "cancel")])
      );
      ctx.wizard.state.message = { message: message.message_id };
      return;
    }

    ctx.scene.session.toNickname = toNickname;
    ctx.scene.session.toChatId = user.userId;

    const message = await ctx.reply(
      `Напишите сообщение для \`${toNickname}\``,
      {
        parse_mode: "MarkdownV2",
        ...Markup.inlineKeyboard([Markup.button.callback("Cancel", "cancel")])
      }
    );
    ctx.wizard.state.message = { message: message.message_id };
    return ctx.wizard.next();
  },
  async (ctx) => {
    try {
      const lastMessageID = ctx.wizard.state.message.message;
      bot.telegram.editMessageReplyMarkup(ctx.from.id, lastMessageID, {
        reply_markup: { remove_keyboard: true }
      });
    } catch (_) {
      console.log("not remove keyboard");
    }

    if (!ctx.message || !ctx.message.text) {
      const message = await ctx.reply(
        "Error. Message is incorrect",
        Markup.inlineKeyboard([Markup.button.callback("Cancel", "cancel")])
      );
      ctx.wizard.state.message = { message: message.message_id };
      return;
    }

    try {
      await ctx.telegram.sendMessage(
        ctx.scene.session.toChatId,
        ctx.message.text
      );
      await ctx.reply("Сообщение отправлено.");
    } catch (error) {
      logger.error("Error: " + JSON.stringify(error));
      logger.warn(JSON.stringify(ctx.message));

      await ctx.reply("Ошибка. Что-то пошло не так.");
    }

    await ctx.scene.leave();
  }
);

messageWizard.action("cancel", async (ctx) => {
  await ctx.deleteMessage();
  return await ctx.scene.leave();
});

export { messageWizard };

export function message() {
  bot.command("message", async (ctx) => {
    await ctx.scene.enter("message");
  });
}
