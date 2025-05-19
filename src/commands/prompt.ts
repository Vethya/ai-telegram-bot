import { Telegraf, Context } from "telegraf";
import { message } from "telegraf/filters";
import {
  isAdmin,
  isBlacklisted,
  isRateLimited,
  isWhitelisted,
} from "../utils/checks";
import { generateResponse } from "../ai-service";
import { Message } from "telegraf/types";
import { getContext } from "../db/services";

// Map to store user message ID to bot reply message ID
const messageReplyMap = new Map<number, number>();

// Map to store the reply chain (messageId -> { text, botResponse, parentId })
const replyChainMap = new Map<
  number,
  {
    text: string;
    botResponse?: string;
    parentId?: number;
    imageUrl?: string;
  }
>();

// Maximum chain length
const MAX_CHAIN_LENGTH = 10;

export default (bot: Telegraf<Context>) => {
  // Helper to get image URL from a message if it exists
  const getImageUrl = async (
    ctx: Context,
    message: Message
  ): Promise<string | undefined> => {
    if ("photo" in message && message.photo && message.photo.length > 0) {
      // Get the highest resolution photo (last in the array)
      const fileId = message.photo[message.photo.length - 1].file_id;
      try {
        const fileInfo = await ctx.telegram.getFile(fileId);
        return `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${fileInfo.file_path}`;
      } catch (error) {
        console.error("Error getting file info:", error);
        return undefined;
      }
    }
    return undefined;
  };

  // Helper function to gather the reply chain
  const gatherReplyChain = (
    messageId: number
  ): {
    text: string;
    botResponse?: string;
    parentId?: number;
    imageUrl?: string;
  }[] => {
    const chain: {
      text: string;
      botResponse?: string;
      parentId?: number;
      imageUrl?: string;
    }[] = [];
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

  function stripMarkdown(text: string): string {
    text = text.replace(/^(\s*)\*\s+/gm, "$1- ");
    text = text.replace(/\*(.+?)\*/g, "$1");
    return text.trim();
  }

  const handlePrompt = async (
    ctx: Context,
    isEdited: boolean = false,
    isReplyWithoutCommand: boolean = false,
    isFromMention: boolean = false
  ) => {
    const chatId = ctx.chat!.id;
    const userId = ctx.from?.id;
    const messageId = isEdited
      ? ctx.editedMessage!.message_id
      : ctx.message!.message_id;
    const message = isEdited ? ctx.editedMessage : ctx.message;

    if (!userId) return;

    if (await isBlacklisted(userId)) {
      return;
    }

    const _isWhitelisted = await isWhitelisted(chatId);
    if (!_isWhitelisted) {
      await ctx.reply("Sorry, I can't respond here!", {
        reply_parameters: { message_id: messageId },
      });
      return;
    }

    if ((await isRateLimited(userId)) && !(await isAdmin(userId))) {
      await ctx.reply(
        "You're sending messages too quickly. Please slow down.",
        {
          reply_parameters: { message_id: messageId },
        }
      );
      return;
    }

    // Get message text and image if available
    let text = "";
    let currentImageUrl: string | undefined;

    if ("text" in message!) {
      text = message.text || "";
    } else if ("caption" in message! && message.caption) {
      text = message.caption;
    }

    // Get image URL if the message contains an image
    if ("photo" in message!) {
      currentImageUrl = await getImageUrl(ctx, message);
      if (!currentImageUrl) {
        await ctx.reply("Failed to process the image. Please try again.", {
          reply_parameters: { message_id: messageId },
        });
        return;
      }
    }

    let prompt = isReplyWithoutCommand
      ? text
      : text.split(" ").slice(1).join(" ").trim();

    // Gather context from the reply chain if replying to a bot message
    let contextMessages: Array<{
      role: "user" | "assistant";
      content: any; // Can be string or array of content objects
    }> = [];
    let chainLength = 0;
    let replyToMessage: Message | undefined;
    let userMessageId: number | undefined;
    let replyImageUrl: string | undefined;

    // Check if this is a reply to another message
    if ("reply_to_message" in message! && message.reply_to_message) {
      replyToMessage = message.reply_to_message;

      // Check if the replied message contains an image
      replyImageUrl = await getImageUrl(ctx, replyToMessage);

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

        // Convert the chain to message format
        trimmedChain.forEach((entry) => {
          const userText = entry.text.replace(/^\/(prompt|p)\s+/, ""); // Remove command prefix if present

          const userContent = [];
          if (userText) {
            userContent.push({ type: "text", text: userText });
          }
          if (entry.imageUrl) {
            userContent.push({ type: "image", image: entry.imageUrl });
          }

          contextMessages.push({
            role: "user",
            content:
              userContent.length === 1 && userContent[0].type === "text"
                ? userContent[0].text
                : userContent,
          });

          if (entry.botResponse) {
            contextMessages.push({
              role: "assistant",
              content: entry.botResponse,
            });
          }
        });
      } else {
        // Single reply to a message
        const replyContent = [];
        let replyText = "";

        if ("text" in replyToMessage && replyToMessage.text) {
          replyText = replyToMessage.text;
        } else if ("caption" in replyToMessage && replyToMessage.caption) {
          replyText = replyToMessage.caption;
        }

        if (replyText) {
          replyContent.push({ type: "text", text: replyText });
        }
        if (replyImageUrl) {
          replyContent.push({ type: "image", image: replyImageUrl });
        }

        if (replyContent.length > 0) {
          contextMessages.push({
            role: "user",
            content: replyContent.length === 1 && replyContent[0].type === "text"
              ? replyContent[0].text
              : replyContent,
          });
        }
      }
    }

    let userPrompt = "";

    // Add the current prompt as the last message
    if (isReplyWithoutCommand) {
      userPrompt = prompt;
    } else if (isFromMention) {
      const botInfo = await ctx.telegram.getMe();
      const botUsername = botInfo.username;
      const mentionRegex = new RegExp(`@${botUsername}\\b`, 'i');

      userPrompt = text.replace(mentionRegex, '').trim();
    } else {
      userPrompt = prompt.replace(/^\/(prompt|p)\s+/, "");
    }

    const userContent = [];

    // Only add text content if there's actual text to add
    if (userPrompt && userPrompt.trim() !== "") {
      userContent.push({ type: "text", text: userPrompt });
    }

    if (currentImageUrl) {
      userContent.push({ type: "image", image: currentImageUrl });
    }

    // If we're sending just an image but no text, add a default instruction
    if (
      userContent.length === 1 &&
      userContent[0].type === "image" &&
      (!userPrompt || userPrompt.trim() === "")
    ) {
      userContent.unshift({
        type: "text",
        text: "Please describe this image in detail.",
      });
    }

    // Add the current message to context
    if (userContent.length > 0) {
      contextMessages.push({
        role: "user",
        content: userContent.length === 1 && userContent[0].type === "text"
          ? userContent[0].text
          : userContent,
      });
    }

    // Get chat context from database if available
    const chatContext = await getContext(chatId.toString());
    if (chatContext) {
      // Add the chat context as a user message at the beginning
      contextMessages.unshift({
        role: "user",
        content: `Context: ${chatContext}`,
      });
    }

    console.log("Context messages:", JSON.stringify(contextMessages, null, 2));

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

      for await (const chunk of generateResponse(contextMessages)) {
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
          text: userPrompt,
          botResponse: undefined,
          parentId: userMessageId,
          imageUrl: currentImageUrl, // Make sure to store the image URL
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
        if (
          error.description &&
          error.description.includes("can't parse entities")
        ) {
          await ctx.telegram.editMessageText(
            chatId,
            botReplyMessageId,
            undefined,
            strippedText || "Done!"
          );
          const chainEntry = replyChainMap.get(messageId) || {
            text: userPrompt,
            botResponse: undefined,
            parentId: userMessageId,
            imageUrl: currentImageUrl, // Make sure to store the image URL
          };
          chainEntry.botResponse = strippedText;
          replyChainMap.set(messageId, chainEntry);
        } else {
          console.error("Error updating message:", error);
          await ctx.telegram.editMessageText(
            chatId,
            botReplyMessageId,
            undefined,
            "Error formatting response. Please try again."
          );
        }
      }
    } catch (error) {
      console.error("Error processing prompt:", error);
      await ctx.reply("Sorry, something went wrong. Please try again!", {
        reply_parameters: { message_id: messageId },
      });
    }
  };

  // Handle initial /prompt or /p command
  bot.command(["prompt", "p"], async (ctx) => {
    // Check if the message has a photo
    /* Commented out photo handling
    if ("photo" in ctx.message) {
      await handlePrompt(ctx);
      return;
    }
    */
    
    // For text messages, check if there's a reply
    if ("reply_to_message" in ctx.message && ctx.message.reply_to_message) {
      await handlePrompt(ctx);
      return;
    }
    
    // For regular text messages
    await handlePrompt(ctx);
  });

  // Handle replies to messages
  bot.on("message", async (ctx) => {
    if (!ctx.message) return;

    // Check if the message is a text message and mentions the bot
    if ("text" in ctx.message && ctx.message.text) {
      const text = ctx.message.text;
      
      // Get bot info to check for username mentions
      const botInfo = await ctx.telegram.getMe();
      const botUsername = botInfo.username;
      
      // Check if the message mentions the bot
      const mentionRegex = new RegExp(`@${botUsername}\\b`, 'i');
      if (mentionRegex.test(text)) {
        await handlePrompt(ctx, false, false, true);
        return;
      }
    }

    // Check if reply_to_message property exists
    if (!("reply_to_message" in ctx.message) || !ctx.message.reply_to_message)
      return;

    const replyToMessage = ctx.message.reply_to_message;

    // Check if it's a reply to a bot message
    let userMessageId: number | undefined;
    for (const [key, value] of messageReplyMap.entries()) {
      if (value === replyToMessage.message_id) {
        userMessageId = key;
        break;
      }
    }

    if (userMessageId && replyChainMap.has(userMessageId)) {
      // Process the prompt
      await handlePrompt(ctx, false, true);
    }
  });

  // Handle edited messages
  bot.on("edited_message", async (ctx) => {
    if (!ctx.editedMessage) return;

    // Check if it's a text message with the command
    if ("text" in ctx.editedMessage) {
      const editedText = ctx.editedMessage.text;
      const commandMatch = editedText.match(/^\/(prompt|p)(?:\s|$)/);
      if (commandMatch) {
        await handlePrompt(ctx, true);
        return;
      }
      
      // Check if the message mentions the bot
      const botInfo = await ctx.telegram.getMe();
      const botUsername = botInfo.username;
      const mentionRegex = new RegExp(`@${botUsername}\\b`, 'i');
      if (mentionRegex.test(editedText)) {
        // Extract the prompt after the mention
        const prompt = editedText.replace(mentionRegex, '').trim();
        
        // If there's a prompt, handle it
        if (prompt) {
          await handlePrompt(ctx, true);
          return;
        }
      }
    }

    /* Commented out photo handling
    // Check if it's a photo with caption containing the command
    if ("photo" in ctx.editedMessage && ctx.editedMessage.caption) {
      const editedCaption = ctx.editedMessage.caption;
      const commandMatch = editedCaption.match(/^\/(prompt|p)(?:\s|$)/);
      if (commandMatch) {
        await handlePrompt(ctx, true);
        return;
      }
      
      // Check if the caption mentions the bot
      const botInfo = await ctx.telegram.getMe();
      const botUsername = botInfo.username;
      const mentionRegex = new RegExp(`@${botUsername}\\b`, 'i');
      if (mentionRegex.test(editedCaption)) {
        // Extract the prompt after the mention
        const prompt = editedCaption.replace(mentionRegex, '').trim();
        
        // If there's a prompt, handle it
        if (prompt) {
          await handlePrompt(ctx, true);
          return;
        }
      }
    }
    */
  });

  /* Commented out photo handling middleware
  // Handle photo messages with /prompt or /p command in caption
  bot.use(async (ctx, next) => {
    if (ctx.message && "photo" in ctx.message) {
      console.log("Photo message received");
      
      // Handle photos with captions that include our command
      if (ctx.message.caption) {
        const captionText = ctx.message.caption;
        
        // Check for command first
        const commandMatch = captionText.match(/^\/(prompt|p)(?:\s|$)/);
        if (commandMatch) {
          await handlePrompt(ctx);
          return;
        }
        
        // Then check for mention
        const botInfo = await ctx.telegram.getMe();
        const botUsername = botInfo.username;
        const mentionRegex = new RegExp(`@${botUsername}\\b`, 'i');
        if (mentionRegex.test(captionText)) {
          await handlePrompt(ctx);
          return;
        }
      } else {
        // If no caption, check if it's a reply to a bot message
        if ("reply_to_message" in ctx.message && ctx.message.reply_to_message) {
          const replyToMessage = ctx.message.reply_to_message;

          // Check if replying to a bot message
          let userMessageId: number | undefined;
          for (const [key, value] of messageReplyMap.entries()) {
            if (value === replyToMessage.message_id) {
              userMessageId = key;
              break;
            }
          }

          if (userMessageId && replyChainMap.has(userMessageId)) {
            await handlePrompt(ctx, false, true);
            return;
          }
        }
      }
    }
    return next();
  });
  */
};
