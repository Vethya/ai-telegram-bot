import * as dotenv from "dotenv";

import { Telegraf } from "telegraf";
import { generateResponse } from "./ai-service";

dotenv.config();

// Environment variables
const BOT_TOKEN = process.env.BOT_TOKEN!;
const WHITELIST_GROUP_IDS = process.env.WHITELIST_GROUP_IDS!.split(",");

// Initialize bot
const bot = new Telegraf(BOT_TOKEN);

// Middleware to check whitelist
const isWhitelisted = (chatId: number | string): boolean => {
  return WHITELIST_GROUP_IDS.includes(chatId.toString());
};

// Bot handlers
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

bot.command("prompt", async (ctx) => {
  const chatId = ctx.chat.id;
  if (!isWhitelisted(chatId)) return;

  const prompt = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!prompt) {
    ctx.reply("Please provide a prompt! Usage: /prompt <your question>", {
      reply_parameters: { message_id: ctx.message.message_id },
    });
    return;
  }

  try {
    // Send initial message
    const initialMessage = await ctx.reply("Thinking...", {
      reply_parameters: { message_id: ctx.message.message_id },
    });
    const messageId = initialMessage.message_id;
    let buffer = "";
    let lastUpdateTime = Date.now();
    const UPDATE_INTERVAL = 3000; // 3 seconds

    // Stream plain text response
    for await (const chunk of generateResponse(prompt)) {
      buffer += chunk;

      const currentTime = Date.now();
      if (currentTime - lastUpdateTime >= UPDATE_INTERVAL) {
        await ctx.telegram
          .editMessageText(
            chatId,
            messageId,
            undefined,
            buffer || "Processing..." // No parse_mode, plain text
          )
          .catch((err) => {
            if (err.description.includes("message is not modified")) return;
            console.error("Edit error:", err);
            throw err;
          });
        lastUpdateTime = currentTime;
      }
    }

    await ctx.telegram.editMessageText(
      chatId,
      messageId,
      undefined,
      buffer || "Done!",
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    console.error("Error processing prompt:", error);
    await ctx.reply("Sorry, something went wrong. Please try again!", {
      reply_parameters: { message_id: ctx.message.message_id },
    });
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
});

// Launch bot
bot.launch().then(async () => {
  console.log("Bot started successfully");
});

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
