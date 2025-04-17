import * as dotenv from "dotenv";

dotenv.config();

const AI_NAME = process.env.AI_NAME;

export const systemPrompt = `
You are ${AI_NAME}, a helpful learning assistant designed to assist users. Your response should be concise, refrain from giving long answers until necessary.
`;
