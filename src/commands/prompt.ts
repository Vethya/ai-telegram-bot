import { Telegraf } from "telegraf";
import { isBlacklisted, isRateLimited, isWhitelisted } from "../utils/checks";
import { generateResponse } from "../ai-service";

export default (bot: Telegraf) => {
  bot.command(["prompt", "p"], async (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from?.id;

    if (!userId) return;

    if (isBlacklisted(userId)) {
      await ctx.reply("You are blacklisted and cannot use this bot!", {
        reply_parameters: { message_id: ctx.message.message_id },
      });
      return;
    }

    const _isWhitelisted = isWhitelisted(chatId);
    if (!_isWhitelisted) {
      await ctx.reply("Sorry, I can't respond here!", {
        reply_parameters: { message_id: ctx.message.message_id },
      });
      return;
    }

    if (isRateLimited(userId)) {
      return;
    }

    const prompt = ctx.message.text.split(" ").slice(1).join(" ").trim();
    if (!prompt) {
      ctx.reply(
        "Please provide a prompt! Usage: /prompt or /p <your question>",
        {
          reply_parameters: { message_id: ctx.message.message_id },
        }
      );
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
          strippedText || "Done!",
          { parse_mode: "Markdown" }
        );
      } catch (error: any) {
        if (error.description.includes("can't parse entities")) {
          await ctx.telegram.editMessageText(
            chatId,
            messageId,
            undefined,
            strippedText || "Done!"
          );
        }
        return;
      }
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
};
