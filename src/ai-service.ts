import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { systemPrompt } from "./constants";

export async function* generateResponse(
  messages: Array<{
    role: "user" | "assistant";
    content: any; // Can be string or array of content objects
  }>
) {
  try {
    console.log(
      "Generating response for messages:",
      JSON.stringify(messages, null, 2)
    );

    // Process messages to ensure they're in the right format for the AI model
    const formattedMessages = messages.map((msg) => {
      // If content is already correctly formatted
      if (
        Array.isArray(msg.content) &&
        msg.content.length > 0 &&
        "type" in msg.content[0]
      ) {
        return {
          role: msg.role,
          content: msg.content,
        };
      }
      // If content is a string, convert to the correct format
      else if (typeof msg.content === "string") {
        return {
          role: msg.role,
          content: [{ type: "text", text: msg.content }],
        };
      }
      // Return as-is (should already be formatted correctly)
      else {
        return msg;
      }
    });

    console.log(
      "Formatted messages:",
      JSON.stringify(formattedMessages, null, 2)
    );

    // Call your AI model with the formatted messages
    const result = await streamText({
      model: google("gemini-2.0-flash-exp"),
      system: systemPrompt,
      messages: formattedMessages,
      maxTokens: 1000,
    });

    let hasYieldedContent = false;

    for await (const chunk of result.textStream) {
      if (chunk && chunk.trim()) {
        hasYieldedContent = true;
        yield chunk;
      }
    }

    // If no content was yielded, provide a fallback response
    if (!hasYieldedContent) {
      yield "I've analyzed the content, but don't have a specific response. Please provide more details or ask a specific question.";
    }
  } catch (error) {
    console.error("Error generating AI response:", error);
    yield "Sorry, I encountered an error processing your request.";
  }
}
