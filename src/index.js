import { Scenes, session } from "telegraf";
import bot from "./bot";
import db from "./models/db";
import { catalog, catalogScene } from "./scenes/catalog";
import { checkout, checkoutScene } from "./scenes/checkout";
import { myOrders } from "./scenes/myOrders";
import { orderWizard } from "./scenes/order";
import { orders } from "./scenes/orders";
import { paymentsScene } from "./scenes/payments";
import { start } from "./scenes/start";
import { app } from "./server";

const runApp = () => {
  bot.use(session());

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
    checkoutScene
  ]);

  bot.use(stage.middleware());

  start();
  catalog();
  myOrders();
  checkout();
  orders();

  bot.launch();
};

db.sequelize.sync().then(() => {
  runApp();
  app.listen(4242, () => console.log("Running on port 4242"));
});
