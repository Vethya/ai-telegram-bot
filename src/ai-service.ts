import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { systemPrompt } from "./constants";

export async function* generateResponse(
  contextMessages: Array<{
    role: "user" | "assistant";
    content: string;
  }>
): AsyncGenerator<string> {
  try {
    const result = await streamText({
      model: google("gemini-2.0-flash-exp"),
      messages: contextMessages,
      maxTokens: 1000,
    });

    for await (const textPart of result.textStream) {
      if (textPart) {
        yield textPart;
      }
    }
  } catch (error) {
    console.error("Error streaming AI response:", error);
    throw new Error("Failed to generate response");
  }
}
