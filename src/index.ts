import * as dotenv from "dotenv";

import { Telegraf } from "telegraf";
import { generateResponse } from "./ai-service";
import { isAdmin, isBlacklisted, isRateLimited } from "./utils/checks";
import { BLACKLIST, saveBlacklist } from "./utils/blacklist";

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN!;
const WHITELIST_GROUP_IDS = process.env.WHITELIST_GROUP_IDS!.split(",");

const bot = new Telegraf(BOT_TOKEN);
let botId: number | undefined;

const isWhitelisted = (chatId: number | string): boolean => {
  return WHITELIST_GROUP_IDS.includes(chatId.toString());
};

bot.command("start", async (ctx) => {
  const chatId = ctx.chat.id;
  const _isWhitelisted = isWhitelisted(chatId);

  const userId = ctx.from?.id;
  if (userId && isRateLimited(userId)) {
    return;
  }

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

bot.command("blacklist", async (ctx) => {
  const userId = ctx.from?.id;

  if (!userId || !isAdmin(userId)) {
    await ctx.reply("Only admins can use this command.", {
      reply_parameters: { message_id: ctx.message.message_id },
    });
    return;
  }

  let targetId: number | undefined;

  if (ctx.message.reply_to_message) {
    targetId = ctx.message.reply_to_message.from?.id;
  }

  if (!targetId) {
    const args = ctx.message.text.split(" ").slice(1);
    if (args.length > 0 && /^\d+$/.test(args[0])) {
      targetId = parseInt(args[0], 10);
    }
  }

  if (!targetId) {
    await ctx.reply(
      "Please reply to a user's message or provide their ID (e.g., /blacklist 123456789).",
      {
        reply_parameters: { message_id: ctx.message.message_id },
      }
    );
    return;
  }

  if (isAdmin(targetId)) {
    await ctx.reply("You can't blacklist an admin.", {
      reply_parameters: { message_id: ctx.message.message_id },
    });
    return;
  }

  BLACKLIST.add(targetId.toString());
  await saveBlacklist();
  await ctx.reply(`User ${targetId} has been blacklisted.`, {
    reply_parameters: { message_id: ctx.message.message_id },
  });
});

bot.command("unblacklist", async (ctx) => {
  const userId = ctx.from?.id;

  if (!userId || !isAdmin(userId)) {
    await ctx.reply("Only admins can use this command.", {
      reply_parameters: { message_id: ctx.message.message_id },
    });
    return;
  }

  let targetId: number | undefined;

  if (ctx.message.reply_to_message) {
    targetId = ctx.message.reply_to_message.from?.id;
  }

  if (!targetId) {
    const args = ctx.message.text.split(" ").slice(1);
    if (args.length > 0 && /^\d+$/.test(args[0])) {
      targetId = parseInt(args[0], 10);
    }
  }

  if (!targetId) {
    await ctx.reply(
      "Please reply to a user's message or provide their ID (e.g., /unblacklist 123456789).",
      {
        reply_parameters: { message_id: ctx.message.message_id },
      }
    );
    return;
  }

  if (!BLACKLIST.has(targetId.toString())) {
    await ctx.reply("This user is not blacklisted.", {
      reply_parameters: { message_id: ctx.message.message_id },
    });
    return;
  }

  BLACKLIST.delete(targetId.toString());
  await saveBlacklist();
  await ctx.reply(`User ${targetId} has been removed from the blacklist.`, {
    reply_parameters: { message_id: ctx.message.message_id },
  });
});

bot.command(["prompt", "p"], async (ctx) => {
  const chatId = ctx.chat.id;
  const userId = ctx.from?.id;

  if (!userId || userId === botId) return;

  if (isBlacklisted(userId)) {
    await ctx.reply("You are blacklisted and cannot use this bot.", {
      reply_parameters: { message_id: ctx.message.message_id },
    });
    return;
  }

  const _isWhitelisted = isWhitelisted(chatId);
  if (!_isWhitelisted) {
    await ctx.reply("Sorry, I can't respond here.", {
      reply_parameters: { message_id: ctx.message.message_id },
    });
    return;
  }

  if (userId && isRateLimited(userId)) {
    return;
  }

  const prompt = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!prompt) {
    ctx.reply("Please provide a prompt! Usage: /prompt or /p <your question>", {
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
    try {
      await ctx.telegram.editMessageText(
        chatId,
        messageId,
        undefined,
        strippedText || "Done.",
        { parse_mode: "Markdown" }
      );
    } catch (error: any) {
      if (error.description.includes("can't parse entities")) {
        await ctx.telegram.editMessageText(
          chatId,
          messageId,
          undefined,
          strippedText || "Done."
        );
      }
      return;
    }
  } catch (error) {
    console.error("Error processing prompt:", error);
    await ctx.reply("Sorry, something went wrong. Please try again.", {
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

  const me = await bot.telegram.getMe();
  botId = me.id;
  console.log(`Bot ID: ${botId}`);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
