import { Telegraf, Context } from "telegraf";
import { isAdmin, isWhitelisted } from "../utils/checks";
import { getContext, setContext, removeContext } from "../db/services";

// Maximum character limit for context prompts
const MAX_CONTEXT_LENGTH = 1000;

export default (bot: Telegraf<Context>) => {
  // Command to set context for a chat
  bot.command("setcontext", async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat.id.toString();
    
    // Check if user is admin or if it's a private chat
    const isPrivateChat = ctx.chat.type === "private";
    const isUserAdmin = userId ? await isAdmin(userId) : false;
    const isChatWhitelisted = await isWhitelisted(chatId);
    
    // Only admins in whitelisted chats or users in private chats can set context
    if (!isPrivateChat && !isUserAdmin) {
      await ctx.reply("Only admins in whitelisted chats can set context.", {
        reply_parameters: { message_id: ctx.message.message_id },
      });
      return;
    }
    
    // Get the context prompt from the message
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
      await ctx.reply(
        "Please provide a context prompt. Usage: /setcontext Your context prompt here",
        {
          reply_parameters: { message_id: ctx.message.message_id },
        }
      );
      return;
    }
    
    // Extract the context prompt (everything after the command)
    const prompt = args.slice(1).join(" ");
    
    // Check if the prompt exceeds the character limit
    if (prompt.length > MAX_CONTEXT_LENGTH) {
      await ctx.reply(
        `Context prompt is too long. Maximum length is ${MAX_CONTEXT_LENGTH} characters.`,
        {
          reply_parameters: { message_id: ctx.message.message_id },
        }
      );
      return;
    }
    
    try {
      await setContext(chatId, prompt);
      await ctx.reply(`Context set successfully for this chat.`, {
        reply_parameters: { message_id: ctx.message.message_id },
      });
    } catch (error) {
      console.error("Error setting context:", error);
      await ctx.reply("Failed to set context. Please try again later.", {
        reply_parameters: { message_id: ctx.message.message_id },
      });
    }
  });
  
  // Command to view current context
  bot.command("context", async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat.id.toString();
    
    // Anyone can view the context
    try {
      const context = await getContext(chatId);
      if (context) {
        await ctx.reply(`Current context for this chat:\n\n${context}`, {
          reply_parameters: { message_id: ctx.message.message_id },
        });
      } else {
        await ctx.reply("No context set for this chat.", {
          reply_parameters: { message_id: ctx.message.message_id },
        });
      }
    } catch (error) {
      console.error("Error getting context:", error);
      await ctx.reply("Failed to retrieve context. Please try again later.", {
        reply_parameters: { message_id: ctx.message.message_id },
      });
    }
  });
  
  // Command to remove context
  bot.command(["removecontext", "rmcontext"], async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat.id.toString();
    
    // Check if user is admin or if it's a private chat
    const isPrivateChat = ctx.chat.type === "private";
    const isUserAdmin = userId ? await isAdmin(userId) : false;
    
    // Only admins in whitelisted chats or users in private chats can remove context
    if (!isPrivateChat && !isUserAdmin) {
      await ctx.reply("Only admins in whitelisted chats can remove context.", {
        reply_parameters: { message_id: ctx.message.message_id },
      });
      return;
    }
    
    try {
      await removeContext(chatId);
      await ctx.reply(`Context removed successfully for this chat.`, {
        reply_parameters: { message_id: ctx.message.message_id },
      });
    } catch (error) {
      console.error("Error removing context:", error);
      await ctx.reply("Failed to remove context. Please try again later.", {
        reply_parameters: { message_id: ctx.message.message_id },
      });
    }
  });
}; 