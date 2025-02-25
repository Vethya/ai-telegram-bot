import { google } from "@ai-sdk/google";
import { generateText, streamText } from "ai";

export async function generateResponse(prompt: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: google("gemini-2.0-flash-exp"),
      prompt: "Invent a new holiday and describe its traditions.",
    });

    const response = text;
    return response;
  } catch (error) {
    console.error("Error generating AI response:", error);
    throw new Error("Failed to generate response");
  }
}
