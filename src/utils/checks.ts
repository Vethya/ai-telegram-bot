import * as dotenv from "dotenv";
import { isAdmin as isAdminDB, isWhitelisted as isWhitelistedDB, isBlacklisted as isBlacklistedDB } from "../db/services";

dotenv.config();

const RATE_LIMIT_SECONDS = 2;
const rateLimitMap = new Map<number, number>();

export const isWhitelisted = async (chatId: number | string): Promise<boolean> => {
  return await isWhitelistedDB(chatId.toString());
};

export const isRateLimited = (userId: number): boolean => {
  const lastCommandTime = rateLimitMap.get(userId) || 0;
  const currentTime = Date.now();
  const timeDiffSeconds = (currentTime - lastCommandTime) / 1000;

  if (timeDiffSeconds < RATE_LIMIT_SECONDS) {
    return true;
  }

  rateLimitMap.set(userId, currentTime);
  return false;
};

export const isAdmin = async (userId: number | string): Promise<boolean> => {
  return await isAdminDB(userId.toString());
};

export const isBlacklisted = async (userId: number | string): Promise<boolean> => {
  return await isBlacklistedDB(userId.toString());
};
