import { Admin, Whitelist, Blacklist } from './models';

// Admin services
export const isAdmin = async (userId: string): Promise<boolean> => {
  const admin = await Admin.findOne({ userId });
  return !!admin;
};

export const addAdmin = async (userId: string): Promise<void> => {
  await Admin.create({ userId });
};

export const removeAdmin = async (userId: string): Promise<void> => {
  await Admin.deleteOne({ userId });
};

// Whitelist services
export const isWhitelisted = async (groupId: string): Promise<boolean> => {
  const whitelisted = await Whitelist.findOne({ groupId });
  return !!whitelisted;
};

export const addToWhitelist = async (groupId: string): Promise<void> => {
  await Whitelist.create({ groupId });
};

export const removeFromWhitelist = async (groupId: string): Promise<void> => {
  await Whitelist.deleteOne({ groupId });
};

// Blacklist services
export const isBlacklisted = async (userId: string): Promise<boolean> => {
  const blacklisted = await Blacklist.findOne({ userId });
  return !!blacklisted;
};

export const addToBlacklist = async (userId: string): Promise<void> => {
  await Blacklist.create({ userId });
};

export const removeFromBlacklist = async (userId: string): Promise<void> => {
  await Blacklist.deleteOne({ userId });
}; 