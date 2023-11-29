import axios from "axios";
import fs from "fs";
import { config } from "./config";
import { products } from "./products";

export function amountCart(cart) {
  return cart.reduce((amount, id) => {
    const product = products.find((item) => item.id === id.id);
    return amount + product.price * id.count;
  }, 0);
}

export function validateEmail(email) {
  return email.match(
    /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  );
}

export async function getCourse(
  tokens = ["kusama", "polkadot"],
  currency = "usd"
) {
  const file = __dirname + "/../files/courses";
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file));
    if (data.time > Date.now()) {
      return data.data;
    }
  }
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&ids=${tokens.join(
    ","
  )}&order=market_cap_desc&per_page=100&page=1&sparkline=false&locale=en&x_cg_api_key=${
    config.coingecko
  }`;
  const data = await axios.get(url);
  const result = {};
  for (const token of tokens) {
    result[token] = 0;
  }
  for (const token of data.data) {
    result[token.id] = Number(token.current_price);
  }
  fs.writeFileSync(
    __dirname + "/../files/courses",
    JSON.stringify({ time: Date.now() + 60 * 1000, data: result })
  );
  return result;
}
