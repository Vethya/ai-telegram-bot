import { Telegraf } from "telegraf";
import { isWhitelisted } from "../utils/checks";

export default (bot: Telegraf) => {
  bot.command("start", async (ctx) => {
    const chatId = ctx.chat.id;
    const _isWhitelisted = isWhitelisted(chatId);

    await ctx.reply(
      `Hello! I'm Vethya AI!${
        _isWhitelisted
          ? ""
          : " This chat doesn't seem to be whitelisted. I can't respond here, sorry."
      }`,
      {
        reply_parameters: { message_id: ctx.message.message_id },
      }
    );
  });
};
