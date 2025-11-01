    const mongoose = require("mongoose");
    const { v4: uuidv4 } = require("uuid");

    const cardSchema = new mongoose.Schema({
      cardId: { type: String, default: uuidv4 },
      globalCardId: { type: Number, required: true },
      userCardId: { type: Number, required: true },
      name: { type: String, required: true }, // e.g., "Gojo Satoru"
      race: { type: String, required: true }, // e.g., "demon", "angel", etc.
      rarity: { type: String, default: "mortal" }, // can be updated later for rarity system
      imageUrl: { type: String, required: true },

      // 💠 Soul System (we can expand this later)
      soulPotential: { type: Number, default: 0 },
      soulType: { type: String, default: "neutral" },

        // 📈 Card Level
      level: { type: Number, default: 1 },
      xp: { type: Number, default: 0 },

      // ⚔️ Character Stats
      stats: {
      hp: { type: Number, default: 0 },
      attack: { type: Number, default: 0 },
      defense: { type: Number, default: 0 },
      speed: { type: Number, default: 0 },
      magic: { type: Number, default: 0 },
      spirit: { type: Number, default: 0 },
    },


      obtainedAt: { type: Date, default: Date.now },
    });

    const userSchema = new mongoose.Schema({
      userId: { type: String, required: true },
      guildId: { type: String, required: false },

      xp: { type: Number, default: 0 },
      level: { type: Number, default: 1 },
      race: { type: String, default: null }, // user's chosen race

      userCardCounter: { type: Number, default: 0 }, // 🔥 New counter
      cards: [cardSchema],

      selectedCardId: { type: Number, default: null },

      filters: {
    type: new mongoose.Schema({
      levelup: {
        rarity: { type: [String], default: [] },
        race: { type: [String], default: [] },
        nameIncludes: { type: [String], default: [] },
        nameExcludes: { type: [String], default: [] },
        lastMode: { type: String, default: "smart" }
      }
    }, { _id: false }),
    default: {}
  }
    });

    // 🧩 Avoid OverwriteModelError when reloading
    module.exports = mongoose.models.User || mongoose.model("User", userSchema);
