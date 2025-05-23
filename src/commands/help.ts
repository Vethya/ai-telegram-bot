import { Telegraf } from "telegraf";
import { isAdmin } from "../utils/checks";

export default (bot: Telegraf) => {
  bot.command("help", async (ctx) => {
    const userId = ctx.from?.id;
    const isUserAdmin = userId ? await isAdmin(userId) : false;

    // General commands available to all users
    let helpMessage = "*Available Commands:*\n\n";
    
    // Start command
    helpMessage += "*General Commands:*\n";
    helpMessage += "• /start - Start the bot\n";
    helpMessage += "• /help - Show this help message\n\n";
    
    // Prompt command
    helpMessage += "*AI Interaction:*\n";
    helpMessage += "• /prompt or /p <text> - Ask the AI a question\n";
    helpMessage += "• Reply to a bot message - Ask follow-up questions\n";
    helpMessage += "• Reply to a message with /prompt or /p - Ask the AI a question with the reply as context\n";
    helpMessage += "• Reply to a message with an image - Ask the AI a question about the image\n";
    helpMessage += "• Mention the bot - Ask a question. Works like /prompt and /p\n\n";
    
    // Context commands
    helpMessage += "*Context Management:*\n";
    helpMessage += "• /context - View the current context for this chat\n";
    helpMessage += "• /setcontext <text> - Set context for this chat\n";
    helpMessage += "• /removecontext or /rmcontext - Remove context for this chat\n\n";
    
    // Admin-only commands
    if (isUserAdmin) {
      helpMessage += "*Admin Commands:*\n";
      helpMessage += "• /whitelist <chat_id or @username> - Whitelist a chat\n";
      helpMessage += "• /unwhitelist <chat_id or @username> - Remove a chat from whitelist\n";
      helpMessage += "• /blacklist <user_id> - Blacklist a user\n";
      helpMessage += "• /unblacklist <user_id> - Remove a user from blacklist\n";
    }

    await ctx.reply(helpMessage, {
      parse_mode: "Markdown",
      reply_parameters: { message_id: ctx.message.message_id },
    });
  });
}; 