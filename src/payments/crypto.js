import { escapers } from "@telegraf/entity";
import { formateAddress, generateAddress, ss58 } from "../merchant/crypto";
import { getCourse } from "../tools/utils";

export async function crypto(order) {
  const course = await getCourse(["polkadot", "kusama"]);
  const dot = parseFloat((Number(order.amount) / course.polkadot).toFixed(2));
  const ksm = parseFloat((Number(order.amount) / course.kusama).toFixed(2));
  const address = generateAddress(order.id);

  await order.update({
    meta: JSON.stringify({
      amountDot: dot,
      amountKsm: ksm,
      coursetime: Date.now()
    })
  });

  const messageText = `To pay for your order, simply transfer tokens to either network. Your order status will automatically switch to "paid," and we'll reach out to you for shipping details.`;
  const message = `${escapers.MarkdownV2(messageText)}

*Polkadot*
Address \`${formateAddress(address, ss58.robonomics)}\`
*${escapers.MarkdownV2(dot.toString())}* DOT

*Kusama*
Address \`${formateAddress(address, ss58.robonomics)}\`
*${escapers.MarkdownV2(ksm.toString())}* KSM`;
  return message;
}
