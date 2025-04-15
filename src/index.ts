import { Telegraf } from "telegraf";
import * as dotenv from "dotenv";
import { connectDB } from "./db/connection";
import startCommand from "./commands/start";
import promptCommand from "./commands/prompt";
import blacklistCommand from "./commands/blacklist";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN!);

// Connect to MongoDB
connectDB().catch(console.error);

// Register commands in a specific order
startCommand(bot);
blacklistCommand(bot); // Register blacklist commands before prompt
promptCommand(bot);

// Start the bot
bot.launch().then(() => {
  console.log("Bot started successfully!");
});

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
