"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const telegraf_1 = require("telegraf");
const ai_service_1 = require("./ai-service");
dotenv.config();
// Environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const WHITELIST_GROUP_IDS = process.env.WHITELIST_GROUP_IDS.split(",");
// Initialize bot
const bot = new telegraf_1.Telegraf(BOT_TOKEN);
// Middleware to check whitelist
const isWhitelisted = (chatId) => {
    return WHITELIST_GROUP_IDS.includes(chatId.toString());
};
// Bot handlers
bot.command("start", async (ctx) => {
    const chatId = ctx.chat.id;
    const _isWhitelisted = isWhitelisted(chatId);
    await ctx.reply(`Hello! I'm Vethya AI!${_isWhitelisted
        ? ""
        : " This chat doesn't seem to be whitelisted. I can't respond here, sorry."}`);
});
bot.help((ctx) => {
    const chatId = ctx.chat.id;
    if (!isWhitelisted(chatId))
        return;
    ctx.reply("Just send me a message, and I’ll respond using Gemini 2.0 AI!");
});
bot.command("prompt", async (ctx) => {
    const chatId = ctx.chat.id;
    if (!isWhitelisted(chatId))
        return;
    const prompt = ctx.message.text.split(" ").slice(1).join(" ").trim();
    if (!prompt) {
        await ctx.reply("Please provide a prompt! Usage: /prompt <your question>");
        return;
    }
    try {
        // Send initial message
        const initialMessage = await ctx.reply("Thinking...");
        const messageId = initialMessage.message_id;
        let buffer = "";
        let lastUpdateTime = Date.now();
        const UPDATE_INTERVAL = 3000; // 3 seconds
        // Stream and buffer response
        for await (const chunk of (0, ai_service_1.generateResponse)(prompt)) {
            buffer += chunk;
            const currentTime = Date.now();
            if (currentTime - lastUpdateTime >= UPDATE_INTERVAL) {
                await ctx.telegram
                    .editMessageText(chatId, messageId, undefined, buffer || "Processing...", { parse_mode: "Markdown" })
                    .catch((err) => {
                    if (err.description.includes("message is not modified"))
                        return;
                    throw err;
                });
                lastUpdateTime = currentTime;
            }
        }
        // Final update with complete response
        await ctx.telegram.editMessageText(chatId, messageId, undefined, buffer || "Done!", { parse_mode: "Markdown" });
    }
    catch (error) {
        console.error("Error processing prompt:", error);
        await ctx.reply("Sorry, something went wrong. Please try again!");
    }
});
// Error handling
bot.catch((err, ctx) => {
    console.error(`Error for ${ctx.updateType}:`, err);
});
// Launch bot
bot.launch().then(async () => {
    console.log("Bot started successfully");
    // const webhookUrl = process.env.VERCEL_URL
    //   ? `https://${process.env.VERCEL_URL}/api/bot`
    //   : "your-custom-domain/api/bot";
    // await bot.telegram.setWebhook(webhookUrl);
});
// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
