import bot from "../bot";
import Profile from "../models/profile";

export function start() {
  bot.start(async (ctx) => {
    const profile = await Profile.findOne({ where: { userId: ctx.from.id } });
    if (profile === null) {
      await Profile.create({
        userId: ctx.from.id,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name
      });
    }
    await ctx.reply("Welcome!");
    ctx.scene.enter("catalog");
  });
}
