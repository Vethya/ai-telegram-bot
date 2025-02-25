"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResponse = generateResponse;
const google_1 = require("@ai-sdk/google");
const ai_1 = require("ai");
async function* generateResponse(prompt) {
    try {
        const result = await (0, ai_1.streamText)({
            model: (0, google_1.google)("gemini-2.0-flash-exp"),
            prompt: "Invent a new holiday and describe its traditions.",
        });
        for await (const textPart of result.textStream) {
            if (textPart) {
                yield textPart;
            }
        }
    }
    catch (error) {
        console.error("Error streaming AI response:", error);
        throw new Error("Failed to generate response");
    }
}
