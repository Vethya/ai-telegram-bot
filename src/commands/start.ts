import { Telegraf } from "telegraf";
import { isWhitelisted } from "../utils/checks";
import * as dotenv from "dotenv";

dotenv.config();

const AI_NAME = process.env.AI_NAME;

export default (bot: Telegraf) => {
  bot.command("start", async (ctx) => {
    const chatId = ctx.chat.id;
    const _isWhitelisted = await isWhitelisted(chatId);

    await ctx.reply(
      `Hello! I'm ${AI_NAME}!${
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
