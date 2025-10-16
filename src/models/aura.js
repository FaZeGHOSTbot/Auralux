// src/models/aura.js
const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ["level", "daily", "weekly", "monthly", "work", "give", "spend", "other"], required: true },
  amount: { type: Number, required: true },
  reason: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const auraSchema = new mongoose.Schema({
  userId: { type: String, required: true },         // Discord user id
  guildId: { type: String, default: null },         // Optional: null => global record. Use if you want per-guild balances.
  aura: { type: Number, default: 0 },               // Current balance

  // Cooldowns and streaks
  lastDaily: { type: Date, default: null },
  dailyStreak: { type: Number, default: 0 },

  lastWeekly: { type: Date, default: null },
  weeklyStreak: { type: Number, default: 0 },

  lastMonthly: { type: Date, default: null },
  monthlyStreak: { type: Number, default: 0 },

  lastWork: { type: Date, default: null },

  // Optional bookkeeping
  totalEarned: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },

  // Recent transactions (keeps last N transactions to avoid huge arrays)
  recentTransactions: {
    type: [transactionSchema],
    default: []
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update updatedAt on save
auraSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Compound index to allow either unique per (user,guild) or fast lookups for global records (guildId = null)
auraSchema.index({ userId: 1, guildId: 1 }, { unique: true });

// Helper to push transaction and trim array to last N (N = 20)
auraSchema.methods.pushTransaction = async function (txn, max = 20) {
  this.recentTransactions.push(txn);
  if (this.recentTransactions.length > max) {
    this.recentTransactions = this.recentTransactions.slice(-max);
  }
  await this.save();
};

module.exports = mongoose.model("Aura", auraSchema);
