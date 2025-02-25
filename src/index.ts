import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { generateResponse } from "./ai-service";

// Environment variables
const BOT_TOKEN = process.env.BOT_TOKEN || "your-telegram-bot-token";
const WHITELIST_GROUP_IDS = process.env.WHITELIST_GROUP_IDS?.split(",") || [
  "your-group-id",
];

// Initialize bot
const bot = new Telegraf(BOT_TOKEN);

// Middleware to check whitelist
const isWhitelisted = (chatId: number | string): boolean => {
  return WHITELIST_GROUP_IDS.includes(chatId.toString());
};

// Bot handlers
bot.start((ctx) => {
  const chatId = ctx.chat.id;
  if (!isWhitelisted(chatId)) return;

  ctx.reply("Hello! I’m an AI bot powered by Gemini 2.0. Ask me anything!");
});

bot.help((ctx) => {
  const chatId = ctx.chat.id;
  if (!isWhitelisted(chatId)) return;

  ctx.reply("Just send me a message, and I’ll respond using Gemini 2.0 AI!");
});

bot.on(message("text"), async (ctx) => {
  const chatId = ctx.chat.id;
  if (!isWhitelisted(chatId)) return;

  const userMessage = ctx.message.text;

  try {
    ctx.replyWithChatAction("typing");
    const response = await generateResponse(userMessage);
    await ctx.reply(response);
  } catch (error) {
    console.error("Error processing message:", error);
    await ctx.reply("Sorry, something went wrong. Please try again!");
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
});

// Launch bot
bot.launch().then(() => {
  console.log("Bot started successfully");
});

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
