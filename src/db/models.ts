import mongoose from 'mongoose';

// Admin Schema
const adminSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  addedAt: { type: Date, default: Date.now }
});

// Whitelist Schema
const whitelistSchema = new mongoose.Schema({
  groupId: { type: String, required: true, unique: true },
  addedAt: { type: Date, default: Date.now }
});

// Blacklist Schema
const blacklistSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  addedAt: { type: Date, default: Date.now }
});

export const Admin = mongoose.model('Admin', adminSchema);
export const Whitelist = mongoose.model('Whitelist', whitelistSchema);
export const Blacklist = mongoose.model('Blacklist', blacklistSchema); 