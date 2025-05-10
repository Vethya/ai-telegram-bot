import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { systemPrompt } from "./constants";
import { getTools } from "./utils/tools";

export async function* generateResponse(
  messages: Array<{
    role: "user" | "assistant";
    content: any;
  }>
) {
  try {
    console.log(
      "Generating response for messages:",
      JSON.stringify(messages, null, 2)
    );

    const formattedMessages = messages.map((msg) => {
      if (
        Array.isArray(msg.content) &&
        msg.content.length > 0 &&
        "type" in msg.content[0]
      ) {
        return {
          role: msg.role,
          content: msg.content,
        };
      } else if (typeof msg.content === "string") {
        return {
          role: msg.role,
          content: [{ type: "text", text: msg.content }],
        };
      } else {
        return msg;
      }
    });

    const tools = await getTools();

    // Call AI model with tools
    const result = await streamText({
      model: google("gemini-2.0-flash-exp"),
      system: systemPrompt,
      messages: formattedMessages,
      maxTokens: 1000,
      tools: tools,
      maxSteps: 5,
    });

    let hasYieldedContent = false;

    for await (const chunk of result.textStream) {
      if (chunk && chunk.trim()) {
        hasYieldedContent = true;
        yield chunk;
      }
    }

    if (!hasYieldedContent) {
      yield "I've analyzed the content, but don't have a specific response. Please provide more details or ask a specific question.";
    }
  } catch (error) {
    console.error("Error generating AI response:", error);
    yield "Sorry, I encountered an error processing your request.";
  }
}
