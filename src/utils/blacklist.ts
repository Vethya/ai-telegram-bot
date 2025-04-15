import * as fs from "fs/promises";
import { addToBlacklist, removeFromBlacklist } from "../db/services";

const BLACKLIST_FILE = "./blacklist.json";
const loadBlacklist = async () => {
  try {
    const data = await fs.readFile(BLACKLIST_FILE, "utf-8");
    return new Set<string>(JSON.parse(data));
  } catch {
    return new Set<string>(process.env.BLACKLIST?.split(",") || []);
  }
};

export const saveBlacklist = async (userId: string) => {
  await addToBlacklist(userId);
};

export const removeFromBlacklistFile = async (userId: string) => {
  await removeFromBlacklist(userId);
};

export let BLACKLIST: Set<string> = new Set<string>();

(async () => {
  BLACKLIST = await loadBlacklist();
})();
