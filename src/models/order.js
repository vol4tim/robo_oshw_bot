import { escapers } from "@telegraf/entity";
import bot from "../bot";
import { config } from "../config";
import { products } from "../products";
import logger from "../tools/logger";
import { amountCart } from "../tools/utils";
import db from "./db";
import Profile from "./profile";

const Order = db.sequelize.define("order", {
  profileId: {
    type: db.Sequelize.INTEGER
  },
  fio: {
    type: db.Sequelize.STRING
  },
  email: {
    type: db.Sequelize.STRING
  },
  phone: {
    type: db.Sequelize.STRING
  },
  address: {
    type: db.Sequelize.STRING
  },
  comment: {
    type: db.Sequelize.STRING
  },
  payment: {
    type: db.Sequelize.STRING
  },
  products: {
    type: db.Sequelize.STRING
  },
  amount: {
    type: db.Sequelize.NUMBER
  },
  status: {
    type: db.Sequelize.INTEGER
  },
  stripe_order_id: {
    type: db.Sequelize.STRING
  },
  meta: {
    type: db.Sequelize.STRING
  }
});

export const STATUS = {
  NEW: 1,
  PAID: 2,
  PROCESS: 3,
  DELIVER: 4,
  READY: 5,
  CANCEL: 6
};
export const STATUS_STRING = {
  1: "Not paid",
  2: "Paid",
  3: "Getting ready to ship",
  4: "Delivered",
  5: "Ready",
  6: "Cancel"
};

export async function saveOrder(userId, data) {
  const profile = await Profile.findOne({ where: { userId: userId } });
  const order = await Order.create({
    profileId: profile.id,
    fio: data.order.fio,
    email: data.order.email,
    phone: data.order.phone,
    address: data.order.address,
    comment: data.order.comment,
    payment: data.order.payment,
    products: JSON.stringify(data.cart.products),
    amount: amountCart(data.cart.products),
    status: STATUS.NEW
  });
  return order.id;
}

export async function paid(order_id, payment_intent = "") {
  await Order.update(
    { status: STATUS.PAID, stripe_order_id: payment_intent },
    { where: { id: order_id } }
  );
  const order = await Order.findOne({
    where: { id: order_id }
  });
  const profile = await Profile.findOne({
    where: { id: order.profileId }
  });
  const message = `Your order #${order.id} has been paid. \nManager will contact you shortly.`;
  await bot.telegram.sendMessage(profile.userId, message);

  const cart = JSON.parse(order.products);
  const product = products.find((item) => item.id === cart[0].id);
  let payment = order.payment;
  if (order.payment === "crypto") {
    try {
      const meta = JSON.parse(order.meta);
      payment = `${order.payment} \\| ${meta.address} \\| ${
        meta.chain === "polkadot"
          ? meta.amountDot + " DOT"
          : meta.amountKsm + " KSM"
      }`;
    } catch (error) {
      logger.warn(`not meta ${order.id}`);
    }
  }
  const messageAdmin = `
*Оплачен заказ \\#${order.id} на сумму ${order.amount} $*
Tg: @${escapers.MarkdownV2(profile.username.toString())}
Комментарий: ${
    order.comment ? escapers.MarkdownV2(order.comment.toString()) : ""
  }
Способ оплаты: ${payment}
Товар: ${escapers.MarkdownV2(product.title)} \\| ${
    cart[0].count
  } pcs \\| ${escapers.MarkdownV2(cart[0].price.toString())}$
`;
  for (const admin of config.admins) {
    await bot.telegram.sendMessage(admin, messageAdmin, {
      parse_mode: "MarkdownV2"
    });
  }
}

export default Order;
