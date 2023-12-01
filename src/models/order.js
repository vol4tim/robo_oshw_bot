import { amountCart } from "../utils";
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

export default Order;
