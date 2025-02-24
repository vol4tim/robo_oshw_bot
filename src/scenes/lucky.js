import { signatureVerify, validateAddress } from "@polkadot/util-crypto";
import { escapers } from "@telegraf/entity";
import { ethers } from "ethers";
import { Composer, Markup, Scenes } from "telegraf";
import bot from "../bot";
import { config } from "../config";
import { checkBalanceXRT, start } from "../merchant/crypto";
import Lucky, { saveLucky } from "../models/lucky";
import Profile from "../models/profile";
import { checkBalanceXRT as checkBalanceEthXRT } from "../tools/eth";

const messageForSignature = "Altruist!";
const minxrt = 42;

const stepHandler = new Composer();

stepHandler.action("next", async (ctx) => {
  try {
    const lastMessageID = ctx.wizard.state.message.message;
    bot.telegram.editMessageReplyMarkup(ctx.from.id, lastMessageID, {
      reply_markup: { remove_keyboard: true }
    });
  } catch (_) {
    console.log("not remove keyboard");
  }
  const message = await ctx.reply(
    "Please provide the address of your account.",
    Markup.inlineKeyboard([Markup.button.callback("Cancel", "cancel")])
  );
  ctx.wizard.state.message = { message: message.message_id };
  return ctx.wizard.next();
});

stepHandler.use(() => {
  return;
});

const luckyWizard = new Scenes.WizardScene(
  "lucky",
  async (ctx) => {
    const user = await Profile.findOne({ where: { userId: ctx.from.id } });
    const lucky = await Lucky.findOne({
      where: {
        profileId: user.id
      }
    });
    if (lucky) {
      await ctx.reply("Your account is already participating in the giveaway.");
      await ctx.scene.leave();
      return;
    }

    const message = await ctx.reply(
      `To participate in the giveaway, you need to sign the message \`${messageForSignature}\` with a key that has a balance of more than ${minxrt} XRT\\.`,
      {
        parse_mode: "MarkdownV2",
        ...Markup.inlineKeyboard([
          Markup.button.callback("Next", "next"),
          Markup.button.callback("Cancel", "cancel")
        ])
      }
    );
    ctx.wizard.state.message = { message: message.message_id };
    return ctx.wizard.next();
  },
  stepHandler,
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

    let address = ctx.message.text;
    const typeAddress = address.startsWith("0x") ? "ethereum" : "polkadot";

    if (typeAddress === "polkadot") {
      try {
        validateAddress(address);
      } catch (error) {
        const message = await ctx.reply(
          `Error. ${error.message}`,
          Markup.inlineKeyboard([Markup.button.callback("Cancel", "cancel")])
        );
        ctx.wizard.state.message = { message: message.message_id };
        return;
      }
    } else {
      try {
        address = ethers.getAddress(address);
      } catch (error) {
        const message = await ctx.reply(
          `Error. ${error.message}`,
          Markup.inlineKeyboard([Markup.button.callback("Cancel", "cancel")])
        );
        ctx.wizard.state.message = { message: message.message_id };
        return;
      }
    }

    const lucky = await Lucky.findOne({
      where: {
        address: address
      }
    });
    if (lucky) {
      const message = await ctx.reply(
        "The specified address is already participating in the giveaway.",
        Markup.inlineKeyboard([Markup.button.callback("Cancel", "cancel")])
      );
      ctx.wizard.state.message = { message: message.message_id };
      return;
    }

    if (typeAddress === "polkadot") {
      await start("robonomics");
      if (!(await checkBalanceXRT(address))) {
        const message = await ctx.reply(
          `Error. Min balance is ${minxrt} XRT`,
          Markup.inlineKeyboard([Markup.button.callback("Cancel", "cancel")])
        );
        ctx.wizard.state.message = { message: message.message_id };
        return;
      }
    } else {
      if (!(await checkBalanceEthXRT(address))) {
        const message = await ctx.reply(
          `Error. Min balance is ${minxrt} XRT`,
          Markup.inlineKeyboard([Markup.button.callback("Cancel", "cancel")])
        );
        ctx.wizard.state.message = { message: message.message_id };
        return;
      }
    }

    ctx.scene.session.address = address;
    ctx.scene.session.typeAddress = typeAddress;
    const message = await ctx.reply(
      `Now, please provide the hash of the signed message \`${messageForSignature}\``,
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

    const signature = ctx.message.text;

    if (ctx.scene.session.typeAddress === "polkadot") {
      try {
        const { isValid } = signatureVerify(
          messageForSignature,
          signature,
          ctx.scene.session.address
        );

        if (!isValid) {
          const message = await ctx.reply(
            "Error. Signature is incorrect",
            Markup.inlineKeyboard([Markup.button.callback("Cancel", "cancel")])
          );
          ctx.wizard.state.message = { message: message.message_id };
          return;
        }
      } catch (_) {
        const message = await ctx.reply(
          "Error. Signature is incorrect",
          Markup.inlineKeyboard([Markup.button.callback("Cancel", "cancel")])
        );
        ctx.wizard.state.message = { message: message.message_id };
        return;
      }
    } else {
      const recoveredAddress = ethers.verifyMessage(
        messageForSignature,
        signature
      );
      if (recoveredAddress !== ctx.scene.session.address) {
        const message = await ctx.reply(
          "Error. Signature is incorrect",
          Markup.inlineKeyboard([Markup.button.callback("Cancel", "cancel")])
        );
        ctx.wizard.state.message = { message: message.message_id };
        return;
      }
    }

    await ctx.reply("You are now participating in the giveaway.");

    try {
      await saveLucky(ctx.from.id, ctx.scene.session.address, signature);
    } catch (error) {
      console.log(error);
    }

    const user = await Profile.findOne({ where: { userId: ctx.from.id } });
    const message = `*New user joined the lucky draw*
*Tg*: @${escapers.MarkdownV2(user.username.toString())}
*Address*: ${escapers.MarkdownV2(ctx.scene.session.address)}
*Signature*: ${escapers.MarkdownV2(signature)}
`;
    for (const admin of config.admins) {
      await ctx.telegram.sendMessage(admin, message, {
        parse_mode: "MarkdownV2"
      });
    }

    await ctx.scene.leave();
  }
);

luckyWizard.action("cancel", async (ctx) => {
  await ctx.deleteMessage();
  return await ctx.scene.leave();
});

export { luckyWizard };

export function lucky() {
  bot.command("lucky", async (ctx) => {
    await ctx.scene.enter("lucky");
  });
}
