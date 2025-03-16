import { Telegraf } from "telegraf";
import { isBlacklisted, isRateLimited, isWhitelisted } from "../utils/checks";
import { generateResponse } from "../ai-service";

const messageReplyMap = new Map<number, number>();

import { Context } from "telegraf";

export default (bot: Telegraf) => {
  const handlePrompt = async (ctx: Context, isEdited: boolean = false) => {
    const chatId = ctx.chat!.id;
    const userId = ctx.from?.id;
    const messageId = isEdited
      ? ctx.editedMessage!.message_id
      : ctx.message!.message_id;

    if (!userId) return;

    if (isBlacklisted(userId)) {
      await ctx.reply("You are blacklisted and cannot use this bot!", {
        reply_parameters: { message_id: messageId },
      });
      return;
    }

    const _isWhitelisted = isWhitelisted(chatId);
    if (!_isWhitelisted) {
      await ctx.reply("Sorry, I can't respond here!", {
        reply_parameters: { message_id: messageId },
      });
      return;
    }

    if (isRateLimited(userId)) {
      return;
    }

    // Safely access the message text
    const message = isEdited ? ctx.editedMessage : ctx.message;
    if (!("text" in message!)) {
      await ctx.reply("This command only works with text messages.", {
        reply_parameters: { message_id: messageId },
      });
      return;
    }

    const text = message.text;
    const prompt = text.split(" ").slice(1).join(" ").trim();
    if (!prompt) {
      await ctx.reply(
        "Please provide a prompt! Usage: /prompt or /p <your question>",
        {
          reply_parameters: { message_id: messageId },
        }
      );
      return;
    }

    try {
      let botReplyMessageId: number;
      if (isEdited && messageReplyMap.has(messageId)) {
        botReplyMessageId = messageReplyMap.get(messageId)!;
        await ctx.telegram.editMessageText(
          chatId,
          botReplyMessageId,
          undefined,
          "Regenerating response..."
        );
      } else {
        const initialMessage = await ctx.reply("Thinking...", {
          reply_parameters: { message_id: messageId },
        });
        botReplyMessageId = initialMessage.message_id;
        messageReplyMap.set(messageId, botReplyMessageId);
      }

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
              botReplyMessageId,
              undefined,
              buffer || "Processing..."
            )
            .catch((err: { description: string }) => {
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
          botReplyMessageId,
          undefined,
          strippedText || "Done!",
          { parse_mode: "Markdown" }
        );
      } catch (error: any) {
        if (error.description.includes("can't parse entities")) {
          await ctx.telegram.editMessageText(
            chatId,
            botReplyMessageId,
            undefined,
            strippedText || "Done!"
          );
        }
        return;
      }
    } catch (error) {
      console.error("Error processing prompt:", error);
      await ctx.reply("Sorry, something went wrong. Please try again!", {
        reply_parameters: { message_id: messageId },
      });
    }
  };

  bot.command(["prompt", "p"], async (ctx) => {
    await handlePrompt(ctx);
  });

  // Handle edited messages
  bot.on("edited_message", async (ctx) => {
    if (!ctx.editedMessage) return;

    if (!("text" in ctx.editedMessage)) return; // Ignore non-text messages

    const editedText = ctx.editedMessage.text;
    const commandMatch = editedText.match(/^\/(prompt|p)(?:\s|$)/);
    if (!commandMatch) return;

    await handlePrompt(ctx, true);
  });

  function stripMarkdown(text: string): string {
    text = text.replace(/^(\s*)\*\s+/gm, "$1- ");
    text = text.replace(/\*(.+?)\*/g, "$1");
    return text.trim();
  }
};
