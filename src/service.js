import {
  checkBalancesWallets,
  checkOrders,
  start,
  withdraw
} from "./merchant/crypto";
import db from "./models/db";
import logger from "./tools/logger";

const runApp = async () => {
  await start(true);
  await checkOrders();
  const balances = await checkBalancesWallets();
  await withdraw(balances);
  logger.info("service end");
  process.exit(0);
};

db.sequelize.sync().then(() => {
  runApp();
});
