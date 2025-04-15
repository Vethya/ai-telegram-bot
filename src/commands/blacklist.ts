import { Telegraf } from "telegraf";
import { isAdmin, isWhitelisted } from "../utils/checks";
import { saveBlacklist, removeFromBlacklistFile } from "../utils/blacklist";

export default (bot: Telegraf) => {
  bot.command("blacklist", async (ctx) => {
    const userId = ctx.from?.id;

    if (!userId || !(await isAdmin(userId))) {
      await ctx.reply("Only admins can use this command!", {
        reply_parameters: { message_id: ctx.message.message_id },
      });
      return;
    }

    const chatId = ctx.chat.id;
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
        "Please reply to a user's message or provide their numeric ID (e.g., /blacklist 123456789).",
        {
          reply_parameters: { message_id: ctx.message.message_id },
        }
      );
      return;
    }

    if (await isAdmin(targetId)) {
      await ctx.reply("You can't blacklist an admin!", {
        reply_parameters: { message_id: ctx.message.message_id },
      });
      return;
    }

    if (!(await isWhitelisted(chatId))) {
      await ctx.reply("This chat is not whitelisted!", {
        reply_parameters: { message_id: ctx.message.message_id },
      });
      return;
    }

    await saveBlacklist(targetId.toString());
    await ctx.reply(`User ${targetId} has been blacklisted.`, {
      reply_parameters: { message_id: ctx.message.message_id },
    });
  });

  bot.command("unblacklist", async (ctx) => {
    const userId = ctx.from?.id;

    if (!userId || !(await isAdmin(userId))) {
      await ctx.reply("Only admins can use this command!", {
        reply_parameters: { message_id: ctx.message.message_id },
      });
      return;
    }

    const chatId = ctx.chat.id;
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
        "Please reply to a user's message or provide their numeric ID (e.g., /unblacklist 123456789).",
        {
          reply_parameters: { message_id: ctx.message.message_id },
        }
      );
      return;
    }

    if (!(await isWhitelisted(chatId))) {
      await ctx.reply("This chat is not whitelisted!", {
        reply_parameters: { message_id: ctx.message.message_id },
      });
      return;
    }

    await removeFromBlacklistFile(targetId.toString());
    await ctx.reply(`User ${targetId} has been removed from the blacklist.`, {
      reply_parameters: { message_id: ctx.message.message_id },
    });
  });
};
