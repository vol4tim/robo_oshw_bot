import { escapers } from "@telegraf/entity";
import { config } from "../config";
import { getCourse } from "../utils";

export async function crypto(order) {
  const course = await getCourse(["polkadot", "kusama"]);
  const dot = parseFloat((Number(order.amount) / course.polkadot).toFixed(2));
  const ksm = parseFloat((Number(order.amount) / course.kusama).toFixed(2));

  const message = `To pay for the order, you need to transfer tokens to one of the networks

*Polkadot*
Address \`${config.wallets.polkadot}\`
*${escapers.MarkdownV2(dot.toString())}* DOT

*Kusama*
Address \`${config.wallets.kusama}\`
*${escapers.MarkdownV2(ksm.toString())}* KSM`;
  return message;
}
