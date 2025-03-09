import * as dotenv from "dotenv";
import { BLACKLIST } from "./blacklist";

dotenv.config();

const WHITELIST_GROUP_IDS = process.env.WHITELIST_GROUP_IDS!.split(",");
const RATE_LIMIT_SECONDS = 10;
const rateLimitMap = new Map<number, number>();
const ADMINS = process.env.ADMINS!.split(",");

export const isWhitelisted = (chatId: number | string): boolean => {
  return WHITELIST_GROUP_IDS.includes(chatId.toString());
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

export const isAdmin = (userId: number | string): boolean => {
  return ADMINS.includes(userId.toString());
};

export const isBlacklisted = (userId: number | string): boolean => {
  return BLACKLIST.has(userId.toString());
};
