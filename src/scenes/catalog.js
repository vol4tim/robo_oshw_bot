import { escapers } from "@telegraf/entity";
import { Markup, Scenes } from "telegraf";
import bot from "../bot";
import { products } from "../products";

const catalogScene = new Scenes.BaseScene("catalog");
catalogScene.enter(async (ctx) => {
  for (const product of products) {
    const features = product.features
      .map((item) => {
        return `_${escapers.MarkdownV2(item)}_`;
      })
      .join(" \\| ");
    const message = `
*${product.title}*

${escapers.MarkdownV2(product.description)}

${features}

$_${product.price}_ per device

Worldwide free shipping
`;
    await ctx.replyWithPhoto(product.image, {
      caption: message,
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard([
        Markup.button.callback("Buy", `buy-${product.id}`)
      ])
    });
  }
});

export { catalogScene };

export function catalog() {
  bot.command("catalog", async (ctx) => {
    ctx.scene.enter("catalog");
  });

  bot.action(/^buy-(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const id = ctx.match[1];
    const product = products.find((item) => item.id === id);
    if (product) {
      if (!ctx.session) {
        ctx.session = {};
      }
      ctx.session.cart = {};
      ctx.session.order = {};
      ctx.session.cart.products = [{ id: id, count: 1, price: product.price }];
      await ctx.scene.enter("order");
    } else {
      await ctx.reply("Selected product not found");
    }
  });
}
