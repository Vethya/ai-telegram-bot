import { Telegraf } from "telegraf";
import { isAdmin } from "../utils/checks";
import { addToWhitelist, removeFromWhitelist } from "../db/services";

export default (bot: Telegraf) => {
  bot.command("whitelist", async (ctx) => {
    const userId = ctx.from?.id;

    if (!userId || !(await isAdmin(userId))) {
      await ctx.reply("Only admins can use this command!", {
        reply_parameters: { message_id: ctx.message.message_id },
      });
      return;
    }

    const args = ctx.message.text.split(" ").slice(1);
    let targetChatId: string | undefined;

    // If no arguments provided, use the current chat
    if (args.length === 0) {
      targetChatId = ctx.chat.id.toString();
    } else {
      const input = args[0];
      
      // Check if input is a group username (starts with @)
      if (input.startsWith("@")) {
        try {
          const chat = await ctx.telegram.getChat(input);
          targetChatId = chat.id.toString();
        } catch (error) {
          await ctx.reply("Could not find the specified group. Please check the username and try again.", {
            reply_parameters: { message_id: ctx.message.message_id },
          });
          return;
        }
      } else if (/^-?\d+$/.test(input)) {
        // If input is a numeric ID
        targetChatId = input;
      } else {
        await ctx.reply("Please provide a valid chat ID or group username (e.g., /whitelist -100123456789 or /whitelist @groupname).", {
          reply_parameters: { message_id: ctx.message.message_id },
        });
        return;
      }
    }

    try {
      await addToWhitelist(targetChatId);
      await ctx.reply(`Chat ${targetChatId} has been whitelisted.`, {
        reply_parameters: { message_id: ctx.message.message_id },
      });
    } catch (error) {
      await ctx.reply("Failed to whitelist the chat. It might already be whitelisted.", {
        reply_parameters: { message_id: ctx.message.message_id },
      });
    }
  });

  bot.command("unwhitelist", async (ctx) => {
    const userId = ctx.from?.id;

    if (!userId || !(await isAdmin(userId))) {
      await ctx.reply("Only admins can use this command!", {
        reply_parameters: { message_id: ctx.message.message_id },
      });
      return;
    }

    const args = ctx.message.text.split(" ").slice(1);
    let targetChatId: string | undefined;

    // If no arguments provided, use the current chat
    if (args.length === 0) {
      targetChatId = ctx.chat.id.toString();
    } else {
      const input = args[0];
      
      // Check if input is a group username (starts with @)
      if (input.startsWith("@")) {
        try {
          const chat = await ctx.telegram.getChat(input);
          targetChatId = chat.id.toString();
        } catch (error) {
          await ctx.reply("Could not find the specified group. Please check the username and try again.", {
            reply_parameters: { message_id: ctx.message.message_id },
          });
          return;
        }
      } else if (/^-?\d+$/.test(input)) {
        // If input is a numeric ID
        targetChatId = input;
      } else {
        await ctx.reply("Please provide a valid chat ID or group username (e.g., /unwhitelist -100123456789 or /unwhitelist @groupname).", {
          reply_parameters: { message_id: ctx.message.message_id },
        });
        return;
      }
    }

    try {
      await removeFromWhitelist(targetChatId);
      await ctx.reply(`Chat ${targetChatId} has been removed from the whitelist.`, {
        reply_parameters: { message_id: ctx.message.message_id },
      });
    } catch (error) {
      await ctx.reply("Failed to remove the chat from whitelist. It might not be whitelisted.", {
        reply_parameters: { message_id: ctx.message.message_id },
      });
    }
  });
}; 