import type { createAISDKTools } from "@agentic/ai-sdk";

const importDynamic = new Function("modulePath", "return import(modulePath)");

let toolsInstance: ReturnType<typeof createAISDKTools> | undefined;
let initializationPromise: Promise<ReturnType<typeof createAISDKTools>> | null =
  null;

export async function initializeTools() {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      const { calculator } = await importDynamic("@agentic/calculator");
      const { WeatherClient } = await importDynamic("@agentic/weather");
      const { createAISDKTools } = await importDynamic("@agentic/ai-sdk");

      const weather = new WeatherClient();

      toolsInstance = createAISDKTools(calculator, weather);

      if (!toolsInstance) {
        throw new Error("Failed to create tools instance");
      }

      return toolsInstance;
    } catch (error) {
      console.error("Error initializing tools:", error);
      throw error;
    }
  })();

  return initializationPromise;
}

export async function getTools(): Promise<ReturnType<typeof createAISDKTools>> {
  try {
    if (!toolsInstance) {
      await initializeTools();
    }
    if (!toolsInstance) {
      throw new Error("Failed to initialize tools");
    }
    return toolsInstance;
  } catch (error) {
    console.error("Error getting tools:", error);
    throw error;
  }
}
