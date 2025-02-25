import { google } from "@ai-sdk/google";
import { streamText } from "ai";

export async function* generateResponse(
  prompt: string
): AsyncGenerator<string> {
  try {
    const result = await streamText({
      model: google("gemini-2.0-flash-exp"),
      prompt: "Invent a new holiday and describe its traditions.",
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
