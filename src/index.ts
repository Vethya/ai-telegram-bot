import * as dotenv from "dotenv";

import { Telegraf } from "telegraf";
import { generateResponse } from "./ai-service";

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN!;
const WHITELIST_GROUP_IDS = process.env.WHITELIST_GROUP_IDS!.split(",");

const bot = new Telegraf(BOT_TOKEN);

const isWhitelisted = (chatId: number | string): boolean => {
  return WHITELIST_GROUP_IDS.includes(chatId.toString());
};

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
  const _isWhitelisted = isWhitelisted(chatId);

  if (!_isWhitelisted) {
    await ctx.reply("Sorry, I can't respond here!", {
      reply_parameters: { message_id: ctx.message.message_id },
    });
    return;
  }

  const prompt = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!prompt) {
    ctx.reply("Please provide a prompt! Usage: /prompt <your question>", {
      reply_parameters: { message_id: ctx.message.message_id },
    });
    return;
  }

  try {
    const initialMessage = await ctx.reply("Thinking...", {
      reply_parameters: { message_id: ctx.message.message_id },
    });
    const messageId = initialMessage.message_id;
    let buffer = "";
    let lastUpdateTime = Date.now();
    const UPDATE_INTERVAL = 3000;

    for await (const chunk of generateResponse(prompt)) {
      buffer += chunk;

      const currentTime = Date.now();
      if (currentTime - lastUpdateTime >= UPDATE_INTERVAL) {
        await ctx.telegram
          .editMessageText(
            chatId,
            messageId,
            undefined,
            buffer || "Processing..."
          )
          .catch((err) => {
            if (err.description.includes("message is not modified")) return;
            console.error("Edit error:", err);
            throw err;
          });
        lastUpdateTime = currentTime;
      }
    }

    const strippedText = stripMarkdown(buffer);
    await ctx.telegram.editMessageText(
      chatId,
      messageId,
      undefined,
      strippedText || "Done!",
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    console.error("Error processing prompt:", error);
    await ctx.reply("Sorry, something went wrong. Please try again!", {
      reply_parameters: { message_id: ctx.message.message_id },
    });
  }
});

function stripMarkdown(text: string): string {
  text = text.replace(/^(\s*)\*\s+/gm, "$1- ");
  text = text.replace(/\*(.+?)\*/g, "$1");

  return text.trim();
}

bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
});

bot.launch().then(async () => {
  console.log("Bot started successfully");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
