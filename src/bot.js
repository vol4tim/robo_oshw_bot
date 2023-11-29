import { Telegraf } from "telegraf";
import { config } from "./config";

const options = {};
const bot = new Telegraf(config.bot.token, options);

export default bot;
