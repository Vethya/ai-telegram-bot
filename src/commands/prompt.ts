import { Telegraf, Context } from "telegraf";
import { isBlacklisted, isRateLimited, isWhitelisted } from "../utils/checks";
import { generateResponse } from "../ai-service";
import { Message } from "telegraf/types";

// Map to store user message ID to bot reply message ID
const messageReplyMap = new Map<number, number>();

// Map to store the reply chain (messageId -> { text, botResponse, parentId })
const replyChainMap = new Map<
  number,
  { text: string; botResponse?: string; parentId?: number }
>();

// Maximum chain length
const MAX_CHAIN_LENGTH = 10;

export default (bot: Telegraf<Context>) => {
  // Helper function to check if a message has reply_to_message and is a text message
  const isTextMessageWithReply = (
    message: Message
  ): message is Message.TextMessage => {
    return "text" in message && "reply_to_message" in message;
  };

  // Core logic for handling a prompt (used for both initial, edited, and reply messages)
  const handlePrompt = async (
    ctx: Context,
    isEdited: boolean = false,
    isReplyWithoutCommand: boolean = false
  ) => {
    const chatId = ctx.chat!.id;
    const userId = ctx.from?.id;
    const messageId = isEdited
      ? ctx.editedMessage!.message_id
      : ctx.message!.message_id;
    const message = isEdited ? ctx.editedMessage : ctx.message;

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
    if (!("text" in message!)) {
      await ctx.reply("This command only works with text messages.", {
        reply_parameters: { message_id: messageId },
      });
      return;
    }

    const text = message.text;
    let prompt = isReplyWithoutCommand
      ? text
      : text.split(" ").slice(1).join(" ").trim();

    // If this is a command and no prompt is provided, show usage
    if (!isReplyWithoutCommand && !prompt) {
      await ctx.reply(
        "Please provide a prompt! Usage: /prompt or /p <your question>",
        {
          reply_parameters: { message_id: messageId },
        }
      );
      return;
    }

    // Gather context from the reply chain if replying to a bot message
    let context = "";
    let chainLength = 0;
    let replyToMessage: Message.TextMessage | undefined;
    let userMessageId: number | undefined;
    if (isTextMessageWithReply(message) && message.reply_to_message) {
      if ("text" in message.reply_to_message) {
        replyToMessage = message.reply_to_message;

        // Check if the replied-to message is a bot message (part of a reply chain)
        for (const [key, value] of messageReplyMap.entries()) {
          if (value === replyToMessage.message_id) {
            userMessageId = key;
            break;
          }
        }

        if (userMessageId && replyChainMap.has(userMessageId)) {
          // Replied to a bot message, so include the full reply chain
          const chain = gatherReplyChain(userMessageId);
          chainLength = chain.length;

          // Trim the chain to the last MAX_CHAIN_LENGTH messages
          const trimmedChain = chain.slice(-MAX_CHAIN_LENGTH);
          context = trimmedChain
            .map((entry) => `${entry.text}\n${entry.botResponse || ""}`)
            .join("\n---\n");
          prompt = `${context}\n${prompt}`; // Append the new prompt to the context
        } else {
          context = replyToMessage.text;
          prompt = `${context}\n${prompt}`; // Include the replied-to message text in the prompt
        }
      } else {
        await ctx.reply("The replied-to message must be a text message.", {
          reply_parameters: { message_id: messageId },
        });
        return;
      }
    } else {
      replyChainMap.set(messageId, {
        text,
        botResponse: undefined,
        parentId: undefined,
      });
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
        // Update the reply chain with the bot's response
        const chainEntry = replyChainMap.get(messageId) || {
          text: "",
          botResponse: undefined,
          parentId: userMessageId,
        };
        chainEntry.botResponse = strippedText;
        replyChainMap.set(messageId, chainEntry);

        // Trim the chain if it exceeds MAX_CHAIN_LENGTH
        if (chainLength >= MAX_CHAIN_LENGTH) {
          const chain = gatherReplyChain(messageId);
          const trimmedChain = chain.slice(-MAX_CHAIN_LENGTH);
          replyChainMap.clear();
          trimmedChain.forEach((entry, index) => {
            const newMessageId =
              index === 0
                ? trimmedChain[0].parentId || messageId
                : trimmedChain[index - 1].parentId!;
            replyChainMap.set(newMessageId, entry);
          });
        }
      } catch (error: any) {
        if (error.description.includes("can't parse entities")) {
          await ctx.telegram.editMessageText(
            chatId,
            botReplyMessageId,
            undefined,
            strippedText || "Done!"
          );
          const chainEntry = replyChainMap.get(messageId) || {
            text: "",
            botResponse: undefined,
            parentId: userMessageId,
          };
          chainEntry.botResponse = strippedText;
          replyChainMap.set(messageId, chainEntry);
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

  // Helper function to gather the reply chain
  const gatherReplyChain = (
    messageId: number
  ): { text: string; botResponse?: string; parentId?: number }[] => {
    const chain: { text: string; botResponse?: string; parentId?: number }[] =
      [];
    let currentId: number | undefined = messageId;

    while (currentId !== undefined) {
      const entry = replyChainMap.get(currentId);
      if (entry) {
        chain.unshift(entry); // Add to the beginning to maintain chronological order
        currentId = entry.parentId;
      } else {
        break;
      }
    }

    return chain;
  };

  // Handle initial /prompt or /p command
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

  bot.on("message", async (ctx) => {
    if (!ctx.message) return;
    if (!("text" in ctx.message)) return;

    const replyToMessage = ctx.message.reply_to_message;
    if (!replyToMessage || !isTextMessageWithReply(ctx.message)) {
      return;
    }

    let userMessageId: number | undefined;
    for (const [key, value] of messageReplyMap.entries()) {
      if (value === replyToMessage.message_id) {
        userMessageId = key;
        break;
      }
    }

    if (userMessageId && replyChainMap.has(userMessageId)) {
      const text = ctx.message.text;
      if (text.startsWith("/")) return;

      await handlePrompt(ctx, false, true);
    }
  });

  function stripMarkdown(text: string): string {
    text = text.replace(/^(\s*)\*\s+/gm, "$1- ");
    text = text.replace(/\*(.+?)\*/g, "$1");
    return text.trim();
  }
};
