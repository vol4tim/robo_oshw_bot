import { SQLite } from "@telegraf/session/sqlite";
import { Scenes, session } from "telegraf";
import bot from "./bot";
import { PATH_SESSION_DB, config } from "./config";
import { start as startCrypto } from "./merchant/crypto";
import { app as startStripe } from "./merchant/stripe";
import db from "./models/db";
import { catalog, catalogScene } from "./scenes/catalog";
import { checkout, checkoutScene } from "./scenes/checkout";
import { myOrders } from "./scenes/myOrders";
import { orderWizard } from "./scenes/order";
import { orders } from "./scenes/orders";
import { paymentsScene } from "./scenes/payments";
import { sender, senderWizard } from "./scenes/sender";
import { start } from "./scenes/start";
import logger from "./tools/logger";

const runApp = () => {
  const store = SQLite({
    filename: PATH_SESSION_DB
  });
  bot.use(
    session({
      store,
      defaultSession: () => ({ cart: {}, order: {} })
    })
  );

  bot.use(async (ctx, next) => {
    if (ctx.chat.type === "group") {
      if (
        !config.adminsGroup ||
        ctx.message.chat.id !== config.adminsGroup ||
        !ctx.message.reply_to_message ||
        ctx.message.reply_to_message.from.id !== config.bot.id
      ) {
        return;
      }
    }

    if (ctx.message && ctx.message.entities) {
      if (
        ["/orders", "/sender"].includes(ctx.message.text) &&
        !config.admins.includes(ctx.from.id.toString())
      ) {
        return;
      }
    }

    await next();
  });

  bot.telegram.setMyCommands([
    {
      command: "catalog",
      description: "View products"
    },
    {
      command: "my_orders",
      description: "View my orders"
    }
  ]);

  const stage = new Scenes.Stage([
    catalogScene,
    orderWizard,
    paymentsScene,
    checkoutScene,
    senderWizard
  ]);

  bot.use(stage.middleware());

  start();
  catalog();
  myOrders();
  checkout();
  orders();
  sender();

  bot.on("message", async (ctx) => {
    if (!config.adminsGroup) {
      return;
    }
    if (
      ctx.message.chat.type === "group" &&
      ctx.message.chat.id === config.adminsGroup &&
      ctx.message.reply_to_message &&
      ctx.message.reply_to_message.from &&
      ctx.message.reply_to_message.forward_from &&
      ctx.message.reply_to_message.message_id &&
      ctx.message.reply_to_message.from.id === config.bot.id
    ) {
      await ctx.telegram.sendMessage(
        ctx.message.reply_to_message.forward_from.id,
        ctx.message.text,
        {
          reply_to_message_id: ctx.message.reply_to_message.message_id - 1
        }
      );
      return;
    } else if (
      ctx.message.chat.type === "group" &&
      ctx.message.chat.id === config.adminsGroup &&
      ctx.message.reply_to_message
    ) {
      logger.warn(JSON.stringify(ctx.message));
    }
    if (ctx.message.chat.type === "private") {
      ctx.forwardMessage(config.adminsGroup);
      return;
    }
  });

  bot.launch();
};

db.sequelize.sync().then(() => {
  runApp();
  startCrypto();
  startStripe.listen(4242, () => logger.info("Running on port 4242"));
});
