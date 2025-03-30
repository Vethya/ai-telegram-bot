import * as dotenv from "dotenv";

import { Telegraf } from "telegraf";

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN!;

const bot = new Telegraf(BOT_TOKEN);
let botId: number | undefined;

import("./commands/start").then(({ default: startCommand }) =>
  startCommand(bot)
);
import("./commands/prompt").then(({ default: promptCommand }) =>
  promptCommand(bot)
);
import("./commands/blacklist").then(({ default: blacklistCommand }) =>
  blacklistCommand(bot)
);

bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
});

bot.launch().then(async () => {
  console.log("Bot started successfully");

  const me = await bot.telegram.getMe();
  botId = me.id;
  console.log(`Bot ID: ${botId}`);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
